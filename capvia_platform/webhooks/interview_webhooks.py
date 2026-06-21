import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from capvia_platform.models.models import (
    Application, ApplicationStatus, StageName, RiskLevel, RecommendationType
)
from capvia_platform.repositories.interview_repository import InterviewRepository
from capvia_platform.repositories.application_repository import ApplicationEventRepository
from capvia_platform.services.application_service import ApplicationService
from capvia_platform.services.services import RecruitmentProgressService
from capvia_platform.services.integrity_service import IntegrityService

logger = logging.getLogger("interview_webhooks")
interview_repo = InterviewRepository()
event_repo = ApplicationEventRepository()

async def handle_interview_evaluated_webhook(db: AsyncSession, data: dict):
    """
    Coordinates interview scored/evaluated webhook payload.
    Persists InterviewResult and IntegrityResult, updates mappings,
    and transitions application status to EVALUATED.
    """
    app_id_str = data.get("application_id")
    session_id_str = data.get("session_id")
    overall_answer_score = int(data.get("overall_answer_score_pct", 0))
    overall_integrity_score = int(data.get("overall_integrity_score", 0))
    cheating_prob = int(data.get("cheating_probability_pct", 0))
    risk_str = data.get("risk_level", "LOW").upper()
    video_url = data.get("video_url", "")
    rec_str = data.get("recommendation", "Consider")
    
    # Check application_id
    if not app_id_str:
        logger.error("Missing application_id in INTERVIEW_EVALUATED webhook data.")
        return {"success": False, "message": "Missing application_id"}

    app_uuid = uuid.UUID(app_id_str)
    session_uuid = uuid.UUID(session_id_str) if session_id_str else uuid.uuid4()

    # 1. Fetch application details
    stmt = (
        select(Application)
        .where(Application.id == app_uuid)
        .options(selectinload(Application.vacancy))
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app:
        logger.error(f"Application {app_uuid} not found during INTERVIEW_EVALUATED processing.")
        return {"success": False, "message": "Application not found"}

    # 2. Map Risk Level and RecommendationType enums
    risk = RiskLevel[risk_str] if risk_str in RiskLevel.__members__ else RiskLevel.LOW
    
    # Map recommendation
    rec = RecommendationType.CONSIDER
    if rec_str == "Strong Hire":
        rec = RecommendationType.STRONG_HIRE
    elif rec_str == "Consider":
        rec = RecommendationType.CONSIDER
    elif rec_str == "Review Required":
        rec = RecommendationType.REVIEW_REQUIRED
    elif rec_str == "Not Recommended":
        rec = RecommendationType.NOT_RECOMMENDED
    else:
        # Check standard RecommendationType keys
        rec_clean = rec_str.replace(" ", "_").upper()
        if rec_clean in RecommendationType.__members__:
            rec = RecommendationType[rec_clean]

    # Extra reports and lists
    strengths = data.get("strengths", ["Technical Skills"])
    improvements = data.get("improvements", ["Elaborate further"])
    raw_report = data.get("raw_report", {})
    baselined_locally = data.get("baselined_locally", False)

    # 3. Save InterviewResult
    await interview_repo.save_interview_result(
        db,
        application_id=app_uuid,
        session_id=session_uuid,
        overall_answer_score_pct=overall_answer_score,
        overall_integrity_score=overall_integrity_score,
        cheating_probability_pct=cheating_prob,
        risk_level=risk,
        recommendation=rec,
        video_url=video_url,
        baselined_locally=baselined_locally,
        local_evaluation_report=raw_report if baselined_locally else None,
        strengths=strengths,
        improvements=improvements,
        raw_report=raw_report
    )

    # 4. Save IntegrityResult if details are provided
    integrity_details = data.get("integrity_details", {})
    if integrity_details:
        await interview_repo.save_integrity_result(
            db,
            application_id=app_uuid,
            focus_percentage=int(integrity_details.get("focus_percentage", 100)),
            look_away_count=int(integrity_details.get("look_away_count", 0)),
            head_stability_pct=int(integrity_details.get("head_stability_pct", 100)),
            head_movements_count=int(integrity_details.get("head_movements_count", 0)),
            face_visibility_pct=int(integrity_details.get("face_visibility_pct", 100)),
            face_absences_count=int(integrity_details.get("face_absences_count", 0)),
            multi_face_events=int(integrity_details.get("multi_face_events", 0)),
            phone_detections_count=int(integrity_details.get("phone_detections_count", 0)),
            tab_switches=int(integrity_details.get("tab_switches", 0)),
            copy_pastes=int(integrity_details.get("copy_pastes", 0)),
            suspicious_keys=int(integrity_details.get("suspicious_keys", 0)),
            violations=integrity_details.get("violations", [])
        )
    else:
        # Default integrity report
        await interview_repo.save_integrity_result(
            db,
            application_id=app_uuid,
            focus_percentage=90,
            look_away_count=0,
            head_stability_pct=90,
            head_movements_count=0,
            face_visibility_pct=100,
            face_absences_count=0,
            multi_face_events=0,
            phone_detections_count=0,
            tab_switches=0,
            copy_pastes=0,
            suspicious_keys=0,
            violations=[]
        )

    # 5. Transition Application Status to EVALUATED
    from_status = app.status.value
    target_status = (
        ApplicationStatus.EVALUATED_LOCAL_BASELINE 
        if baselined_locally else 
        ApplicationStatus.EVALUATED
    )

    await RecruitmentProgressService.update_application_status(
        db,
        application_id=app_uuid,
        status=target_status,
        stage=StageName.INTERVIEW
    )

    # Log event
    await event_repo.create_event(
        db,
        application_id=app_uuid,
        event_type="STATUS_UPDATED_EVALUATED",
        from_status=from_status,
        to_status=target_status.value,
        actor_id=None,
        actor_role="SYSTEM"
    )

    # Notify Candidate
    await ApplicationService._notify(
        db,
        user_id=app.candidate_id,
        title="Evaluation Completed! 📄",
        message=f"Your AI video interview results for '{app.vacancy.title}' have been compiled and evaluated. Our recruitment team will review them shortly."
    )

    logger.info(f"Successfully processed INTERVIEW_EVALUATED webhook for Application {app_uuid}.")

    # Phase 13 — Trigger Integrity Engine automatically after evaluation
    try:
        integrity_result = await IntegrityService.calculate_integrity_assessment(
            db,
            application_id=app_uuid,
            actor_id=None,
            actor_role="SYSTEM"
        )
        if integrity_result:
            logger.info(
                f"IntegrityService auto-triggered for Application {app_uuid}: "
                f"Trust={integrity_result.trust_index}, Risk={integrity_result.compiled_risk_level}"
            )
        else:
            logger.warning(
                f"IntegrityService returned None for Application {app_uuid}. "
                "IntegrityResult row may not exist yet."
            )
    except Exception as exc:
        logger.error(f"IntegrityService auto-trigger failed for Application {app_uuid}: {exc}")

    return {"success": True}
