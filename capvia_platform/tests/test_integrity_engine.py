"""
CAPVIA Phase 13 — Integrity Engine Tests
==========================================
Tests covering:
  1. Calibration weights (default, Redis, update)
  2. Penalty calculators (ATS, Simulation, Interview)
  3. Trust Index and Risk Level derivation
  4. Confidence Level completeness scoring
  5. Full lifecycle: DB setup → interview webhook → auto Integrity assessment
  6. Manual re-evaluation via IntegrityService
  7. Explainability and Audit Trail persistence
  8. Historical Tracking accumulation (multiple runs)
"""
import os
import uuid
import asyncio
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

# ---- env setup BEFORE imports ----
os.environ["DATABASE_URL"] = "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db"
os.environ["SECRET_KEY"] = "test_secret_for_integrity_engine"
os.environ["ALGORITHM"] = "HS256"
os.environ["REDIS_URL"] = ""  # Force local memory fallback

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType,
    User, Company, Internship, Application,
    ATSResult, SimulationResult, InterviewResult, IntegrityResult,
    ApplicationMapping, Notification
)
from capvia_platform.services.integrity_service import (
    IntegrityService,
    get_calibration_weights, calibrate_weights,
    _compute_ats_penalty, _compute_simulation_penalty, _compute_interview_penalty,
    _determine_risk_level, _determine_confidence_level,
    DEFAULT_WEIGHTS,
)
from capvia_platform.repositories.interview_repository import InterviewRepository
from capvia_platform.webhooks.interview_webhooks import handle_interview_evaluated_webhook

interview_repo = InterviewRepository()


def run_async(coro):
    async def wrapper():
        try:
            await coro
        finally:
            await engine.dispose()
    asyncio.run(wrapper())


@pytest.fixture(autouse=True)
def clean_database():
    async def run_clean():
        async with AsyncSessionFactory() as session:
            await session.execute(text(
                "TRUNCATE TABLE users, internships, applications, candidate_mappings, "
                "vacancy_mappings, application_mappings, ats_results, dna_profiles, "
                "simulation_results, notifications, company_members, companies, "
                "interview_results, integrity_results CASCADE;"
            ))
            await session.commit()
    run_async(run_clean())
    yield


# =============================================================================
# 1. Calibration Weights
# =============================================================================

def test_default_calibration_weights():
    async def run():
        weights = await get_calibration_weights(redis_client=None)
        assert "integrity_weight" in weights
        assert "ai_weight" in weights
        assert "ats_weight" in weights
        assert abs(weights["integrity_weight"] - DEFAULT_WEIGHTS["integrity_weight"]) < 1e-6
    run_async(run())


def test_calibrate_weights_validates_bounds():
    async def run():
        custom = {"integrity_weight": 1.5, "ai_weight": -0.1, "ats_weight": 0.5}
        result = await calibrate_weights(custom, redis_client=None)
        assert result["integrity_weight"] == 1.0   # clamped to 1.0
        assert result["ai_weight"] == 0.0           # clamped to 0.0
        assert result["ats_weight"] == 0.5
    run_async(run())


def test_calibrate_weights_preserves_missing_keys():
    async def run():
        # Only provide one key — rest should default
        custom = {"integrity_weight": 0.60}
        result = await calibrate_weights(custom, redis_client=None)
        assert result["integrity_weight"] == 0.60
        assert result["ai_weight"] == DEFAULT_WEIGHTS["ai_weight"]
        assert result["ats_weight"] == DEFAULT_WEIGHTS["ats_weight"]
    run_async(run())


# =============================================================================
# 2. ATS Penalty Calculator
# =============================================================================

def test_ats_penalty_clean_resume():
    ats = MagicMock()
    ats.overall_score = 82.0
    ats.is_suspicious = False
    ats.fraud_probability = 0.05
    result = _compute_ats_penalty(ats)
    assert result["penalty"] == 0
    assert result["available"] is True
    assert result["ats_score_normalized"] == pytest.approx(0.82)


def test_ats_penalty_suspicious_and_high_fraud():
    ats = MagicMock()
    ats.overall_score = 70.0
    ats.is_suspicious = True
    ats.fraud_probability = 0.80
    result = _compute_ats_penalty(ats)
    assert result["penalty"] == 35   # 15 (suspicious) + 20 (high fraud)
    assert len(result["signals"]) == 2
    assert any(s["signal"] == "ats_suspicious_resume" for s in result["signals"])
    assert any(s["signal"] == "ats_high_fraud_probability" for s in result["signals"])


def test_ats_penalty_none_returns_unavailable():
    result = _compute_ats_penalty(None)
    assert result["available"] is False
    assert result["penalty"] == 0
    assert result["ats_score_normalized"] == 0.0


# =============================================================================
# 3. Simulation Penalty Calculator
# =============================================================================

def test_simulation_penalty_clean():
    sim = MagicMock()
    sim.cheating_risk_level = "LOW"
    sim.ai_dependency_score = 0.10
    result = _compute_simulation_penalty(sim)
    assert result["penalty"] == 0
    assert result["ai_dependency_score"] == pytest.approx(0.10)


def test_simulation_penalty_critical_cheating_and_high_ai():
    sim = MagicMock()
    sim.cheating_risk_level = "CRITICAL"
    sim.ai_dependency_score = 0.80
    result = _compute_simulation_penalty(sim)
    # 30 (critical) + 20 (extreme AI dependency)
    assert result["penalty"] == 50
    assert len(result["signals"]) == 2
    assert any(s["severity"] == "CRITICAL" for s in result["signals"])


def test_simulation_penalty_none_returns_unavailable():
    result = _compute_simulation_penalty(None)
    assert result["available"] is False
    assert result["penalty"] == 0


# =============================================================================
# 4. Interview / Proctoring Penalty Calculator
# =============================================================================

def test_interview_penalty_clean():
    ir = MagicMock()
    ir.phone_detections_count = 0
    ir.multi_face_events = 0
    ir.tab_switches = 0
    ir.copy_pastes = 0
    ir.look_away_count = 2   # under free threshold
    ir.face_absences_count = 1  # under free threshold
    ir.suspicious_keys = 0
    interview = MagicMock()
    interview.cheating_probability_pct = 10
    result = _compute_interview_penalty(interview, ir)
    assert result["penalty"] == 0
    assert result["has_critical"] is False


def test_interview_penalty_phone_and_tab():
    ir = MagicMock()
    ir.phone_detections_count = 1
    ir.multi_face_events = 0
    ir.tab_switches = 3
    ir.copy_pastes = 0
    ir.look_away_count = 0
    ir.face_absences_count = 0
    ir.suspicious_keys = 0
    interview = MagicMock()
    interview.cheating_probability_pct = 30
    result = _compute_interview_penalty(interview, ir)
    assert result["penalty"] == 25 + 15   # phone=25, tab=3×5=15
    assert result["has_critical"] is True


def test_interview_penalty_none_returns_unavailable():
    result = _compute_interview_penalty(None, None)
    assert result["available"] is False


# =============================================================================
# 5. Risk Level and Confidence Level Derivation
# =============================================================================

def test_risk_level_low():
    assert _determine_risk_level(85, False) == "LOW"

def test_risk_level_medium():
    assert _determine_risk_level(72, False) == "MEDIUM"

def test_risk_level_high():
    assert _determine_risk_level(60, False) == "HIGH"

def test_risk_level_critical_by_score():
    assert _determine_risk_level(45, False) == "CRITICAL"

def test_risk_level_critical_by_signal():
    # Even if score is 90, a critical signal overrides
    assert _determine_risk_level(90, True) == "CRITICAL"

def test_confidence_level_all_phases():
    assert _determine_confidence_level(True, True, True) == pytest.approx(1.0)

def test_confidence_level_two_phases():
    c = _determine_confidence_level(True, True, False)
    assert c == pytest.approx(0.66)

def test_confidence_level_no_data():
    assert _determine_confidence_level(False, False, False) == 0.0


# =============================================================================
# 6. IntegrityService.get_integrity_assessment returns None when missing
# =============================================================================

def test_get_integrity_assessment_returns_none_for_missing():
    async def run():
        async with AsyncSessionFactory() as db:
            result = await IntegrityService.get_integrity_assessment(db, uuid.uuid4())
            assert result is None
    run_async(run())


# =============================================================================
# 7. Full Lifecycle: DB → Webhook → Auto Integrity Assessment
# =============================================================================

def test_full_integrity_lifecycle_via_webhook():
    async def run():
        async with AsyncSessionFactory() as db:
            # 1. Setup candidate, company, internship, application
            candidate = User(
                id=uuid.uuid4(),
                email=f"candidate_{uuid.uuid4().hex[:6]}@capvia.com",
                full_name="Alice Chen",
                password_hash="hashed",
                role="STUDENT"
            )
            db.add(candidate)
            await db.flush()

            company = Company(
                id=uuid.uuid4(),
                name=f"TechCorp {uuid.uuid4().hex[:4]}",
                is_verified=True
            )
            db.add(company)
            await db.flush()

            internship = Internship(
                id=uuid.uuid4(),
                company_id=company.id,
                title="Data Engineer Intern",
                required_skills=["Python", "SQL", "Spark"]
            )
            db.add(internship)
            await db.flush()

            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.INTERVIEW_IN_PROGRESS
            )
            db.add(application)
            await db.commit()

            # 2. Insert ATS Result
            ats = ATSResult(
                application_id=application.id,
                overall_score=78.5,
                score_band="GOOD",
                detected_role="Data Engineer",
                matched_skills=["Python", "SQL"],
                missing_skills=["Spark"],
                is_suspicious=False,
                fraud_probability=0.05,
                fraud_flags=[],
                raw_analysis={}
            )
            db.add(ats)
            await db.flush()

            # 3. Insert Simulation Result
            sim = SimulationResult(
                application_id=application.id,
                attempt_id=9999,
                total_score=82.0,
                recommendation="hire",
                cheating_risk_level=RiskLevel.LOW,
                ai_dependency_score=0.12,
                round_scores={},
                submitted_at=datetime.now(timezone.utc)
            )
            db.add(sim)
            await db.flush()

            await db.commit()

            # 4. Trigger interview evaluated webhook (saves InterviewResult + IntegrityResult)
            webhook_data = {
                "application_id": str(application.id),
                "session_id": str(uuid.uuid4()),
                "overall_answer_score_pct": 80,
                "overall_integrity_score": 92,
                "cheating_probability_pct": 5,
                "risk_level": "LOW",
                "recommendation": "Strong Hire",
                "video_url": f"http://storage.capvia.com/{application.id}.webm",
                "baselined_locally": False,
                "strengths": ["Clear communication"],
                "improvements": [],
                "raw_report": {"tier": "Strong"},
                "integrity_details": {
                    "focus_percentage": 95,
                    "look_away_count": 1,
                    "head_stability_pct": 96,
                    "head_movements_count": 0,
                    "face_visibility_pct": 100,
                    "face_absences_count": 0,
                    "multi_face_events": 0,
                    "phone_detections_count": 0,
                    "tab_switches": 1,
                    "copy_pastes": 0,
                    "suspicious_keys": 0,
                    "violations": [{"type": "tab_switch", "severity": "MEDIUM", "message": "Tab switches: 1"}]
                }
            }

            await handle_interview_evaluated_webhook(db, webhook_data)
            await db.commit()

            # 5. Verify IntegrityResult was created and Integrity Engine ran automatically
            integrity = await IntegrityService.get_integrity_assessment(db, application.id)
            assert integrity is not None

            # integrity_score and trust_index should be populated by auto-trigger
            assert integrity.integrity_score is not None
            assert integrity.trust_index is not None
            assert integrity.compiled_risk_level is not None
            assert integrity.confidence_level is not None
            assert integrity.explainability is not None
            assert integrity.audit_trail is not None
            assert len(integrity.audit_trail) >= 1

            # Trust index should reflect clean candidate (low penalties)
            assert integrity.trust_index >= 60

            # Risk level should be LOW or MEDIUM for clean signals + 1 tab switch
            assert integrity.compiled_risk_level in ("LOW", "MEDIUM")

    run_async(run())


# =============================================================================
# 8. Manual Re-Evaluation Accumulates History
# =============================================================================

def test_manual_reevaluation_accumulates_history():
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = User(
                id=uuid.uuid4(),
                email=f"retest_{uuid.uuid4().hex[:6]}@capvia.com",
                full_name="Bob Smith",
                password_hash="hashed",
                role="STUDENT"
            )
            db.add(candidate)
            await db.flush()

            company = Company(
                id=uuid.uuid4(),
                name=f"Corp {uuid.uuid4().hex[:4]}",
                is_verified=True
            )
            db.add(company)
            await db.flush()

            internship = Internship(
                id=uuid.uuid4(),
                company_id=company.id,
                title="Backend Intern",
                required_skills=["Go"]
            )
            db.add(internship)
            await db.flush()

            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.INTERVIEW_IN_PROGRESS
            )
            db.add(application)

            # Minimal integrity_results row
            integrity_row = IntegrityResult(
                application_id=application.id,
                focus_percentage=90,
                look_away_count=0,
                head_stability_pct=95,
                head_movements_count=0,
                face_visibility_pct=100,
                face_absences_count=0,
                multi_face_events=0,
                phone_detections_count=0,
                tab_switches=0,
                copy_pastes=0,
                suspicious_keys=0,
                violations=[]
            )
            db.add(integrity_row)
            await db.commit()

            # Run assessment twice
            await IntegrityService.calculate_integrity_assessment(db, application.id)
            await db.commit()
            await IntegrityService.calculate_integrity_assessment(db, application.id)
            await db.commit()

            # Reload and verify two historical entries
            result = await IntegrityService.get_integrity_assessment(db, application.id)
            assert result is not None
            assert isinstance(result.historical_tracking, list)
            assert len(result.historical_tracking) == 2
            assert isinstance(result.audit_trail, list)
            assert len(result.audit_trail) == 2

    run_async(run())


# =============================================================================
# 9. Explainability JSON structure
# =============================================================================

def test_explainability_structure():
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = User(
                id=uuid.uuid4(),
                email=f"explain_{uuid.uuid4().hex[:6]}@capvia.com",
                full_name="Carol Diaz",
                password_hash="hashed",
                role="STUDENT"
            )
            db.add(candidate)
            await db.flush()

            company = Company(
                id=uuid.uuid4(),
                name=f"Explain Corp {uuid.uuid4().hex[:4]}",
                is_verified=True
            )
            db.add(company)
            await db.flush()

            internship = Internship(
                id=uuid.uuid4(),
                company_id=company.id,
                title="QA Intern",
                required_skills=["Python"]
            )
            db.add(internship)
            await db.flush()

            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(application)

            integrity_row = IntegrityResult(
                application_id=application.id,
                focus_percentage=85,
                look_away_count=4,  # triggers look_away signal
                head_stability_pct=95,
                head_movements_count=0,
                face_visibility_pct=100,
                face_absences_count=0,
                multi_face_events=0,
                phone_detections_count=0,
                tab_switches=2,     # triggers tab switch signal
                copy_pastes=0,
                suspicious_keys=0,
                violations=[]
            )
            db.add(integrity_row)
            await db.commit()

            result = await IntegrityService.calculate_integrity_assessment(db, application.id)
            await db.commit()

            assert result.explainability is not None
            exp = result.explainability
            assert "summary" in exp
            assert "signals" in exp
            assert "phase_breakdown" in exp
            assert "interview" in exp["phase_breakdown"]

            # tab switches and look_away should generate signals
            signal_types = [s["signal"] for s in exp["signals"]]
            assert "interview_tab_switches" in signal_types
            assert "interview_look_away" in signal_types

    run_async(run())
