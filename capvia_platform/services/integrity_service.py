"""
CAPVIA Phase 13 — Integrity Engine
====================================
Aggregates risk, cheating, and AI-dependency signals from ATS, Coding Simulation,
and Interview phases into a unified Trust Index with full explainability and audit trail.

Scoring Formula:
  integrity_score = 100
    - ATS penalty (fraud flags / suspicion)
    - Simulation penalty (cheating risk level / high AI dependency)
    - Interview penalty (webcam violations / tab switches / phone detection)
  Bounded to [0, 100].

  ai_dependency_score = simulation_result.ai_dependency_score   (calibrated to [0.0, 1.0])

  trust_index = clamp(
      (integrity_score * integrity_weight)
      + ((1.0 - ai_dependency_score) * 100 * ai_weight)
      + (ats_score_normalized * ats_weight),
      0, 100
  )

Risk Level:
  CRITICAL  → trust_index < 50  OR critical signals present (phone/multi-face)
  HIGH      → trust_index < 65
  MEDIUM    → trust_index < 80
  LOW       → trust_index >= 80

Confidence Level:
  Completeness ratio based on which phases have real data (ATS 33%, Simulation 33%, Interview 34%).
"""
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.core.config import settings
from capvia_platform.models.models import (
    Application, ATSResult, SimulationResult, InterviewResult, IntegrityResult
)

logger = logging.getLogger("integrity_service")

# Deferred import to avoid circular dependency — DNAService imports models only
_dna_service_module = None

def _get_dna_service():
    global _dna_service_module
    if _dna_service_module is None:
        from capvia_platform.services import dna_service as _ds
        _dna_service_module = _ds
    return _dna_service_module

# =========================================================================
# Default calibration weights (used when Redis unavailable or not configured)
# =========================================================================
DEFAULT_WEIGHTS: Dict[str, float] = {
    "integrity_weight": 0.45,   # Proctoring / behavioral integrity contribution
    "ai_weight": 0.30,          # (1 - ai_dependency) × 100 contribution
    "ats_weight": 0.25,         # ATS score contribution
}

CALIBRATION_REDIS_KEY = "integrity_calibration_weights"
CALIBRATION_TTL_SECONDS = 86400  # 24 hours

# =========================================================================
# Helper: Redis connection
# =========================================================================
async def _get_redis() -> Optional[aioredis.Redis]:
    if settings.REDIS_URL:
        try:
            pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
            return aioredis.Redis(connection_pool=pool)
        except Exception as exc:
            logger.warning(f"Integrity Engine: Redis unavailable — {exc}")
    return None


# =========================================================================
# Calibration Helpers
# =========================================================================
async def get_calibration_weights(redis_client: Optional[aioredis.Redis] = None) -> Dict[str, float]:
    """Load calibration weights from Redis; fall back to DEFAULT_WEIGHTS."""
    if redis_client:
        try:
            raw = await redis_client.get(CALIBRATION_REDIS_KEY)
            if raw:
                loaded = json.loads(raw)
                weights = {**DEFAULT_WEIGHTS, **loaded}
                return weights
        except Exception as exc:
            logger.warning(f"Integrity calibration load failed — {exc}")
    return dict(DEFAULT_WEIGHTS)


async def calibrate_weights(
    weights: Dict[str, float],
    redis_client: Optional[aioredis.Redis] = None
) -> Dict[str, float]:
    """Persist custom calibration weights to Redis and return validated weights."""
    validated: Dict[str, float] = {}
    for key in DEFAULT_WEIGHTS:
        val = float(weights.get(key, DEFAULT_WEIGHTS[key]))
        val = max(0.0, min(1.0, val))
        validated[key] = val

    if redis_client:
        try:
            await redis_client.setex(CALIBRATION_REDIS_KEY, CALIBRATION_TTL_SECONDS, json.dumps(validated))
            logger.info("Integrity calibration weights saved to Redis.")
        except Exception as exc:
            logger.warning(f"Integrity calibration persist failed — {exc}")

    return validated


# =========================================================================
# Internal Penalty Calculators
# =========================================================================

def _compute_ats_penalty(ats: Optional[ATSResult]) -> Dict[str, Any]:
    """Derive ATS-based penalty and signals."""
    penalty = 0
    signals = []
    ats_score_normalized = 0.0

    if ats is None:
        return {"penalty": penalty, "signals": signals, "ats_score_normalized": ats_score_normalized, "available": False}

    ats_score_normalized = float(ats.overall_score) / 100.0

    if ats.is_suspicious:
        penalty += 15
        signals.append({"signal": "ats_suspicious_resume", "severity": "HIGH", "penalty": 15,
                         "reason": "ATS flagged the resume as potentially fabricated."})

    fraud_prob = float(ats.fraud_probability)
    if fraud_prob > 0.70:
        p = 20
        penalty += p
        signals.append({"signal": "ats_high_fraud_probability", "severity": "CRITICAL", "penalty": p,
                         "reason": f"Fraud probability {fraud_prob:.0%} exceeds HIGH threshold (70%)."})
    elif fraud_prob > 0.40:
        p = 10
        penalty += p
        signals.append({"signal": "ats_moderate_fraud_probability", "severity": "MEDIUM", "penalty": p,
                         "reason": f"Fraud probability {fraud_prob:.0%} exceeds MEDIUM threshold (40%)."})

    return {"penalty": penalty, "signals": signals, "ats_score_normalized": ats_score_normalized, "available": True}


def _compute_simulation_penalty(sim: Optional[SimulationResult]) -> Dict[str, Any]:
    """Derive Simulation-based penalty and signals."""
    penalty = 0
    signals = []
    ai_dependency_score = 0.0

    if sim is None:
        return {"penalty": penalty, "signals": signals, "ai_dependency_score": ai_dependency_score, "available": False}

    ai_dependency_score = float(sim.ai_dependency_score)
    risk_str = str(sim.cheating_risk_level).upper()

    if risk_str == "CRITICAL":
        p = 30
        penalty += p
        signals.append({"signal": "simulation_critical_cheating_risk", "severity": "CRITICAL", "penalty": p,
                         "reason": "Simulation engine flagged candidate at CRITICAL cheating risk."})
    elif risk_str == "HIGH" or risk_str == "SUSPICIOUS":
        p = 20
        penalty += p
        signals.append({"signal": "simulation_high_cheating_risk", "severity": "HIGH", "penalty": p,
                         "reason": f"Simulation engine flagged candidate at {risk_str} cheating risk."})

    if ai_dependency_score >= 0.75:
        p = 20
        penalty += p
        signals.append({"signal": "simulation_extreme_ai_dependency", "severity": "HIGH", "penalty": p,
                         "reason": f"AI dependency score {ai_dependency_score:.0%} is extremely high (>75%)."})
    elif ai_dependency_score >= 0.50:
        p = 10
        penalty += p
        signals.append({"signal": "simulation_high_ai_dependency", "severity": "MEDIUM", "penalty": p,
                         "reason": f"AI dependency score {ai_dependency_score:.0%} is high (>50%)."})

    return {"penalty": penalty, "signals": signals, "ai_dependency_score": ai_dependency_score, "available": True}


def _compute_interview_penalty(
    interview: Optional[InterviewResult],
    integrity_row: Optional[IntegrityResult]
) -> Dict[str, Any]:
    """Derive Interview + Proctoring based penalty and signals."""
    penalty = 0
    signals = []
    has_critical = False

    if integrity_row is None and interview is None:
        return {"penalty": penalty, "signals": signals, "has_critical": has_critical, "available": False}

    # Grab proctoring metrics from integrity_row
    phone = getattr(integrity_row, "phone_detections_count", 0) or 0
    multi_face = getattr(integrity_row, "multi_face_events", 0) or 0
    tab_sw = getattr(integrity_row, "tab_switches", 0) or 0
    copy_p = getattr(integrity_row, "copy_pastes", 0) or 0
    look_away = getattr(integrity_row, "look_away_count", 0) or 0
    face_absent = getattr(integrity_row, "face_absences_count", 0) or 0
    susp_keys = getattr(integrity_row, "suspicious_keys", 0) or 0

    # Phone detected — severe signal
    if phone > 0:
        p = 25 + (phone - 1) * 10
        penalty += p
        has_critical = True
        signals.append({"signal": "interview_phone_detected", "severity": "CRITICAL", "penalty": p,
                         "reason": f"Phone detected {phone} time(s) during video interview."})

    # Multi-face events
    if multi_face > 0:
        p = multi_face * 10
        penalty += p
        has_critical = True
        signals.append({"signal": "interview_multi_face", "severity": "CRITICAL", "penalty": p,
                         "reason": f"Multiple faces detected {multi_face} time(s) suggesting impersonation."})

    # Face absences (after 1 free)
    if face_absent > 1:
        p = (face_absent - 1) * 7
        penalty += p
        signals.append({"signal": "interview_face_absent", "severity": "HIGH", "penalty": p,
                         "reason": f"Candidate left frame {face_absent} time(s)."})

    # Gaze look-aways (after 3 free)
    if look_away > 3:
        p = (look_away - 3) * 4
        penalty += p
        signals.append({"signal": "interview_look_away", "severity": "MEDIUM", "penalty": p,
                         "reason": f"Candidate looked away {look_away} time(s) (threshold: 3 free)."})

    # Tab switches
    if tab_sw > 0:
        p = tab_sw * 5
        penalty += p
        signals.append({"signal": "interview_tab_switches", "severity": "MEDIUM", "penalty": p,
                         "reason": f"Candidate switched browser tab {tab_sw} time(s)."})

    # Copy-paste events
    if copy_p > 0:
        p = copy_p * 10
        penalty += p
        signals.append({"signal": "interview_copy_pastes", "severity": "HIGH", "penalty": p,
                         "reason": f"Copy-paste detected {copy_p} time(s) during interview."})

    # Suspicious key presses
    if susp_keys > 0:
        p = susp_keys * 5
        penalty += p
        signals.append({"signal": "interview_suspicious_keys", "severity": "MEDIUM", "penalty": p,
                         "reason": f"Suspicious key combinations detected {susp_keys} time(s)."})

    # Interview answer quality cross-check
    if interview:
        cheat_prob = getattr(interview, "cheating_probability_pct", 0) or 0
        if cheat_prob > 70:
            p = 15
            penalty += p
            signals.append({"signal": "interview_high_cheating_probability", "severity": "HIGH", "penalty": p,
                             "reason": f"Interview engine reported cheating probability of {cheat_prob}%."})

    return {"penalty": penalty, "signals": signals, "has_critical": has_critical, "available": True}


def _determine_risk_level(trust_index: int, has_critical_signal: bool) -> str:
    if has_critical_signal or trust_index < 50:
        return "CRITICAL"
    elif trust_index < 65:
        return "HIGH"
    elif trust_index < 80:
        return "MEDIUM"
    return "LOW"


def _determine_confidence_level(ats_available: bool, sim_available: bool, interview_available: bool) -> float:
    """Confidence represents data completeness across all three evaluation phases."""
    score = 0.0
    if ats_available:
        score += 0.33
    if sim_available:
        score += 0.33
    if interview_available:
        score += 0.34
    return round(score, 4)


# =========================================================================
# Core IntegrityService
# =========================================================================

class IntegrityService:

    @staticmethod
    async def calculate_integrity_assessment(
        db: AsyncSession,
        application_id: uuid.UUID,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = "SYSTEM",
    ) -> Optional[IntegrityResult]:
        """
        Full Integrity Engine computation for a given application.

        Steps:
          1. Load all result models from DB.
          2. Compute ATS, Simulation, Interview penalties + signals.
          3. Apply calibration weights.
          4. Derive integrity_score, ai_dependency_score, trust_index,
             risk_level, confidence_level.
          5. Build explainability JSON and scoring_formula snapshot.
          6. Append to audit_trail and historical_tracking.
          7. Persist updated IntegrityResult.
          8. Return the updated record.
        """
        # 1. Load all related results for the application
        stmt = (
            select(Application)
            .where(Application.id == application_id)
            .options(
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.integrity_result),
            )
        )
        res = await db.execute(stmt)
        app = res.scalar_one_or_none()

        if not app:
            logger.error(f"IntegrityService: Application {application_id} not found.")
            return None

        ats = app.ats_result
        sim = app.simulation_result
        interview = app.interview_result
        integrity_row = app.integrity_result

        if integrity_row is None:
            logger.warning(
                f"IntegrityService: No IntegrityResult row for application {application_id}. "
                "Ensure interview proctoring was saved first."
            )
            return None

        # 2. Compute penalties per phase
        redis_client = await _get_redis()
        weights = await get_calibration_weights(redis_client)

        ats_data = _compute_ats_penalty(ats)
        sim_data = _compute_simulation_penalty(sim)
        int_data = _compute_interview_penalty(interview, integrity_row)

        total_penalty = ats_data["penalty"] + sim_data["penalty"] + int_data["penalty"]
        all_signals: List[Dict] = ats_data["signals"] + sim_data["signals"] + int_data["signals"]
        has_critical = int_data["has_critical"]

        # 3. Compute integrity_score
        integrity_score = max(0, min(100, 100 - total_penalty))

        # 4. AI dependency score from Simulation
        ai_dependency_score = sim_data["ai_dependency_score"]

        # 5. ATS normalized score
        ats_score_norm = ats_data["ats_score_normalized"]

        # 6. Trust Index
        trust_raw = (
            (integrity_score * weights["integrity_weight"])
            + ((1.0 - ai_dependency_score) * 100.0 * weights["ai_weight"])
            + (ats_score_norm * 100.0 * weights["ats_weight"])
        )
        trust_index = int(max(0, min(100, round(trust_raw))))

        # 7. Risk Level & Confidence
        risk_level = _determine_risk_level(trust_index, has_critical)
        confidence_level = _determine_confidence_level(
            ats_data["available"], sim_data["available"], int_data["available"]
        )

        # 8. Explainability JSON
        explainability = {
            "summary": (
                f"Integrity Score: {integrity_score}/100. "
                f"Trust Index: {trust_index}/100. "
                f"Risk Level: {risk_level}. "
                f"AI Dependency: {ai_dependency_score:.0%}. "
                f"Confidence: {confidence_level:.0%}."
            ),
            "signals": all_signals,
            "phase_breakdown": {
                "ats": {
                    "available": ats_data["available"],
                    "penalty": ats_data["penalty"],
                    "ats_score_pct": round(ats_score_norm * 100, 1),
                },
                "simulation": {
                    "available": sim_data["available"],
                    "penalty": sim_data["penalty"],
                    "ai_dependency_pct": round(ai_dependency_score * 100, 1),
                },
                "interview": {
                    "available": int_data["available"],
                    "penalty": int_data["penalty"],
                    "has_critical_violation": has_critical,
                },
            },
        }

        # 9. Scoring formula snapshot
        scoring_formula = {
            "formula": (
                "integrity_score = 100 - total_penalty (bounded [0,100]); "
                "trust_index = (integrity_score * integrity_weight) "
                "+ ((1 - ai_dependency) * 100 * ai_weight) "
                "+ (ats_score * 100 * ats_weight)"
            ),
            "values": {
                "total_penalty": total_penalty,
                "integrity_score": integrity_score,
                "ai_dependency_score": ai_dependency_score,
                "ats_score_normalized": ats_score_norm,
                "trust_raw": round(trust_raw, 4),
                "trust_index": trust_index,
            },
            "weights_used": weights,
        }

        # 10. Calibration logic snapshot
        calibration_logic = {
            "weights": weights,
            "source": "redis" if redis_client else "local_default",
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

        # 11. New audit trail entry
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor_id": str(actor_id) if actor_id else None,
            "actor_role": actor_role,
            "action": "INTEGRITY_ASSESSMENT_COMPUTED",
            "integrity_score": integrity_score,
            "trust_index": trust_index,
            "risk_level": risk_level,
            "confidence_level": confidence_level,
        }

        existing_audit: List = list(integrity_row.audit_trail or [])
        existing_audit.append(audit_entry)

        # 12. Historical tracking entry
        history_entry = {
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "integrity_score": integrity_score,
            "ai_dependency_score": ai_dependency_score,
            "trust_index": trust_index,
            "risk_level": risk_level,
            "confidence_level": confidence_level,
            "total_penalty": total_penalty,
            "signal_count": len(all_signals),
        }
        existing_history: List = list(integrity_row.historical_tracking or [])
        existing_history.append(history_entry)

        # 13. Persist updates on the IntegrityResult row
        integrity_row.integrity_score = integrity_score
        integrity_row.ai_dependency_score = ai_dependency_score
        integrity_row.trust_index = trust_index
        integrity_row.compiled_risk_level = risk_level
        integrity_row.confidence_level = confidence_level
        integrity_row.explainability = explainability
        integrity_row.scoring_formula = scoring_formula
        integrity_row.calibration_logic = calibration_logic
        integrity_row.audit_trail = existing_audit
        integrity_row.historical_tracking = existing_history

        await db.flush()

        logger.info(
            f"IntegrityService: Application {application_id} assessed — "
            f"Trust={trust_index}, Risk={risk_level}, Confidence={confidence_level:.0%}"
        )

        # Phase 14 — Auto-trigger DNA Engine after integrity is committed
        try:
            dna_mod = _get_dna_service()
            await dna_mod.DNAService.generate_dna_profile(
                db,
                application_id=application_id,
                actor_id=actor_id,
                actor_role=actor_role,
            )
            logger.info(f"DNAService auto-triggered for Application {application_id}.")
        except Exception as exc:
            logger.error(f"DNAService auto-trigger failed for Application {application_id}: {exc}")

        return integrity_row

    @staticmethod
    async def get_integrity_assessment(
        db: AsyncSession,
        application_id: uuid.UUID
    ) -> Optional[IntegrityResult]:
        """Retrieve the current IntegrityResult for an application."""
        stmt = select(IntegrityResult).where(
            IntegrityResult.application_id == application_id,
            IntegrityResult.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_calibration_snapshot() -> Dict[str, float]:
        """Return the currently active calibration weights."""
        redis_client = await _get_redis()
        return await get_calibration_weights(redis_client)

    @staticmethod
    async def update_calibration(weights: Dict[str, float]) -> Dict[str, float]:
        """Save new calibration weights to Redis and return the validated set."""
        redis_client = await _get_redis()
        return await calibrate_weights(weights, redis_client)
