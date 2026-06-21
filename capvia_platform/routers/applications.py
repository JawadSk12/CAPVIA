"""
CAPVIA Phase 9 — Applications Router
12 endpoints: apply, my applications, detail, timeline,
withdraw, HR applicant list, shortlist, reject, hire,
status update, notifications, mark-read.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.api.dependencies import get_db, get_current_user, RoleChecker
from capvia_platform.models.models import User
from capvia_platform.schemas.schemas import (
    ApplicationCreateRequest, ApplicationWithdrawRequest,
    ApplicationRejectRequest, ApplicationStatusUpdateRequest,
)
from capvia_platform.services.application_service import ApplicationService

router = APIRouter(tags=["Applications"])

# =========================================================================
# Candidate Endpoints
# =========================================================================

@router.post("/applications", summary="Apply to an internship")
async def apply_to_internship(
    payload: ApplicationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit an application for a published internship.
    Enforces: published status, deadline, duplicate guard, application limit.
    """
    return await ApplicationService.apply(
        db,
        internship_id=uuid.UUID(payload.internship_id),
        current_user=current_user,
        cover_letter=payload.cover_letter,
        resume_url=payload.resume_url,
    )


@router.get("/applications/dashboard", summary="Candidate application dashboard stats")
async def get_application_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregate stats (total, active, breakdown) and 5 most recent applications
    for the current candidate's dashboard.
    """
    return await ApplicationService.get_dashboard(db, current_user)


@router.get("/applications/me", summary="List my applications")
async def list_my_applications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's submitted applications with vacancy snapshot and scores."""
    return await ApplicationService.list_my_applications(
        db, current_user, page=page, per_page=per_page, status=status
    )


@router.get("/applications/{application_id}", summary="Get application detail")
async def get_application_detail(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full application detail including scores, events, and related results.
    Candidates can only view their own.
    """
    return await ApplicationService.get_detail(db, application_id, current_user)


@router.get("/applications/{application_id}/timeline", summary="Application event timeline")
async def get_application_timeline(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chronological list of all lifecycle events for the application."""
    return await ApplicationService.get_timeline(db, application_id, current_user)


@router.delete("/applications/{application_id}", summary="Withdraw an application")
async def withdraw_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Candidate withdraws their application. Only valid if not already in a terminal state.
    Writes a WITHDRAWN event and notifies the candidate.
    """
    return await ApplicationService.withdraw(db, application_id, current_user)


# =========================================================================
# HR / Admin Endpoints
# =========================================================================

@router.get(
    "/internships/{internship_id}/applications",
    summary="List applicants for an internship (HR/Admin)"
)
async def list_internship_applications(
    internship_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """HR/Admin view of all applicants for a specific internship, with filters."""
    return await ApplicationService.list_for_internship(
        db, internship_id, current_user,
        page=page, per_page=per_page,
        status=status, sort_by=sort_by, sort_dir=sort_dir,
    )


@router.post(
    "/applications/{application_id}/shortlist",
    summary="Shortlist a candidate (HR/Admin)"
)
async def shortlist_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """Transitions the application to SHORTLISTED and notifies the candidate."""
    return await ApplicationService.shortlist(db, application_id, current_user)


@router.post(
    "/applications/{application_id}/reject",
    summary="Reject a candidate (HR/Admin)"
)
async def reject_application(
    application_id: uuid.UUID,
    payload: ApplicationRejectRequest = ApplicationRejectRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """Transitions to REJECTED with optional reason. Notifies the candidate."""
    return await ApplicationService.reject(db, application_id, current_user, reason=payload.reason)


@router.post(
    "/applications/{application_id}/hire",
    summary="Mark a candidate as hired (HR/Admin)"
)
async def hire_candidate(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """Transitions SHORTLISTED → HIRED. Sends congratulations notification."""
    return await ApplicationService.hire(db, application_id, current_user)


@router.put(
    "/applications/{application_id}/status",
    summary="Update application status (system/HR)"
)
async def update_application_status(
    application_id: uuid.UUID,
    payload: ApplicationStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"])),
):
    """
    Generic status transition endpoint used by ATS/Simulation/Interview webhooks
    and HR manual overrides. Validates against the state machine.
    """
    return await ApplicationService.update_status(
        db, application_id, current_user,
        new_status=payload.status, metadata=payload.metadata,
    )


# =========================================================================
# Notification Endpoints
# =========================================================================

@router.get("/notifications", summary="Get user notifications")
async def get_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Paginated notification feed with unread count badge."""
    return await ApplicationService.get_notifications(
        db, current_user, page=page, per_page=per_page, unread_only=unread_only
    )


@router.post("/notifications/{notification_id}/read", summary="Mark notification as read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marks a single notification as read."""
    return await ApplicationService.mark_notification_read(db, notification_id, current_user)


@router.post("/notifications/read-all", summary="Mark all notifications as read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marks all unread notifications as read in a single DB update."""
    return await ApplicationService.mark_all_notifications_read(db, current_user)
