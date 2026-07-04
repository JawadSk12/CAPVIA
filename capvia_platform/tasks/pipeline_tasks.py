"""
CAPVIA — Parallel Pipeline Pre-Generation Task
Fires immediately on application submit, concurrently with ATS processing.
Pre-warms the AssessAI simulation engine so that when ATS finishes,
the SIMULATION_INVITED transition is instant (no 10-30s registration wait).
"""
import uuid
import logging
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from capvia_platform.database.connection import get_db_session
from capvia_platform.models.models import Application, Internship
from capvia_platform.services.services import MappingService
from capvia_platform.services.simulation_connector import simulation_connector

logger = logging.getLogger("pipeline_tasks")


async def pre_generate_pipeline(application_id: uuid.UUID) -> None:
    """
    Best-effort parallel pre-warm task. Errors are logged but never raised.
    Runs concurrently with process_ats_stage so that by the time ATS finishes,
    the candidate is already registered in AssessAI and SIMULATION_INVITED
    can be applied immediately without an additional 10-30s round-trip.
    """
    # Small delay to let the apply() transaction fully commit
    await asyncio.sleep(0.5)
    logger.info(f"[pre_generate_pipeline] Starting for Application {application_id}")

    try:
        async with get_db_session() as session:
            stmt = (
                select(Application)
                .where(Application.id == application_id)
                .options(
                    selectinload(Application.candidate),
                    selectinload(Application.vacancy).selectinload(Internship.company),
                )
            )
            res = await session.execute(stmt)
            app = res.scalar_one_or_none()

            if not app:
                logger.warning(f"[pre_generate_pipeline] Application {application_id} not found.")
                return

            vacancy = app.vacancy
            candidate = app.candidate

            if not vacancy or not candidate:
                logger.warning(f"[pre_generate_pipeline] Missing vacancy or candidate for {application_id}.")
                return

            company_name = vacancy.company.name if vacancy.company else "CAPVIA"
            vacancy_title = vacancy.title or "Internship"
            required_skills = list(vacancy.required_skills or [])

            # Step 1: Get or create vacancy mapping
            vacancy_map = await MappingService.get_or_create_vacancy_mapping(
                session, vacancy.id
            )

            # Step 2: Pre-register vacancy in AssessAI (idempotent)
            if vacancy_map.simulation_internship_id is None:
                try:
                    logger.info(
                        f"[pre_generate_pipeline] Pre-registering vacancy '{vacancy_title}' in AssessAI"
                    )
                    sim_internship_id = await simulation_connector.register_internship(
                        title=vacancy_title,
                        company_name=company_name,
                        description=vacancy.description,
                        required_skills=required_skills,
                        technologies=[],
                    )
                    vacancy_map.simulation_internship_id = sim_internship_id
                    await session.flush()
                    logger.info(
                        f"[pre_generate_pipeline] Vacancy pre-registered: sim_internship_id={sim_internship_id}"
                    )
                except Exception as e:
                    logger.warning(
                        f"[pre_generate_pipeline] Vacancy pre-registration failed (non-fatal): {e}"
                    )
            else:
                logger.info(
                    f"[pre_generate_pipeline] Vacancy already registered: sim_internship_id={vacancy_map.simulation_internship_id}"
                )

            sim_internship_id = vacancy_map.simulation_internship_id
            if not sim_internship_id:
                logger.warning(
                    f"[pre_generate_pipeline] No sim_internship_id available, skipping candidate pre-registration."
                )
                return

            # Step 3: Get or create candidate + application mapping
            cand_map = await MappingService.get_or_create_candidate_mapping(session, candidate.id)
            app_map = await MappingService.get_or_create_application_mapping(session, application_id)

            # Step 4: Pre-register candidate in AssessAI (idempotent)
            if app_map.simulation_application_id is None:
                try:
                    logger.info(
                        f"[pre_generate_pipeline] Pre-registering candidate '{candidate.email}' in AssessAI"
                    )
                    reg_res = await simulation_connector.register_candidate(
                        internship_id=sim_internship_id,
                        external_application_uuid=str(application_id),
                        external_candidate_uuid=str(candidate.id),
                        email=candidate.email,
                        name=candidate.full_name or candidate.email,
                        skills=required_skills,
                    )

                    sim_cand_id = reg_res.get("simulation_candidate_id")
                    sim_app_id = reg_res.get("simulation_application_id")

                    if sim_cand_id and sim_app_id:
                        cand_map.simulation_candidate_id = sim_cand_id
                        app_map.simulation_application_id = sim_app_id
                        await session.flush()
                        logger.info(
                            f"[pre_generate_pipeline] Candidate pre-registered: "
                            f"sim_cand_id={sim_cand_id}, sim_app_id={sim_app_id}"
                        )
                    else:
                        logger.warning(
                            f"[pre_generate_pipeline] Unexpected registration response: {reg_res}"
                        )
                except Exception as e:
                    logger.warning(
                        f"[pre_generate_pipeline] Candidate pre-registration failed (non-fatal): {e}"
                    )
            else:
                logger.info(
                    f"[pre_generate_pipeline] Candidate already registered: sim_app_id={app_map.simulation_application_id}"
                )

            await session.commit()
            logger.info(
                f"[pre_generate_pipeline] Completed successfully for Application {application_id}"
            )

    except Exception as e:
        # Best-effort task — never crash the main request
        logger.error(
            f"[pre_generate_pipeline] Unhandled error for Application {application_id}: {e}",
            exc_info=True,
        )
