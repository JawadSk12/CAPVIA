"""
CAPVIA Phase 13 — Integrity Engine Router
==========================================
Endpoints:
  POST /integrity/{application_id}/evaluate  — HR/System: Force integrity re-assessment
  GET  /integrity/{application_id}           — HR/System/Candidate: Retrieve results
  POST /integrity/calibrate                  — Admin/System: Update calibration weights
  GET  /integrity/calibration                — Admin/System: View active calibration weights
"""
import uuid
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from capvia_platform.api.dependencies import get_db, get_current_user, get_system_auth
from capvia_platform.core.exceptions import ResourceNotFoundException, AuthorizationException
from capvia_platform.models.models import Application, IntegrityResult, UserRole
from capvia_platform.services.integrity_service import IntegrityService

logger = logging.getLogger("integrity_router")
router = APIRouter()


def _format_integrity_response(row: IntegrityResult) -> dict:
    return {
        "application_id": str(row.application_id),
        "focus_percentage": row.focus_percentage,
        "look_away_count": row.look_away_count,
        "tab_switches": row.tab_switches,
        "copy_pastes": row.copy_pastes,
        "phone_detections_count": row.phone_detections_count,
        "multi_face_events": row.multi_face_events,
        "face_absences_count": row.face_absences_count,
        "suspicious_keys": row.suspicious_keys,
        "violations": row.violations,
        "integrity_score": row.integrity_score,
        "ai_dependency_score": float(row.ai_dependency_score) if row.ai_dependency_score is not None else None,
        "trust_index": row.trust_index,
        "risk_level": row.compiled_risk_level,
        "confidence_level": float(row.confidence_level) if row.confidence_level is not None else None,
        "explainability": row.explainability,
        "scoring_formula": row.scoring_formula,
        "calibration_logic": row.calibration_logic,
        "audit_trail": row.audit_trail,
        "historical_tracking": row.historical_tracking,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.post("/integrity/{application_id}/evaluate", tags=["Integrity Engine"])
async def evaluate_integrity(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Force a full Integrity Engine re-assessment for an application."""
    user_role = current_user.role.value
    user_id_str = str(current_user.id)

    allowed_roles = {UserRole.HR.value, UserRole.ADMIN.value}
    if user_role not in allowed_roles:
        raise AuthorizationException("Only HR or Admin can run integrity assessments.")

    app_uuid = uuid.UUID(application_id)

    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    actor_uuid = uuid.UUID(user_id_str) if user_id_str else None
    integrity_row = await IntegrityService.calculate_integrity_assessment(
        db,
        application_id=app_uuid,
        actor_id=actor_uuid,
        actor_role=user_role or "SYSTEM"
    )

    if not integrity_row:
        return {
            "success": False,
            "message": "Integrity assessment could not be computed. Ensure interview proctoring data exists.",
            "application_id": application_id
        }

    await db.commit()

    return {
        "success": True,
        "message": "Integrity assessment computed successfully.",
        "result": _format_integrity_response(integrity_row)
    }


@router.get("/integrity/{application_id}", tags=["Integrity Engine"])
async def get_integrity(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the current integrity assessment for an application."""
    app_uuid = uuid.UUID(application_id)

    user_role = current_user.role.value
    user_id_str = str(current_user.id)

    if user_role == UserRole.STUDENT.value:
        stmt = select(Application).where(Application.id == app_uuid)
        res = await db.execute(stmt)
        app = res.scalar_one_or_none()
        if not app:
            raise ResourceNotFoundException("Application", application_id)
        if user_id_str and str(app.candidate_id) != user_id_str:
            raise AuthorizationException("Candidates can only view their own integrity results.")

    integrity_row = await IntegrityService.get_integrity_assessment(db, app_uuid)
    if not integrity_row:
        raise ResourceNotFoundException("IntegrityResult", application_id)

    return _format_integrity_response(integrity_row)


@router.post("/integrity/calibrate", tags=["Integrity Engine"])
async def set_calibration_weights(
    weights: dict,
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """Update Integrity Engine calibration weights (System/Admin only)."""
    validated = await IntegrityService.update_calibration(weights)
    return {
        "success": True,
        "message": "Calibration weights updated successfully.",
        "weights": validated
    }


@router.get("/integrity/calibration", tags=["Integrity Engine"])
async def get_calibration_weights(
    system_claims: dict = Depends(get_system_auth)
):
    """Retrieve the currently active Integrity Engine calibration weights."""
    weights = await IntegrityService.get_calibration_snapshot()
    return {
        "weights": weights,
        "description": {
            "integrity_weight": "Contribution of behavioral integrity score.",
            "ai_weight": "Contribution of (1 - ai_dependency_score) x 100.",
            "ats_weight": "Contribution of normalized ATS overall score.",
        }
    }
