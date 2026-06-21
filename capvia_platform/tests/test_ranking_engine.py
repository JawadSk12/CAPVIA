"""
CAPVIA Phase 15 — Ranking Engine Tests
=========================================
Tests covering:
  1. Score extractor unit tests (ATS, Simulation, Interview, Integrity)
  2. Weighted final_score formula correctness
  3. Component renormalisation when phases are missing
  4. Tier inference (PLATINUM / GOLD / SILVER / BRONZE / UNRANKED)
  5. Data completeness calculation
  6. Ordinal rank computation (with ties)
  7. Percentile computation
  8. Top-candidate flag logic
  9. Explainability JSON structure
  10. Score breakdown JSON structure
  11. Ranking analytics cohort statistics
  12. Full single-application ranking lifecycle (DB integration)
  13. Ranking persists and updates on re-compute
  14. Audit trail append-only accumulation
  15. Internship leaderboard (multi-candidate ordering)
  16. Company rank computation (cross-internship)
  17. Internship analytics (tier distribution, top candidates)
  18. Compare rankings (side-by-side)
  19. Full trigger chain: webhook → integrity → DNA → ranking
  20. Edge cases: no-data application, single candidate cohort
"""
import os
import uuid
import asyncio
import math
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db")
os.environ.setdefault("SECRET_KEY", "test_secret_for_ranking_engine")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("REDIS_URL", "")

from sqlalchemy import text

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType,
    User, Company, Internship, Application,
    ATSResult, SimulationResult, InterviewResult, IntegrityResult,
    DNAProfile, Ranking,
)
from capvia_platform.services.ranking_service import (
    RankingService, WEIGHTS,
    _safe, _clamp, _round2,
    _extract_ats_score, _extract_simulation_score,
    _extract_interview_score, _extract_integrity_score,
    _compute_final_score, _infer_tier, _compute_data_completeness,
    _compute_ordinal_rank, _compute_percentile, _compute_top10_threshold,
    _build_explainability, _build_score_breakdown, _build_ranking_analytics,
    _format_ranking_row,
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
                "vacancy_mappings, application_mappings, ats_results, dna_profiles, rankings, "
                "simulation_results, notifications, company_members, companies, "
                "interview_results, integrity_results CASCADE;"
            ))
            await session.commit()
    run_async(run_clean())
    yield


# ============================================================
# DB Fixtures
# ============================================================

async def _create_user(db, suffix: str = "") -> User:
    u = User(
        id=uuid.uuid4(),
        email=f"rank_{suffix}_{uuid.uuid4().hex[:6]}@capvia.com",
        full_name=f"Rank Candidate {suffix}",
        password_hash="hashed",
        role="STUDENT",
    )
    db.add(u)
    await db.flush()
    return u


async def _create_company(db) -> Company:
    c = Company(id=uuid.uuid4(), name=f"RankCorp {uuid.uuid4().hex[:4]}", is_verified=True)
    db.add(c)
    await db.flush()
    return c


async def _create_internship(db, company_id: uuid.UUID) -> Internship:
    i = Internship(
        id=uuid.uuid4(),
        company_id=company_id,
        title="Ranking Test Intern",
        required_skills=["Python"],
    )
    db.add(i)
    await db.flush()
    return i


async def _create_application(db, candidate_id: uuid.UUID, internship_id: uuid.UUID) -> Application:
    app = Application(
        id=uuid.uuid4(),
        candidate_id=candidate_id,
        vacancy_id=internship_id,
        status=ApplicationStatus.EVALUATED,
    )
    db.add(app)
    await db.flush()
    return app


async def _attach_results(
    db, app: Application,
    ats_score: float = 80.0,
    sim_score: float = 75.0,
    iv_answer: int = 78,
    iv_integrity: int = 88,
    trust_index: int = 82,
) -> None:
    ats = ATSResult(
        application_id=app.id,
        overall_score=ats_score,
        score_band="GOOD",
        matched_skills=["Python"],
        missing_skills=[],
        is_suspicious=False,
        fraud_probability=0.02,
        fraud_flags=[],
        raw_analysis={},
    )
    sim = SimulationResult(
        application_id=app.id,
        attempt_id=int(uuid.uuid4().int % 10_000_000),
        total_score=sim_score,
        recommendation="hire",
        cheating_risk_level=RiskLevel.LOW,
        ai_dependency_score=0.10,
        round_scores={"r1": sim_score},
        submitted_at=datetime.now(timezone.utc),
    )
    iv = InterviewResult(
        application_id=app.id,
        session_id=uuid.uuid4(),
        overall_answer_score_pct=iv_answer,
        overall_integrity_score=iv_integrity,
        cheating_probability_pct=5,
        risk_level=RiskLevel.LOW,
        recommendation=RecommendationType.STRONG_HIRE,
        video_url=f"http://storage/videos/{app.id}.webm",
        strengths=["clarity"],
        improvements=[],
        raw_report={},
    )
    ir = IntegrityResult(
        application_id=app.id,
        focus_percentage=95,
        look_away_count=0,
        head_stability_pct=98,
        head_movements_count=0,
        face_visibility_pct=98,
        face_absences_count=0,
        multi_face_events=0,
        phone_detections_count=0,
        tab_switches=0,
        copy_pastes=0,
        suspicious_keys=0,
        violations=[],
        trust_index=trust_index,
        compiled_risk_level="LOW",
        confidence_level=1.00,
    )
    db.add_all([ats, sim, iv, ir])
    await db.flush()


async def _build_ranked_app(
    db, company: Company, internship: Internship,
    ats_score: float = 80.0, sim_score: float = 75.0,
    iv_answer: int = 78, trust_index: int = 82,
) -> Application:
    user = await _create_user(db)
    app = await _create_application(db, user.id, internship.id)
    await _attach_results(db, app, ats_score=ats_score, sim_score=sim_score,
                          iv_answer=iv_answer, trust_index=trust_index)
    await db.commit()
    return app


# ============================================================
# 1. Score extractor unit tests
# ============================================================

def test_extract_ats_score_normal():
    ats = MagicMock()
    ats.overall_score = 78.5
    assert _extract_ats_score(ats) == pytest.approx(78.5)


def test_extract_ats_score_clamped():
    ats = MagicMock()
    ats.overall_score = 110.0
    assert _extract_ats_score(ats) == 100.0


def test_extract_ats_score_none():
    assert _extract_ats_score(None) is None


def test_extract_simulation_score():
    sim = MagicMock()
    sim.total_score = 65.3
    assert _extract_simulation_score(sim) == pytest.approx(65.3)


def test_extract_simulation_score_none():
    assert _extract_simulation_score(None) is None


def test_extract_interview_score_combined():
    iv = MagicMock()
    iv.overall_answer_score_pct = 80
    iv.overall_integrity_score = 90
    expected = _clamp(80 * 0.80 + 90 * 0.20)
    assert _extract_interview_score(iv) == pytest.approx(expected)


def test_extract_interview_score_none():
    assert _extract_interview_score(None) is None


def test_extract_integrity_score_from_trust_index():
    ir = MagicMock()
    ir.trust_index = 75
    assert _extract_integrity_score(ir) == pytest.approx(75.0)


def test_extract_integrity_score_none_when_trust_index_missing():
    ir = MagicMock()
    ir.trust_index = None
    assert _extract_integrity_score(ir) is None


def test_extract_integrity_score_none_when_result_missing():
    assert _extract_integrity_score(None) is None


# ============================================================
# 2. Weighted final_score formula
# ============================================================

def test_final_score_all_phases():
    ats_raw, sim_raw, iv_raw, integ_raw = 80.0, 70.0, 75.0, 85.0
    expected = (80 * 0.25 + 70 * 0.30 + 75 * 0.25 + 85 * 0.20)
    score, components, raw = _compute_final_score(ats_raw, sim_raw, iv_raw, integ_raw)
    assert score == pytest.approx(expected, abs=0.1)
    assert abs(sum(components.values()) - score) < 0.1


def test_weights_sum_to_one():
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


def test_final_score_clamped_to_100():
    score, _, _ = _compute_final_score(100.0, 100.0, 100.0, 100.0)
    assert score <= 100.0


def test_final_score_zero_when_no_data():
    score, components, _ = _compute_final_score(None, None, None, None)
    assert score == 0.0
    assert all(v == 0.0 for v in components.values())


# ============================================================
# 3. Weight renormalisation when phases are missing
# ============================================================

def test_renormalise_with_ats_only():
    score, components, _ = _compute_final_score(80.0, None, None, None)
    # Only ATS present — renormalised weight = 1.0 → full contribution
    assert score == pytest.approx(80.0, abs=0.1)
    assert components["simulation"] == 0.0
    assert components["interview"] == 0.0
    assert components["integrity"] == 0.0


def test_renormalise_with_ats_and_sim():
    ats_w = WEIGHTS["ats"]
    sim_w = WEIGHTS["simulation"]
    total = ats_w + sim_w
    expected = (80.0 * ats_w / total + 70.0 * sim_w / total)
    score, _, _ = _compute_final_score(80.0, 70.0, None, None)
    assert score == pytest.approx(expected, abs=0.1)


def test_renormalise_three_phases():
    ats_w = WEIGHTS["ats"]
    sim_w = WEIGHTS["simulation"]
    iv_w  = WEIGHTS["interview"]
    total = ats_w + sim_w + iv_w
    expected = (80 * ats_w + 70 * sim_w + 75 * iv_w) / total
    score, _, _ = _compute_final_score(80.0, 70.0, 75.0, None)
    assert score == pytest.approx(expected, abs=0.1)


# ============================================================
# 4. Tier inference
# ============================================================

def test_tier_platinum():
    assert _infer_tier(90.0) == "PLATINUM"
    assert _infer_tier(85.0) == "PLATINUM"


def test_tier_gold():
    assert _infer_tier(80.0) == "GOLD"
    assert _infer_tier(70.0) == "GOLD"


def test_tier_silver():
    assert _infer_tier(68.0) == "SILVER"
    assert _infer_tier(55.0) == "SILVER"


def test_tier_bronze():
    assert _infer_tier(50.0) == "BRONZE"
    assert _infer_tier(40.0) == "BRONZE"


def test_tier_unranked():
    assert _infer_tier(39.9) == "UNRANKED"
    assert _infer_tier(0.0) == "UNRANKED"


# ============================================================
# 5. Data completeness
# ============================================================

def test_data_completeness_all_present():
    ats = MagicMock()
    sim = MagicMock()
    iv  = MagicMock()
    ir  = MagicMock(); ir.trust_index = 80
    completeness = _compute_data_completeness(ats, sim, iv, ir)
    assert completeness == pytest.approx(1.0, abs=0.01)


def test_data_completeness_partial():
    ats = MagicMock()
    sim = MagicMock()
    completeness = _compute_data_completeness(ats, sim, None, None)
    expected = WEIGHTS["ats"] + WEIGHTS["simulation"]
    assert completeness == pytest.approx(expected, abs=0.01)


def test_data_completeness_none():
    completeness = _compute_data_completeness(None, None, None, None)
    assert completeness == pytest.approx(0.0, abs=0.01)


# ============================================================
# 6. Ordinal rank computation
# ============================================================

def test_ordinal_rank_basic():
    scores = [90.0, 75.0, 60.0, 45.0]
    assert _compute_ordinal_rank(scores, 90.0) == 1
    assert _compute_ordinal_rank(scores, 75.0) == 2
    assert _compute_ordinal_rank(scores, 45.0) == 4


def test_ordinal_rank_with_ties():
    scores = [90.0, 75.0, 75.0, 60.0]
    # Both 75.0 candidates get rank 2
    assert _compute_ordinal_rank(scores, 75.0) == 2


def test_ordinal_rank_single_candidate():
    assert _compute_ordinal_rank([70.0], 70.0) == 1


# ============================================================
# 7. Percentile computation
# ============================================================

def test_percentile_top_scorer():
    scores = [90.0, 75.0, 60.0, 45.0]
    # 90 is above all others → percentile ≈ 87.5
    pct = _compute_percentile(scores, 90.0)
    assert pct > 75.0


def test_percentile_bottom_scorer():
    scores = [90.0, 75.0, 60.0, 45.0]
    pct = _compute_percentile(scores, 45.0)
    assert pct < 25.0


def test_percentile_empty_cohort():
    pct = _compute_percentile([], 70.0)
    assert pct == 100.0


# ============================================================
# 8. Top-candidate flag
# ============================================================

def test_top10_threshold_basic():
    scores = [95.0, 85.0, 75.0, 65.0, 55.0, 45.0, 35.0, 25.0, 15.0, 5.0]
    threshold = _compute_top10_threshold(scores)
    assert threshold >= 85.0  # Top 10% of 10 = rank 1


def test_top10_threshold_empty():
    assert _compute_top10_threshold([]) == 0.0


# ============================================================
# 9. Explainability JSON structure
# ============================================================

def test_explainability_structure():
    score, components, raw = _compute_final_score(80.0, 75.0, 70.0, 82.0)
    exp = _build_explainability(score, components, raw,
                                80.0, 75.0, 70.0, 82.0,
                                "GOLD", 1.0)
    assert "summary" in exp
    assert "tier" in exp
    assert "phase_contributions" in exp
    assert "formula" in exp
    assert "strengths" in exp
    assert "risk_signals" in exp
    assert "absent_phases" in exp
    assert exp["tier"] == "GOLD"
    assert exp["final_score"] == score


def test_explainability_missing_phase_flags_risk():
    score, components, raw = _compute_final_score(80.0, None, 70.0, None)
    exp = _build_explainability(score, components, raw,
                                80.0, None, 70.0, None,
                                _infer_tier(score), 0.55)
    assert len(exp["absent_phases"]) == 2
    assert any("Missing data" in r for r in exp["risk_signals"])


def test_explainability_low_completeness_warns():
    score, components, raw = _compute_final_score(80.0, None, None, None)
    exp = _build_explainability(score, components, raw,
                                80.0, None, None, None,
                                _infer_tier(score), 0.25)
    assert any("provisional" in r.lower() for r in exp["risk_signals"])


# ============================================================
# 10. Score breakdown JSON structure
# ============================================================

def test_score_breakdown_structure():
    score, components, raw = _compute_final_score(80.0, 70.0, 75.0, 85.0)
    bd = _build_score_breakdown(80.0, 70.0, 75.0, 85.0, components, score)
    assert "final_score" in bd
    assert "weights" in bd
    assert "components" in bd
    for phase in ("ats", "simulation", "interview", "integrity"):
        assert phase in bd["components"]
        assert "raw_score" in bd["components"][phase]
        assert "contribution" in bd["components"][phase]
        assert "weight" in bd["components"][phase]


# ============================================================
# 11. Ranking analytics cohort statistics
# ============================================================

def test_ranking_analytics_structure():
    scores = [90.0, 80.0, 70.0, 60.0, 50.0]
    top_threshold = _compute_top10_threshold(scores)
    analytics = _build_ranking_analytics(scores, 80.0, 2, 5, top_threshold)
    assert analytics["cohort_size"] == 5
    assert "cohort_mean" in analytics
    assert "cohort_median" in analytics
    assert "cohort_std_dev" in analytics
    assert "score_distribution" in analytics
    dist = analytics["score_distribution"]
    assert "platinum_count" in dist
    assert "gold_count" in dist


def test_ranking_analytics_empty_cohort():
    analytics = _build_ranking_analytics([], 70.0, 1, 0, 0.0)
    assert analytics["cohort_size"] == 0


# ============================================================
# 12. Full single-application ranking lifecycle
# ============================================================

def test_compute_ranking_single_application():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)
            app = await _build_ranked_app(db, company, internship)

            ranking = await RankingService.compute_ranking(db, app.id)
            await db.commit()

            assert ranking is not None
            assert ranking.final_score is not None
            assert 0 <= float(ranking.final_score) <= 100
            assert ranking.internship_rank == 1   # only candidate
            assert ranking.company_rank == 1
            assert ranking.global_percentile is not None
            assert ranking.recommendation_tier in ("PLATINUM", "GOLD", "SILVER", "BRONZE", "UNRANKED")
            assert isinstance(ranking.is_top_candidate, bool)
            assert ranking.explainability is not None
            assert ranking.score_breakdown is not None
            assert ranking.ranking_analytics is not None
            assert ranking.audit_trail is not None
            assert len(ranking.audit_trail) == 1

    run_async(run())


# ============================================================
# 13. Ranking persists and updates on re-compute
# ============================================================

def test_ranking_updates_on_recompute():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)
            app = await _build_ranked_app(db, company, internship)

            r1 = await RankingService.compute_ranking(db, app.id)
            await db.commit()

            r2 = await RankingService.compute_ranking(db, app.id)
            await db.commit()

            # Should be the SAME row — not a duplicate
            r = await RankingService.get_ranking(db, app.id)
            assert r is not None
            assert r.id == r1.id == r2.id
            # Audit trail should have 2 entries
            assert len(r.audit_trail) == 2

    run_async(run())


# ============================================================
# 14. Audit trail is append-only
# ============================================================

def test_audit_trail_append_only():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)
            app = await _build_ranked_app(db, company, internship)

            for _ in range(3):
                await RankingService.compute_ranking(db, app.id)
                await db.commit()

            r = await RankingService.get_ranking(db, app.id)
            assert r is not None
            assert len(r.audit_trail) == 3
            for entry in r.audit_trail:
                assert "computed_at" in entry
                assert "final_score" in entry
                assert "internship_rank" in entry
                assert entry["action"] == "RANKING_COMPUTED"

    run_async(run())


# ============================================================
# 15. Internship leaderboard ordering
# ============================================================

def test_internship_leaderboard_ordering():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)

            # Create 3 candidates with varying scores
            app_high = await _build_ranked_app(db, company, internship,
                                               ats_score=95.0, sim_score=92.0, iv_answer=90, trust_index=95)
            app_mid  = await _build_ranked_app(db, company, internship,
                                               ats_score=70.0, sim_score=68.0, iv_answer=65, trust_index=72)
            app_low  = await _build_ranked_app(db, company, internship,
                                               ats_score=45.0, sim_score=40.0, iv_answer=42, trust_index=50)

            for app in [app_high, app_mid, app_low]:
                await RankingService.compute_ranking(db, app.id)
            await db.commit()

            leaderboard = await RankingService.get_internship_leaderboard(db, internship.id)

            assert len(leaderboard) == 3
            # Should be ordered: high → mid → low
            scores = [r["final_score"] for r in leaderboard]
            assert scores == sorted(scores, reverse=True)
            # Ranks should be sequential
            ranks = [r["internship_rank"] for r in leaderboard]
            assert ranks[0] <= ranks[1] <= ranks[2]

    run_async(run())


# ============================================================
# 16. Company rank (cross-internship)
# ============================================================

def test_company_rank_cross_internship():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship1 = await _create_internship(db, company.id)
            internship2 = await _create_internship(db, company.id)

            # Top performer in internship1
            app_top = await _build_ranked_app(db, company, internship1,
                                              ats_score=95.0, sim_score=92.0, iv_answer=90, trust_index=95)
            # Lower performer in internship2
            app_low = await _build_ranked_app(db, company, internship2,
                                              ats_score=40.0, sim_score=38.0, iv_answer=35, trust_index=45)

            await RankingService.compute_ranking(db, app_top.id)
            await RankingService.compute_ranking(db, app_low.id)
            await db.commit()

            r_top = await RankingService.get_ranking(db, app_top.id)
            r_low = await RankingService.get_ranking(db, app_low.id)

            assert r_top is not None
            assert r_low is not None
            assert r_top.company_rank < r_low.company_rank  # top should have lower (better) rank number

    run_async(run())


# ============================================================
# 17. Internship analytics
# ============================================================

def test_internship_analytics():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)

            app1 = await _build_ranked_app(db, company, internship, ats_score=92.0, sim_score=90.0, iv_answer=88, trust_index=93)
            app2 = await _build_ranked_app(db, company, internship, ats_score=65.0, sim_score=60.0, iv_answer=62, trust_index=70)
            app3 = await _build_ranked_app(db, company, internship, ats_score=35.0, sim_score=30.0, iv_answer=32, trust_index=38)

            for app in [app1, app2, app3]:
                await RankingService.compute_ranking(db, app.id)
            await db.commit()

            analytics = await RankingService.get_internship_analytics(db, internship.id)

            assert analytics["cohort_size"] == 3
            assert "mean_score" in analytics
            assert "median_score" in analytics
            assert "tier_distribution" in analytics
            assert "top_candidates" in analytics
            for tier in ("PLATINUM", "GOLD", "SILVER", "BRONZE", "UNRANKED"):
                assert tier in analytics["tier_distribution"]

    run_async(run())


# ============================================================
# 18. Compare rankings
# ============================================================

def test_compare_rankings():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)

            app1 = await _build_ranked_app(db, company, internship, ats_score=90.0, sim_score=88.0, iv_answer=85, trust_index=90)
            app2 = await _build_ranked_app(db, company, internship, ats_score=55.0, sim_score=50.0, iv_answer=52, trust_index=60)

            await RankingService.compute_ranking(db, app1.id)
            await RankingService.compute_ranking(db, app2.id)
            await db.commit()

            result = await RankingService.compare_rankings(db, [app1.id, app2.id])

            assert result["comparison_count"] == 2
            ranked = result["ranked_results"]
            assert len(ranked) == 2
            # App1 (higher scores) should be comparison_rank 1
            assert ranked[0]["comparison_rank"] == 1
            assert ranked[0]["final_score"] >= ranked[1]["final_score"]

    run_async(run())


def test_compare_rankings_includes_unavailable():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)

            app1 = await _build_ranked_app(db, company, internship)
            await RankingService.compute_ranking(db, app1.id)
            await db.commit()

            phantom_id = uuid.uuid4()
            result = await RankingService.compare_rankings(db, [app1.id, phantom_id])

            assert len(result["unavailable"]) == 1
            assert str(phantom_id) in result["unavailable"]

    run_async(run())


# ============================================================
# 19. Full trigger chain: webhook → integrity → DNA → ranking
# ============================================================

def test_full_trigger_chain_ranking_auto_generated():
    async def run():
        async with AsyncSessionFactory() as db:
            # Setup application with ATS + Simulation data
            user = await _create_user(db, "chain")
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)
            app = await _create_application(db, user.id, internship.id)

            ats = ATSResult(
                application_id=app.id, overall_score=84.0, score_band="GOOD",
                matched_skills=["Python", "SQL"], missing_skills=[],
                is_suspicious=False, fraud_probability=0.02,
                fraud_flags=[], raw_analysis={},
            )
            sim = SimulationResult(
                application_id=app.id, attempt_id=int(uuid.uuid4().int % 10_000_000),
                total_score=80.0, recommendation="hire",
                cheating_risk_level=RiskLevel.LOW, ai_dependency_score=0.12,
                round_scores={"r1": 80.0}, submitted_at=datetime.now(timezone.utc),
            )
            db.add_all([ats, sim])
            await db.commit()

            # Fire interview evaluated webhook — triggers integrity → DNA → ranking
            webhook_data = {
                "application_id": str(app.id),
                "session_id": str(uuid.uuid4()),
                "overall_answer_score_pct": 80,
                "overall_integrity_score": 88,
                "cheating_probability_pct": 6,
                "risk_level": "LOW",
                "recommendation": "Strong Hire",
                "video_url": f"http://storage.capvia.com/{app.id}.webm",
                "baselined_locally": False,
                "strengths": ["Clear reasoning", "Structured answers"],
                "improvements": ["Speak more concisely"],
                "raw_report": {},
                "integrity_details": {
                    "focus_percentage": 96,
                    "look_away_count": 1,
                    "head_stability_pct": 97,
                    "head_movements_count": 0,
                    "face_visibility_pct": 99,
                    "face_absences_count": 0,
                    "multi_face_events": 0,
                    "phone_detections_count": 0,
                    "tab_switches": 0,
                    "copy_pastes": 0,
                    "suspicious_keys": 0,
                    "violations": [],
                },
            }
            await handle_interview_evaluated_webhook(db, webhook_data)
            await db.commit()

            # Ranking should have been auto-generated via chain
            ranking = await RankingService.get_ranking(db, app.id)
            assert ranking is not None, "Ranking must be auto-generated via trigger chain"
            assert ranking.final_score is not None
            assert 0 <= float(ranking.final_score) <= 100
            assert ranking.internship_rank is not None
            assert ranking.recommendation_tier is not None
            assert ranking.explainability is not None
            assert "summary" in ranking.explainability

    run_async(run())


# ============================================================
# 20. Edge cases
# ============================================================

def test_ranking_with_no_results():
    """Application with no evaluation data produces a valid (zero-score) ranking."""
    async def run():
        async with AsyncSessionFactory() as db:
            user = await _create_user(db, "nodata")
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)
            app = await _create_application(db, user.id, internship.id)
            await db.commit()

            ranking = await RankingService.compute_ranking(db, app.id)
            await db.commit()

            assert ranking is not None
            assert float(ranking.final_score) == 0.0
            assert ranking.data_completeness == 0.0
            assert ranking.recommendation_tier == "UNRANKED"

    run_async(run())


def test_ranking_returns_none_for_missing_application():
    async def run():
        async with AsyncSessionFactory() as db:
            result = await RankingService.compute_ranking(db, uuid.uuid4())
            assert result is None

    run_async(run())


def test_get_ranking_returns_none_for_unknown():
    async def run():
        async with AsyncSessionFactory() as db:
            result = await RankingService.get_ranking(db, uuid.uuid4())
            assert result is None

    run_async(run())


def test_internship_analytics_empty_cohort():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)
            analytics = await RankingService.get_internship_analytics(db, internship.id)
            assert analytics["cohort_size"] == 0

    run_async(run())


def test_batch_rerank_internship():
    async def run():
        async with AsyncSessionFactory() as db:
            company = await _create_company(db)
            internship = await _create_internship(db, company.id)

            app1 = await _build_ranked_app(db, company, internship, ats_score=85.0, sim_score=82.0)
            app2 = await _build_ranked_app(db, company, internship, ats_score=60.0, sim_score=55.0)

            summary = await RankingService.rank_internship_cohort(db, internship.id)
            await db.commit()

            assert summary["total"] == 2
            assert summary["success"] == 2
            assert summary["failed"] == 0

    run_async(run())


def test_format_ranking_row_structure():
    """Unit test for the response formatter."""
    ranking = MagicMock(spec=Ranking)
    ranking.id = uuid.uuid4()
    ranking.application_id = uuid.uuid4()
    ranking.internship_id = uuid.uuid4()
    ranking.final_score = 78.5
    ranking.ats_component = 19.5
    ranking.simulation_component = 23.4
    ranking.interview_component = 18.9
    ranking.integrity_component = 16.7
    ranking.ats_raw_score = 78.0
    ranking.simulation_raw_score = 78.0
    ranking.interview_raw_score = 75.6
    ranking.integrity_raw_score = 83.5
    ranking.internship_rank = 2
    ranking.company_rank = 3
    ranking.global_percentile = 72.5
    ranking.is_top_candidate = False
    ranking.recommendation_tier = "GOLD"
    ranking.data_completeness = 1.0
    ranking.explainability = {"summary": "test"}
    ranking.score_breakdown = {"final_score": 78.5}
    ranking.ranking_analytics = {"cohort_size": 10}
    ranking.audit_trail = []
    ranking.created_at = datetime.now(timezone.utc)
    ranking.updated_at = datetime.now(timezone.utc)

    result = _format_ranking_row(ranking)

    assert result["final_score"] == 78.5
    assert result["internship_rank"] == 2
    assert result["recommendation_tier"] == "GOLD"
    assert result["is_top_candidate"] is False
    assert "explainability" in result
    assert "score_breakdown" in result
    assert "ranking_analytics" in result
