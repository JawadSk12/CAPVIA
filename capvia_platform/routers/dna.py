"""
CAPVIA Phase 14 — DNA Engine Router
=====================================
Endpoints:
  POST /dna/{application_id}/generate   — HR/Admin/System: Force DNA profile generation
  GET  /dna/{application_id}            — HR/Admin/Candidate (own): Retrieve full DNA profile
  GET  /dna/{application_id}/radar      — HR/Admin/Candidate (own): Retrieve radar chart JSON
  GET  /dna/{application_id}/history    — HR/Admin/Candidate (own): Retrieve historical trends
  POST /dna/compare                     — HR/Admin: Side-by-side comparison of multiple applications
"""
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from capvia_platform.api.dependencies import get_db, get_current_user
from capvia_platform.core.exceptions import ResourceNotFoundException, AuthorizationException
from capvia_platform.models.models import Application, DNAProfile, UserRole
from capvia_platform.services.dna_service import DNAService, DIMENSION_LABELS

logger = logging.getLogger("dna_router")
router = APIRouter()

# =========================================================================
# Response Formatter
# =========================================================================

def _format_dna_response(dna: DNAProfile) -> dict:
    return {
        "id": str(dna.id),
        "application_id": str(dna.application_id),
        # Capability Dimensions
        "capability_dimensions": {
            d: getattr(dna, d, None) for d in DIMENSION_LABELS
        },
        # Overall metrics
        "capability_score": float(dna.capability_score) if dna.capability_score is not None else None,
        "candidate_level": dna.candidate_level,
        # ATS SBERT-era fields (for completeness)
        "ats_signals": {
            "technical_alignment": float(dna.technical_alignment),
            "project_alignment": float(dna.project_alignment),
            "experience_alignment": float(dna.experience_alignment),
            "domain_alignment": float(dna.domain_alignment),
            "semantic_match_strength": float(dna.semantic_match_strength),
            "readability": float(dna.readability),
            "clarity": float(dna.clarity),
            "ats_compatibility": float(dna.ats_compatibility),
            "technical_depth": float(dna.technical_depth),
            "practical_exposure": float(dna.practical_exposure),
            "internship_readiness": float(dna.internship_readiness),
            "hiring_readiness_score": float(dna.hiring_readiness_score),
        },
        # Phase 14 derived structures
        "radar_chart_data": dna.radar_chart_data,
        "capability_vectors": dna.capability_vectors,
        "comparative_analysis": dna.comparative_analysis,
        "historical_trends": dna.historical_trends,
        "created_at": dna.created_at.isoformat() if dna.created_at else None,
        "updated_at": dna.updated_at.isoformat() if dna.updated_at else None,
    }


def _assert_access(current_user: dict, app: Application):
    """RBAC guard: Candidates can only view their own DNA; HR/Admin/System see all."""
    role = current_user.get("role", "")
    if role == UserRole.STUDENT.value:
        user_id = current_user.get("sub") or current_user.get("user_id")
        if user_id and str(app.candidate_id) != user_id:
            raise AuthorizationException("Candidates can only view their own DNA profile.")


# =========================================================================
# Endpoints
# =========================================================================

@router.post("/dna/{application_id}/generate", tags=["DNA Engine"])
async def generate_dna(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Force a full DNA Engine profile generation for an application.
    Accessible by HR, Admin, or System.
    """
    role = current_user.get("role", "")
    allowed = {UserRole.HR.value, UserRole.ADMIN.value, "HR", "ADMIN", "system_admin"}
    if role not in allowed:
        roles_list = current_user.get("roles", [])
        if "system_admin" not in roles_list:
            raise AuthorizationException("Only HR, Admin, or System can generate DNA profiles.")

    app_uuid = uuid.UUID(application_id)
    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    user_id_str = current_user.get("sub") or current_user.get("user_id")
    actor_uuid = uuid.UUID(user_id_str) if user_id_str else None

    dna = await DNAService.generate_dna_profile(
        db,
        application_id=app_uuid,
        actor_id=actor_uuid,
        actor_role=role or "SYSTEM"
    )

    if not dna:
        return {
            "success": False,
            "message": "DNA profile could not be generated. Application data may be incomplete.",
            "application_id": application_id,
        }

    await db.commit()
    return {
        "success": True,
        "message": "DNA profile generated successfully.",
        "result": _format_dna_response(dna),
    }


@router.get("/dna/{application_id}", tags=["DNA Engine"])
async def get_dna(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the full DNA profile for an application.
    Candidates can only view their own profile.
    """
    app_uuid = uuid.UUID(application_id)

    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    _assert_access(current_user, app)

    dna = await DNAService.get_dna_profile(db, app_uuid)
    if not dna:
        raise ResourceNotFoundException("DNAProfile", application_id)

    return _format_dna_response(dna)


@router.get("/dna/{application_id}/radar", tags=["DNA Engine"])
async def get_radar_chart(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve Chart.js-compatible radar chart JSON for a DNA profile.
    """
    app_uuid = uuid.UUID(application_id)

    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    _assert_access(current_user, app)

    radar = await DNAService.get_radar_chart_data(db, app_uuid)
    if radar is None:
        raise ResourceNotFoundException("DNAProfile radar data", application_id)

    return {
        "application_id": application_id,
        "radar_chart": radar,
    }


@router.get("/dna/{application_id}/history", tags=["DNA Engine"])
async def get_dna_history(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve historical DNA snapshots for trend analysis.
    """
    app_uuid = uuid.UUID(application_id)

    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    _assert_access(current_user, app)

    trends = await DNAService.get_historical_trends(db, app_uuid)
    return {
        "application_id": application_id,
        "snapshot_count": len(trends),
        "historical_trends": trends,
    }


@router.post("/dna/compare", tags=["DNA Engine"])
async def compare_dna_profiles(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Side-by-side capability comparison of multiple applications.

    Body: { "application_ids": ["uuid1", "uuid2", ...] }
    Accessible by HR and Admin only.
    """
    role = current_user.get("role", "")
    allowed = {UserRole.HR.value, UserRole.ADMIN.value, "HR", "ADMIN"}
    if role not in allowed:
        raise AuthorizationException("Only HR or Admin can perform DNA comparisons.")

    raw_ids = body.get("application_ids", [])
    if not raw_ids or len(raw_ids) < 2:
        return {
            "success": False,
            "message": "Provide at least 2 application_ids for comparison.",
        }
    if len(raw_ids) > 20:
        return {
            "success": False,
            "message": "Maximum 20 applications can be compared at once.",
        }

    app_uuids: List[uuid.UUID] = []
    for raw in raw_ids:
        try:
            app_uuids.append(uuid.UUID(str(raw)))
        except ValueError:
            return {"success": False, "message": f"Invalid UUID: {raw}"}

    comparison = await DNAService.compare_applications(db, app_uuids)
    return {
        "success": True,
        **comparison,
    }
