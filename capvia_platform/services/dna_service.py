"""
CAPVIA Phase 14 — DNA Engine
==============================
Converts raw evaluation signals from ATS, Simulation, Interview, and Integrity phases
into structured Capability Intelligence.

Nine Capability Dimensions (all 0–100):
  1. Problem Solving      — Simulation score + Interview answer depth
  2. Execution            — Simulation completion + ATS practical exposure
  3. Communication        — Interview answer quality + ATS readability/clarity
  4. Learning Ability     — Skill gap recovery + ATS matched/missing ratio
  5. Adaptability         — Interview improvement signals + simulation round variance
  6. Consistency          — Integrity trust index + low proctoring violations
  7. Confidence           — Interview risk level (low risk = high confidence) + answer boldness
  8. Role Fit             — ATS domain/technical alignment + internship_readiness
  9. Leadership Potential — ATS experience alignment + interview recommendation quality

Derived Structures:
  - radar_chart_data      — Labelled dimension values for Chart.js Radar Chart
  - capability_vectors    — Normalized unit vector per dimension (for ML comparison)
  - comparative_analysis  — Comparison vs internship cohort averages (stub for future ranker)
  - historical_trends     — Time-series of DNA snapshots across re-runs
"""
import uuid
import math
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.models.models import (
    Application, ATSResult, SimulationResult, InterviewResult,
    IntegrityResult, DNAProfile, RecommendationType, RiskLevel
)

logger = logging.getLogger("dna_service")

# Deferred import to avoid circular dependency — RankingService imports models only
_ranking_service_module = None

def _get_ranking_service():
    global _ranking_service_module
    if _ranking_service_module is None:
        from capvia_platform.services import ranking_service as _rs
        _ranking_service_module = _rs
    return _ranking_service_module

# =========================================================================
# Capability Dimension Weights and Labels
# =========================================================================

DIMENSION_LABELS = [
    "problem_solving",
    "execution",
    "communication",
    "learning_ability",
    "adaptability",
    "consistency",
    "confidence",
    "role_fit",
    "leadership_potential",
]

# =========================================================================
# Internal Signal Extractors
# =========================================================================

def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> int:
    return int(max(lo, min(hi, round(val))))


def _compute_problem_solving(
    sim: Optional[SimulationResult],
    interview: Optional[InterviewResult],
) -> Dict[str, Any]:
    """
    Problem Solving = ability to tackle unknown problems under timed, observed conditions.

    Sources:
      - Simulation total_score (60%): direct coding benchmark.
      - Interview answer_score_pct (40%): open-ended problem decomposition.
    """
    sim_score = _safe_float(getattr(sim, "total_score", None))   # 0–100
    iv_score = _safe_float(getattr(interview, "overall_answer_score_pct", None))  # 0–100

    if sim is None and interview is None:
        score = 0.0
        sources = ["no_data"]
    elif sim is None:
        score = iv_score * 1.0
        sources = ["interview_only"]
    elif interview is None:
        score = sim_score * 1.0
        sources = ["simulation_only"]
    else:
        score = sim_score * 0.60 + iv_score * 0.40
        sources = ["simulation", "interview"]

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "simulation_total_score": sim_score,
            "interview_answer_score_pct": iv_score,
        },
    }


def _compute_execution(
    sim: Optional[SimulationResult],
    dna: Optional[DNAProfile],  # existing SBERT fields
) -> Dict[str, Any]:
    """
    Execution = ability to implement solutions with practical competence.

    Sources:
      - Simulation total_score (50%): task completion under pressure.
      - ATS practical_exposure (30%): historical project evidence.
      - ATS internship_readiness (20%): baseline execution maturity.
    """
    sim_score = _safe_float(getattr(sim, "total_score", None))
    practical = _safe_float(getattr(dna, "practical_exposure", None))
    readiness = _safe_float(getattr(dna, "internship_readiness", None))

    if sim is None and dna is None:
        return {"score": 0, "sources": ["no_data"], "components": {}}

    if sim is None:
        score = practical * 0.60 + readiness * 0.40
        sources = ["ats_only"]
    elif dna is None:
        score = sim_score
        sources = ["simulation_only"]
    else:
        score = sim_score * 0.50 + practical * 0.30 + readiness * 0.20
        sources = ["simulation", "ats"]

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "simulation_total_score": sim_score,
            "practical_exposure": practical,
            "internship_readiness": readiness,
        },
    }


def _compute_communication(
    interview: Optional[InterviewResult],
    dna: Optional[DNAProfile],
) -> Dict[str, Any]:
    """
    Communication = clarity, fluency, and precision in expressing ideas.

    Sources:
      - Interview answer_score_pct (50%): real verbal/written delivery.
      - ATS readability (25%): resume writing quality signal.
      - ATS clarity (25%): structural communication indicator.
    """
    iv_score = _safe_float(getattr(interview, "overall_answer_score_pct", None))
    readability = _safe_float(getattr(dna, "readability", None))
    clarity = _safe_float(getattr(dna, "clarity", None))

    if interview is None and dna is None:
        return {"score": 0, "sources": ["no_data"], "components": {}}

    if interview is None:
        score = readability * 0.50 + clarity * 0.50
        sources = ["ats_only"]
    elif dna is None:
        score = iv_score
        sources = ["interview_only"]
    else:
        score = iv_score * 0.50 + readability * 0.25 + clarity * 0.25
        sources = ["interview", "ats"]

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "interview_answer_score_pct": iv_score,
            "readability": readability,
            "clarity": clarity,
        },
    }


def _compute_learning_ability(
    ats: Optional[ATSResult],
    dna: Optional[DNAProfile],
) -> Dict[str, Any]:
    """
    Learning Ability = speed of skill acquisition and gap bridging capacity.

    Sources:
      - Skill gap ratio: matched / (matched + missing) — smaller gap = faster learner (60%).
      - ATS technical_depth (40%): depth of self-taught specialization.
    """
    matched = len(getattr(ats, "matched_skills", None) or [])
    missing = len(getattr(ats, "missing_skills", None) or [])
    total = matched + missing
    gap_ratio = (matched / total) if total > 0 else 0.5  # Default 50% if no ATS

    tech_depth = _safe_float(getattr(dna, "technical_depth", None))

    if ats is None and dna is None:
        return {"score": 50, "sources": ["default"], "components": {}}

    score = gap_ratio * 100 * 0.60 + tech_depth * 0.40
    sources = []
    if ats is not None:
        sources.append("ats_skill_gap")
    if dna is not None:
        sources.append("ats_technical_depth")

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "matched_skills_count": matched,
            "missing_skills_count": missing,
            "gap_ratio": round(gap_ratio, 4),
            "technical_depth": tech_depth,
        },
    }


def _compute_adaptability(
    sim: Optional[SimulationResult],
    interview: Optional[InterviewResult],
) -> Dict[str, Any]:
    """
    Adaptability = ability to adjust under changing conditions and challenges.

    Sources:
      - Interview improvement count (40%): willingness to accept and apply feedback.
      - Simulation round_scores variance (40%): performance consistency across varied rounds.
      - Interview strengths count (20%): breadth of demonstrated versatility.
    """
    improvements = interview.improvements if interview and interview.improvements else []
    strengths = interview.strengths if interview and interview.strengths else []
    improvement_score = min(100.0, len(improvements) * 20.0)  # each improvement up to 100

    # Compute round variance — low variance (consistently high) = more adaptive
    round_scores = {}
    if sim and sim.round_scores:
        round_scores = sim.round_scores if isinstance(sim.round_scores, dict) else {}

    if round_scores:
        values = [float(v) for v in round_scores.values() if isinstance(v, (int, float))]
        if len(values) >= 2:
            mean_val = sum(values) / len(values)
            variance = sum((x - mean_val) ** 2 for x in values) / len(values)
            std_dev = math.sqrt(variance)
            # Low std_dev = consistent = high adaptability score
            variance_score = max(0.0, 100.0 - std_dev * 2)
        else:
            variance_score = _safe_float(sim.total_score if sim else None)
    else:
        variance_score = _safe_float(getattr(sim, "total_score", None))

    strength_score = min(100.0, len(strengths) * 25.0)

    if sim is None and interview is None:
        return {"score": 50, "sources": ["default"], "components": {}}

    score = improvement_score * 0.40 + variance_score * 0.40 + strength_score * 0.20
    sources = []
    if interview:
        sources.append("interview_improvements")
    if sim:
        sources.append("simulation_round_variance")

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "improvement_count": len(improvements),
            "strength_count": len(strengths),
            "round_variance_score": round(variance_score, 2),
        },
    }


def _compute_consistency(
    integrity: Optional[IntegrityResult],
) -> Dict[str, Any]:
    """
    Consistency = behavioral reliability across all evaluation phases.

    Sources:
      - Integrity trust_index (70%): sustained ethical behavior under observation.
      - Low proctoring violation count (30%): clean behavioral pattern.
    """
    trust = _safe_float(getattr(integrity, "trust_index", None))

    # Violation penalty: count distinct violation categories
    violations_raw = getattr(integrity, "violations", None) or []
    violation_count = len(violations_raw) if isinstance(violations_raw, list) else 0

    # Low violations → high consistency
    violation_score = max(0.0, 100.0 - violation_count * 15.0)

    if integrity is None:
        return {"score": 50, "sources": ["default"], "components": {}}

    score = trust * 0.70 + violation_score * 0.30
    return {
        "score": _clamp(score),
        "sources": ["integrity_trust_index", "proctoring_violations"],
        "components": {
            "trust_index": trust,
            "violation_count": violation_count,
            "violation_score": round(violation_score, 2),
        },
    }


def _compute_confidence(
    interview: Optional[InterviewResult],
    integrity: Optional[IntegrityResult],
) -> Dict[str, Any]:
    """
    Confidence = self-assurance and directness in high-pressure scenarios.

    Sources:
      - Interview risk_level inverse (50%): LOW risk = high confidence expression.
      - Interview cheating_probability inverse (30%): low suspicion = authentic expression.
      - Face visibility pct (20%): maintained presence = visual confidence.
    """
    risk_str = str(getattr(interview, "risk_level", "MEDIUM")).upper() if interview else "MEDIUM"
    risk_map = {"LOW": 90, "MEDIUM": 60, "HIGH": 35, "CRITICAL": 10}
    risk_score = float(risk_map.get(risk_str, 60))

    cheat_prob = _safe_float(getattr(interview, "cheating_probability_pct", None))
    authenticity_score = max(0.0, 100.0 - cheat_prob)

    face_vis = _safe_float(getattr(integrity, "face_visibility_pct", None))
    if face_vis == 0.0 and integrity is not None:
        face_vis = 80.0  # default if field missing

    if interview is None and integrity is None:
        return {"score": 50, "sources": ["default"], "components": {}}

    score = risk_score * 0.50 + authenticity_score * 0.30 + face_vis * 0.20
    sources = []
    if interview:
        sources.extend(["interview_risk", "cheating_probability"])
    if integrity:
        sources.append("face_visibility")

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "risk_level": risk_str,
            "risk_score": risk_score,
            "cheating_probability_pct": cheat_prob,
            "face_visibility_pct": face_vis,
        },
    }


def _compute_role_fit(
    ats: Optional[ATSResult],
    dna: Optional[DNAProfile],
) -> Dict[str, Any]:
    """
    Role Fit = alignment between candidate's profile and the target role.

    Sources:
      - ATS overall_score (40%): holistic match signal.
      - ATS domain_alignment (30%): specialization match.
      - ATS technical_alignment (30%): skills match to JD.
    """
    overall = _safe_float(getattr(ats, "overall_score", None))
    domain = _safe_float(getattr(dna, "domain_alignment", None))
    tech_align = _safe_float(getattr(dna, "technical_alignment", None))

    if ats is None and dna is None:
        return {"score": 50, "sources": ["default"], "components": {}}

    if ats is None:
        score = domain * 0.50 + tech_align * 0.50
        sources = ["ats_sbert_only"]
    elif dna is None:
        score = overall
        sources = ["ats_score_only"]
    else:
        score = overall * 0.40 + domain * 0.30 + tech_align * 0.30
        sources = ["ats_overall", "domain_alignment", "technical_alignment"]

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "ats_overall_score": overall,
            "domain_alignment": domain,
            "technical_alignment": tech_align,
        },
    }


def _compute_leadership_potential(
    ats: Optional[ATSResult],
    dna: Optional[DNAProfile],
    interview: Optional[InterviewResult],
) -> Dict[str, Any]:
    """
    Leadership Potential = evidence of ownership, initiative, and team influence.

    Sources:
      - ATS experience_alignment (35%): seniority and ownership signals.
      - Interview recommendation quality (35%): evaluator's hiring confidence.
      - ATS hiring_readiness_score (30%): overall growth trajectory.
    """
    exp_align = _safe_float(getattr(dna, "experience_alignment", None))
    hiring_ready = _safe_float(getattr(dna, "hiring_readiness_score", None))

    # Map interview recommendation to a numeric score
    rec = getattr(interview, "recommendation", None)
    # Handle both enum objects and plain strings
    if hasattr(rec, "value"):
        rec_str = str(rec.value).upper().replace(" ", "_")
    else:
        rec_str = str(rec).upper().replace(" ", "_") if rec else ""
    rec_map = {
        "STRONG_HIRE": 95,
        "STRONG HIRE": 95,
        "CONSIDER": 70,
        "REVIEW_REQUIRED": 45,
        "REVIEW REQUIRED": 45,
        "NOT_RECOMMENDED": 15,
        "NOT RECOMMENDED": 15,
    }
    rec_score = float(rec_map.get(rec_str, 50))

    if dna is None and interview is None:
        return {"score": 50, "sources": ["default"], "components": {}}

    if dna is None:
        score = rec_score
        sources = ["interview_recommendation"]
    elif interview is None:
        score = exp_align * 0.55 + hiring_ready * 0.45
        sources = ["ats_experience", "hiring_readiness"]
    else:
        score = exp_align * 0.35 + rec_score * 0.35 + hiring_ready * 0.30
        sources = ["ats_experience", "interview_recommendation", "hiring_readiness"]

    return {
        "score": _clamp(score),
        "sources": sources,
        "components": {
            "experience_alignment": exp_align,
            "recommendation": rec_str,
            "recommendation_score": rec_score,
            "hiring_readiness_score": hiring_ready,
        },
    }


# =========================================================================
# Radar Chart Data Builder
# =========================================================================

def _build_radar_chart_data(dimensions: Dict[str, int]) -> Dict[str, Any]:
    """Build Chart.js-compatible Radar Chart JSON."""
    return {
        "type": "radar",
        "labels": [label.replace("_", " ").title() for label in DIMENSION_LABELS],
        "datasets": [
            {
                "label": "Candidate DNA",
                "data": [dimensions.get(d, 0) for d in DIMENSION_LABELS],
                "backgroundColor": "rgba(99, 102, 241, 0.18)",
                "borderColor": "rgba(99, 102, 241, 1)",
                "pointBackgroundColor": "rgba(99, 102, 241, 1)",
                "pointBorderColor": "#fff",
                "pointHoverBackgroundColor": "#fff",
                "pointHoverBorderColor": "rgba(99, 102, 241, 1)",
            }
        ],
        "options": {
            "scales": {
                "r": {
                    "min": 0,
                    "max": 100,
                    "ticks": {"stepSize": 20}
                }
            }
        },
    }


# =========================================================================
# Capability Vectors Builder
# =========================================================================

def _build_capability_vectors(dimensions: Dict[str, int]) -> Dict[str, Any]:
    """
    Normalize dimension scores into a unit vector for cosine-similarity comparisons.
    Also produces per-dimension category classification.
    """
    values = [float(dimensions.get(d, 0)) for d in DIMENSION_LABELS]
    magnitude = math.sqrt(sum(v ** 2 for v in values)) or 1.0
    unit_vector = [round(v / magnitude, 6) for v in values]

    categories = {}
    for dim in DIMENSION_LABELS:
        score = dimensions.get(dim, 0)
        if score >= 80:
            category = "ELITE"
        elif score >= 65:
            category = "STRONG"
        elif score >= 50:
            category = "DEVELOPING"
        elif score >= 35:
            category = "EMERGING"
        else:
            category = "NEEDS_DEVELOPMENT"
        categories[dim] = {"score": score, "category": category}

    return {
        "raw_vector": values,
        "unit_vector": unit_vector,
        "magnitude": round(magnitude, 4),
        "dimension_categories": categories,
    }


# =========================================================================
# Comparative Analysis Builder
# =========================================================================

async def _build_comparative_analysis(
    db: AsyncSession,
    application: Application,
    dimensions: Dict[str, int],
) -> Dict[str, Any]:
    """
    Compare candidate dimensions against the cohort (same internship) averages.
    Requires at least 1 other DNA profile for the same internship.
    """
    internship_id = application.vacancy_id

    # Pull all DNA profiles for this internship (excluding current)
    stmt = (
        select(DNAProfile)
        .join(Application, Application.id == DNAProfile.application_id)
        .where(
            Application.vacancy_id == internship_id,
            Application.id != application.id,
            DNAProfile.deleted_at.is_(None),
            DNAProfile.problem_solving.is_not(None),  # only profiles with Phase 14 data
        )
    )
    result = await db.execute(stmt)
    peers = result.scalars().all()

    peer_count = len(peers)
    if peer_count == 0:
        return {
            "peer_count": 0,
            "message": "No cohort data available yet for comparison.",
            "percentile_ranks": {},
            "cohort_averages": {},
        }

    # Compute cohort averages per dimension
    cohort_avgs: Dict[str, float] = {}
    for dim in DIMENSION_LABELS:
        values = [float(getattr(p, dim, 0) or 0) for p in peers]
        cohort_avgs[dim] = round(sum(values) / len(values), 2)

    # Compute percentile ranks for candidate
    percentile_ranks: Dict[str, float] = {}
    for dim in DIMENSION_LABELS:
        cand_score = dimensions.get(dim, 0)
        peer_scores = [float(getattr(p, dim, 0) or 0) for p in peers]
        below = sum(1 for s in peer_scores if s < cand_score)
        equal = sum(1 for s in peer_scores if s == cand_score)
        percentile = (below + 0.5 * equal) / peer_count * 100
        percentile_ranks[dim] = round(percentile, 1)

    # Strength and gap identification
    strengths = [d for d in DIMENSION_LABELS if dimensions.get(d, 0) >= cohort_avgs.get(d, 0)]
    gaps = [d for d in DIMENSION_LABELS if dimensions.get(d, 0) < cohort_avgs.get(d, 0)]

    return {
        "peer_count": peer_count,
        "cohort_averages": cohort_avgs,
        "percentile_ranks": percentile_ranks,
        "strengths_vs_cohort": strengths,
        "gaps_vs_cohort": gaps,
        "overall_percentile": round(sum(percentile_ranks.values()) / len(percentile_ranks), 1),
    }


# =========================================================================
# Core DNAService
# =========================================================================

class DNAService:

    @staticmethod
    async def generate_dna_profile(
        db: AsyncSession,
        application_id: uuid.UUID,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = "SYSTEM",
    ) -> Optional[DNAProfile]:
        """
        Full DNA Engine computation for a given application.

        Steps:
          1. Load all result models (ATS, Simulation, Interview, Integrity, existing DNAProfile).
          2. Compute 9 capability dimensions using signal extractors.
          3. Build radar_chart_data (Chart.js format).
          4. Build capability_vectors (unit-normalized + category classification).
          5. Build comparative_analysis (cohort percentile ranks).
          6. Append to historical_trends.
          7. Upsert DNAProfile record.
          8. Return updated record.
        """
        # 1. Load all related data
        stmt = (
            select(Application)
            .where(Application.id == application_id)
            .options(
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.integrity_result),
                selectinload(Application.dna_profile),
            )
        )
        res = await db.execute(stmt)
        app = res.scalar_one_or_none()

        if not app:
            logger.error(f"DNAService: Application {application_id} not found.")
            return None

        ats = app.ats_result
        sim = app.simulation_result
        interview = app.interview_result
        integrity = app.integrity_result
        existing_dna = app.dna_profile  # may have legacy SBERT fields

        # 2. Compute all 9 capability dimensions
        ps_data = _compute_problem_solving(sim, interview)
        ex_data = _compute_execution(sim, existing_dna)
        cm_data = _compute_communication(interview, existing_dna)
        la_data = _compute_learning_ability(ats, existing_dna)
        ad_data = _compute_adaptability(sim, interview)
        cn_data = _compute_consistency(integrity)
        cf_data = _compute_confidence(interview, integrity)
        rf_data = _compute_role_fit(ats, existing_dna)
        lp_data = _compute_leadership_potential(ats, existing_dna, interview)

        dimensions: Dict[str, int] = {
            "problem_solving": ps_data["score"],
            "execution": ex_data["score"],
            "communication": cm_data["score"],
            "learning_ability": la_data["score"],
            "adaptability": ad_data["score"],
            "consistency": cn_data["score"],
            "confidence": cf_data["score"],
            "role_fit": rf_data["score"],
            "leadership_potential": lp_data["score"],
        }

        # 3. Radar Chart Data
        radar_chart_data = _build_radar_chart_data(dimensions)

        # 4. Capability Vectors
        capability_vectors = _build_capability_vectors(dimensions)

        # 5. Comparative Analysis
        comparative_analysis = await _build_comparative_analysis(db, app, dimensions)

        # 6. Historical trend entry
        trend_entry = {
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "actor_id": str(actor_id) if actor_id else None,
            "actor_role": actor_role,
            "dimensions": dimensions,
            "overall_percentile": comparative_analysis.get("overall_percentile"),
        }

        # 7. Upsert DNAProfile — always do an explicit SELECT to avoid stale relationship cache
        existing_stmt = select(DNAProfile).where(
            DNAProfile.application_id == application_id,
            DNAProfile.deleted_at.is_(None),
        )
        existing_res = await db.execute(existing_stmt)
        existing_dna = existing_res.scalar_one_or_none()

        if existing_dna is None:
            # Create minimal record (SBERT fields from ATS or defaults)
            dna_row = DNAProfile(
                application_id=application_id,
                technical_alignment=_safe_float(getattr(ats, "overall_score", None)),
                project_alignment=0.0,
                experience_alignment=0.0,
                domain_alignment=0.0,
                semantic_match_strength=0.0,
                readability=0.0,
                clarity=0.0,
                ats_compatibility=0.0,
                technical_depth=0.0,
                practical_exposure=0.0,
                internship_readiness=0.0,
                hiring_readiness_score=0.0,
                capability_score=float(sum(dimensions.values()) / len(dimensions)),
                candidate_level=_infer_candidate_level(dimensions),
                # Phase 14 dims
                **{d: v for d, v in dimensions.items()},
                radar_chart_data=radar_chart_data,
                capability_vectors=capability_vectors,
                comparative_analysis=comparative_analysis,
                historical_trends=[trend_entry],
            )
            db.add(dna_row)
            await db.flush()
        else:
            # Update Phase 14 fields on existing record
            dna_row = existing_dna
            for dim, val in dimensions.items():
                setattr(dna_row, dim, val)
            dna_row.radar_chart_data = radar_chart_data
            dna_row.capability_vectors = capability_vectors
            dna_row.comparative_analysis = comparative_analysis
            existing_trends = list(dna_row.historical_trends or [])
            existing_trends.append(trend_entry)
            dna_row.historical_trends = existing_trends
            # Update overall capability_score and level
            dna_row.capability_score = float(sum(dimensions.values()) / len(dimensions))
            dna_row.candidate_level = _infer_candidate_level(dimensions)

        await db.flush()

        logger.info(
            f"DNAService: Application {application_id} DNA generated — "
            f"Dimensions: {dimensions}"
        )

        # Phase 15 — Auto-trigger Ranking Engine after DNA is committed
        try:
            ranking_mod = _get_ranking_service()
            await ranking_mod.RankingService.compute_ranking(
                db,
                application_id=application_id,
                actor_id=actor_id,
                actor_role=actor_role,
            )
            logger.info(f"RankingService auto-triggered for Application {application_id}.")
        except Exception as exc:
            logger.error(f"RankingService auto-trigger failed for Application {application_id}: {exc}")

        return dna_row

    @staticmethod
    async def get_dna_profile(
        db: AsyncSession,
        application_id: uuid.UUID
    ) -> Optional[DNAProfile]:
        """Retrieve the current DNAProfile for an application."""
        stmt = select(DNAProfile).where(
            DNAProfile.application_id == application_id,
            DNAProfile.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_radar_chart_data(
        db: AsyncSession,
        application_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """Return Chart.js radar chart JSON for an application's DNA profile."""
        dna = await DNAService.get_dna_profile(db, application_id)
        if dna is None:
            return None
        if dna.radar_chart_data:
            return dna.radar_chart_data
        # Re-derive if not stored
        dims = {d: getattr(dna, d, 0) or 0 for d in DIMENSION_LABELS}
        return _build_radar_chart_data(dims)

    @staticmethod
    async def get_historical_trends(
        db: AsyncSession,
        application_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """Return historical DNA snapshots for an application."""
        dna = await DNAService.get_dna_profile(db, application_id)
        if dna is None:
            return []
        return list(dna.historical_trends or [])

    @staticmethod
    async def compare_applications(
        db: AsyncSession,
        application_ids: List[uuid.UUID],
    ) -> Dict[str, Any]:
        """
        Side-by-side capability comparison of multiple applications.
        Returns per-dimension scores and a ranked summary.
        """
        results = []
        for app_id in application_ids:
            dna = await DNAService.get_dna_profile(db, app_id)
            if dna is None:
                results.append({"application_id": str(app_id), "available": False})
                continue
            dims = {d: getattr(dna, d, 0) or 0 for d in DIMENSION_LABELS}
            avg = sum(dims.values()) / len(dims)
            results.append({
                "application_id": str(app_id),
                "available": True,
                "dimensions": dims,
                "overall_average": round(avg, 2),
                "candidate_level": dna.candidate_level,
                "vectors": dna.capability_vectors,
            })

        # Sort by overall_average descending
        ranked = sorted(
            [r for r in results if r.get("available")],
            key=lambda x: x.get("overall_average", 0),
            reverse=True,
        )
        for i, r in enumerate(ranked):
            r["rank"] = i + 1

        return {
            "comparison_count": len(application_ids),
            "ranked_results": ranked,
            "unavailable": [r["application_id"] for r in results if not r.get("available")],
        }


# =========================================================================
# Helpers
# =========================================================================

def _infer_candidate_level(dimensions: Dict[str, int]) -> str:
    """Infer overall candidate tier from dimension average."""
    avg = sum(dimensions.values()) / len(dimensions)
    if avg >= 80:
        return "ELITE"
    elif avg >= 65:
        return "STRONG"
    elif avg >= 50:
        return "DEVELOPING"
    elif avg >= 35:
        return "EMERGING"
    return "ENTRY"
