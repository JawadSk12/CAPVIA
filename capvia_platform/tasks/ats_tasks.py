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
    """
    # Small sleep to ensure transaction that created the application is fully committed
    await asyncio.sleep(0.2)
    
    logger.info(f"Starting background ATS processing task for Application: {application_id}")
    
    async with get_db_session() as session:
        # 1. Fetch application with vacancy eagerly loaded
        from sqlalchemy.orm import selectinload
        stmt = (
            select(Application)
            .where(Application.id == application_id)
            .options(selectinload(Application.vacancy))
        )
        res = await session.execute(stmt)
        app = res.scalar_one_or_none()
        
        if not app:
            logger.error(f"Application {application_id} not found in background task.")
            return

        # 2. Update status to ATS_PENDING
        try:
            await RecruitmentProgressService.update_application_status(
                session,
                application_id=application_id,
                status=ApplicationStatus.ATS_PENDING,
                stage=StageName.ATS
            )
            
            # Create event
            await event_repo.create_event(
                session,
                application_id=application_id,
                event_type="STATUS_UPDATED_ATS_PENDING",
                from_status="APPLIED",
                to_status="ATS_PENDING",
                actor_id=app.candidate_id,
                actor_role="STUDENT"
            )
            
            # Send notification
            from capvia_platform.services.application_service import ApplicationService
            await ApplicationService._notify(
                session,
                user_id=app.candidate_id,
                title="Resume Under Review 🤖",
                message=f"Your resume for the internship '{app.vacancy.title}' is being analyzed by our ATS system."
            )
            
            # Commit transition state
            await session.commit()
            
        except Exception as e:
            logger.error(f"Failed to transition application {application_id} to ATS_PENDING: {str(e)}")
            return

        # 3. Retrieve resume bytes from resume_url
        resume_bytes = None
        filename = "resume.pdf"
        
        if app.resume_url:
            if app.resume_url.startswith("http://") or app.resume_url.startswith("https://"):
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(app.resume_url)
                        resp.raise_for_status()
                        resume_bytes = resp.content
                        filename = os.path.basename(app.resume_url.split("?")[0]) or "resume.pdf"
                except Exception as e:
                    logger.warning(f"Failed to download resume from URL {app.resume_url}: {str(e)}")
            else:
                try:
                    if os.path.exists(app.resume_url):
                        with open(app.resume_url, "rb") as f:
                            resume_bytes = f.read()
                        filename = os.path.basename(app.resume_url)
                except Exception as e:
                    logger.warning(f"Failed to read local resume file {app.resume_url}: {str(e)}")

        if not resume_bytes:
            logger.info(f"Using fallback mock PDF bytes for Application {application_id}")
            resume_bytes = b"%PDF-1.4 mock resume content"
            filename = "mock_resume.pdf"

        # 4. Upload and compare resume via ATS Connector
        try:
            # Upload
            resume_uuid_str = await ats_connector.upload_resume(resume_bytes, filename)
            resume_uuid = uuid.UUID(resume_uuid_str)
            logger.info(f"Uploaded resume for Application {application_id}, received resume_uuid: {resume_uuid}")
            
            # Save resume uuid mapping
            await MappingService.get_or_create_application_mapping(
                session,
                application_id=application_id,
                ats_resume_uuid=resume_uuid
            )
            await session.commit()
            
            # Trigger comparison
            logger.info(f"Triggering comparison for vacancy {app.vacancy_id} and resume {resume_uuid}")
            compare_res = await ats_connector.compare_resume(str(app.vacancy_id), str(resume_uuid))
            logger.info(f"ATS comparison triggered successfully. Response: {compare_res}")
            
        except Exception as e:
            logger.error(f"Error executing ATS processing for Application {application_id}: {str(e)}")
            # Log failure event
            await event_repo.create_event(
                session,
                application_id=application_id,
                event_type="ATS_PROCESSING_FAILED",
                from_status="ATS_PENDING",
                to_status="ATS_PENDING",
                metadata={"error": str(e)}
            )
            await session.commit()
