"""
backend/api/v1/routes/resume.py
──────────────────────────────────
Resume upload, status polling, analysis retrieval, and AI rewrite routes.

Endpoints:
  POST   /resume/upload         → Upload + start processing pipeline
  GET    /resume/{id}/status    → Poll processing status (every 2s)
  GET    /resume/{id}/analysis  → Get full ATS result
  GET    /resume/{id}/heatmap   → Get section heatmap only (fast)
  POST   /resume/{id}/rewrite   → Request AI rewrite (SSE stream)
  GET    /resume/history        → User's upload history
  DELETE /resume/{id}           → Delete resume + S3 + results (GDPR)
"""





import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
    UploadFile,
    File,
    Form,
    status,
)
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.auth import TokenPayload, get_current_user_payload
from core.rbac import assert_owns_resource
from core.security import limiter, validate_resume_file, compute_file_hash
from core.audit import log_audit_event
from db.postgres import get_db
from db.mongodb import get_mongo_db, Collections
from db.redis_client import (
    get_redis,
    get_resume_status,
    get_cached_ats_score,
    ResumeStatus,
)
from models.audit_log import AuditAction
from models.resume import Resume, ResumeStatus as DBStatus, ResumeMode
from schemas.resume import (
    ATSAnalysisResponse,
    ResumeStatusResponse,
    ResumeUploadResponse,
    ResumeSummary,
    RewriteRequest,
    RewriteSuggestion,
    STAGE_LABELS,
)
from schemas.dna_ats import DNACapabilityGraph
from core.capability_extraction import CapabilityExtractionEngine
from services.storage_service import storage_service

router = APIRouter(prefix="/resume", tags=["Resume"])
logger = structlog.get_logger(__name__)


# ─── Upload ───────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a resume for ATS analysis",
)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def upload_resume(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF or DOCX resume file (max 5MB)"),
    mode: str = Form(default="GLOBAL", description="GLOBAL or INTERNSHIP"),
    jd_id: str | None = Form(default=None, description="JD ID for INTERNSHIP mode"),
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> ResumeUploadResponse:
    """
    Accept a resume file and start the async processing pipeline.

    Flow:
      1. Validate file (type, size, magic bytes)
      2. Check for duplicate (same SHA-256 hash)
      3. Upload to storage
      4. Create Resume record in PostgreSQL (PENDING)
      5. Kick off background processing (no Celery required)
      6. Return resume_id for status polling

    Accepts:
      - application/pdf
      - application/vnd.openxmlformats-officedocument.wordprocessingml.document
    """
    log = logger.bind(user_id=current_user.user_id, mode=mode)

    # Validate mode
    if mode not in ("GLOBAL", "INTERNSHIP"):
        raise HTTPException(400, "mode must be GLOBAL or INTERNSHIP")

    if mode == "INTERNSHIP" and not jd_id:
        raise HTTPException(400, "jd_id is required for INTERNSHIP mode")

    # Validate the uploaded file (security checks)
    try:
        file_bytes = await validate_resume_file(file)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"File validation failed: {e}")

    file_hash = compute_file_hash(file_bytes)

    # Check for duplicate upload
    existing = await db.execute(
        select(Resume).where(
            Resume.user_id == current_user.user_id,
            Resume.file_hash == file_hash,
        )
    )
    existing_resume = existing.scalars().first()
    if existing_resume and existing_resume.status == "DONE":
        # Return existing result instead of reprocessing
        log.info("duplicate_upload_detected", existing_id=existing_resume.id)
        return ResumeUploadResponse(
            resume_id=existing_resume.id,
            status="DONE",
            message="Duplicate detected. Returning existing analysis.",
            estimated_seconds=0,
        )

    # Generate resume ID upfront (used for S3 key)
    resume_id = str(uuid.uuid4())

    # Upload to S3
    s3_key = await storage_service.upload_resume(
        file_bytes=file_bytes,
        user_id=current_user.user_id,
        resume_id=resume_id,
        filename=file.filename or f"resume_{resume_id}.pdf",
        content_type=file.content_type or "application/pdf",
    )

    # ── Step 4: Create Resume record in PostgreSQL ─────────────────────
    try:
        resume = Resume(
            id=resume_id,
            user_id=current_user.user_id,
            original_filename=file.filename,
            s3_key=s3_key,
            file_type=file.content_type or "application/pdf",
            file_size_bytes=len(file_bytes),
            file_hash=file_hash,
            mode=ResumeMode(mode.upper()),
            jd_id=jd_id,
            status=DBStatus.PENDING,
            created_at=datetime.now(timezone.utc),
        )
        db.add(resume)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"DATABASE ERROR during resume upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Database save failed: {str(e)}"
        )

    await log_audit_event(
        session=db,
        action=AuditAction.RESUME_UPLOAD,
        user_id=current_user.user_id,
        resource_type="resume",
        resource_id=resume_id,
        metadata={
            "filename": file.filename,
            "size_bytes": len(file_bytes),
            "mode": mode,
            "jd_id": jd_id,
        },
    )
    await db.commit()

    # ── Run pipeline in FastAPI background (no Celery needed) ─────────────
    from services.pipeline_service import run_resume_pipeline
    background_tasks.add_task(run_resume_pipeline, resume_id, file_bytes)

    log.info("resume_uploaded_and_queued", resume_id=resume_id, mode=mode)

    return JSONResponse(
        status_code=201,
        content={
            "resume_id": resume_id,
            "status": ResumeStatus.PENDING,
            "message": "Resume uploaded successfully. Processing started.",
            "estimated_seconds": 30,
        }
    )


# ─── Status Polling ───────────────────────────────────────────────────────────

@router.get(
    "/{resume_id}/status",
    response_model=ResumeStatusResponse,
    summary="Poll resume processing status",
)
async def get_status(
    request: Request,
    resume_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> ResumeStatusResponse:
    """
    Poll the processing status of a resume.
    Frontend calls this every 2 seconds until status = DONE or ERROR.
    Status is cached in Redis for fast response.
    """
    # Verify ownership
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    assert_owns_resource(resume.user_id, current_user, "resume")

    # Get status from Redis (fast path)
    status_data = await get_resume_status(resume_id, redis=redis)
    if status_data:
        current_status = status_data.get("status", resume.status.value)
        error_msg = status_data.get("error", resume.error_message)
    else:
        current_status = resume.status.value
        error_msg = resume.error_message

    from models.resume import STAGE_PROGRESS
    progress = STAGE_PROGRESS.get(current_status, 0)

    return JSONResponse(
        content={
            "resume_id": resume_id,
            "status": current_status,
            "progress_percent": max(progress, 0),
            "stage_label": STAGE_LABELS.get(current_status, "Processing..."),
            "error_message": error_msg,
            "estimated_seconds_remaining": (
                max(0, int((100 - progress) / 2))
                if current_status not in ("DONE", "ERROR")
                else 0
            ),
        }
    )


# ─── Full Analysis ────────────────────────────────────────────────────────────

@router.get(
    "/{resume_id}/analysis",
    response_model=ATSAnalysisResponse,
    summary="Get full ATS analysis result",
)
async def get_analysis(
    request: Request,
    resume_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> ATSAnalysisResponse:
    """
    Return the full ATS analysis result.

    Fast path: Check Redis cache for score summary.
    Full path: Load detailed result from MongoDB.

    Returns 202 if still processing, 404 if not found.
    """
    # Verify ownership and processing state
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    assert_owns_resource(resume.user_id, current_user, "resume")

    if resume.status != "DONE":
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Resume is still processing (status: {resume.status})",
        )

    # ── Try MongoDB first (primary store) ─────────────────────────────────
    result_doc = None
    try:
        mongo_db = await get_mongo_db()
        result_doc = await mongo_db[Collections.ATS_RESULTS].find_one({"_id": resume_id})
    except Exception:
        pass

    # ── Fallback: Redis full_result cache ──────────────────────────────────
    if not result_doc:
        try:
            raw = await redis.get(f"full_result:{resume_id}")
            if raw:
                import json as _json
                result_doc = _json.loads(raw)
        except Exception:
            pass

    if not result_doc:
        raise HTTPException(
            status_code=404,
            detail="Analysis result not found. The pipeline may still be running or failed. Please try re-uploading.",
        )

    # Audit: track who viewed this result
    try:
        await log_audit_event(
            session=db,
            action=AuditAction.ATS_RESULT_VIEW,
            user_id=current_user.user_id,
            resource_type="ats_result",
            resource_id=resume_id,
        )
        await db.commit()
    except Exception:
        pass

    # Map result document to response schema
    return _map_result_to_response(result_doc, resume)


# ─── DNA Capability Graph ─────────────────────────────────────────────────────

@router.get(
    "/{resume_id}/dna",
    response_model=DNACapabilityGraph,
    summary="Get DNA Capability Graph output",
)
async def get_dna_graph(
    request: Request,
    resume_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> DNACapabilityGraph:
    """
    Return the ATS analysis result structured as a DNA Capability Graph.
    This output is directly consumable by the CAPVIA Capability DNA Engine.
    """
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    assert_owns_resource(resume.user_id, current_user, "resume")

    if resume.status != "DONE":
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Resume is still processing (status: {resume.status})",
        )

    result_doc = None
    try:
        mongo_db = await get_mongo_db()
        result_doc = await mongo_db[Collections.ATS_RESULTS].find_one({"_id": resume_id})
    except Exception:
        pass

    if not result_doc:
        try:
            raw = await redis.get(f"full_result:{resume_id}")
            if raw:
                import json as _json
                result_doc = _json.loads(raw)
        except Exception:
            pass

    if not result_doc:
        raise HTTPException(404, "Analysis result not found.")

    if "dna_capability" in result_doc and result_doc["dna_capability"]:
        return DNACapabilityGraph(**result_doc["dna_capability"])
    
    # Fallback: Extract on the fly
    return CapabilityExtractionEngine.extract_dna_intelligence(
        ats_result=result_doc,
        candidate_id=str(resume.user_id),
        job_id=resume.jd_id or "global-eval"
    )

# ─── Heatmap ─────────────────────────────────────────────────────────────────

@router.get(
    "/{resume_id}/heatmap",
    summary="Get section heatmap data",
)
async def get_heatmap(
    resume_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return only the heatmap portion of the analysis for fast section renders."""
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    assert_owns_resource(resume.user_id, current_user, "resume")

    mongo_db = await get_mongo_db()
    result_doc = await mongo_db[Collections.ATS_RESULTS].find_one(
        {"_id": resume_id},
        {"heatmap": 1, "overall_score": 1},
    )

    if not result_doc:
        raise HTTPException(404, "Heatmap data not found")

    return {
        "resume_id": resume_id,
        "overall_score": result_doc.get("overall_score"),
        "heatmap": result_doc.get("heatmap", []),
    }


# ─── AI Rewrite (SSE) ─────────────────────────────────────────────────────────

@router.post(
    "/{resume_id}/rewrite",
    summary="Request AI rewrite suggestions (Server-Sent Events)",
)
@limiter.limit("5/minute")
async def request_rewrite(
    request: Request,
    resume_id: str,
    body: RewriteRequest,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> StreamingResponse:
    """
    Generate AI rewrite suggestions for a resume section.

    Returns a Server-Sent Events stream so the UI can show
    typing-style progressive reveal.

    Events:
      data: {"type": "token", "text": "..."} → each text token
      data: {"type": "complete", "result": {...}} → final result
      data: {"type": "error", "message": "..."} → on failure
    """
    if not settings.ENABLE_AI_REWRITE:
        raise HTTPException(503, "AI rewrite feature is currently disabled")

    # Verify ownership
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    assert_owns_resource(resume.user_id, current_user, "resume")

    if resume.status != "DONE":
        raise HTTPException(400, "Resume must be fully processed before rewriting")

    valid_sections = {"skills", "experience", "summary", "projects"}
    if body.section not in valid_sections:
        raise HTTPException(400, f"section must be one of: {', '.join(valid_sections)}")

    # Audit log
    await log_audit_event(
        session=db,
        action=AuditAction.ATS_REWRITE_REQUEST,
        user_id=current_user.user_id,
        resource_type="resume",
        resource_id=resume_id,
        metadata={"section": body.section},
    )
    await db.commit()

    # Enqueue Celery task
    from workers.tasks.generate_rewrite import generate_rewrite_task
    task = generate_rewrite_task.delay(
        resume_id=resume_id,
        section=body.section,
        user_id=current_user.user_id,
        target_role=body.target_role,
        jd_id=body.jd_id,
    )

    # Stream SSE: poll Redis until rewrite result is available
    async def event_stream():
        import asyncio
        rewrite_key = f"rewrite:{resume_id}:{body.section}"
        timeout = 90  # seconds
        elapsed = 0

        # Send initial "processing" event
        yield f"data: {json.dumps({'type': 'status', 'message': 'Generating AI suggestions...'})}\n\n"

        while elapsed < timeout:
            await asyncio.sleep(1.5)
            elapsed += 1.5

            # Check if result is ready
            raw = await redis.get(rewrite_key)
            if raw:
                result = json.loads(raw)
                # Stream the suggested content character by character
                content = result.get("suggested_content", "")
                for i in range(0, len(content), 8):
                    chunk = content[i:i+8]
                    yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
                    await asyncio.sleep(0.02)

                # Send complete event
                yield f"data: {json.dumps({'type': 'complete', 'result': result})}\n\n"
                return

            # Check if task failed
            if task.failed():
                yield f"data: {json.dumps({'type': 'error', 'message': 'Rewrite generation failed'})}\n\n"
                return

        yield f"data: {json.dumps({'type': 'error', 'message': 'Rewrite timed out'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# ─── History ──────────────────────────────────────────────────────────────────

@router.get(
    "/history",
    response_model=list[ResumeSummary],
    summary="Get user's resume upload history",
)
async def get_history(
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    limit: int = 20,
    offset: int = 0,
) -> list[ResumeSummary]:
    """Return the authenticated user's resume upload history."""
    from sqlalchemy import desc

    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == current_user.user_id)
        .order_by(desc(Resume.created_at))
        .limit(min(limit, 50))
        .offset(offset)
    )
    resumes = result.scalars().all()

    summaries = []
    for resume in resumes:
        # Get cached score for fast display
        cached_score = await get_cached_ats_score(resume.id, redis=redis)
        score = cached_score.get("overall_score") if cached_score else None
        role = cached_score.get("detected_role") if cached_score else None

        summaries.append(ResumeSummary(
            id=resume.id,
            original_filename=resume.original_filename,
            status=resume.status,
            mode=resume.mode,
            overall_score=score,
            detected_role=role,
            created_at=resume.created_at,
            completed_at=resume.completed_at,
        ))

    return summaries


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete(
    "/{resume_id}",
    response_model=dict,
    summary="Delete a resume (GDPR erasure)",
)
async def delete_resume(
    resume_id: str,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> dict:
    """
    Delete a resume and all associated data.
    GDPR right to erasure: removes from S3, MongoDB, PostgreSQL.
    """
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    assert_owns_resource(resume.user_id, current_user, "resume")

    # Delete from S3
    try:
        await storage_service.delete_file(resume.s3_key)
    except Exception as e:
        logger.warning(f"S3 delete failed (continuing): {e}")

    # Delete from MongoDB
    mongo_db = await get_mongo_db()
    await mongo_db[Collections.RESUMES].delete_one({"_id": resume_id})
    await mongo_db[Collections.ATS_RESULTS].delete_one({"_id": resume_id})

    # Delete from Redis cache
    await redis.delete(f"score:{resume_id}", f"status:{resume_id}", f"role:{resume_id}")

    # Delete from PostgreSQL (cascades to ats_results)
    await db.execute(delete(Resume).where(Resume.id == resume_id))

    await log_audit_event(
        session=db,
        action=AuditAction.RESUME_DELETE,
        user_id=current_user.user_id,
        resource_type="resume",
        resource_id=resume_id,
    )
    await db.commit()

    return {"message": "Resume deleted successfully", "resume_id": resume_id}


# ─── Response Mapper ─────────────────────────────────────────────────────────

def _map_result_to_response(result_doc: dict, resume: Resume) -> ATSAnalysisResponse:
    """Map MongoDB document to ATSAnalysisResponse Pydantic model."""
    from schemas.resume import (
        DimensionScores, SkillAnalysis, SkillMatch, SkillGap,
        HeatmapSection, ExplainabilityReport, ExplainabilityFactor,
        FraudAnalysis, FraudFlag,
    )

    # Dimension scores
    dims = result_doc.get("dimension_scores", {})
    dimension_scores = DimensionScores(
        semantic_skill_match=dims.get("semantic_skill_match", 0),
        project_relevance=dims.get("project_relevance", 0),
        experience_depth=dims.get("experience_depth", 0),
        education_alignment=dims.get("education_alignment", 0),
        ats_format=dims.get("ats_format", 0),
        keyword_intelligence=dims.get("keyword_intelligence", 0),
        certification_bonus=dims.get("certification_bonus"),
        skill_proof_score=dims.get("skill_proof_score"),
    )

    # Skill analysis
    sa = result_doc.get("skill_analysis", {})
    skill_analysis = SkillAnalysis(
        matches=[SkillMatch(**m) for m in sa.get("matches", [])],
        gaps=[SkillGap(**g) for g in sa.get("gaps", [])],
        coverage=sa.get("coverage", 0),
        semantic_score=sa.get("score", 0),
        matched_count=sa.get("matched_count", 0),
        gap_count=sa.get("gap_count", 0),
    )

    # Heatmap
    heatmap = [HeatmapSection(**h) for h in result_doc.get("heatmap", [])]

    # Explainability
    exp = result_doc.get("explainability", {})
    explainability = ExplainabilityReport(
        factors=[ExplainabilityFactor(**f) for f in exp.get("factors", [])],
        summary=exp.get("summary", ""),
        confidence=exp.get("confidence", 0.5),
        confidence_label=exp.get("confidence_label", "MEDIUM"),
    )

    # Fraud analysis
    fraud = result_doc.get("fraud_analysis", {})
    raw_flags = fraud.get("flags", [])
    parsed_flags = []
    for f in raw_flags:
        if isinstance(f, str):
            parsed_flags.append(FraudFlag(flag_type="UNSUBSTANTIATED_SKILL", severity="MEDIUM", detail=f))
        else:
            parsed_flags.append(FraudFlag(**f))

    fraud_analysis = FraudAnalysis(
        is_suspicious=fraud.get("is_suspicious", False),
        fraud_probability=fraud.get("fraud_probability", 0),
        flags=parsed_flags,
        proof_score=fraud.get("proof_score", 1.0),
        verdict=fraud.get("verdict", "CLEAN"),
    )

    return ATSAnalysisResponse(
        resume_id=str(result_doc.get("resume_id", "")),
        user_id=resume.user_id,
        mode=result_doc.get("mode", "GLOBAL"),
        created_at=resume.created_at,
        overall_score=result_doc.get("overall_score", 0),
        score_band=result_doc.get("score_band", "FAIR"),
        percentile=result_doc.get("percentile"),
        detected_role=result_doc.get("detected_role", ""),
        role_confidence=result_doc.get("role_confidence", 0),
        role_alternatives=result_doc.get("role_alternatives", []),
        dimensions=dimension_scores,
        skill_analysis=skill_analysis,
        heatmap=heatmap,
        explainability=explainability,
        fraud_analysis=fraud_analysis,
        ai_confidence=result_doc.get("ai_confidence", 0.5),
        confidence_label=result_doc.get("confidence_label", "MEDIUM"),
    )