import uuid
import logging
import httpx
import os
import asyncio
from sqlalchemy import select
from capvia_platform.database.connection import get_db_session
from capvia_platform.models.models import Application, ApplicationStatus, StageName
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.repositories.application_repository import ApplicationEventRepository
from capvia_platform.services.ats_connector import ats_connector

logger = logging.getLogger("ats_tasks")
event_repo = ApplicationEventRepository()

async def process_ats_stage(application_id: uuid.UUID):
    """
    Background task to transition application to ATS_PENDING, upload resume,
    and trigger ATS comparison.

    Uses separate DB sessions for each phase so that a failure in one phase
    does not poison the session used by another phase.
    """
    # Small sleep to ensure transaction that created the application is fully committed
    await asyncio.sleep(0.2)

    logger.info(f"Starting background ATS processing task for Application: {application_id}")

    # ── Phase 1: Fetch application & transition to ATS_PENDING ──────────────────
    candidate_id = None
    vacancy_id = None
    vacancy_title = None
    resume_url = None
    vacancy_required_skills = []
    vacancy_responsibilities = []
    vacancy_technologies = []
    vacancy_description = None
    vacancy_experience_level = "entry"
    company_name = None

    async with get_db_session() as session:
        from sqlalchemy.orm import selectinload
        from capvia_platform.models.models import Internship
        stmt = (
            select(Application)
            .where(Application.id == application_id)
            .options(
                selectinload(Application.vacancy).selectinload(Internship.company)
            )
        )
        res = await session.execute(stmt)
        app = res.scalar_one_or_none()

        if not app:
            logger.error(f"Application {application_id} not found in background task.")
            return

        candidate_id = app.candidate_id
        vacancy_id = app.vacancy_id
        resume_url = app.resume_url

        if app.vacancy:
            vacancy_title = app.vacancy.title
            vacancy_required_skills = list(app.vacancy.required_skills or [])
            vacancy_responsibilities = list(app.vacancy.responsibilities or [])
            vacancy_technologies = list(app.vacancy.technologies or [])
            vacancy_description = app.vacancy.description
            vacancy_experience_level = app.vacancy.experience_level or "entry"
            if app.vacancy.company:
                company_name = app.vacancy.company.name
        else:
            vacancy_title = "Internship"


        try:
            await RecruitmentProgressService.update_application_status(
                session,
                application_id=application_id,
                status=ApplicationStatus.ATS_PENDING,
                stage=StageName.ATS
            )

            await event_repo.create_event(
                session,
                application_id=application_id,
                event_type="STATUS_UPDATED_ATS_PENDING",
                from_status="APPLIED",
                to_status="ATS_PENDING",
                actor_id=candidate_id,
                actor_role="STUDENT"
            )

            from capvia_platform.services.application_service import ApplicationService
            await ApplicationService._notify(
                session,
                user_id=candidate_id,
                title="Resume Under Review 🤖",
                message=f"Your resume for the internship '{vacancy_title}' is being analyzed by our ATS system."
            )

            await session.commit()

        except Exception as e:
            logger.error(f"Failed to transition application {application_id} to ATS_PENDING: {str(e)}")
            return

    # ── Phase 2: Download or read resume bytes ───────────────────────────────────
    resume_bytes = None
    filename = "resume.pdf"

    if resume_url:
        if resume_url.startswith("http://") or resume_url.startswith("https://"):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(resume_url)
                    resp.raise_for_status()
                    resume_bytes = resp.content
                    filename = os.path.basename(resume_url.split("?")[0]) or "resume.pdf"
            except Exception as e:
                logger.warning(f"Failed to download resume from URL {resume_url}: {str(e)}")
        else:
            try:
                if os.path.exists(resume_url):
                    with open(resume_url, "rb") as f:
                        resume_bytes = f.read()
                    filename = os.path.basename(resume_url)
            except Exception as e:
                logger.warning(f"Failed to read local resume file {resume_url}: {str(e)}")

    if not resume_bytes:
        logger.info(f"Using fallback mock PDF bytes for Application {application_id}")
        resume_bytes = b"%PDF-1.4 mock resume content"
        filename = "mock_resume.pdf"

    # ── Phase 3: Sync JD to ATS Engine & upload resume ──────────────────────────
    resume_uuid: uuid.UUID = None
    try:
        # First sync the internship JD to the ATS Engine (idempotent — safe to re-run)
        try:
            await ats_connector.sync_jd_to_ats(
                jd_id=str(vacancy_id),
                title=vacancy_title,
                required_skills=vacancy_required_skills,
                responsibilities=vacancy_responsibilities,
                preferred_skills=[],
                tools_and_technologies=vacancy_technologies,
                company=company_name,
                description=vacancy_description,
                experience_level=vacancy_experience_level,
            )
        except Exception as jd_err:
            logger.warning(f"JD sync to ATS failed (will proceed anyway): {jd_err}")

        resume_uuid_str = await ats_connector.upload_resume(resume_bytes, filename)
        resume_uuid = uuid.UUID(resume_uuid_str)
        logger.info(f"Uploaded resume for Application {application_id}, received resume_uuid: {resume_uuid}")

        async with get_db_session() as session:
            await MappingService.get_or_create_application_mapping(
                session,
                application_id=application_id,
                ats_resume_uuid=resume_uuid
            )
            await session.commit()

    except Exception as e:
        logger.error(f"Resume upload failed for Application {application_id}: {str(e)}")
        async with get_db_session() as session:
            try:
                await event_repo.create_event(
                    session,
                    application_id=application_id,
                    event_type="ATS_PROCESSING_FAILED",
                    from_status="ATS_PENDING",
                    to_status="ATS_PENDING",
                    metadata={"error": f"Upload failed: {str(e)}"}
                )
                await session.commit()
            except Exception:
                pass
        return

    # ── Phase 4: Poll resume processing status (up to 20s) ──────────────────────
    for attempt in range(20):
        try:
            st_res = await ats_connector.get_resume_status(str(resume_uuid))
            status_val = st_res.get("status", "")
            logger.info(f"Resume {resume_uuid} status: {status_val} (attempt {attempt+1})")
            if status_val in ("DONE", "COMPLETED", "READY"):
                logger.info(f"Resume {resume_uuid} processing complete.")
                break
        except Exception as status_err:
            logger.warning(f"Error polling resume status: {status_err}")
        await asyncio.sleep(1)

    # ── Phase 5: Trigger ATS comparison ──────────────────────────────────────────
    try:
        compare_res = await ats_connector.compare_resume(str(vacancy_id), str(resume_uuid))
        logger.info(f"ATS comparison triggered for Application {application_id}. Response: {compare_res}")
    except Exception as comp_err:
        logger.warning(f"ATS comparison call returned an error (may still process): {comp_err}")

    # ── Phase 6: Wait briefly for ATS Celery worker callback, then fallback ───────
    # The ATS Engine may call back our /webhooks/ats endpoint automatically.
    # We wait up to 10s for that, then handle it ourselves if not done.
    await asyncio.sleep(5)

    async with get_db_session() as session:
        res = await session.execute(
            select(Application).where(Application.id == application_id)
        )
        current_app = res.scalar_one_or_none()
        already_processed = (
            current_app is not None
            and current_app.status != ApplicationStatus.ATS_PENDING
        )

    if already_processed:
        logger.info(
            f"Application {application_id} already advanced to {current_app.status.value} "
            f"(ATS callback received). Skipping redundant webhook call."
        )
        return

    # Fallback: ATS Engine did not call back — process webhook ourselves
    from capvia_platform.webhooks.ats_webhooks import handle_ats_processed_webhook
    webhook_data = {
        "application_id": str(application_id),
        "resume_id": str(resume_uuid),
        "jd_id": str(vacancy_id),
        "status": "SUCCESS"
    }
    try:
        async with get_db_session() as session:
            result = await handle_ats_processed_webhook(session, webhook_data)
            await session.commit()
            logger.info(f"ATS webhook (fallback) processed for Application {application_id}. Result: {result}")
    except Exception as webhook_err:
        logger.error(f"ATS webhook processing failed for Application {application_id}: {str(webhook_err)}")
        async with get_db_session() as session:
            try:
                await event_repo.create_event(
                    session,
                    application_id=application_id,
                    event_type="ATS_PROCESSING_FAILED",
                    from_status="ATS_PENDING",
                    to_status="ATS_PENDING",
                    metadata={"error": str(webhook_err)}
                )
                await session.commit()
            except Exception:
                pass

