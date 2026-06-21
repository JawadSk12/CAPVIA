"""
CAPVIA Phase 18 — Report Engine Router
=======================================
Endpoints:
  POST /reports/{application_id}/generate - HR/Admin only: Compile details and write PDF
  GET  /reports/{application_id}          - HR/Admin/Candidate (own): Retrieve metadata
  GET  /reports/{application_id}/download - HR/Admin/Candidate (own): Download PDF file
"""
import os
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from capvia_platform.api.dependencies import get_db, get_current_user
from capvia_platform.core.exceptions import ResourceNotFoundException, AuthorizationException
from capvia_platform.models.models import Application, User, UserRole, ActivityLog
from capvia_platform.schemas.schemas import ReportGenerateRequest, ReportResponse
from capvia_platform.services.report_service import ReportService
from capvia_platform.repositories.repositories import ReportRepository

logger = logging.getLogger("reports_router")
router = APIRouter()


# =========================================================================
# RBAC guard helpers
# =========================================================================

def _assert_hr_or_admin(current_user: User):
    role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    allowed = {UserRole.HR.value, UserRole.ADMIN.value, "HR", "ADMIN"}
    if role_val not in allowed:
        raise AuthorizationException("Access denied. Only HR or Admin roles can perform this action.")


def _assert_report_access(current_user: User, app: Application):
    """
    Recruiters (HR/Admin) can access any report.
    Candidates can only access their own report.
    """
    role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    student_val = UserRole.STUDENT.value if hasattr(UserRole.STUDENT, "value") else UserRole.STUDENT
    if role_val == student_val or str(role_val).upper() in ("STUDENT", "CANDIDATE"):
        if app.candidate_id != current_user.id:
            raise AuthorizationException("Access denied. Candidates can only view their own reports.")


async def _log_download_activity(db_session_factory, actor_id: uuid.UUID, application_id: uuid.UUID):
    """
    Background log helper to record report downloads.
    """
    # We do a brief session start & commit since it runs in the background
    async with db_session_factory() as session:
        log = ActivityLog(
            user_id=actor_id,
            action="DOWNLOAD_REPORT",
            description=f"Downloaded recruiter intelligence report for Application ID {application_id}."
        )
        session.add(log)
        await session.commit()


# =========================================================================
# Endpoints
# =========================================================================

@router.post("/reports/{application_id}/generate", response_model=ReportResponse, tags=["Report Engine"])
async def generate_report(
    application_id: str,
    payload: Optional[ReportGenerateRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates or regenerates a candidate recruiter intelligence report.
    Pulls assessment sub-systems scoring, runs heuristics if custom fields are missing,
    generates a versioned ReportLab PDF, and writes audit trails.
    Accessible to HR or Admin only.
    """
    _assert_hr_or_admin(current_user)
    
    app_uuid = uuid.UUID(application_id)
    context = await ReportService.generate_report_data(db, app_uuid)
    
    # Check manual overrides, fallback to heuristics compiler
    summary = payload.summary if (payload and payload.summary) else None
    strengths = payload.strengths if (payload and payload.strengths) else None
    weaknesses = payload.weaknesses if (payload and payload.weaknesses) else None
    recommendations = payload.recommendations if (payload and payload.recommendations) else None
    
    default_summary, default_strengths, default_weaknesses, default_recs = (
        ReportService.compile_default_metadata(context)
    )
    
    summary = summary or default_summary
    strengths = strengths or default_strengths
    weaknesses = weaknesses or default_weaknesses
    recommendations = recommendations or default_recs
    
    # Inject final details back into context for PDF printing
    context["summary"] = summary
    context["strengths"] = strengths
    context["weaknesses"] = weaknesses
    context["recommendations"] = recommendations
    
    # Query next version index
    next_version = ReportService.resolve_next_version(app_uuid)
    
    # Build PDF binary
    pdf_bytes = ReportService.build_pdf_report(context, version=next_version)
    
    # Save file and database entry
    report = await ReportService.save_report(
        db=db,
        application_id=app_uuid,
        summary=summary,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations,
        pdf_bytes=pdf_bytes,
        version=next_version,
        actor_id=current_user.id
    )
    
    await db.commit()
    return report


@router.get("/reports/{application_id}", response_model=ReportResponse, tags=["Report Engine"])
async def get_report_metadata(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the report database record (summary, strengths, weaknesses, recs, pdf_url)
    for a given application.
    Accessible by HR/Admin, or the owning Student/Candidate.
    """
    app_uuid = uuid.UUID(application_id)
    
    # Load application to check access
    stmt = select(Application).where(Application.id == app_uuid, Application.deleted_at.is_(None))
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)
        
    _assert_report_access(current_user, app)
    
    repo = ReportRepository()
    report = await repo.get_by_application_id(db, app_uuid)
    if not report:
        raise ResourceNotFoundException("Report", application_id)
        
    return report


@router.get("/reports/{application_id}/download", tags=["Report Engine"])
async def download_report_pdf(
    application_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Downloads the versioned PDF report file for the given application.
    Enforces role authorization, returns a streaming FileResponse, and queues
    an audit log entry in the background.
    """
    app_uuid = uuid.UUID(application_id)
    
    # Load application to check access
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Application)
        .where(Application.id == app_uuid, Application.deleted_at.is_(None))
        .options(selectinload(Application.candidate))
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)
        
    _assert_report_access(current_user, app)
    
    repo = ReportRepository()
    report = await repo.get_by_application_id(db, app_uuid)
    if not report or not report.pdf_url:
        raise ResourceNotFoundException("Report PDF", application_id)
        
    # Resolve filepath
    reports_dir = ReportService._get_storage_dir()
    filename = report.pdf_url.split("/")[-1]
    filepath = os.path.join(reports_dir, filename)
    
    if not os.path.exists(filepath):
        raise ResourceNotFoundException("PDF file on storage", filename)
        
    # Queue background task to log download activity
    # Using dependencies sessionmaker wrapper
    from capvia_platform.database.connection import AsyncSessionFactory
    background_tasks.add_task(_log_download_activity, AsyncSessionFactory, current_user.id, app_uuid)
    
    # Return FileResponse
    return FileResponse(
        path=filepath,
        filename=f"capvia_report_{app.candidate.full_name.replace(' ', '_')}_{filename}",
        media_type="application/pdf"
    )
