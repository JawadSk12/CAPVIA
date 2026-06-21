"""
CAPVIA Phase 15 — Ranking Engine
==================================
Generates weighted composite candidate rankings across four evaluation dimensions.

Scoring Formula (all inputs normalised to [0, 100]):
  final_score = ATS   × 0.25
              + Sim   × 0.30
              + IV    × 0.25
              + Integ × 0.20

Outputs per Application:
  - final_score          — Weighted composite (0–100)
  - score_breakdown      — Per-component raw + weighted contributions
  - internship_rank      — Ordinal rank within the internship cohort (1 = best)
  - company_rank         — Ordinal rank across all internships in the company
  - global_percentile    — Percentile relative to internship cohort
  - is_top_candidate     — True when in the top 10 % of the internship cohort
  - recommendation_tier  — PLATINUM / GOLD / SILVER / BRONZE / UNRANKED
  - explainability       — Human-readable rationale with strengths & risks
  - ranking_analytics    — Cohort statistics (mean, median, std-dev, top-10 %)
  - audit_trail          — Append-only computation history

Trigger Chain:
  DNA Engine (Phase 14) → Ranking Engine (Phase 15) [auto-triggered]

All public methods are async and accept a SQLAlchemy AsyncSession.
"""
import uuid
import math
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.models.models import (
    Application, ATSResult, SimulationResult, InterviewResult,
    IntegrityResult, DNAProfile, Ranking, Internship,
)

logger = logging.getLogger("ranking_service")

# =========================================================================
# Weighting constants
# =========================================================================
WEIGHTS: Dict[str, float] = {
    "ats":        0.25,
    "simulation": 0.30,
    "interview":  0.25,
    "integrity":  0.20,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "Weights must sum to 1.0"

# =========================================================================
# Tier thresholds (on final_score 0–100)
# =========================================================================
TIERS: List[Tuple[float, str]] = [
    (85.0, "PLATINUM"),
    (70.0, "GOLD"),
    (55.0, "SILVER"),
    (40.0, "BRONZE"),
]
UNRANKED_TIER = "UNRANKED"

# Top-candidate threshold: top 10 % of internship cohort
TOP_CANDIDATE_PERCENTILE = 90.0

# =========================================================================
# Internal helpers
# =========================================================================

def _safe(val: Any, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _round2(val: float) -> float:
    return round(val, 2)


def _infer_tier(score: float) -> str:
    for threshold, tier in TIERS:
        if score >= threshold:
            return tier
    return UNRANKED_TIER


def _compute_data_completeness(
    ats: Optional[ATSResult],
    sim: Optional[SimulationResult],
    interview: Optional[InterviewResult],
    integrity: Optional[IntegrityResult],
) -> float:
    """
    Fraction of evaluation phases that have real scored data.
    Weights mirror the scoring formula contribution.
    """
    score = 0.0
    if ats is not None:
        score += WEIGHTS["ats"]
    if sim is not None:
        score += WEIGHTS["simulation"]
    if interview is not None:
        score += WEIGHTS["interview"]
    if integrity is not None and integrity.trust_index is not None:
        score += WEIGHTS["integrity"]
    return round(score, 4)


# =========================================================================
# Score extractors  — normalise each source signal to [0, 100]
# =========================================================================

def _extract_ats_score(ats: Optional[ATSResult]) -> Optional[float]:
    """ATSResult.overall_score is already 0–100."""
    if ats is None:
        return None
    return _clamp(_safe(ats.overall_score))


def _extract_simulation_score(sim: Optional[SimulationResult]) -> Optional[float]:
    """SimulationResult.total_score is already 0–100."""
    if sim is None:
        return None
    return _clamp(_safe(sim.total_score))


def _extract_interview_score(interview: Optional[InterviewResult]) -> Optional[float]:
    """
    Combines:
      - overall_answer_score_pct (80 %): quality of responses
      - overall_integrity_score  (20 %): proctoring integrity during interview
    Both fields are 0–100 integers.
    """
    if interview is None:
        return None
    answer = _safe(interview.overall_answer_score_pct)
    integrity = _safe(interview.overall_integrity_score)
    combined = answer * 0.80 + integrity * 0.20
    return _clamp(combined)


def _extract_integrity_score(integrity: Optional[IntegrityResult]) -> Optional[float]:
    """IntegrityResult.trust_index is 0–100 (Phase 13 compiled field)."""
    if integrity is None or integrity.trust_index is None:
        return None
    return _clamp(_safe(integrity.trust_index))


# =========================================================================
# Composite score calculator
# =========================================================================

def _compute_final_score(
    ats_raw: Optional[float],
    sim_raw: Optional[float],
    iv_raw: Optional[float],
    integ_raw: Optional[float],
) -> Tuple[float, Dict[str, float], Dict[str, float]]:
    """
    Returns (final_score, components, raw_scores) where:
      - components    = {ats, simulation, interview, integrity} weighted contributions
      - raw_scores    = {ats, simulation, interview, integrity} pre-weighting values
    Missing phases are excluded and remaining weights are renormalised.
    """
    available = {
        "ats":        ats_raw,
        "simulation": sim_raw,
        "interview":  iv_raw,
        "integrity":  integ_raw,
    }
    present = {k: v for k, v in available.items() if v is not None}

    if not present:
        # No data at all — score 0, completeness will flag it
        return 0.0, {k: 0.0 for k in available}, {k: 0.0 for k in available}

    # Re-normalise weights for the phases actually present
    total_weight = sum(WEIGHTS[k] for k in present)
    components: Dict[str, float] = {}
    for key in available:
        if key in present:
            components[key] = _round2(present[key] * WEIGHTS[key] / total_weight)
        else:
            components[key] = 0.0

    final_score = _clamp(sum(components.values()))

    raw_scores: Dict[str, float] = {k: _round2(v) if v is not None else 0.0
                                     for k, v in available.items()}
    return _round2(final_score), components, raw_scores


# =========================================================================
# Explainability builder
# =========================================================================

def _build_explainability(
    final_score: float,
    components: Dict[str, float],
    raw_scores: Dict[str, float],
    ats_raw: Optional[float],
    sim_raw: Optional[float],
    iv_raw: Optional[float],
    integ_raw: Optional[float],
    tier: str,
    data_completeness: float,
) -> Dict[str, Any]:
    """
    Produces a human-readable explainability object:
      - summary narrative
      - phase-level contribution breakdown
      - identified strengths and risk signals
      - formula snapshot
    """
    # Identify strongest and weakest phases (from present ones only)
    available_components = {
        "ATS (25 %)":        (ats_raw, components["ats"]),
        "Simulation (30 %)": (sim_raw, components["simulation"]),
        "Interview (25 %)":  (iv_raw,  components["interview"]),
        "Integrity (20 %)":  (integ_raw, components["integrity"]),
    }
    present_phases = {k: v for k, v in available_components.items() if v[0] is not None}
    absent_phases  = [k for k, v in available_components.items() if v[0] is None]

    strengths: List[str] = []
    risk_signals: List[str] = []

    for phase, (raw, weighted) in present_phases.items():
        if raw is not None:
            if raw >= 75:
                strengths.append(f"{phase}: {raw:.1f}/100 — strong performance.")
            elif raw < 45:
                risk_signals.append(f"{phase}: {raw:.1f}/100 — below average, warrants review.")

    if absent_phases:
        risk_signals.append(
            f"Missing data for {', '.join(absent_phases)}. "
            "Score was renormalised; ranking confidence is reduced."
        )

    if data_completeness < 0.5:
        risk_signals.append(
            "Low data completeness (<50 %). This ranking is provisional and may change "
            "as more evaluation stages are completed."
        )

    summary = (
        f"Candidate achieved a Final Score of {final_score:.1f}/100, "
        f"placing them in the {tier} tier. "
        f"Data completeness: {data_completeness * 100:.0f} %. "
        f"Identified {len(strengths)} strength(s) and {len(risk_signals)} risk signal(s)."
    )

    return {
        "summary":          summary,
        "tier":             tier,
        "final_score":      final_score,
        "data_completeness": data_completeness,
        "phase_contributions": {
            "ats":        {"raw": ats_raw,   "weighted": components["ats"],        "weight": WEIGHTS["ats"]},
            "simulation": {"raw": sim_raw,   "weighted": components["simulation"], "weight": WEIGHTS["simulation"]},
            "interview":  {"raw": iv_raw,    "weighted": components["interview"],  "weight": WEIGHTS["interview"]},
            "integrity":  {"raw": integ_raw, "weighted": components["integrity"],  "weight": WEIGHTS["integrity"]},
        },
        "absent_phases":    absent_phases,
        "strengths":        strengths,
        "risk_signals":     risk_signals,
        "formula":          (
            "final_score = ats × 0.25 + simulation × 0.30 + interview × 0.25 + integrity × 0.20"
            " (weights renormalised when phases are absent)"
        ),
    }


# =========================================================================
# Score breakdown builder
# =========================================================================

def _build_score_breakdown(
    ats_raw: Optional[float],
    sim_raw: Optional[float],
    iv_raw: Optional[float],
    integ_raw: Optional[float],
    components: Dict[str, float],
    final_score: float,
) -> Dict[str, Any]:
    return {
        "final_score": final_score,
        "weights":     WEIGHTS,
        "components": {
            "ats": {
                "raw_score":    ats_raw,
                "weight":       WEIGHTS["ats"],
                "contribution": components["ats"],
                "source":       "ATSResult.overall_score",
            },
            "simulation": {
                "raw_score":    sim_raw,
                "weight":       WEIGHTS["simulation"],
                "contribution": components["simulation"],
                "source":       "SimulationResult.total_score",
            },
            "interview": {
                "raw_score":    iv_raw,
                "weight":       WEIGHTS["interview"],
                "contribution": components["interview"],
                "source":       "InterviewResult (answer_score 80% + integrity_score 20%)",
            },
            "integrity": {
                "raw_score":    integ_raw,
                "weight":       WEIGHTS["integrity"],
                "contribution": components["integrity"],
                "source":       "IntegrityResult.trust_index",
            },
        },
    }


# =========================================================================
# Cohort analytics builder (across all ranked candidates for an internship)
# =========================================================================

def _build_ranking_analytics(
    all_scores: List[float],
    candidate_score: float,
    internship_rank: int,
    total_candidates: int,
    top_threshold: float,
) -> Dict[str, Any]:
    """
    Produce cohort statistics for the full internship applicant pool.
    """
    if not all_scores:
        return {"cohort_size": 0}

    sorted_scores = sorted(all_scores, reverse=True)
    mean_val = sum(all_scores) / len(all_scores)
    variance = sum((x - mean_val) ** 2 for x in all_scores) / len(all_scores)
    std_dev = math.sqrt(variance)
    median_val = sorted_scores[len(sorted_scores) // 2]

    return {
        "cohort_size":       total_candidates,
        "cohort_mean":       _round2(mean_val),
        "cohort_median":     _round2(median_val),
        "cohort_std_dev":    _round2(std_dev),
        "cohort_max":        _round2(sorted_scores[0]),
        "cohort_min":        _round2(sorted_scores[-1]),
        "top_10pct_threshold": _round2(top_threshold),
        "candidate_score":   candidate_score,
        "internship_rank":   internship_rank,
        "total_candidates":  total_candidates,
        "score_distribution": {
            "platinum_count": sum(1 for s in all_scores if s >= 85),
            "gold_count":     sum(1 for s in all_scores if 70 <= s < 85),
            "silver_count":   sum(1 for s in all_scores if 55 <= s < 70),
            "bronze_count":   sum(1 for s in all_scores if 40 <= s < 55),
            "unranked_count": sum(1 for s in all_scores if s < 40),
        },
    }


# =========================================================================
# Cohort ranking helpers
# =========================================================================

async def _compute_internship_cohort_scores(
    db: AsyncSession,
    internship_id: uuid.UUID,
) -> List[Dict[str, Any]]:
    """
    Load all active Ranking rows for a given internship and return their
    application_id + final_score pairs (including rows just flushed this session).
    """
    stmt = (
        select(Ranking)
        .where(
            Ranking.internship_id == internship_id,
            Ranking.deleted_at.is_(None),
            Ranking.final_score.is_not(None),
        )
    )
    res = await db.execute(stmt)
    rows = res.scalars().all()
    return [{"application_id": r.application_id, "final_score": float(r.final_score)} for r in rows]


async def _compute_company_cohort_scores(
    db: AsyncSession,
    company_id: uuid.UUID,
) -> List[Dict[str, Any]]:
    """
    Load all active Ranking rows for all internships belonging to this company.
    """
    stmt = (
        select(Ranking.application_id, Ranking.final_score)
        .join(Internship, Internship.id == Ranking.internship_id)
        .where(
            Internship.company_id == company_id,
            Internship.deleted_at.is_(None),
            Ranking.deleted_at.is_(None),
            Ranking.final_score.is_not(None),
        )
    )
    res = await db.execute(stmt)
    rows = res.fetchall()
    return [{"application_id": r[0], "final_score": float(r[1])} for r in rows]


def _compute_ordinal_rank(scores: List[float], candidate_score: float) -> int:
    """Ordinal rank: 1 = highest score.  Ties share the same rank position."""
    sorted_desc = sorted(scores, reverse=True)
    # Find first position where score matches (dense rank)
    for i, s in enumerate(sorted_desc):
        if s <= candidate_score:
            return i + 1
    return len(scores)


def _compute_percentile(scores: List[float], candidate_score: float) -> float:
    """Percentile = fraction of cohort scoring strictly below candidate × 100."""
    if not scores:
        return 100.0
    below = sum(1 for s in scores if s < candidate_score)
    equal = sum(1 for s in scores if s == candidate_score)
    percentile = (below + 0.5 * equal) / len(scores) * 100
    return round(percentile, 2)


def _compute_top10_threshold(scores: List[float]) -> float:
    """Score at the 90th percentile of the cohort."""
    if not scores:
        return 0.0
    sorted_asc = sorted(scores)
    idx = max(0, int(math.ceil(0.90 * len(sorted_asc))) - 1)
    return sorted_asc[idx]


# =========================================================================
# Core RankingService
# =========================================================================

class RankingService:

    @staticmethod
    async def compute_ranking(
        db: AsyncSession,
        application_id: uuid.UUID,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = "SYSTEM",
    ) -> Optional[Ranking]:
        """
        Full Ranking Engine computation for a single application.

        Steps:
          1. Load Application + all result models.
          2. Extract normalised raw scores from each evaluation phase.
          3. Compute weighted final_score and component contributions.
          4. Upsert (or create) the Ranking row with raw + weighted scores.
          5. Flush to DB so the new score is visible for cohort queries.
          6. Re-query the full internship cohort to compute:
               internship_rank, company_rank, global_percentile, is_top_candidate.
          7. Build explainability, score_breakdown, and ranking_analytics.
          8. Append audit_trail entry.
          9. Flush and return the updated Ranking row.
        """
        # ── Step 1: Load application with all related results ──────────────
        stmt = (
            select(Application)
            .where(
                Application.id == application_id,
                Application.deleted_at.is_(None),
            )
            .options(
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.integrity_result),
                selectinload(Application.vacancy),
                selectinload(Application.ranking),
            )
        )
        res = await db.execute(stmt)
        app = res.scalar_one_or_none()

        if not app:
            logger.error(f"RankingService: Application {application_id} not found.")
            return None

        ats       = app.ats_result
        sim       = app.simulation_result
        interview = app.interview_result
        integrity = app.integrity_result
        internship = app.vacancy

        if internship is None:
            logger.error(f"RankingService: No Internship linked to application {application_id}.")
            return None

        internship_id = internship.id
        company_id    = internship.company_id

        # ── Step 2: Extract raw normalised scores ──────────────────────────
        ats_raw   = _extract_ats_score(ats)
        sim_raw   = _extract_simulation_score(sim)
        iv_raw    = _extract_interview_score(interview)
        integ_raw = _extract_integrity_score(integrity)

        # ── Step 3: Compute final score ────────────────────────────────────
        final_score, components, raw_scores = _compute_final_score(
            ats_raw, sim_raw, iv_raw, integ_raw
        )
        data_completeness = _compute_data_completeness(ats, sim, interview, integrity)
        tier              = _infer_tier(final_score)

        # ── Step 4: Upsert Ranking row ─────────────────────────────────────
        existing_ranking = app.ranking
        if existing_ranking is None:
            # Also check directly in case relationship cache is stale
            stmt2 = select(Ranking).where(
                Ranking.application_id == application_id,
                Ranking.deleted_at.is_(None),
            )
            res2 = await db.execute(stmt2)
            existing_ranking = res2.scalar_one_or_none()

        if existing_ranking is None:
            ranking_row = Ranking(
                application_id  = application_id,
                internship_id   = internship_id,
                final_score     = final_score,
                ats_component        = components["ats"],
                simulation_component = components["simulation"],
                interview_component  = components["interview"],
                integrity_component  = components["integrity"],
                ats_raw_score        = raw_scores["ats"]        if ats_raw   is not None else None,
                simulation_raw_score = raw_scores["simulation"] if sim_raw   is not None else None,
                interview_raw_score  = raw_scores["interview"]  if iv_raw    is not None else None,
                integrity_raw_score  = raw_scores["integrity"]  if integ_raw is not None else None,
                data_completeness    = data_completeness,
                recommendation_tier  = tier,
                is_top_candidate     = False,   # will update after cohort query
                # Legacy
                score = final_score,
                audit_trail = [],
            )
            db.add(ranking_row)
        else:
            ranking_row = existing_ranking
            ranking_row.internship_id        = internship_id
            ranking_row.final_score          = final_score
            ranking_row.ats_component        = components["ats"]
            ranking_row.simulation_component = components["simulation"]
            ranking_row.interview_component  = components["interview"]
            ranking_row.integrity_component  = components["integrity"]
            ranking_row.ats_raw_score        = raw_scores["ats"]        if ats_raw   is not None else None
            ranking_row.simulation_raw_score = raw_scores["simulation"] if sim_raw   is not None else None
            ranking_row.interview_raw_score  = raw_scores["interview"]  if iv_raw    is not None else None
            ranking_row.integrity_raw_score  = raw_scores["integrity"]  if integ_raw is not None else None
            ranking_row.data_completeness    = data_completeness
            ranking_row.recommendation_tier  = tier
            ranking_row.score                = final_score   # legacy sync

        await db.flush()

        # ── Step 5 & 6: Cohort ranking ─────────────────────────────────────
        internship_cohort = await _compute_internship_cohort_scores(db, internship_id)
        company_cohort    = await _compute_company_cohort_scores(db, company_id)

        internship_scores = [r["final_score"] for r in internship_cohort]
        company_scores    = [r["final_score"] for r in company_cohort]

        internship_rank  = _compute_ordinal_rank(internship_scores, final_score)
        company_rank     = _compute_ordinal_rank(company_scores, final_score)
        global_percentile = _compute_percentile(internship_scores, final_score)

        top10_threshold  = _compute_top10_threshold(internship_scores)
        is_top_candidate = (
            global_percentile >= TOP_CANDIDATE_PERCENTILE
            and len(internship_scores) >= 3   # require ≥3 candidates before flagging top
        )

        ranking_row.internship_rank   = internship_rank
        ranking_row.company_rank      = company_rank
        ranking_row.global_percentile = _round2(global_percentile)
        ranking_row.is_top_candidate  = is_top_candidate
        ranking_row.rank              = internship_rank   # legacy sync

        # ── Step 7: Explainability, score_breakdown, ranking_analytics ─────
        ranking_row.explainability = _build_explainability(
            final_score, components, raw_scores,
            ats_raw, sim_raw, iv_raw, integ_raw,
            tier, data_completeness,
        )

        ranking_row.score_breakdown = _build_score_breakdown(
            ats_raw, sim_raw, iv_raw, integ_raw, components, final_score
        )

        ranking_row.ranking_analytics = _build_ranking_analytics(
            all_scores      = internship_scores,
            candidate_score = final_score,
            internship_rank = internship_rank,
            total_candidates = len(internship_scores),
            top_threshold   = top10_threshold,
        )

        # ── Step 8: Audit trail ────────────────────────────────────────────
        audit_entry = {
            "computed_at":    datetime.now(timezone.utc).isoformat(),
            "actor_id":       str(actor_id) if actor_id else None,
            "actor_role":     actor_role,
            "action":         "RANKING_COMPUTED",
            "final_score":    final_score,
            "internship_rank": internship_rank,
            "company_rank":   company_rank,
            "global_percentile": _round2(global_percentile),
            "tier":           tier,
            "data_completeness": data_completeness,
        }
        existing_trail: List = list(ranking_row.audit_trail or [])
        existing_trail.append(audit_entry)
        ranking_row.audit_trail = existing_trail

        await db.flush()

        logger.info(
            f"RankingService: Application {application_id} ranked — "
            f"Score={final_score:.1f}, InternshipRank={internship_rank}, "
            f"CompanyRank={company_rank}, Percentile={global_percentile:.1f}%, "
            f"Tier={tier}, Top={is_top_candidate}"
        )

        return ranking_row

    # ────────────────────────────────────────────────────────────────────────
    # Batch: re-rank all candidates for a given internship
    # ────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def rank_internship_cohort(
        db: AsyncSession,
        internship_id: uuid.UUID,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = "SYSTEM",
    ) -> Dict[str, Any]:
        """
        Re-compute rankings for ALL applications in an internship cohort.
        Useful when a new candidate completes evaluation, which may shift peer ranks.

        Returns a summary dict with total processed, success, failure counts.
        """
        stmt = (
            select(Application)
            .where(
                Application.vacancy_id == internship_id,
                Application.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        applications = res.scalars().all()

        success_count = 0
        failure_ids: List[str] = []

        for app in applications:
            try:
                ranking = await RankingService.compute_ranking(
                    db,
                    application_id=app.id,
                    actor_id=actor_id,
                    actor_role=actor_role,
                )
                if ranking:
                    success_count += 1
                else:
                    failure_ids.append(str(app.id))
            except Exception as exc:
                logger.error(
                    f"RankingService: Batch rank failed for application {app.id}: {exc}"
                )
                failure_ids.append(str(app.id))

        return {
            "internship_id": str(internship_id),
            "total":         len(applications),
            "success":       success_count,
            "failed":        len(failure_ids),
            "failure_ids":   failure_ids,
        }

    # ────────────────────────────────────────────────────────────────────────
    # Read helpers
    # ────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_ranking(
        db: AsyncSession,
        application_id: uuid.UUID,
    ) -> Optional[Ranking]:
        """Retrieve the current Ranking for a given application."""
        stmt = select(Ranking).where(
            Ranking.application_id == application_id,
            Ranking.deleted_at.is_(None),
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_internship_leaderboard(
        db: AsyncSession,
        internship_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Return the ranked leaderboard for a given internship, sorted by
        internship_rank ascending (1 = best).
        """
        stmt = (
            select(Ranking)
            .where(
                Ranking.internship_id == internship_id,
                Ranking.deleted_at.is_(None),
                Ranking.final_score.is_not(None),
            )
            .order_by(Ranking.internship_rank.asc().nulls_last())
            .limit(limit)
            .offset(offset)
        )
        res = await db.execute(stmt)
        rows = res.scalars().all()
        return [_format_ranking_row(r) for r in rows]

    @staticmethod
    async def get_internship_analytics(
        db: AsyncSession,
        internship_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Return aggregate ranking analytics for an internship cohort:
        score distribution, tier counts, top-candidate list.
        """
        stmt = (
            select(Ranking)
            .where(
                Ranking.internship_id == internship_id,
                Ranking.deleted_at.is_(None),
                Ranking.final_score.is_not(None),
            )
        )
        res = await db.execute(stmt)
        rows = res.scalars().all()

        if not rows:
            return {"internship_id": str(internship_id), "cohort_size": 0}

        scores = [float(r.final_score) for r in rows]
        tiers_dist: Dict[str, int] = {
            "PLATINUM": 0, "GOLD": 0, "SILVER": 0, "BRONZE": 0, "UNRANKED": 0
        }
        for r in rows:
            tiers_dist[r.recommendation_tier or "UNRANKED"] = (
                tiers_dist.get(r.recommendation_tier or "UNRANKED", 0) + 1
            )

        top_candidates = [
            {"application_id": str(r.application_id),
             "final_score":    float(r.final_score),
             "internship_rank": r.internship_rank}
            for r in rows if r.is_top_candidate
        ]

        mean_val  = sum(scores) / len(scores)
        sorted_sc = sorted(scores, reverse=True)
        median_val = sorted_sc[len(sorted_sc) // 2]

        return {
            "internship_id":    str(internship_id),
            "cohort_size":      len(rows),
            "mean_score":       _round2(mean_val),
            "median_score":     _round2(median_val),
            "top_score":        _round2(sorted_sc[0]),
            "bottom_score":     _round2(sorted_sc[-1]),
            "tier_distribution": tiers_dist,
            "top_candidates":   top_candidates,
        }

    @staticmethod
    async def compare_rankings(
        db: AsyncSession,
        application_ids: List[uuid.UUID],
    ) -> Dict[str, Any]:
        """
        Side-by-side comparison of multiple application rankings.
        Returns each candidate's full breakdown plus a relative ranking.
        """
        results: List[Dict[str, Any]] = []

        for app_id in application_ids:
            ranking = await RankingService.get_ranking(db, app_id)
            if ranking is None:
                results.append({"application_id": str(app_id), "available": False})
            else:
                data = _format_ranking_row(ranking)
                data["available"] = True
                results.append(data)

        available = [r for r in results if r.get("available")]
        available.sort(key=lambda x: x.get("final_score", 0), reverse=True)
        for i, r in enumerate(available):
            r["comparison_rank"] = i + 1

        return {
            "comparison_count": len(application_ids),
            "ranked_results":   available,
            "unavailable":      [r["application_id"] for r in results if not r.get("available")],
        }


# =========================================================================
# Response formatter  (used by router)
# =========================================================================

def _format_ranking_row(row: Ranking) -> Dict[str, Any]:
    return {
        "id":                 str(row.id),
        "application_id":     str(row.application_id),
        "internship_id":      str(row.internship_id),
        # Scores
        "final_score":        float(row.final_score) if row.final_score is not None else None,
        # Component contributions
        "ats_component":          float(row.ats_component)          if row.ats_component          is not None else None,
        "simulation_component":   float(row.simulation_component)   if row.simulation_component   is not None else None,
        "interview_component":    float(row.interview_component)     if row.interview_component    is not None else None,
        "integrity_component":    float(row.integrity_component)     if row.integrity_component    is not None else None,
        # Raw source scores
        "ats_raw_score":          float(row.ats_raw_score)          if row.ats_raw_score          is not None else None,
        "simulation_raw_score":   float(row.simulation_raw_score)   if row.simulation_raw_score   is not None else None,
        "interview_raw_score":    float(row.interview_raw_score)     if row.interview_raw_score    is not None else None,
        "integrity_raw_score":    float(row.integrity_raw_score)     if row.integrity_raw_score    is not None else None,
        # Rankings
        "internship_rank":    row.internship_rank,
        "company_rank":       row.company_rank,
        "global_percentile":  float(row.global_percentile) if row.global_percentile is not None else None,
        # Derived signals
        "is_top_candidate":   row.is_top_candidate,
        "recommendation_tier": row.recommendation_tier,
        "data_completeness":  float(row.data_completeness) if row.data_completeness is not None else None,
        # JSONB
        "explainability":     row.explainability,
        "score_breakdown":    row.score_breakdown,
        "ranking_analytics":  row.ranking_analytics,
        "audit_trail":        row.audit_trail,
        # Timestamps
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
