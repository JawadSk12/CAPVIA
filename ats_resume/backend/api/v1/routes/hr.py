import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import TokenPayload
from core.rbac import require_hr_or_admin
from db.postgres import get_db
from models.ats_result import ATSResult
from models.internship import Internship
from models.resume import Resume, ResumeStatus
from models.user import User
from schemas.hr import HRAnalytics, HRCandidateDetail, CandidateActionRequest

router = APIRouter(prefix="/hr", tags=["HR Operations"])
logger = structlog.get_logger(__name__)


@router.get("/analytics", response_model=HRAnalytics)
async def get_analytics(
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
) -> HRAnalytics:
    """Get high-level recruitment analytics for HR dashboard."""
    
    # 1. Counts
    active_jds = await db.scalar(select(func.count(Internship.id)).where(Internship.is_active == True))
    total_resumes = await db.scalar(select(func.count(Resume.id)))
    shortlisted = await db.scalar(select(func.count(ATSResult.id)).where(ATSResult.hr_status == "SHORTLISTED"))
    avg_score = await db.scalar(select(func.avg(ATSResult.overall_score))) or 0.0

    # 2. Score distribution
    dist_query = await db.execute(
        select(ATSResult.score_band, func.count(ATSResult.id))
        .group_by(ATSResult.score_band)
    )
    score_dist = {band: count for band, count in dist_query.all() if band}

    return HRAnalytics(
        total_active_jds=active_jds or 0,
        total_candidates=total_resumes or 0,
        total_shortlisted=shortlisted or 0,
        avg_ats_score=round(float(avg_score), 1),
        applicants_by_day=[],  # TODO: Implement trend query
        score_distribution=score_dist,
        top_skills_requested=[]  # TODO: Implement from MongoDB
    )


@router.get("/candidates")
async def get_all_candidates(
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
    jd_id: str | None = None,
    hr_status: str | None = None,
    min_score: float = 0.0,
    limit: int = 50,
    offset: int = 0,
):
    """Global candidate list for HR, across all JDs."""
    query = (
        select(ATSResult, Resume, User)
        .join(Resume, ATSResult.resume_id == Resume.id)
        .join(User, ATSResult.user_id == User.id)
        .order_by(desc(ATSResult.overall_score))
    )

    if jd_id:
        query = query.where(ATSResult.jd_id == jd_id)
    if hr_status:
        query = query.where(ATSResult.hr_status == hr_status)
    if min_score > 0:
        query = query.where(ATSResult.overall_score >= min_score)

    result = await db.execute(query.limit(min(limit, 100)).offset(offset))
    rows = result.all()

    candidates = []
    for ats, resume, user in rows:
        candidates.append({
            "id": resume.id,
            "full_name": user.full_name,
            "email": user.email,
            "overall_score": ats.overall_score,
            "score_band": ats.score_band,
            "hr_status": ats.hr_status,
            "applied_at": resume.created_at,
            "is_suspicious": ats.is_suspicious,
        })

    return candidates


@router.get("/candidate/{resume_id}")
async def get_candidate_detail(
    resume_id: str,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Detailed view of a candidate for HR."""
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Candidate not found")
    
    user = await db.get(User, resume.user_id)
    
    # Get all ATS results for this resume
    ats_query = await db.execute(
        select(ATSResult).where(ATSResult.resume_id == resume_id)
    )
    ats_results = ats_query.scalars().all()

    return {
        "id": resume.id,
        "full_name": user.full_name if user else None,
        "email": user.email if user else None,
        "phone": user.phone if user else None,
        "resume_url": f"/api/v1/resume/download/{resume.s3_key}",
        "current_status": resume.status,
        "applied_at": resume.created_at,
        "ats_results": [
            {
                "jd_id": ats.jd_id,
                "overall_score": ats.overall_score,
                "score_band": ats.score_band,
                "hr_status": ats.hr_status,
            }
            for ats in ats_results
        ]
    }


@router.post("/candidate/{resume_id}/action")
async def take_candidate_action(
    resume_id: str,
    body: CandidateActionRequest,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Move candidate to SHORTLISTED, REJECTED, etc."""
    query = update(ATSResult).where(ATSResult.resume_id == resume_id)
    if body.jd_id:
        query = query.where(ATSResult.jd_id == body.jd_id)
    
    # Map action to status
    status_map = {
        "SHORTLIST": "SHORTLISTED",
        "REJECT": "REJECTED",
        "UNDO": "PENDING"
    }
    new_status = status_map.get(body.action.upper())
    if not new_status:
        raise HTTPException(400, f"Invalid action: {body.action}")

    await db.execute(query.values(hr_status=new_status))
    await db.commit()

    return {"message": f"Candidate marked as {new_status}"}


@router.get("/funnel/{jd_id}")
async def get_funnel(
    jd_id: str,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get recruitment funnel stats for a specific JD."""
    total = await db.scalar(select(func.count(ATSResult.id)).where(ATSResult.jd_id == jd_id))
    shortlisted = await db.scalar(
        select(func.count(ATSResult.id))
        .where(ATSResult.jd_id == jd_id, ATSResult.hr_status == "SHORTLISTED")
    )
    rejected = await db.scalar(
        select(func.count(ATSResult.id))
        .where(ATSResult.jd_id == jd_id, ATSResult.hr_status == "REJECTED")
    )

    return {
        "jd_id": jd_id,
        "stages": [
            {"name": "Applied", "count": total or 0, "color": "#6366f1"},
            {"name": "Shortlisted", "count": shortlisted or 0, "color": "#10b981"},
            {"name": "Rejected", "count": rejected or 0, "color": "#ef4444"},
        ]
    }


@router.get("/export/{jd_id}")
async def export_candidates(
    jd_id: str,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export candidate list as CSV."""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    query = (
        select(ATSResult, User)
        .join(User, ATSResult.user_id == User.id)
        .where(ATSResult.jd_id == jd_id)
        .order_by(desc(ATSResult.overall_score))
    )
    result = await db.execute(query)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Email", "Score", "Band", "Status", "Applied At"])

    for i, (ats, user) in enumerate(rows, 1):
        writer.writerow([
            i,
            user.full_name or "Unknown",
            user.email,
            ats.overall_score,
            ats.score_band,
            ats.hr_status,
            ats.created_at.strftime("%Y-%m-%d %H:%M"),
        ])

    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
    )
    response.headers["Content-Disposition"] = f"attachment; filename=candidates_{jd_id}.csv"
    return response
