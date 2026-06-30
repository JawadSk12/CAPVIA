import uuid
import json
import random
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import redis.asyncio as aioredis

from capvia_platform.api.dependencies import get_db, get_system_auth, get_current_user
from capvia_platform.schemas.schemas import (
    StartInterviewRequest, StartInterviewResponse,
    SaveInterviewAnswerRequest, SaveInterviewAnswerResponse,
    InterviewCompleteResponse, InterviewResultResponse
)
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType, ApplicationMapping, InterviewResult, Application, User
)
from capvia_platform.core.config import settings
from capvia_platform.core.exceptions import ResourceNotFoundException, BaseAPIException
from capvia_platform.repositories.interview_repository import InterviewRepository
from capvia_platform.tasks.interview_tasks import process_interview_evaluation_task

logger = logging.getLogger("interview_router")
router = APIRouter()
interview_repo = InterviewRepository()

async def _get_redis() -> Optional[aioredis.Redis]:
    if settings.REDIS_URL:
        try:
            pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
            return aioredis.Redis(connection_pool=pool)
        except Exception as e:
            logger.warning(f"Failed to connect to Redis in router: {str(e)}")
    return None

def _generate_default_questions(job_role: str, skills: List[str]) -> List[str]:
    skill_str = skills[0] if skills else job_role
    return [
        f"Describe your experience working with {skill_str} and how you implement it in production.",
        f"What are some common performance bottlenecks in {job_role} applications, and how do you resolve them?",
        f"Explain a time when you had to debug a complex issue related to state management or concurrency in your application.",
        f"How do you ensure security and follow best practices when building APIs or database layers for {job_role}?",
        f"Imagine you are in a team meeting and there is a conflict about technical design. How do you resolve it behaviourally?"
    ]

@router.post("/interview/start", response_model=StartInterviewResponse, tags=["Interview"])
async def start_interview(
    payload: StartInterviewRequest,
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 3.1: Initializes video session, triggers LLM questions, returns Signed URL for video.
    """
    session_id = uuid.uuid4()
    app_uuid = uuid.UUID(payload.application_id)
    cand_uuid = uuid.UUID(payload.candidate_id)
    
    # 1. Fetch Application to verify existence
    stmt_app = select(Application).where(Application.id == app_uuid).options(selectinload(Application.vacancy))
    res_app = await db.execute(stmt_app)
    app = res_app.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", payload.application_id)

    # 2. Save mapping coordinates
    await MappingService.get_or_create_candidate_mapping(
        db,
        candidate_uuid=cand_uuid,
        interview_candidate_uuid=cand_uuid
    )
    
    await MappingService.get_or_create_application_mapping(
        db,
        application_id=app_uuid,
        interview_session_uuid=session_id
    )
    
    # 3. Transition status to INTERVIEW_IN_PROGRESS
    await RecruitmentProgressService.update_application_status(
        db,
        application_id=app_uuid,
        status=ApplicationStatus.INTERVIEW_IN_PROGRESS,
        stage=StageName.INTERVIEW
    )
    
    # 4. Generate 5 customized questions
    questions = _generate_default_questions(payload.job_role, payload.skills)
    
    # Save questions in Redis
    redis_client = await _get_redis()
    if redis_client:
        try:
            questions_key = f"interview_questions:{app_uuid}"
            await redis_client.setex(questions_key, 7200, json.dumps(questions))
        except Exception as e:
            logger.warning(f"Failed to cache interview questions: {str(e)}")

    await db.commit()

    return StartInterviewResponse(
        session_id=str(session_id),
        signed_video_upload_url=f"https://storage.googleapis.com/capvia-interview-videos/{session_id}.webm",
        questions=questions,
        expires_at=datetime.utcnow() + timedelta(hours=2)
    )

@router.post("/interview/answer", response_model=SaveInterviewAnswerResponse, tags=["Interview"])
async def save_interview_answer(
    payload: SaveInterviewAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 3.2: Saves audio, text transcript, and proctoring logs per question.
    """
    # Resolve candidate's active application in INTERVIEW status
    stmt_app = (
        select(Application)
        .where(
            Application.candidate_id == current_user.id,
            Application.status.in_([
                ApplicationStatus.INTERVIEW_INVITED,
                ApplicationStatus.INTERVIEW_IN_PROGRESS
            ])
        )
        .order_by(Application.updated_at.desc())
    )
    res_app = await db.execute(stmt_app)
    app = res_app.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=404,
            detail="No active interview session found for your candidate account."
        )
    app_uuid = app.id

    # Resolve question text by index
    question_text = f"Question {payload.question_index + 1}"
    redis_client = await _get_redis()
    if redis_client:
        try:
            questions_key = f"interview_questions:{app_uuid}"
            q_raw = await redis_client.get(questions_key)
            if q_raw:
                questions = json.loads(q_raw)
                if 0 <= payload.question_index < len(questions):
                    question_text = questions[payload.question_index]
        except Exception as e:
            logger.warning(f"Failed to fetch questions from cache: {str(e)}")

    # Store answers in Redis cache
    if redis_client:
        try:
            answers_key = f"interview_answers:{app_uuid}"
            ans_raw = await redis_client.get(answers_key)
            answers = json.loads(ans_raw) if ans_raw else []
            
            # Update or append
            updated = False
            for ans in answers:
                if ans.get("question_index") == payload.question_index:
                    ans["answer"] = payload.transcript
                    ans["question"] = question_text
                    ans["audio_duration_sec"] = payload.audio_duration_sec
                    updated = True
                    break
            if not updated:
                answers.append({
                    "question_index": payload.question_index,
                    "question": question_text,
                    "answer": payload.transcript,
                    "audio_duration_sec": payload.audio_duration_sec
                })
            await redis_client.setex(answers_key, 7200, json.dumps(answers))

            # Store proctoring logs
            proc_key = f"interview_proctoring:{app_uuid}"
            proc_raw = await redis_client.get(proc_key)
            proc_records = json.loads(proc_raw) if proc_raw else []
            proc_records.append({
                "question_index": payload.question_index,
                "violations_count": payload.proctoring_violations_count,
                "details": payload.proctoring_details or {}
            })
            await redis_client.setex(proc_key, 7200, json.dumps(proc_records))
        except Exception as e:
            logger.warning(f"Failed to cache answer in Redis: {str(e)}")

    return SaveInterviewAnswerResponse(
        success=True, 
        saved_at=datetime.utcnow()
    )

@router.post("/interview/complete", response_model=InterviewCompleteResponse, tags=["Interview"])
async def complete_interview(
    session_id: str = Form(...),
    video_url: str = Form(...),
    local_violations_json: str = Form(...),
    baselined_locally: Optional[bool] = Form(False),
    local_evaluation_report_json: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 3.3: Concludes interview and triggers evaluation.
    """
    session_uuid = uuid.UUID(session_id)
    
    # 1. Resolve mapping coordinates
    stmt = select(ApplicationMapping).where(ApplicationMapping.interview_session_uuid == session_uuid)
    res = await db.execute(stmt)
    app_map = res.scalar_one_or_none()
    
    if not app_map:
        raise ResourceNotFoundException("ApplicationMapping with session", session_id)
        
    app_id = app_map.application_id
    
    # Query application to check ownership
    stmt_app = select(Application).where(Application.id == app_id)
    res_app = await db.execute(stmt_app)
    app_obj = res_app.scalar_one_or_none()
    
    if app_obj:
        user_role_val = getattr(current_user.role, "value", str(current_user.role))
        if app_obj.candidate_id != current_user.id and user_role_val not in ("ADMIN", "HR"):
            raise HTTPException(
                status_code=403,
                detail="Access denied. You do not own this interview session."
            )
    
    # 2. Update stage status
    target_status = (
        ApplicationStatus.EVALUATED_LOCAL_BASELINE 
        if baselined_locally else 
        ApplicationStatus.INTERVIEW_COMPLETED
    )
    
    await RecruitmentProgressService.update_application_status(
        db,
        application_id=app_id,
        status=target_status,
        stage=StageName.INTERVIEW
    )
    
    if baselined_locally:
        # Save results directly (Evaluation Server Offline Fallback)
        answer_score = 75
        integrity_score = 90
        cheating_prob = 10
        risk = RiskLevel.LOW
        rec = RecommendationType.STRONG_HIRE
        local_report = {}
        
        if local_evaluation_report_json:
            try:
                local_report = json.loads(local_evaluation_report_json)
                answer_score = local_report.get("overall_answer_score_pct", answer_score)
                integrity_score = local_report.get("overall_integrity_score", integrity_score)
                cheating_prob = local_report.get("cheating_probability_pct", cheating_prob)
                
                risk_str = local_report.get("risk_level", "LOW").upper()
                risk = RiskLevel[risk_str] if risk_str in RiskLevel.__members__ else RiskLevel.LOW
                
                rec_str = local_report.get("recommendation", "Strong Hire")
                if rec_str == "Strong Hire":
                    rec = RecommendationType.STRONG_HIRE
                elif rec_str == "Consider":
                    rec = RecommendationType.CONSIDER
                elif rec_str == "Review Required":
                    rec = RecommendationType.REVIEW_REQUIRED
                else:
                    rec = RecommendationType.NOT_RECOMMENDED
            except Exception:
                pass

        await interview_repo.save_interview_result(
            db,
            application_id=app_id,
            session_id=session_uuid,
            overall_answer_score_pct=answer_score,
            overall_integrity_score=integrity_score,
            cheating_probability_pct=cheating_prob,
            risk_level=risk,
            recommendation=rec,
            video_url=video_url,
            baselined_locally=True,
            local_evaluation_report=local_report,
            strengths=["Technical Base", "Communication Clarity"],
            improvements=["Database structures"],
            raw_report=local_report
        )
        
        # Save baseline proctoring
        await interview_repo.save_integrity_result(
            db,
            application_id=app_id,
            focus_percentage=90,
            look_away_count=1,
            head_stability_pct=90,
            head_movements_count=1,
            face_visibility_pct=100,
            face_absences_count=0,
            multi_face_events=0,
            phone_detections_count=0,
            tab_switches=1,
            copy_pastes=0,
            suspicious_keys=0,
            violations=[]
        )
        await db.commit()
        
        return InterviewCompleteResponse(
            success=True,
            status="BASELINED_LOCALLY",
            evaluated_immediately=True
        )
    else:
        # Commit stage status transition to INTERVIEW_COMPLETED
        await db.commit()

        # Spawn Async background task to fetch details, call evaluation server, and complete evaluation
        import asyncio
        asyncio.create_task(
            process_interview_evaluation_task(app_id, video_url, local_violations_json)
        )
        
        return InterviewCompleteResponse(
            success=True,
            status="processing_evaluation",
            evaluated_immediately=False
        )

@router.get("/interview/status/{application_id}", tags=["Interview"])
async def get_interview_status(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 6.4: Poll Interview Evaluation status.
    """
    app_uuid = uuid.UUID(application_id)
    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise ResourceNotFoundException("Application", application_id)
    
    # Check ownership
    user_role_val = getattr(current_user.role, "value", str(current_user.role))
    if app.candidate_id != current_user.id and user_role_val not in ("ADMIN", "HR"):
        raise HTTPException(
            status_code=403,
            detail="Access denied. You do not own this application."
        )
        
    status = "not_started"
    progress = 0
    
    if app.status in [ApplicationStatus.EVALUATED, ApplicationStatus.EVALUATED_LOCAL_BASELINE]:
        status = "completed"
        progress = 100
    elif app.status == ApplicationStatus.INTERVIEW_COMPLETED:
        status = "processing_evaluation"
        progress = 80
    elif app.status == ApplicationStatus.INTERVIEW_IN_PROGRESS:
        status = "in_progress"
        progress = 50
    elif app.status == ApplicationStatus.INTERVIEW_INVITED:
        status = "not_started"
        progress = 10
        
    return {
        "application_id": str(app.id),
        "session_id": str(app.application_mapping.interview_session_uuid) if app.application_mapping and app.application_mapping.interview_session_uuid else None,
        "status": status,
        "progress_percent": progress,
        "error_message": None,
        "updated_at": app.updated_at.isoformat()
    }

@router.get("/interview/result/{application_id}", response_model=InterviewResultResponse, tags=["Interview"])
async def get_interview_result(
    application_id: str,
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 3.4: Retrieves final evaluated reporting dashboard metrics. Securely authorized via System JWT.
    """
    app_uuid = uuid.UUID(application_id)
    
    # Query database
    result = await interview_repo.get_interview_result(db, app_uuid)
    if not result:
        raise ResourceNotFoundException("InterviewResult for application", application_id)
        
    return InterviewResultResponse(
        application_id=str(result.application_id),
        session_id=str(result.session_id),
        overall_answer_score_pct=result.overall_answer_score_pct,
        overall_integrity_score=result.overall_integrity_score,
        cheating_probability_pct=result.cheating_probability_pct,
        risk_level=result.risk_level,
        recommendation=result.recommendation,
        video_url=result.video_url,
        baselined_locally=result.baselined_locally,
        strengths=result.strengths,
        improvements=result.improvements
    )
