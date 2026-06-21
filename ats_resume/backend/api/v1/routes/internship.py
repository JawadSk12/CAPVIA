"""
backend/api/v1/routes/internship.py
─────────────────────────────────────
Internship JD management and candidate comparison routes.

HR-only endpoints (require HR or ADMIN role):
  POST   /internship                       → Create new JD
  PUT    /internship/{id}                  → Update JD
  DELETE /internship/{id}                  → Archive JD
  POST   /internship/{id}/compare/{rid}   → Trigger internship ATS comparison
  GET    /internship/{id}/candidates       → Get ranked candidate list
  GET    /internship/{id}/ranking          → Get full ranking with stats

Public (authenticated, any role):
  GET    /internship                       → List active internships
  GET    /internship/{id}                  → Get JD details
"""



from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.auth import TokenPayload, get_current_user_payload
from core.rbac import require_hr_or_admin
from core.audit import log_audit_event
from core.security import limiter
from db.postgres import get_db
from db.mongodb import get_mongo_db, Collections
from db.redis_client import get_redis
from models.audit_log import AuditAction
from models.internship import Internship, ExperienceLevel
from models.resume import Resume
from models.ats_result import ATSResult
from models.user import User
from schemas.internship import (
    InternshipCreateRequest,
    InternshipUpdateRequest,
    InternshipSummaryResponse,
    InternshipDetailResponse,
    InternshipATSResponse,
    CandidateRankingResponse,
    CandidateRankItem,
    CompareRequest,
)

router = APIRouter(prefix="/internship", tags=["Internship"])
logger = structlog.get_logger(__name__)


# ─── Create JD ────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=InternshipSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new internship JD (HR only)",
)
async def create_internship(
    body: InternshipCreateRequest,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
) -> InternshipSummaryResponse:
    """
    Create a new internship posting with full JD content.

    Stores:
      - Metadata in PostgreSQL (id, title, active status, etc.)
      - Full JD content in MongoDB (responsibilities, skills, embedding)

    Also triggers async JD embedding for vector search.
    """
    import uuid

    jd_id = str(uuid.uuid4())

    # ── PostgreSQL record ──────────────────────────────────────────────
    internship = Internship(
        id=jd_id,
        created_by=current_user.user_id,
        title=body.title,
        company=body.company,
        department=body.department,
        location=body.location,
        is_remote=body.is_remote,
        experience_level=ExperienceLevel(body.experience_level),
        short_description=body.short_description,
        application_deadline=body.application_deadline,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(internship)

    await log_audit_event(
        session=db,
        action=AuditAction.JD_CREATE,
        user_id=current_user.user_id,
        resource_type="internship",
        resource_id=jd_id,
        metadata={"title": body.title},
    )
    await db.flush()

    # ── MongoDB document ───────────────────────────────────────────────
    mongo_db = await get_mongo_db()
    jd_doc = {
        "_id": jd_id,
        "title": body.title,
        "company": body.company,
        "responsibilities": body.responsibilities,
        "required_skills": body.required_skills,
        "preferred_skills": body.preferred_skills,
        "tools_and_technologies": body.tools_and_technologies,
        "expected_projects": body.expected_projects,
        "experience_level": body.experience_level,
        "full_jd_text": body.full_jd_text,
        "jd_embedding": None,  # Will be set by async embedding task
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await mongo_db[Collections.INTERNSHIPS].insert_one(jd_doc)

    await db.commit()

    # ── Trigger JD embedding (async) ───────────────────────────────────
    _trigger_jd_embedding(jd_id, body.required_skills, body.preferred_skills)

    logger.info("internship_created", jd_id=jd_id, title=body.title)

    return InternshipSummaryResponse(
        id=jd_id,
        title=body.title,
        company=body.company,
        location=body.location,
        is_remote=body.is_remote,
        experience_level=body.experience_level,
        is_active=True,
        is_expired=False,
        total_applicants=0,
        shortlisted_count=0,
        short_description=body.short_description,
        application_deadline=body.application_deadline,
        created_at=internship.created_at,
    )


# ─── List Internships ─────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[InternshipSummaryResponse],
    summary="List all active internships",
)
async def list_internships(
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    active_only: bool = Query(True),
) -> list[InternshipSummaryResponse]:
    """List internship postings. Students see active only; HR sees all."""
    from models.user import UserRole

    query = select(Internship).order_by(desc(Internship.created_at))

    # HR can see all, students see only active
    if current_user.role == UserRole.STUDENT or active_only:
        query = query.where(Internship.is_active == True)  # noqa

    # HR: filter to own org
    if current_user.role == UserRole.HR:
        user = await db.get(User, current_user.user_id)
        if user and user.org_id:
            query = query.where(Internship.org_id == user.org_id)

    result = await db.execute(query.limit(min(limit, 50)).offset(offset))
    internships = result.scalars().all()

    return [
        InternshipSummaryResponse(
            id=i.id,
            title=i.title,
            company=i.company,
            location=i.location,
            is_remote=i.is_remote,
            experience_level=i.experience_level,
            is_active=i.is_active,
            is_expired=i.is_expired,
            total_applicants=i.total_applicants,
            shortlisted_count=i.shortlisted_count,
            short_description=i.short_description,
            application_deadline=i.application_deadline,
            created_at=i.created_at,
        )
        for i in internships
    ]


# ─── Get JD Detail ────────────────────────────────────────────────────────────

@router.get(
    "/{jd_id}",
    response_model=InternshipDetailResponse,
    summary="Get full internship JD details",
)
async def get_internship(
    jd_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
) -> InternshipDetailResponse:
    """Get full JD details including skills, responsibilities."""
    if jd_id == "new":
        return InternshipDetailResponse(
            id="new",
            title="New Internship",
            company="",
            location="",
            is_remote=False,
            experience_level="ENTRY",
            is_active=True,
            is_expired=False,
            total_applicants=0,
            shortlisted_count=0,
            short_description="",
            application_deadline=None,
            created_at=datetime.now(timezone.utc),
            responsibilities=[],
            required_skills=[],
            preferred_skills=[],
            tools_and_technologies=[],
            expected_projects=[],
            full_jd_text="",
            created_by_name=""
        )

    internship = await db.get(Internship, jd_id)
    if not internship:
        raise HTTPException(404, "Internship not found")

    # Load full content from MongoDB
    mongo_db = await get_mongo_db()
    jd_doc = await mongo_db[Collections.INTERNSHIPS].find_one({"_id": jd_id})

    if not jd_doc:
        raise HTTPException(500, "JD content not found in database")

    # Get creator name
    creator = await db.get(User, internship.created_by)
    creator_name = creator.full_name if creator else None

    return InternshipDetailResponse(
        id=jd_id,
        title=internship.title,
        company=internship.company,
        location=internship.location,
        is_remote=internship.is_remote,
        experience_level=internship.experience_level,
        is_active=internship.is_active,
        is_expired=internship.is_expired,
        total_applicants=internship.total_applicants,
        shortlisted_count=internship.shortlisted_count,
        short_description=internship.short_description,
        application_deadline=internship.application_deadline,
        created_at=internship.created_at,
        responsibilities=jd_doc.get("responsibilities", []),
        required_skills=jd_doc.get("required_skills", []),
        preferred_skills=jd_doc.get("preferred_skills", []),
        tools_and_technologies=jd_doc.get("tools_and_technologies", []),
        expected_projects=jd_doc.get("expected_projects", []),
        full_jd_text=jd_doc.get("full_jd_text"),
        created_by_name=creator_name,
    )


# ─── Update JD ────────────────────────────────────────────────────────────────

@router.put(
    "/{jd_id}",
    response_model=InternshipSummaryResponse,
    summary="Update internship JD (HR only)",
)
async def update_internship(
    jd_id: str,
    body: InternshipUpdateRequest,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
) -> InternshipSummaryResponse:
    """Update an existing internship JD."""
    internship = await db.get(Internship, jd_id)
    if not internship:
        raise HTTPException(404, "Internship not found")

    # Only creator or admin can update
    from models.user import UserRole
    if current_user.role != UserRole.ADMIN and internship.created_by != current_user.user_id:
        raise HTTPException(403, "You can only update your own internships")

    # Update PostgreSQL fields
    pg_updates = body.model_dump(exclude_none=True, exclude={
        "responsibilities", "required_skills", "preferred_skills",
        "tools_and_technologies", "expected_projects",
    })
    if pg_updates:
        await db.execute(
            update(Internship).where(Internship.id == jd_id).values(**pg_updates)
        )

    # Update MongoDB fields
    mongo_updates = {k: v for k, v in body.model_dump(exclude_none=True).items()
                     if k in ("responsibilities", "required_skills", "preferred_skills",
                               "tools_and_technologies", "expected_projects")}
    if mongo_updates:
        mongo_db = await get_mongo_db()
        await mongo_db[Collections.INTERNSHIPS].update_one(
            {"_id": jd_id},
            {"$set": mongo_updates},
        )
        # Re-embed if skills changed
        if "required_skills" in mongo_updates or "preferred_skills" in mongo_updates:
            jd_doc = await mongo_db[Collections.INTERNSHIPS].find_one({"_id": jd_id})
            _trigger_jd_embedding(
                jd_id,
                jd_doc.get("required_skills", []),
                jd_doc.get("preferred_skills", []),
            )

    await log_audit_event(
        session=db,
        action=AuditAction.JD_UPDATE,
        user_id=current_user.user_id,
        resource_type="internship",
        resource_id=jd_id,
    )
    await db.commit()

    await db.refresh(internship)
    return InternshipSummaryResponse(
        id=internship.id,
        title=internship.title,
        company=internship.company,
        location=internship.location,
        is_remote=internship.is_remote,
        experience_level=internship.experience_level,
        is_active=internship.is_active,
        is_expired=internship.is_expired,
        total_applicants=internship.total_applicants,
        shortlisted_count=internship.shortlisted_count,
        short_description=internship.short_description,
        application_deadline=internship.application_deadline,
        created_at=internship.created_at,
    )


# ─── Delete / Archive JD ──────────────────────────────────────────────────────

@router.delete(
    "/{jd_id}",
    summary="Archive internship JD (HR only)",
)
async def archive_internship(
    jd_id: str,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Archive (soft-delete) an internship.
    Sets is_active=False — data preserved for reporting.
    """
    internship = await db.get(Internship, jd_id)
    if not internship:
        raise HTTPException(404, "Internship not found")

    await db.execute(
        update(Internship).where(Internship.id == jd_id).values(is_active=False)
    )
    await log_audit_event(
        session=db, action=AuditAction.JD_DELETE,
        user_id=current_user.user_id, resource_type="internship", resource_id=jd_id,
    )
    await db.commit()
    return {"message": "Internship archived", "jd_id": jd_id}


# ─── Compare Resume vs JD ─────────────────────────────────────────────────────

@router.post(
    "/{jd_id}/compare/{resume_id}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger internship ATS comparison",
)
async def compare_resume_to_jd(
    jd_id: str,
    resume_id: str,
    body: CompareRequest = CompareRequest(),
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> dict:
    """
    Trigger comparison of a specific resume against a JD.

    Can be called by:
    - Student (applying to an internship)
    - HR (manually comparing a resume)

    If a result already exists and force_rerun=False, returns existing result.
    """
    # Verify JD exists
    internship = await db.get(Internship, jd_id)
    if not internship or not internship.is_active:
        raise HTTPException(404, "Internship not found or inactive")

    # Verify resume exists and is ready
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")

    if resume.status != "DONE":
        raise HTTPException(400, f"Resume must be fully processed first (status: {resume.status})")

    # Check for existing result
    if not body.force_rerun:
        mongo_db = await get_mongo_db()
        existing = await mongo_db[Collections.INTERNSHIP_RESULTS].find_one({
            "resume_id": resume_id, "jd_id": jd_id
        })
        if existing:
            return {
                "message": "Existing result found",
                "resume_id": resume_id,
                "jd_id": jd_id,
                "status": "DONE",
                "existing": True,
            }

    # Enqueue Celery task
    from workers.tasks.score_internship import score_internship_task
    task = score_internship_task.delay(resume_id, jd_id)

    logger.info("internship_comparison_queued", resume_id=resume_id, jd_id=jd_id)

    return {
        "message": "Comparison started",
        "resume_id": resume_id,
        "jd_id": jd_id,
        "task_id": task.id,
        "status": "PROCESSING",
        "estimated_seconds": 30,
    }


# ─── Get Internship ATS Result ─────────────────────────────────────────────────

@router.get(
    "/{jd_id}/result/{resume_id}",
    response_model=InternshipATSResponse,
    summary="Get internship ATS result for a specific resume",
)
async def get_internship_result(
    jd_id: str,
    resume_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
) -> InternshipATSResponse:
    """Get the internship-specific ATS result for a resume/JD pair."""
    mongo_db = await get_mongo_db()
    result = await mongo_db[Collections.INTERNSHIP_RESULTS].find_one({
        "resume_id": resume_id,
        "jd_id": jd_id,
    })

    if not result:
        raise HTTPException(404, "Internship ATS result not found. Run comparison first.")

    return InternshipATSResponse(
        resume_id=resume_id,
        jd_id=jd_id,
        overall_score=result.get("overall_score", 0),
        score_band=result.get("score_band", "FAIR"),
        dimensions=result.get("dimension_report", []),
        required_skills_analysis=result.get("required_skills_analysis", {}),
        preferred_skills_analysis=result.get("preferred_skills_analysis", {}),
        tool_match_analysis=result.get("tool_match_analysis", {}),
        critical_gaps=result.get("critical_gaps", []),
        nice_to_have_gaps=result.get("nice_to_have_gaps", []),
        action_items=result.get("action_items", []),
        is_suspicious=result.get("fraud_analysis", {}).get("is_suspicious", False),
        fraud_flags=result.get("fraud_analysis", {}).get("flags", []),
        ai_confidence=result.get("ai_confidence", 0.5),
        created_at=datetime.fromisoformat(
            result.get("created_at", datetime.now(timezone.utc).isoformat())
        ),
    )


# ─── Candidate Ranking ────────────────────────────────────────────────────────

@router.get(
    "/{jd_id}/candidates",
    response_model=CandidateRankingResponse,
    summary="Get ranked candidate list for an internship (HR only)",
)
async def get_candidates(
    jd_id: str,
    current_user: TokenPayload = Depends(require_hr_or_admin),
    db: AsyncSession = Depends(get_db),
    min_score: float = 0.0,
    max_score: float = 100.0,
    hr_status: str | None = None,
    flagged_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> CandidateRankingResponse:
    """
    Get ranked candidate list for an internship.

    HR uses this to:
    1. See all applicants ranked by ATS score
    2. Filter by score range, HR status, fraud flags
    3. Click through to individual candidate details
    """
    internship = await db.get(Internship, jd_id)
    if not internship:
        raise HTTPException(404, "Internship not found")

    # Query ats_results for this JD
    from sqlalchemy import and_, desc

    query = (
        select(ATSResult)
        .where(
            and_(
                ATSResult.jd_id == jd_id,
                ATSResult.overall_score >= min_score,
                ATSResult.overall_score <= max_score,
            )
        )
        .order_by(desc(ATSResult.overall_score))
    )

    if hr_status:
        query = query.where(ATSResult.hr_status == hr_status)
    if flagged_only:
        query = query.where(ATSResult.is_suspicious == True)  # noqa

    result = await db.execute(query.limit(min(limit, 100)).offset(offset))
    ats_results = result.scalars().all()

    # Build ranked candidate list
    ranked_candidates = []
    for rank, ats in enumerate(ats_results, start=1 + offset):
        # Get user info
        resume = await db.get(Resume, ats.resume_id)
        if not resume:
            continue

        user = await db.get(User, ats.user_id)

        ranked_candidates.append(CandidateRankItem(
            rank=rank,
            resume_id=ats.resume_id,
            user_id=ats.user_id,
            user_name=user.full_name if user else None,
            user_email=user.email if user else "unknown",
            overall_score=ats.overall_score,
            score_band=ats.score_band,
            required_skill_match=ats.semantic_skill_score or 0,
            project_relevance=ats.project_relevance_score or 0,
            is_suspicious=ats.is_suspicious,
            fraud_flag_count=ats.fraud_flag_count,
            ai_confidence=ats.ai_confidence or 0.5,
            confidence_label=ats.confidence_label,
            hr_status=ats.hr_status,
            applied_at=resume.created_at,
        ))

    # Score distribution
    all_scores_result = await db.execute(
        select(ATSResult.overall_score, ATSResult.score_band)
        .where(ATSResult.jd_id == jd_id)
    )
    all_scores = all_scores_result.all()
    score_distribution = {"STRONG": 0, "GOOD": 0, "FAIR": 0, "WEAK": 0}
    for _, band in all_scores:
        if band in score_distribution:
            score_distribution[band] += 1

    return CandidateRankingResponse(
        jd_id=jd_id,
        jd_title=internship.title,
        total_applicants=internship.total_applicants,
        ranked_candidates=ranked_candidates,
        score_distribution=score_distribution,
    )


# ─── Helper: JD Embedding ─────────────────────────────────────────────────────

def _trigger_jd_embedding(
    jd_id: str,
    required_skills: list[str],
    preferred_skills: list[str],
) -> None:
    """
    Trigger async JD embedding generation.
    Runs in background — doesn't block the HTTP response.
    """
    try:
        from workers.celery_app import celery_app

        @celery_app.task(name=f"embed_jd_{jd_id}")
        def embed_jd():
            import asyncio

            async def _embed():
                from ai_engine.nlp.semantic_matcher import SemanticMatcher
                from db.mongodb import get_mongo_db, Collections

                matcher = SemanticMatcher()
                all_skills = required_skills + preferred_skills
                skill_text = " ".join(all_skills)
                embedding = matcher.encode_texts([skill_text])[0].tolist()

                mongo_db = await get_mongo_db()
                await mongo_db[Collections.INTERNSHIPS].update_one(
                    {"_id": jd_id},
                    {"$set": {"jd_embedding": embedding}},
                )

            asyncio.run(_embed())

        embed_jd.delay()
    except Exception as e:
        logger.warning(f"JD embedding trigger failed (non-critical): {e}")