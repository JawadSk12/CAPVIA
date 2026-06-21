"""
CAPVIA Phase 15 — Ranking Engine Router
=========================================
Endpoints:
  POST /rankings/{application_id}/compute   — HR/Admin/System: Force ranking computation
  GET  /rankings/{application_id}           — HR/Admin/Candidate (own): Retrieve ranking
  GET  /rankings/internship/{internship_id} — HR/Admin: Internship leaderboard
  GET  /rankings/internship/{internship_id}/analytics — HR/Admin: Cohort analytics
  POST /rankings/internship/{internship_id}/rerank    — HR/Admin: Re-rank all cohort
  POST /rankings/compare                    — HR/Admin: Side-by-side comparison
"""
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from capvia_platform.api.dependencies import get_db, get_current_user
from capvia_platform.core.exceptions import ResourceNotFoundException, AuthorizationException
from capvia_platform.models.models import Application, Ranking, UserRole
from capvia_platform.services.ranking_service import RankingService, _format_ranking_row

logger = logging.getLogger("rankings_router")
router = APIRouter()


# =========================================================================
# RBAC guard helpers
# =========================================================================

def _assert_hr_or_admin(current_user: dict):
    role = current_user.get("role", "")
    allowed = {UserRole.HR.value, UserRole.ADMIN.value, "HR", "ADMIN", "system_admin"}
    if role not in allowed:
        roles_list = current_user.get("roles", [])
        if "system_admin" not in roles_list:
            raise AuthorizationException("Only HR, Admin, or System can access this endpoint.")


def _assert_candidate_access(current_user: dict, app: Application):
    """Candidates can only view their own ranking; HR/Admin see all."""
    role = current_user.get("role", "")
    if role == UserRole.STUDENT.value:
        user_id = current_user.get("sub") or current_user.get("user_id")
        if user_id and str(app.candidate_id) != user_id:
            raise AuthorizationException("Candidates can only view their own ranking.")


# =========================================================================
# Endpoints
# =========================================================================

@router.post("/rankings/{application_id}/compute", tags=["Ranking Engine"])
async def compute_ranking(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Force a full Ranking Engine computation for an application.
    Accessible by HR, Admin, or System only.

    Computes:
      - Weighted final_score (ATS 25% + Sim 30% + Interview 25% + Integrity 20%)
      - Internship rank, company rank, global percentile
      - Recommendation tier (PLATINUM / GOLD / SILVER / BRONZE / UNRANKED)
      - Top-candidate flag (top 10 % of internship cohort)
      - Explainability, score_breakdown, ranking_analytics
    """
    _assert_hr_or_admin(current_user)

    app_uuid = uuid.UUID(application_id)
    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    user_id_str = current_user.get("sub") or current_user.get("user_id")
    actor_uuid = uuid.UUID(user_id_str) if user_id_str else None
    role = current_user.get("role", "SYSTEM")

    ranking = await RankingService.compute_ranking(
        db,
        application_id=app_uuid,
        actor_id=actor_uuid,
        actor_role=role,
    )

    if not ranking:
        return {
            "success": False,
            "message": "Ranking could not be computed. Application data may be incomplete.",
            "application_id": application_id,
        }

    await db.commit()
    return {
        "success": True,
        "message": "Ranking computed successfully.",
        "result": _format_ranking_row(ranking),
    }


@router.get("/rankings/{application_id}", tags=["Ranking Engine"])
async def get_ranking(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the current ranking for an application.
    Candidates can only access their own ranking.
    """
    app_uuid = uuid.UUID(application_id)

    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)

    _assert_candidate_access(current_user, app)

    ranking = await RankingService.get_ranking(db, app_uuid)
    if not ranking:
        raise ResourceNotFoundException("Ranking", application_id)

    return _format_ranking_row(ranking)


@router.get("/rankings/internship/{internship_id}", tags=["Ranking Engine"])
async def get_internship_leaderboard(
    internship_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200, description="Max candidates to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
):
    """
    Retrieve the ranked leaderboard for an internship.
    Ordered by internship_rank ascending (rank 1 = highest scorer).
    HR/Admin only.
    """
    _assert_hr_or_admin(current_user)

    internship_uuid = uuid.UUID(internship_id)
    leaderboard = await RankingService.get_internship_leaderboard(
        db, internship_uuid, limit=limit, offset=offset
    )

    return {
        "internship_id": internship_id,
        "count": len(leaderboard),
        "limit": limit,
        "offset": offset,
        "leaderboard": leaderboard,
    }


@router.get("/rankings/internship/{internship_id}/analytics", tags=["Ranking Engine"])
async def get_internship_analytics(
    internship_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve aggregate ranking analytics for an internship cohort:
    score distribution, tier counts, mean/median, top-candidate list.
    HR/Admin only.
    """
    _assert_hr_or_admin(current_user)

    internship_uuid = uuid.UUID(internship_id)
    analytics = await RankingService.get_internship_analytics(db, internship_uuid)

    return {
        "success": True,
        "analytics": analytics,
    }


@router.post("/rankings/internship/{internship_id}/rerank", tags=["Ranking Engine"])
async def rerank_internship_cohort(
    internship_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Re-compute rankings for ALL applications in an internship cohort.

    Use this when a new candidate completes the evaluation pipeline to update
    the relative rankings of all previously ranked candidates.
    HR/Admin only.
    """
    _assert_hr_or_admin(current_user)

    internship_uuid = uuid.UUID(internship_id)
    user_id_str = current_user.get("sub") or current_user.get("user_id")
    actor_uuid = uuid.UUID(user_id_str) if user_id_str else None
    role = current_user.get("role", "SYSTEM")

    summary = await RankingService.rank_internship_cohort(
        db,
        internship_id=internship_uuid,
        actor_id=actor_uuid,
        actor_role=role,
    )

    await db.commit()
    return {
        "success": True,
        "message": f"Cohort re-ranking complete. {summary['success']}/{summary['total']} applications ranked.",
        **summary,
    }


@router.post("/rankings/compare", tags=["Ranking Engine"])
async def compare_rankings(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Side-by-side ranking comparison of multiple applications.

    Body: { "application_ids": ["uuid1", "uuid2", ...] }
    Accessible by HR and Admin only.
    Returns each candidate's full ranking breakdown plus a relative comparison rank.
    """
    _assert_hr_or_admin(current_user)

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

    comparison = await RankingService.compare_rankings(db, app_uuids)
    return {
        "success": True,
        **comparison,
    }
