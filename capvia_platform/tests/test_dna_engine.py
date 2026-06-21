"""
CAPVIA Phase 14 — DNA Engine Tests
=====================================
Tests covering:
  1. All 9 capability dimension calculators (unit tests)
  2. Radar chart data structure validation
  3. Capability vector normalization
  4. Comparative analysis (with and without cohort peers)
  5. Candidate level inference
  6. Full lifecycle: webhook → integrity → auto-DNA generation
  7. Manual DNA generation via DNAService
  8. Historical trend accumulation across multiple runs
  9. Cross-application comparison (DNAService.compare_applications)
  10. DNA retrieval, radar retrieval, history retrieval helpers
"""
import os
import uuid
import asyncio
import math
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db")
os.environ.setdefault("SECRET_KEY", "test_secret_for_dna_engine")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("REDIS_URL", "")

from sqlalchemy import text

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType,
    User, Company, Internship, Application,
    ATSResult, SimulationResult, InterviewResult, IntegrityResult, DNAProfile
)
from capvia_platform.services.dna_service import (
    DNAService, DIMENSION_LABELS,
    _compute_problem_solving, _compute_execution, _compute_communication,
    _compute_learning_ability, _compute_adaptability, _compute_consistency,
    _compute_confidence, _compute_role_fit, _compute_leadership_potential,
    _build_radar_chart_data, _build_capability_vectors,
    _infer_candidate_level, _safe_float, _clamp,
)
from capvia_platform.webhooks.interview_webhooks import handle_interview_evaluated_webhook


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


# ============================================================
# Helper: build a complete application with all results
# ============================================================

async def _build_full_application(db) -> Application:
    candidate = User(
        id=uuid.uuid4(),
        email=f"dna_{uuid.uuid4().hex[:6]}@capvia.com",
        full_name="DNA Candidate",
        password_hash="hashed",
        role="STUDENT"
    )
    db.add(candidate)
    await db.flush()

    company = Company(id=uuid.uuid4(), name=f"DNA Corp {uuid.uuid4().hex[:4]}", is_verified=True)
    db.add(company)
    await db.flush()

    internship = Internship(
        id=uuid.uuid4(),
        company_id=company.id,
        title="ML Engineer Intern",
        required_skills=["Python", "TensorFlow", "SQL"]
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
    await db.flush()

    # ATS Result
    ats = ATSResult(
        application_id=application.id,
        overall_score=82.0,
        score_band="GOOD",
        detected_role="ML Engineer",
        matched_skills=["Python", "TensorFlow"],
        missing_skills=["SQL"],
        is_suspicious=False,
        fraud_probability=0.04,
        fraud_flags=[],
        raw_analysis={}
    )
    db.add(ats)

    # Simulation Result
    sim = SimulationResult(
        application_id=application.id,
        attempt_id=int(uuid.uuid4().int % 1000000),
        total_score=78.5,
        recommendation="hire",
        cheating_risk_level=RiskLevel.LOW,
        ai_dependency_score=0.15,
        round_scores={"round_1": 80.0, "round_2": 75.0, "round_3": 80.0},
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(sim)

    await db.commit()
    return application


# ============================================================
# 1. Utility helpers
# ============================================================

def test_safe_float_with_none():
    assert _safe_float(None) == 0.0
    assert _safe_float(None, default=50.0) == 50.0

def test_safe_float_with_values():
    assert _safe_float(75.3) == pytest.approx(75.3)
    assert _safe_float("42") == pytest.approx(42.0)

def test_clamp():
    assert _clamp(105.0) == 100
    assert _clamp(-5.0) == 0
    assert _clamp(72.7) == 73
    assert _clamp(50.0) == 50


# ============================================================
# 2. Capability Dimension Calculators (unit)
# ============================================================

def test_problem_solving_both_sources():
    sim = MagicMock(); sim.total_score = 80.0
    iv = MagicMock(); iv.overall_answer_score_pct = 70.0
    r = _compute_problem_solving(sim, iv)
    assert r["score"] == pytest.approx(int(80*0.6 + 70*0.4))
    assert "simulation" in r["sources"] and "interview" in r["sources"]

def test_problem_solving_sim_only():
    sim = MagicMock(); sim.total_score = 90.0
    r = _compute_problem_solving(sim, None)
    assert r["score"] == 90
    assert r["sources"] == ["simulation_only"]

def test_problem_solving_no_data():
    r = _compute_problem_solving(None, None)
    assert r["score"] == 0
    assert "no_data" in r["sources"]

def test_execution_all_sources():
    sim = MagicMock(); sim.total_score = 75.0
    dna = MagicMock(); dna.practical_exposure = 70.0; dna.internship_readiness = 65.0
    r = _compute_execution(sim, dna)
    expected = _clamp(75*0.5 + 70*0.3 + 65*0.2)
    assert r["score"] == expected

def test_communication_all_sources():
    iv = MagicMock(); iv.overall_answer_score_pct = 85.0
    dna = MagicMock(); dna.readability = 80.0; dna.clarity = 75.0
    r = _compute_communication(iv, dna)
    expected = _clamp(85*0.5 + 80*0.25 + 75*0.25)
    assert r["score"] == expected

def test_learning_ability_good_gap():
    ats = MagicMock()
    ats.matched_skills = ["Python", "TensorFlow", "SQL"]
    ats.missing_skills = []
    dna = MagicMock(); dna.technical_depth = 80.0
    r = _compute_learning_ability(ats, dna)
    assert r["score"] >= 80  # 100% match

def test_learning_ability_poor_gap():
    ats = MagicMock()
    ats.matched_skills = ["Python"]
    ats.missing_skills = ["TensorFlow", "SQL", "Go", "Rust"]
    dna = MagicMock(); dna.technical_depth = 20.0
    r = _compute_learning_ability(ats, dna)
    assert r["score"] < 50

def test_adaptability_low_variance():
    sim = MagicMock()
    sim.total_score = 80.0
    sim.round_scores = {"r1": 80.0, "r2": 79.0, "r3": 81.0}  # very low variance
    iv = MagicMock()
    iv.improvements = ["Speak slower"]
    iv.strengths = ["Clear thinking", "Concise"]
    r = _compute_adaptability(sim, iv)
    assert r["score"] >= 50  # stable + improvement signals

def test_consistency_clean():
    ir = MagicMock()
    ir.trust_index = 90
    ir.violations = []
    r = _compute_consistency(ir)
    assert r["score"] >= 85  # high trust + no violations

def test_consistency_violations():
    ir = MagicMock()
    ir.trust_index = 60
    ir.violations = [{"type": "tab"}, {"type": "phone"}, {"type": "copy"}]
    r = _compute_consistency(ir)
    assert r["score"] < 70

def test_confidence_low_risk():
    iv = MagicMock()
    iv.risk_level = "LOW"
    iv.cheating_probability_pct = 5
    ir = MagicMock(); ir.face_visibility_pct = 98
    r = _compute_confidence(iv, ir)
    assert r["score"] >= 75

def test_confidence_critical_risk():
    iv = MagicMock()
    iv.risk_level = "CRITICAL"
    iv.cheating_probability_pct = 80
    ir = MagicMock(); ir.face_visibility_pct = 50
    r = _compute_confidence(iv, ir)
    assert r["score"] < 50

def test_role_fit_all_sources():
    ats = MagicMock(); ats.overall_score = 82.0
    dna = MagicMock(); dna.domain_alignment = 85.0; dna.technical_alignment = 78.0
    r = _compute_role_fit(ats, dna)
    expected = _clamp(82*0.4 + 85*0.3 + 78*0.3)
    assert r["score"] == expected

def test_leadership_strong_hire():
    dna = MagicMock(); dna.experience_alignment = 75.0; dna.hiring_readiness_score = 80.0
    iv = MagicMock(); iv.recommendation = "Strong Hire"  # plain string (value of enum)
    r = _compute_leadership_potential(None, dna, iv)
    assert r["score"] >= 70

def test_leadership_not_recommended():
    dna = MagicMock(); dna.experience_alignment = 40.0; dna.hiring_readiness_score = 35.0
    iv = MagicMock(); iv.recommendation = "Not Recommended"  # plain string
    r = _compute_leadership_potential(None, dna, iv)
    assert r["score"] < 50


# ============================================================
# 3. Radar Chart Data Structure
# ============================================================

def test_radar_chart_structure():
    dims = {d: 75 for d in DIMENSION_LABELS}
    radar = _build_radar_chart_data(dims)
    assert radar["type"] == "radar"
    assert len(radar["labels"]) == 9
    assert len(radar["datasets"]) == 1
    assert len(radar["datasets"][0]["data"]) == 9
    assert all(v == 75 for v in radar["datasets"][0]["data"])

def test_radar_chart_label_count():
    dims = {d: i * 10 for i, d in enumerate(DIMENSION_LABELS)}
    radar = _build_radar_chart_data(dims)
    assert len(radar["labels"]) == len(DIMENSION_LABELS) == 9


# ============================================================
# 4. Capability Vectors
# ============================================================

def test_capability_vectors_unit_normalization():
    dims = {d: 60 for d in DIMENSION_LABELS}
    vectors = _build_capability_vectors(dims)
    # unit vector magnitude should be ≈ 1.0
    unit = vectors["unit_vector"]
    mag = math.sqrt(sum(v**2 for v in unit))
    assert abs(mag - 1.0) < 1e-4

def test_capability_vectors_categories():
    dims = {d: 90 if i < 3 else 20 for i, d in enumerate(DIMENSION_LABELS)}
    vectors = _build_capability_vectors(dims)
    cats = vectors["dimension_categories"]
    elite_dims = [d for d in DIMENSION_LABELS[:3] if cats[d]["category"] == "ELITE"]
    needs_devs = [d for d in DIMENSION_LABELS[3:] if cats[d]["category"] in ("NEEDS_DEVELOPMENT", "EMERGING")]
    assert len(elite_dims) == 3
    assert len(needs_devs) > 0


# ============================================================
# 5. Candidate Level Inference
# ============================================================

def test_candidate_level_elite():
    dims = {d: 85 for d in DIMENSION_LABELS}
    assert _infer_candidate_level(dims) == "ELITE"

def test_candidate_level_strong():
    dims = {d: 67 for d in DIMENSION_LABELS}
    assert _infer_candidate_level(dims) == "STRONG"

def test_candidate_level_developing():
    dims = {d: 55 for d in DIMENSION_LABELS}
    assert _infer_candidate_level(dims) == "DEVELOPING"

def test_candidate_level_entry():
    dims = {d: 20 for d in DIMENSION_LABELS}
    assert _infer_candidate_level(dims) == "ENTRY"


# ============================================================
# 6. DNAService: get returns None for missing application
# ============================================================

def test_get_dna_returns_none_for_missing():
    async def run():
        async with AsyncSessionFactory() as db:
            result = await DNAService.get_dna_profile(db, uuid.uuid4())
            assert result is None
    run_async(run())


# ============================================================
# 7. Manual DNA generation with minimal data (integrity row only)
# ============================================================

def test_dna_generation_with_minimal_data():
    async def run():
        async with AsyncSessionFactory() as db:
            app = await _build_full_application(db)

            # Create minimal integrity row (no interview yet)
            ir = IntegrityResult(
                application_id=app.id,
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
                violations=[],
                trust_index=85,
                compiled_risk_level="LOW",
                confidence_level=0.67
            )
            db.add(ir)
            await db.commit()

            dna = await DNAService.generate_dna_profile(db, app.id)
            await db.commit()

            assert dna is not None
            # All 9 dimensions should be populated
            for dim in DIMENSION_LABELS:
                assert getattr(dna, dim, None) is not None, f"Dimension {dim} is None"
            # Radar chart should exist
            assert dna.radar_chart_data is not None
            assert dna.radar_chart_data["type"] == "radar"
            # Vectors should exist
            assert dna.capability_vectors is not None
            assert "unit_vector" in dna.capability_vectors
            # Historical trends
            assert dna.historical_trends is not None
            assert len(dna.historical_trends) == 1

    run_async(run())


# ============================================================
# 8. Full lifecycle via webhook → integrity → auto-DNA
# ============================================================

def test_full_dna_lifecycle_via_webhook():
    async def run():
        async with AsyncSessionFactory() as db:
            app = await _build_full_application(db)

            webhook_data = {
                "application_id": str(app.id),
                "session_id": str(uuid.uuid4()),
                "overall_answer_score_pct": 82,
                "overall_integrity_score": 90,
                "cheating_probability_pct": 8,
                "risk_level": "LOW",
                "recommendation": "Strong Hire",
                "video_url": f"http://storage.capvia.com/{app.id}.webm",
                "baselined_locally": False,
                "strengths": ["Problem decomposition", "Structured thinking", "Confidence"],
                "improvements": ["Improve speed"],
                "raw_report": {"tier": "Strong"},
                "integrity_details": {
                    "focus_percentage": 95,
                    "look_away_count": 1,
                    "head_stability_pct": 96,
                    "head_movements_count": 0,
                    "face_visibility_pct": 98,
                    "face_absences_count": 0,
                    "multi_face_events": 0,
                    "phone_detections_count": 0,
                    "tab_switches": 0,
                    "copy_pastes": 0,
                    "suspicious_keys": 0,
                    "violations": []
                }
            }

            await handle_interview_evaluated_webhook(db, webhook_data)
            await db.commit()

            # Verify DNA was generated automatically via chain:
            # webhook → integrity_service → dna_service
            dna = await DNAService.get_dna_profile(db, app.id)
            assert dna is not None, "DNA profile should exist after full lifecycle"

            for dim in DIMENSION_LABELS:
                val = getattr(dna, dim, None)
                assert val is not None, f"Dimension {dim} is None"
                assert 0 <= val <= 100, f"Dimension {dim} value {val} out of bounds"

            # Strong candidate with good data → expect decent scores
            assert dna.problem_solving >= 40
            assert dna.communication >= 40
            assert dna.candidate_level in ("ENTRY", "EMERGING", "DEVELOPING", "STRONG", "ELITE")

    run_async(run())


# ============================================================
# 9. Historical trends accumulate across multiple runs
# ============================================================

def test_dna_history_accumulates():
    async def run():
        async with AsyncSessionFactory() as db:
            app = await _build_full_application(db)

            ir = IntegrityResult(
                application_id=app.id,
                focus_percentage=90, look_away_count=0, head_stability_pct=95,
                head_movements_count=0, face_visibility_pct=100, face_absences_count=0,
                multi_face_events=0, phone_detections_count=0, tab_switches=0,
                copy_pastes=0, suspicious_keys=0, violations=[],
                trust_index=80, compiled_risk_level="LOW", confidence_level=0.67
            )
            db.add(ir)
            await db.commit()

            # Run DNA 3 times
            await DNAService.generate_dna_profile(db, app.id)
            await db.commit()
            await DNAService.generate_dna_profile(db, app.id)
            await db.commit()
            await DNAService.generate_dna_profile(db, app.id)
            await db.commit()

            dna = await DNAService.get_dna_profile(db, app.id)
            assert dna is not None
            assert isinstance(dna.historical_trends, list)
            assert len(dna.historical_trends) == 3

            # Each entry should have dimensions dict
            for entry in dna.historical_trends:
                assert "computed_at" in entry
                assert "dimensions" in entry
                assert len(entry["dimensions"]) == 9

    run_async(run())


# ============================================================
# 10. Compare Applications
# ============================================================

def test_compare_applications_ranking():
    async def run():
        async with AsyncSessionFactory() as db:
            # Create 2 applications with different scores
            candidate1 = User(id=uuid.uuid4(), email=f"comp1_{uuid.uuid4().hex[:4]}@capvia.com",
                              full_name="Candidate Alpha", password_hash="hashed", role="STUDENT")
            candidate2 = User(id=uuid.uuid4(), email=f"comp2_{uuid.uuid4().hex[:4]}@capvia.com",
                              full_name="Candidate Beta", password_hash="hashed", role="STUDENT")
            db.add_all([candidate1, candidate2])
            await db.flush()

            company = Company(id=uuid.uuid4(), name=f"Corp {uuid.uuid4().hex[:4]}", is_verified=True)
            db.add(company)
            await db.flush()

            internship = Internship(id=uuid.uuid4(), company_id=company.id,
                                    title="Backend Intern", required_skills=["Python"])
            db.add(internship)
            await db.flush()

            app1 = Application(id=uuid.uuid4(), candidate_id=candidate1.id,
                               vacancy_id=internship.id, status=ApplicationStatus.EVALUATED)
            app2 = Application(id=uuid.uuid4(), candidate_id=candidate2.id,
                               vacancy_id=internship.id, status=ApplicationStatus.EVALUATED)
            db.add_all([app1, app2])

            # DNA profiles with contrasting scores
            dna1 = DNAProfile(
                application_id=app1.id,
                technical_alignment=80, project_alignment=0, experience_alignment=70,
                domain_alignment=78, semantic_match_strength=0, readability=75, clarity=72,
                ats_compatibility=0, technical_depth=80, practical_exposure=70,
                internship_readiness=75, hiring_readiness_score=78, capability_score=75,
                candidate_level="STRONG",
                problem_solving=80, execution=75, communication=78, learning_ability=72,
                adaptability=70, consistency=85, confidence=80, role_fit=78,
                leadership_potential=75
            )
            dna2 = DNAProfile(
                application_id=app2.id,
                technical_alignment=55, project_alignment=0, experience_alignment=50,
                domain_alignment=52, semantic_match_strength=0, readability=60, clarity=58,
                ats_compatibility=0, technical_depth=55, practical_exposure=50,
                internship_readiness=55, hiring_readiness_score=52, capability_score=55,
                candidate_level="DEVELOPING",
                problem_solving=55, execution=50, communication=58, learning_ability=52,
                adaptability=50, consistency=60, confidence=55, role_fit=52,
                leadership_potential=50
            )
            db.add_all([dna1, dna2])
            await db.commit()

            comparison = await DNAService.compare_applications(db, [app1.id, app2.id])

            assert comparison["comparison_count"] == 2
            ranked = comparison["ranked_results"]
            assert len(ranked) == 2
            # Alpha (higher scores) should be rank 1
            assert ranked[0]["rank"] == 1
            assert ranked[0]["overall_average"] > ranked[1]["overall_average"]

    run_async(run())


# ============================================================
# 11. get_radar_chart_data and get_historical_trends helpers
# ============================================================

def test_get_radar_chart_returns_none_for_missing():
    async def run():
        async with AsyncSessionFactory() as db:
            result = await DNAService.get_radar_chart_data(db, uuid.uuid4())
            assert result is None
    run_async(run())

def test_get_historical_trends_empty_for_missing():
    async def run():
        async with AsyncSessionFactory() as db:
            result = await DNAService.get_historical_trends(db, uuid.uuid4())
            assert result == []
    run_async(run())


# ============================================================
# 12. Comparative analysis with no peers
# ============================================================

def test_dna_comparative_no_peers():
    async def run():
        async with AsyncSessionFactory() as db:
            app = await _build_full_application(db)

            ir = IntegrityResult(
                application_id=app.id,
                focus_percentage=90, look_away_count=0, head_stability_pct=95,
                head_movements_count=0, face_visibility_pct=100, face_absences_count=0,
                multi_face_events=0, phone_detections_count=0, tab_switches=0,
                copy_pastes=0, suspicious_keys=0, violations=[],
                trust_index=88, compiled_risk_level="LOW", confidence_level=0.67
            )
            db.add(ir)
            await db.commit()

            dna = await DNAService.generate_dna_profile(db, app.id)
            await db.commit()

            assert dna is not None
            comp = dna.comparative_analysis
            assert comp is not None
            assert comp["peer_count"] == 0
            assert "No cohort data" in comp["message"]

    run_async(run())
