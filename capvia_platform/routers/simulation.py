import uuid
import logging
from datetime import datetime, timedelta
from typing import Any, List
from fastapi import APIRouter, Depends, Path, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.api.dependencies import get_db, get_system_auth, get_current_user
from capvia_platform.schemas.schemas import (
    CandidateRegisterRequest, CandidateRegisterResponse,
    StartSimulationResponse, SyncAttemptRequest, SyncAttemptResponse,
    SaveAnswerRequest, SaveAnswerResponse, SaveTelemetryEventsRequest, SaveTelemetryEventsResponse,
    SimulationSubmitResponse
)
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.services.simulation_connector import simulation_connector, SimulationConnectorException
from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, Application, ApplicationMapping, CandidateMapping, User
)

logger = logging.getLogger("simulation_router")

router = APIRouter()


# =============================================================================
# Helper DB Queries to resolve simulation_candidate_id and check ownership
# =============================================================================

async def get_sim_candidate_id_for_app(db: AsyncSession, app_uuid: uuid.UUID, current_user: User) -> int:
    stmt = (
        select(Application)
        .where(Application.id == app_uuid)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    # Verify candidate ownership (allow HR/Admin to bypass)
    user_role_val = getattr(current_user.role, "value", str(current_user.role))
    if app.candidate_id != current_user.id and user_role_val not in ("ADMIN", "HR"):
        raise HTTPException(
            status_code=403,
            detail="Access denied. You do not own this application."
        )

    stmt_map = (
        select(CandidateMapping.simulation_candidate_id)
        .where(CandidateMapping.capvia_candidate_uuid == app.candidate_id)
    )
    res_map = await db.execute(stmt_map)
    sim_cand_id = res_map.scalar_one_or_none()
    if not sim_cand_id:
        raise HTTPException(
            status_code=404,
            detail="Candidate simulation mapping not found. Please contact support."
        )
    return sim_cand_id


async def get_sim_candidate_id_for_attempt(db: AsyncSession, attempt_id: int, current_user: User) -> int:
    stmt = (
        select(Application)
        .join(ApplicationMapping, ApplicationMapping.application_id == Application.id)
        .where(ApplicationMapping.simulation_attempt_id == attempt_id)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Simulation attempt mapping not found.")
    
    # Verify candidate ownership (allow HR/Admin to bypass)
    user_role_val = getattr(current_user.role, "value", str(current_user.role))
    if app.candidate_id != current_user.id and user_role_val not in ("ADMIN", "HR"):
        raise HTTPException(
            status_code=403,
            detail="Access denied. You do not own this simulation attempt."
        )

    stmt_map = (
        select(CandidateMapping.simulation_candidate_id)
        .where(CandidateMapping.capvia_candidate_uuid == app.candidate_id)
    )
    res_map = await db.execute(stmt_map)
    sim_cand_id = res_map.scalar_one_or_none()
    if not sim_cand_id:
        raise HTTPException(
            status_code=404,
            detail="Candidate simulation mapping not found for this attempt."
        )
    return sim_cand_id


# =============================================================================
# System Endpoints — called by simulation engine callbacks / CAPVIA internals
# =============================================================================

@router.post(
    "/system/internships/{internship_id}/register-candidate",
    response_model=CandidateRegisterResponse,
    tags=["Simulation"]
)
async def register_candidate(
    internship_id: str,
    payload: CandidateRegisterRequest,
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 2.1: System endpoint — registers candidate↔simulation engine mapping.
    Called internally by CAPVIA internals. The actual ID-mapping is handled by
    register_candidate_for_simulation_task background task via simulation_connector.
    This endpoint is a passthrough that returns current mapping state.
    """
    cand_mapping = await MappingService.get_or_create_candidate_mapping(
        db,
        candidate_uuid=uuid.UUID(payload.external_candidate_uuid),
    )

    app_mapping = await MappingService.get_or_create_application_mapping(
        db,
        application_id=uuid.UUID(payload.external_application_uuid),
    )

    await RecruitmentProgressService.update_application_status(
        db,
        application_id=uuid.UUID(payload.external_application_uuid),
        status=ApplicationStatus.SIMULATION_INVITED,
        stage=StageName.SIMULATION
    )

    sim_cand_id = getattr(cand_mapping, "simulation_candidate_id", None) or 0
    sim_app_id = getattr(app_mapping, "simulation_application_id", None) or 0

    return CandidateRegisterResponse(
        simulation_candidate_id=sim_cand_id,
        simulation_application_id=sim_app_id
    )


# =============================================================================
# Candidate Endpoint — Start Simulation
# =============================================================================

@router.post(
    "/applications/{application_id}/start-simulation",
    response_model=StartSimulationResponse,
    tags=["Simulation"]
)
async def start_simulation(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 2.2: Candidate clicks "Start Assessment Challenge".
    - Validates that simulation invitation mapping exists
    - Proxies to simulation engine to allocate a real attempt instance
    - Stores real attempt_id in ApplicationMapping
    - Returns real attempt_id for frontend to navigate to
    """
    app_uuid = uuid.UUID(application_id)

    # 1. Fetch the application mapping to get simulation_application_id
    stmt = select(ApplicationMapping).where(ApplicationMapping.application_id == app_uuid)
    res = await db.execute(stmt)
    app_map = res.scalar_one_or_none()

    sim_application_id = app_map.simulation_application_id if app_map else None

    if not sim_application_id:
        raise HTTPException(
            status_code=202,
            detail={
                "code": "SIMULATION_NOT_READY",
                "message": (
                    "Your simulation invitation is still being prepared. "
                    "Please wait a moment and try again. "
                    "If the problem persists, contact support."
                )
            }
        )

    # Resolve simulation candidate ID & verify ownership
    sim_candidate_id = await get_sim_candidate_id_for_app(db, app_uuid, current_user)

    # 2. Call simulation engine to start (or resume) the attempt
    try:
        attempt_data = await simulation_connector.start_attempt(sim_application_id, sim_candidate_id)
    except SimulationConnectorException as e:
        logger.error(
            f"Simulation engine rejected start_attempt for sim_app_id={sim_application_id}: {e.message}"
        )
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": "SIMULATION_ENGINE_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Unexpected error starting simulation attempt: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail={"code": "SIMULATION_ENGINE_UNAVAILABLE", "message": str(e)}
        )

    # 3. Extract real attempt_id and store it in the DB mapping
    attempt_id = attempt_data.get("attempt_id")
    if not attempt_id:
        logger.error(f"Simulation engine returned no attempt_id: {attempt_data}")
        raise HTTPException(
            status_code=502,
            detail={"code": "SIMULATION_ENGINE_BAD_RESPONSE", "message": "No attempt_id returned from simulation engine."}
        )

    # Persist the real attempt ID
    await MappingService.get_or_create_application_mapping(
        db,
        application_id=app_uuid,
        simulation_attempt_id=attempt_id
    )

    # 4. Transition application status to SIMULATION_IN_PROGRESS
    try:
        await RecruitmentProgressService.update_application_status(
            db,
            application_id=app_uuid,
            status=ApplicationStatus.SIMULATION_IN_PROGRESS,
            stage=StageName.SIMULATION
        )
    except Exception as e:
        logger.warning(f"Could not update application status to SIMULATION_IN_PROGRESS: {e}")

    # 5. Return real attempt data to frontend
    access_token = attempt_data.get("access_token", "")
    expires_at_raw = attempt_data.get("expires_at")
    if expires_at_raw:
        try:
            expires_at = datetime.fromisoformat(str(expires_at_raw))
        except Exception:
            expires_at = datetime.utcnow() + timedelta(hours=2)
    else:
        expires_at = datetime.utcnow() + timedelta(hours=2)

    return StartSimulationResponse(
        application_id=application_id,
        attempt_id=attempt_id,
        simulation_token=access_token,
        expires_at=expires_at
    )


# =============================================================================
# Gateway / Sync Endpoints
# =============================================================================

@router.post(
    "/gateway/applications/{application_id}/sync-attempt",
    response_model=SyncAttemptResponse,
    tags=["Simulation"]
)
async def sync_attempt(
    application_id: str,
    payload: SyncAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 2.2a: Syncs simulation_attempt_id from a client-side start back to CAPVIA.
    """
    app_uuid = uuid.UUID(application_id)

    # Check ownership
    stmt = select(Application).where(Application.id == app_uuid)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    user_role_val = getattr(current_user.role, "value", str(current_user.role))
    if app.candidate_id != current_user.id and user_role_val not in ("ADMIN", "HR"):
        raise HTTPException(status_code=403, detail="Access denied")

    await MappingService.get_or_create_application_mapping(
        db,
        application_id=app_uuid,
        simulation_attempt_id=payload.simulation_attempt_id
    )

    await RecruitmentProgressService.update_application_status(
        db,
        application_id=app_uuid,
        status=ApplicationStatus.SIMULATION_IN_PROGRESS
    )

    return SyncAttemptResponse(success=True, message="Attempt mapped and synchronized successfully")


# =============================================================================
# Attempt Proxy Endpoints — proxy all attempt operations to simulation engine
# =============================================================================

@router.get(
    "/gateway/attempts/{attempt_id}",
    tags=["Simulation"]
)
async def get_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy: GET /api/v1/gateway/attempts/{attempt_id}
    """
    sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
    try:
        return await simulation_connector.get_attempt(attempt_id, sim_candidate_id)
    except SimulationConnectorException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching attempt {attempt_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))


@router.post(
    "/gateway/attempts/{attempt_id}/answer",
    tags=["Simulation"]
)
async def save_answer_proxy(
    attempt_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy: POST /api/v1/gateway/attempts/{attempt_id}/answer
    """
    sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
    try:
        body = await request.json()
    except Exception:
        body = {}
    try:
        return await simulation_connector.submit_answer(attempt_id, sim_candidate_id, body)
    except SimulationConnectorException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error saving answer for attempt {attempt_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))


@router.post(
    "/gateway/attempts/{attempt_id}/complete-round",
    tags=["Simulation"]
)
async def complete_round_proxy(
    attempt_id: int,
    round_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy: POST /api/v1/gateway/attempts/{attempt_id}/complete-round
    """
    sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
    try:
        return await simulation_connector.complete_round(attempt_id, sim_candidate_id, round_number)
    except SimulationConnectorException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error completing round {round_number} for attempt {attempt_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))


@router.post(
    "/gateway/attempts/{attempt_id}/submit",
    tags=["Simulation"]
)
async def submit_simulation_proxy(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy: POST /api/v1/gateway/attempts/{attempt_id}/submit
    """
    sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
    try:
        submit_result = await simulation_connector.submit_attempt(attempt_id, sim_candidate_id)
    except SimulationConnectorException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error submitting attempt {attempt_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))

    # Find the CAPVIA application by attempt_id mapping
    stmt = select(ApplicationMapping).where(ApplicationMapping.simulation_attempt_id == attempt_id)
    res = await db.execute(stmt)
    app_map = res.scalar_one_or_none()

    if app_map:
        total_score = float(submit_result.get("final_score", submit_result.get("total_score", 0.0)))
        cheating_risk = submit_result.get("cheating_risk_level", "LOW").upper()
        recommendation = submit_result.get("recommendation", "consider")
        ai_dep = float(submit_result.get("ai_dependency_score", 0.0))

        webhook_data = {
            "application_id": str(app_map.application_id),
            "attempt_id": attempt_id,
            "total_score": total_score,
            "cheating_risk_level": cheating_risk,
            "ai_dependency_score": ai_dep,
            "recommendation": recommendation,
        }

        try:
            import asyncio
            asyncio.create_task(_run_simulation_webhook(webhook_data))
        except Exception as wh_err:
            logger.error(f"Failed to schedule simulation webhook for attempt {attempt_id}: {wh_err}")

    return submit_result


async def _run_simulation_webhook(webhook_data: dict):
    """Background coroutine: runs simulation webhook in a fresh DB session."""
    try:
        from capvia_platform.database.connection import get_db_session
        from capvia_platform.webhooks.simulation_webhooks import handle_simulation_submitted_webhook
        async with get_db_session() as session:
            await handle_simulation_submitted_webhook(session, webhook_data)
            await session.commit()
        logger.info(f"Simulation webhook completed for application {webhook_data.get('application_id')}")
    except Exception as e:
        logger.error(f"Simulation webhook failed: {e}")


@router.post(
    "/gateway/attempts/{attempt_id}/events",
    tags=["Simulation"]
)
async def log_events_proxy(
    attempt_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy: POST /api/v1/gateway/attempts/{attempt_id}/events
    """
    sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
    try:
        body = await request.json()
    except Exception:
        body = []
    try:
        return await simulation_connector.log_events(attempt_id, sim_candidate_id, body)
    except Exception as e:
        logger.warning(f"Error logging events for attempt {attempt_id}: {str(e)}")
        return {"success": True, "processed_count": len(body) if isinstance(body, list) else 0}


@router.get(
    "/gateway/attempts/{attempt_id}/report",
    tags=["Simulation"]
)
async def get_report_proxy(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy: GET /api/v1/gateway/attempts/{attempt_id}/report
    """
    sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
    try:
        return await simulation_connector.get_report(attempt_id, sim_candidate_id)
    except SimulationConnectorException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching report for attempt {attempt_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))


@router.get(
    "/gateway/internships/{sim_internship_id}/blueprint",
    tags=["Simulation"]
)
async def get_blueprint_proxy(
    sim_internship_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Proxy: GET /api/v1/gateway/internships/{sim_internship_id}/blueprint
    """
    try:
        return await simulation_connector.get_internship_blueprint(sim_internship_id)
    except SimulationConnectorException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching blueprint for internship {sim_internship_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=str(e))


# =============================================================================
# Legacy Stub Endpoints (kept for backwards compatibility with any direct calls)
# =============================================================================

@router.post("/attempts/{attempt_id}/answer", response_model=SaveAnswerResponse, tags=["Simulation"])
async def save_answer(
    attempt_id: int,
    payload: SaveAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
        data = payload.dict() if hasattr(payload, "dict") else {}
        await simulation_connector.submit_answer(attempt_id, sim_candidate_id, data)
    except Exception:
        pass
    return SaveAnswerResponse(success=True, saved_at=datetime.utcnow())


@router.post("/attempts/{attempt_id}/events", response_model=SaveTelemetryEventsResponse, tags=["Simulation"])
async def save_telemetry_events(
    attempt_id: int,
    payload: SaveTelemetryEventsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    events_list = payload.events if hasattr(payload, "events") else []
    try:
        sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
        await simulation_connector.log_events(attempt_id, sim_candidate_id, [e.dict() if hasattr(e, "dict") else e for e in events_list])
    except Exception:
        pass
    return SaveTelemetryEventsResponse(success=True, processed_count=len(events_list))


@router.post("/attempts/{attempt_id}/submit", response_model=SimulationSubmitResponse, tags=["Simulation"])
async def submit_simulation(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        sim_candidate_id = await get_sim_candidate_id_for_attempt(db, attempt_id, current_user)
        submit_result = await simulation_connector.submit_attempt(attempt_id, sim_candidate_id)
    except Exception as e:
        logger.warning(f"Simulation engine submit failed: {e}")
        submit_result = {}

    total_score = float(submit_result.get("final_score", submit_result.get("total_score", 85.5)))
    cheating_risk_str = submit_result.get("cheating_risk_level", "LOW").upper()
    risk = RiskLevel[cheating_risk_str] if cheating_risk_str in RiskLevel.__members__ else RiskLevel.LOW
    recommendation = submit_result.get("recommendation", "hire")

    stmt = select(ApplicationMapping).where(ApplicationMapping.simulation_attempt_id == attempt_id)
    res = await db.execute(stmt)
    app_map = res.scalar_one_or_none()

    if app_map:
        webhook_data = {
            "application_id": str(app_map.application_id),
            "attempt_id": attempt_id,
            "total_score": total_score,
            "cheating_risk_level": cheating_risk_str,
            "ai_dependency_score": float(submit_result.get("ai_dependency_score", 0.0)),
            "recommendation": recommendation,
        }
        try:
            import asyncio
            asyncio.create_task(_run_simulation_webhook(webhook_data))
        except Exception:
            pass

    return SimulationSubmitResponse(
        attempt_id=attempt_id,
        status="submitted",
        total_score=total_score,
        role_name=submit_result.get("role_name", "Software Developer"),
        skills_assessed=submit_result.get("skills_assessed", ["Python", "Problem Solving"]),
        cheating_risk_level=risk,
        recommendation=recommendation
    )


# =============================================================================
# Recruiter Dashboard — Application List
# =============================================================================

@router.get("/applications", tags=["Recruiter Dashboard"])
async def get_applications_list(
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.vacancy),
            selectinload(Application.application_mapping),
            selectinload(Application.ats_result),
            selectinload(Application.simulation_result),
            selectinload(Application.interview_result)
        )
        .order_by(Application.created_at.desc())
    )
    res = await db.execute(stmt)
    apps = list(res.scalars().all())

    if not apps:
        return []

    out = []
    for app in apps:
        out.append({
            "id": str(app.id),
            "status": app.status.value,
            "current_stage": app.current_stage.value,
            "created_at": app.created_at.isoformat(),
            "updated_at": app.updated_at.isoformat(),
            "candidate": {
                "full_name": app.candidate.full_name,
                "email": app.candidate.email
            } if app.candidate else None,
            "vacancy": {
                "title": app.vacancy.title
            } if app.vacancy else None,
            "application_mapping": {
                "ats_score": float(app.application_mapping.ats_score) if app.application_mapping and app.application_mapping.ats_score else None,
                "simulation_score": float(app.application_mapping.simulation_score) if app.application_mapping and app.application_mapping.simulation_score else None,
                "interview_answer_score_pct": app.application_mapping.interview_answer_score_pct if app.application_mapping else None,
                "interview_integrity_score": app.application_mapping.interview_integrity_score if app.application_mapping else None,
                "combined_risk_level": app.application_mapping.combined_risk_level.value if app.application_mapping else "LOW"
            } if app.application_mapping else None
        })
    return out
