"""
backend/workers/tasks/parse_resume.py
──────────────────────────────────────
Celery task: Parse a resume from S3, extract structured data.

Pipeline:
  1. Download raw file bytes from S3
  2. Run OCR pipeline → extract full text
  3. Detect section boundaries (Education, Skills, Experience, etc.)
  4. Run NER → extract skills, companies, dates, degrees, projects
  5. Store parsed result in MongoDB
  6. Update status in Redis + PostgreSQL
  7. Chain: embed_resume_task.delay(resume_id)

Retry strategy:
  - Max 3 retries
  - Exponential backoff: 30s, 60s, 120s
  - After 3 failures: status=ERROR, HR notified

This task is CPU-bound (OCR, NER) and runs on the ocr_queue.
No GPU required.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import structlog
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded

from workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


class ParseResumeTask(Task):
    """
    Custom task class with model registry as class-level attribute.
    
    Models are loaded ONCE when the worker starts (not on every task execution).
    Class-level state persists across task invocations within a single worker process.
    This avoids the 15-30 second model load time on every task.
    """
    abstract = True
    _ocr_pipeline = None
    _ner_extractor = None
    _section_detector = None

    @property
    def ocr_pipeline(self):
        if self._ocr_pipeline is None:
            # Use absolute-style imports if running as a package, or ensure path is set
            try:
                from ai_engine.pipelines.ocr_pipeline import OCRPipeline
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.pipelines.ocr_pipeline import OCRPipeline
            self._ocr_pipeline = OCRPipeline()
            logger.info("ocr_pipeline_loaded")
        return self._ocr_pipeline

    @property
    def ner_extractor(self):
        if self._ner_extractor is None:
            try:
                from ai_engine.models.ner_extractor import NERExtractor
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.models.ner_extractor import NERExtractor
            self._ner_extractor = NERExtractor()
            logger.info("ner_extractor_loaded")
        return self._ner_extractor

    @property
    def section_detector(self):
        if self._section_detector is None:
            try:
                from ai_engine.utils.section_detector import SectionDetector
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.utils.section_detector import SectionDetector
            self._section_detector = SectionDetector()
            logger.info("section_detector_loaded")
        return self._section_detector


@celery_app.task(
    bind=True,
    base=ParseResumeTask,
    name="workers.tasks.parse_resume.parse_resume_task",
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,          # exponential: 30s, 60s, 120s
    retry_backoff_max=120,
    retry_jitter=True,           # random jitter to spread retries
    queue="ocr_queue",
)
def parse_resume_task(self: ParseResumeTask, resume_id: str) -> dict:
    """
    Main resume parsing task.

    Args:
        resume_id: UUID of the Resume record in PostgreSQL

    Returns:
        dict with { "status": "success", "resume_id": ... }

    Side effects:
        - MongoDB: creates/updates resumes/{resume_id} document
        - Redis: updates status key
        - PostgreSQL: updates resume.status
        - Celery: chains embed_resume_task
    """
    log = logger.bind(resume_id=resume_id, task_id=self.request.id)
    log.info("parse_resume_task_started")

    try:
        # ── Run async operations in sync context ──────────────────────────
        # Celery tasks are sync; we use asyncio.run() for async DB/storage ops.
        # Each task gets its own event loop (worker_prefetch_multiplier=1 ensures
        # no concurrent execution per worker, so no loop conflicts).
        result = asyncio.run(_parse_resume_async(
            resume_id=resume_id,
            task=self,
            log=log,
        ))
        return result

    except SoftTimeLimitExceeded:
        log.warning("parse_resume_soft_time_limit_exceeded")
        asyncio.run(_set_status_error(resume_id, "Task timed out"))
        raise

    except Exception as exc:
        log.error("parse_resume_task_failed", error=str(exc), exc_info=True)

        # On final retry (max_retries exceeded), mark as ERROR
        if self.request.retries >= self.max_retries:
            asyncio.run(_set_status_error(resume_id, str(exc)))

        raise


async def _parse_resume_async(resume_id: str, task: ParseResumeTask, log) -> dict:
    """
    Async implementation of the parsing pipeline.
    Called from sync Celery task via asyncio.run().
    """
    # Use absolute-style imports if running as a package, or ensure path is set
    try:
        from db.postgres import AsyncSessionLocal
        from db.mongodb import get_mongo_db, Collections
        from db.redis_client import set_resume_status, ResumeStatus
        from services.storage_service import storage_service
    except ImportError:
        import sys
        import os
        sys.path.append(os.getcwd())
        from db.postgres import AsyncSessionLocal
        from db.mongodb import get_mongo_db, Collections
        from db.redis_client import set_resume_status, ResumeStatus
        from services.storage_service import storage_service
    from models.resume import Resume
    from sqlalchemy import select, update

    # ── Step 1: Fetch resume metadata from PostgreSQL ─────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()

        if resume is None:
            raise ValueError(f"Resume {resume_id} not found in PostgreSQL")

        s3_key = resume.s3_key
        file_type = resume.file_type

    # ── Step 2: Update status → OCR ──────────────────────────────────────
    await set_resume_status(resume_id, ResumeStatus.OCR)

    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Resume)
            .where(Resume.id == resume_id)
            .values(status=ResumeStatus.OCR, celery_task_id=task.request.id)
        )
        await db.commit()

    log.info("status_updated_to_ocr")

    # ── Step 3: Download from S3 ──────────────────────────────────────────
    file_bytes = await storage_service.download_file(s3_key)
    log.info("file_downloaded", size_bytes=len(file_bytes))

    # ── Step 4: OCR — extract raw text ───────────────────────────────────
    raw_text = task.ocr_pipeline.extract(file_bytes, file_type)
    log.info("ocr_complete", text_length=len(raw_text))

    if len(raw_text.strip()) < 100:
        raise ValueError(
            f"Extracted text too short ({len(raw_text)} chars). "
            "File may be an image-only scanned PDF or corrupted."
        )

    # ── Step 5: Section detection ─────────────────────────────────────────
    await set_resume_status(resume_id, ResumeStatus.PARSING)
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Resume).where(Resume.id == resume_id).values(status="PARSING")
        )
        await db.commit()

    sections = task.section_detector.detect(raw_text)
    log.info("sections_detected", sections_found=list(sections.keys()))

    # ── Step 6: NER extraction ─────────────────────────────────────────────
    entities = task.ner_extractor.extract(sections)
    log.info(
        "ner_complete",
        skills_found=len(entities.get("skills", [])),
        exp_years=entities.get("experience_years", 0),
    )

    # ── Step 7: Store in MongoDB ───────────────────────────────────────────
    mongo_db = await get_mongo_db()

    resume_document = {
        "_id": resume_id,
        "user_id": resume.user_id if hasattr(resume, "user_id") else None,
        "raw_text": raw_text,
        "word_count": len(raw_text.split()),
        "sections": sections,
        "parsed": entities,
        "parse_version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await mongo_db[Collections.RESUMES].replace_one(
        {"_id": resume_id},
        resume_document,
        upsert=True,
    )
    log.info("resume_stored_in_mongodb")

    # ── Step 8: Update PostgreSQL status → EMBEDDING ──────────────────────
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Resume)
            .where(Resume.id == resume_id)
            .values(status="EMBEDDING")
        )
        await db.commit()

    await set_resume_status(resume_id, ResumeStatus.EMBEDDING)

    # ── Step 9: Chain next task ────────────────────────────────────────────
    # Import here to avoid circular imports
    from workers.tasks.embed_resume import embed_resume_task
    embed_resume_task.delay(resume_id)
    log.info("embed_resume_task_chained")

    return {"status": "success", "resume_id": resume_id}


async def _set_status_error(resume_id: str, error_msg: str) -> None:
    """Mark resume as ERROR in both Redis and PostgreSQL."""
    try:
        from db.postgres import AsyncSessionLocal
        from db.redis_client import set_resume_status, ResumeStatus
        from models.resume import Resume
        from sqlalchemy import update

        await set_resume_status(resume_id, ResumeStatus.ERROR, error_msg=error_msg)

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Resume)
                .where(Resume.id == resume_id)
                .values(status="ERROR", error_message=error_msg[:500])
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to set error status: {e}")


# ─── Periodic Task: Cleanup stale resumes ─────────────────────────────────────

@celery_app.task(name="workers.tasks.parse_resume.cleanup_stale_resumes")
def cleanup_stale_resumes() -> dict:
    """
    Find resumes stuck in PENDING/OCR/PARSING state for >1 hour.
    Mark them as ERROR so the UI doesn't show infinite loading.
    Runs every 30 minutes via Celery Beat.
    """
    return asyncio.run(_cleanup_stale_async())


async def _cleanup_stale_async() -> dict:
    from datetime import timedelta

    from db.postgres import AsyncSessionLocal
    from db.redis_client import set_resume_status, ResumeStatus
    from models.resume import Resume
    from sqlalchemy import select, update

    stale_threshold = datetime.now(timezone.utc) - timedelta(hours=1)
    stale_statuses = ["PENDING", "OCR", "PARSING", "EMBEDDING", "SCORING"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Resume.id).where(
                Resume.status.in_(stale_statuses),
                Resume.created_at < stale_threshold,
            )
        )
        stale_ids = result.scalars().all()

        if stale_ids:
            await db.execute(
                update(Resume)
                .where(Resume.id.in_(stale_ids))
                .values(
                    status="ERROR",
                    error_message="Processing timed out. Please try uploading again.",
                )
            )
            await db.commit()

            for resume_id in stale_ids:
                await set_resume_status(
                    resume_id, ResumeStatus.ERROR, "Processing timed out"
                )

    count = len(stale_ids)
    logger.info(f"Cleaned up {count} stale resumes")
    return {"cleaned_count": count}