"""
CAPVIA Phase 8 — Internships Router
14 endpoints covering CRUD + search/filter + lifecycle + analytics.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.api.dependencies import get_db, get_current_user, RoleChecker
from capvia_platform.schemas.schemas import (
    InternshipCreateRequest, InternshipUpdateRequest,
    InternshipResponse, InternshipListResponse, InternshipAnalyticsResponse
)
from capvia_platform.models.models import User
from capvia_platform.services.internship_service import InternshipService

router = APIRouter(prefix="/internships", tags=["Internships"])

# =========================================================================
# Marketplace — Public Read
# =========================================================================

@router.get("", summary="List & search internships (marketplace)")
async def list_internships(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Full-text search on title/description/location"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    status: Optional[str] = Query(None, description="DRAFT|PUBLISHED|CLOSED|ARCHIVED (HR/Admin only)"),
    work_mode: Optional[str] = Query(None, description="REMOTE|HYBRID|ONSITE"),
    experience_level: Optional[str] = Query(None, description="ENTRY|MID|SENIOR"),
    location: Optional[str] = Query(None, description="Filter by location (partial match)"),
    has_stipend: Optional[bool] = Query(None, description="True = paid only, False = unpaid only"),
    sort_by: str = Query("created_at", description="created_at|view_count|stipend_min|application_deadline|title"),
    sort_dir: str = Query("desc", description="asc|desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marketplace listing with full search, filters, sort, and pagination.
    Candidates see only PUBLISHED internships.
    HR/Admin can filter by any status.
    """
    return await InternshipService.list_internships(
        db,
        page=page,
        per_page=per_page,
        search=search,
        company_id=company_id,
        status=status,
        work_mode=work_mode,
        experience_level=experience_level,
        location=location,
        has_stipend=has_stipend,
        sort_by=sort_by,
        sort_dir=sort_dir,
        current_user=current_user,
    )


@router.get("/manage", summary="HR management view — user's created internships")
async def list_my_internships(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """
    Returns internships created by the current HR user (or all for admin).
    Supports status filtering for Draft/Published/Closed/Archived tabs.
    """
    created_by = None if current_user.role.value == "ADMIN" else str(current_user.id)
    return await InternshipService.list_internships(
        db,
        page=page,
        per_page=per_page,
        company_id=company_id,
        status=status,
        current_user=current_user,
        created_by=created_by,
    )


@router.get("/{internship_id}", summary="Get internship detail")
async def get_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the full internship profile.
    Increments view counter for published internships viewed by candidates.
    """
    from capvia_platform.models.models import UserRole
    increment = current_user.role == UserRole.STUDENT
    return await InternshipService.get(db, internship_id, increment_view=increment)


# =========================================================================
# HR/Admin Write Endpoints
# =========================================================================

@router.post("", summary="Create a new internship")
async def create_internship(
    payload: InternshipCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """
    Creates a new internship. HR must be a member of the target company.
    Can create as DRAFT or directly PUBLISHED.
    """
    return await InternshipService.create(db, payload, current_user)


@router.put("/{internship_id}", summary="Update internship details")
async def update_internship(
    internship_id: uuid.UUID,
    payload: InternshipUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Partial update of internship fields.
    Only creator HR, company owner, or admin can update.
    Cannot edit CLOSED or ARCHIVED internships (admin exception).
    """
    return await InternshipService.update(db, internship_id, payload, current_user)


@router.delete("/{internship_id}", summary="Delete an internship")
async def delete_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft-deletes an internship. Only creator HR, company owner, or admin.
    """
    return await InternshipService.delete(db, internship_id, current_user)


# =========================================================================
# Lifecycle Transition Endpoints
# =========================================================================

@router.post("/{internship_id}/publish", summary="Publish an internship (DRAFT → PUBLISHED)")
async def publish_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """Transitions the internship from DRAFT to PUBLISHED, making it visible to candidates."""
    return await InternshipService.publish(db, internship_id, current_user)


@router.post("/{internship_id}/close", summary="Close an internship (PUBLISHED → CLOSED)")
async def close_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Closes the internship — no new applications accepted. Stays visible in listings."""
    return await InternshipService.close(db, internship_id, current_user)


@router.post("/{internship_id}/archive", summary="Archive an internship")
async def archive_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archives the internship, removing it from public listings."""
    return await InternshipService.archive(db, internship_id, current_user)


@router.post("/{internship_id}/restore", summary="Restore a closed/archived internship to DRAFT")
async def restore_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restores a CLOSED or ARCHIVED internship back to DRAFT status."""
    return await InternshipService.restore(db, internship_id, current_user)


@router.post("/{internship_id}/duplicate", summary="Duplicate an internship as a DRAFT copy")
async def duplicate_internship(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """
    Creates a DRAFT copy of the internship with all fields cloned.
    Useful for quickly posting similar roles.
    """
    return await InternshipService.duplicate(db, internship_id, current_user)


# =========================================================================
# Analytics
# =========================================================================

@router.get("/{internship_id}/analytics", summary="Internship performance analytics")
async def get_internship_analytics(
    internship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """
    Returns comprehensive analytics:
    view count, application pipeline, conversion rate, average assessment scores.
    Creator HR, company owner, or admin only.
    """
    return await InternshipService.get_analytics(db, internship_id, current_user)
