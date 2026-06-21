import uuid
import logging
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from capvia_platform.database.connection import get_db_session
from capvia_platform.models.models import Application, ApplicationStatus, StageName, Internship
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.repositories.application_repository import ApplicationEventRepository
from capvia_platform.services.simulation_connector import simulation_connector
from capvia_platform.services.application_service import ApplicationService

logger = logging.getLogger("simulation_tasks")
event_repo = ApplicationEventRepository()

async def register_candidate_for_simulation_task(application_id: uuid.UUID):
    """
    Background task to register internship and candidate in AssessAI,
    update mappings, transition status to SIMULATION_INVITED, and notify.
    """
    await asyncio.sleep(0.2)
    logger.info(f"Starting background Simulation registration for Application: {application_id}")

    async with get_db_session() as session:
        # 1. Fetch application with details
        stmt = (
            select(Application)
            .where(Application.id == application_id)
            .options(
                selectinload(Application.candidate),
                selectinload(Application.vacancy).selectinload(Internship.company)
            )
        )
        res = await session.execute(stmt)
        app = res.scalar_one_or_none()

        if not app:
            logger.error(f"Application {application_id} not found in background simulation task.")
            return

        # 2. Get or create vacancy mapping
        vacancy_map = await MappingService.get_or_create_vacancy_mapping(session, app.vacancy_id)
        sim_internship_id = vacancy_map.simulation_internship_id

        # If not registered in AssessAI yet, register it
        if sim_internship_id is None:
            try:
                # Resolve company name
                company_name = "Acme Corp"
                if app.vacancy.company:
                    company_name = app.vacancy.company.name

                logger.info(f"Registering vacancy '{app.vacancy.title}' in AssessAI")
                sim_internship_id = await simulation_connector.register_internship(
                    title=app.vacancy.title,
                    company_name=company_name,
                    description=app.vacancy.description,
                    required_skills=app.vacancy.required_skills or [],
                    technologies=[]
                )
                vacancy_map.simulation_internship_id = sim_internship_id
                await session.flush()
            except Exception as e:
                logger.error(f"Failed to register vacancy in AssessAI: {str(e)}")
                # Log event
                await event_repo.create_event(
                    session,
                    application_id=application_id,
                    event_type="SIMULATION_REGISTRATION_FAILED",
                    from_status=app.status.value,
                    to_status=app.status.value,
                    metadata={"error": f"Vacancy registration failed: {str(e)}"}
                )
                return

        # 3. Register candidate in AssessAI
        try:
            logger.info(f"Registering candidate '{app.candidate.email}' in AssessAI for internship {sim_internship_id}")
            reg_res = await simulation_connector.register_candidate(
                internship_id=sim_internship_id,
                external_application_uuid=str(application_id),
                external_candidate_uuid=str(app.candidate_id),
                email=app.candidate.email,
                name=app.candidate.full_name or app.candidate.email,
                skills=app.vacancy.required_skills or []
            )

            sim_cand_id = reg_res.get("simulation_candidate_id")
            sim_app_id = reg_res.get("simulation_application_id")

            if not sim_cand_id or not sim_app_id:
                raise ValueError(f"Invalid registration response: {reg_res}")

            # Save mappings
            cand_map = await MappingService.get_or_create_candidate_mapping(session, app.candidate_id)
            cand_map.simulation_candidate_id = sim_cand_id

            app_map = await MappingService.get_or_create_application_mapping(session, application_id)
            app_map.simulation_application_id = sim_app_id

            await session.flush()

        except Exception as e:
            logger.error(f"Failed to register candidate in AssessAI: {str(e)}")
            await event_repo.create_event(
                session,
                application_id=application_id,
                event_type="SIMULATION_REGISTRATION_FAILED",
                from_status=app.status.value,
                to_status=app.status.value,
                metadata={"error": f"Candidate registration failed: {str(e)}"}
            )
            return

        # 4. Transition application to SIMULATION_INVITED
        try:
            from_status = app.status.value
            await RecruitmentProgressService.update_application_status(
                session,
                application_id=application_id,
                status=ApplicationStatus.SIMULATION_INVITED,
                stage=StageName.SIMULATION
            )

            # Log success event
            await event_repo.create_event(
                session,
                application_id=application_id,
                event_type="STATUS_UPDATED_SIMULATION_INVITED",
                from_status=from_status,
                to_status="SIMULATION_INVITED",
                actor_id=None,
                actor_role="SYSTEM"
            )

            # Notify candidate
            await ApplicationService._notify(
                session,
                user_id=app.candidate_id,
                title="Simulation Invited! 💻",
                message=f"Congratulations! You passed the resume screening for '{app.vacancy.title}'. You are invited to complete the Coding Simulation."
            )

            await session.commit()
            logger.info(f"Successfully invited Application {application_id} to AssessAI Simulation")

        except Exception as e:
            logger.error(f"Failed to transition application {application_id} to SIMULATION_INVITED: {str(e)}")
            await session.rollback()
