import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from capvia_platform.models.models import Application, ApplicationStatus, StageName, RiskLevel, CandidateMapping
from capvia_platform.services.simulation_connector import simulation_connector
from capvia_platform.repositories.simulation_repository import SimulationRepository
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.repositories.application_repository import ApplicationEventRepository
from capvia_platform.services.application_service import ApplicationService

logger = logging.getLogger("simulation_webhooks")
sim_repo = SimulationRepository()
event_repo = ApplicationEventRepository()

async def handle_simulation_submitted_webhook(db: AsyncSession, data: dict):
    """
    Coordinates simulation submission webhook.
    Fetches detailed report, updates mappings, persists SimulationResult,
    and transitions application status.
    """
    app_id_str = data.get("application_id")
    attempt_id = data.get("attempt_id")
    total_score = float(data.get("total_score", 0.0))
    risk_str = data.get("cheating_risk_level", "LOW").upper()
    ai_dep = float(data.get("ai_dependency_score", 0.0))
    rec = data.get("recommendation", "consider")

    if not app_id_str:
        logger.error("Missing application_id in SIMULATION_SUBMITTED webhook data.")
        return {"success": False, "message": "Missing application_id"}

    app_uuid = uuid.UUID(app_id_str)
    
    # 1. Fetch application details
    stmt = (
        select(Application)
        .where(Application.id == app_uuid)
        .options(selectinload(Application.vacancy))
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app:
        logger.error(f"Application {app_uuid} not found during SIMULATION_SUBMITTED processing.")
        return {"success": False, "message": "Application not found"}

    # 2. Map Risk Level enum
    risk = RiskLevel[risk_str] if risk_str in RiskLevel.__members__ else RiskLevel.LOW

    # 3. Fetch detailed evaluation report from AssessAI
    sim_candidate_id = None
    try:
        cand_map_stmt = select(CandidateMapping.simulation_candidate_id).where(CandidateMapping.capvia_candidate_uuid == app.candidate_id)
        cand_map_res = await db.execute(cand_map_stmt)
        sim_candidate_id = cand_map_res.scalar_one_or_none()
    except Exception as map_err:
        logger.warning(f"Could not resolve simulation candidate mapping: {map_err}")

    try:
        detailed_report = await simulation_connector.get_evaluation_report(attempt_id, sim_candidate_id=sim_candidate_id)
    except Exception as e:
        logger.warning(f"Failed to fetch detailed report for attempt {attempt_id}: {str(e)}. Using fallback baseline.")
        detailed_report = {
            "total_score": total_score,
            "round_scores": {"round_1": total_score},
            "cheating_risk_level": risk_str,
            "ai_dependency_score": ai_dep,
            "recommendation": rec
        }

    round_scores = detailed_report.get("round_scores", {})
    submitted_at = detailed_report.get("submitted_at")
    if isinstance(submitted_at, str):
        try:
            submitted_at = datetime.fromisoformat(submitted_at)
        except ValueError:
            submitted_at = datetime.utcnow()
    else:
        submitted_at = datetime.utcnow()

    # 4. Save detailed SimulationResult
    await sim_repo.save_simulation_result(
        db,
        application_id=app_uuid,
        attempt_id=attempt_id,
        total_score=total_score,
        recommendation=rec,
        cheating_risk_level=risk,
        ai_dependency_score=ai_dep,
        round_scores=round_scores,
        submitted_at=submitted_at
    )

    # 5. Update cache in ApplicationMapping
    mapping = await MappingService.get_or_create_application_mapping(db, app_uuid)
    mapping.simulation_score = total_score
    mapping.simulation_attempt_id = attempt_id
    if risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
        mapping.combined_risk_level = RiskLevel.HIGH

    # 6. Evaluate threshold (Pass score >= 70% and not high cheating risk)
    passed = (total_score >= 70.0) and (risk != RiskLevel.HIGH)
    from_status = app.status.value

    if passed:
        # Transition to INTERVIEW_INVITED
        await RecruitmentProgressService.update_application_status(
            db,
            application_id=app_uuid,
            status=ApplicationStatus.INTERVIEW_INVITED,
            stage=StageName.INTERVIEW
        )
        
        # Log event
        await event_repo.create_event(
            db,
            application_id=app_uuid,
            event_type="STATUS_UPDATED_INTERVIEW_INVITED",
            from_status=from_status,
            to_status="INTERVIEW_INVITED",
            actor_id=None,
            actor_role="SYSTEM"
        )
        
        # Notify candidate
        await ApplicationService._notify(
            db,
            user_id=app.candidate_id,
            title="Interview Invited! 🎥",
            message=f"Congratulations! You passed the coding simulation for '{app.vacancy.title}'. You are invited to complete the AI Video Interview."
        )
    else:
        # Transition to SIMULATION_COMPLETED
        await RecruitmentProgressService.update_application_status(
            db,
            application_id=app_uuid,
            status=ApplicationStatus.SIMULATION_COMPLETED,
            stage=StageName.SIMULATION
        )
        
        # Log event
        await event_repo.create_event(
            db,
            application_id=app_uuid,
            event_type="STATUS_UPDATED_SIMULATION_COMPLETED",
            from_status=from_status,
            to_status="SIMULATION_COMPLETED",
            actor_id=None,
            actor_role="SYSTEM"
        )
        
        # Notify candidate
        await ApplicationService._notify(
            db,
            user_id=app.candidate_id,
            title="Simulation Completed 💻",
            message=f"Thank you for completing the coding simulation for '{app.vacancy.title}'. Your results are under review."
        )

    logger.info(f"Successfully processed Simulation webhook for Application {app_uuid}. Passed: {passed}")
    return {"success": True, "passed": passed}
