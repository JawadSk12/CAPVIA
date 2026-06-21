"""
backend/workers/tasks/embed_resume.py
──────────────────────────────────────
Celery task: Generate vector embeddings for a parsed resume.

Embeddings are generated using Sentence Transformers (all-mpnet-base-v2).
The resulting 768-dimensional vector is stored in:
  - PostgreSQL resume_embeddings table (for pgvector similarity search)
  - MongoDB resume document (for AI pipeline access)

These embeddings power:
  - Semantic skill matching (cosine similarity vs JD embeddings)
  - Similar candidate search (HR feature)
  - Vector search across the resume corpus

After completion, chains: score_global_task or score_internship_task
depending on the resume's mode.
"""

from __future__ import annotations

import asyncio
import logging

import structlog
from celery import Task

from workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


class EmbedResumeTask(Task):
    """Task class with lazy-loaded Sentence Transformer model."""
    abstract = True
    _embedder = None

    @property
    def embedder(self):
        if self._embedder is None:
            try:
                from ai_engine.vector_store.embedder import ResumeEmbedder
            except ImportError:
                import sys
                import os
                sys.path.append(os.getcwd())
                from ai_engine.vector_store.embedder import ResumeEmbedder
            self._embedder = ResumeEmbedder()
            logger.info("sentence_transformer_model_loaded")
        return self._embedder


@celery_app.task(
    bind=True,
    base=EmbedResumeTask,
    name="workers.tasks.embed_resume.embed_resume_task",
    max_retries=3,
    default_retry_delay=30,
    queue="score_queue",
)
def embed_resume_task(self: EmbedResumeTask, resume_id: str) -> dict:
    """
    Generate and store embeddings for a parsed resume.

    Inputs (from MongoDB):
        - skills list
        - experience text
        - projects text
        - full parsed text

    Outputs:
        - 768-dim vector in PostgreSQL resume_embeddings
        - Skill-level embeddings in MongoDB

    Then chains: score_global_task or score_internship_task
    """
    import sys
    import os
    if os.getcwd() not in sys.path:
        sys.path.append(os.getcwd())

    log = logger.bind(resume_id=resume_id, task_id=self.request.id)
    log.info("embed_resume_task_started")

    try:
        result = asyncio.run(_embed_resume_async(resume_id, self, log))
        return result
    except Exception as exc:
        log.error("embed_resume_task_failed", error=str(exc))
        if self.request.retries >= self.max_retries:
            asyncio.run(_set_status_error(resume_id, str(exc)))
        raise


async def _embed_resume_async(resume_id: str, task: EmbedResumeTask, log) -> dict:
    from db.mongodb import get_mongo_db, Collections
    from db.postgres import AsyncSessionLocal
    from db.redis_client import set_resume_status, ResumeStatus
    from models.resume import Resume
    from sqlalchemy import text, update

    # ── Load parsed resume from MongoDB ───────────────────────────────────
    mongo_db = await get_mongo_db()
    resume_doc = await mongo_db[Collections.RESUMES].find_one({"_id": resume_id})

    if not resume_doc:
        raise ValueError(f"Resume document {resume_id} not found in MongoDB")

    parsed = resume_doc.get("parsed", {})
    sections = resume_doc.get("sections", {})

    # ── Build text representations for embedding ──────────────────────────
    # We embed different "views" of the resume:
    # 1. Skills text (for skill matching)
    # 2. Full resume text (for holistic semantic matching)
    # 3. Experience text (for experience depth analysis)

    skills_list = [s["skill"] for s in parsed.get("skills", [])]
    skills_text = " ".join(skills_list)

    experience_text = sections.get("experience", "")
    projects_text = sections.get("projects", "")
    summary_text = sections.get("summary", "")

    # Combined text for full resume embedding
    full_text = " ".join(filter(None, [
        summary_text,
        skills_text,
        experience_text,
        projects_text,
    ]))[:10000]  # Cap at 10K chars (model max is 384 tokens but more context = better)

    log.info("embedding_inputs_built", skills_count=len(skills_list))

    # ── Generate embeddings ───────────────────────────────────────────────
    # Run in thread pool (PyTorch inference can block event loop)
    import asyncio
    embeddings = await asyncio.to_thread(
        task.embedder.generate_resume_embeddings,
        full_text=full_text,
        skills_text=skills_text,
        experience_text=experience_text,
    )

    full_embedding = embeddings["full"]       # 768-dim
    skills_embedding = embeddings["skills"]  # 768-dim

    log.info("embeddings_generated", dim=len(full_embedding))

    # ── Store in PostgreSQL (pgvector) ────────────────────────────────────
    # pgvector requires the vector extension compiled against the exact PG binary.
    # On EDB PostgreSQL 18, the Homebrew pgvector .dylib is incompatible.
    # We make this step optional — scoring tasks read embeddings from MongoDB.
    embedding_str = "[" + ",".join(str(x) for x in full_embedding) + "]"
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                text(
                    "INSERT INTO resume_embeddings (resume_id, embedding, created_at) "
                    "VALUES (:resume_id, CAST(:embedding AS vector), NOW()) "
                    "ON CONFLICT (resume_id) DO UPDATE "
                    "SET embedding = CAST(:embedding AS vector), created_at = NOW()"
                ),
                {"resume_id": resume_id, "embedding": embedding_str},
            )
            await db.commit()
        log.info("embedding_stored_in_pgvector")
    except Exception as pgvec_err:
        # pgvector not available — embeddings are in MongoDB, pipeline continues
        log.warning("pgvector_insert_skipped", reason=str(pgvec_err)[:120])

    # ── Store skill-level embeddings in MongoDB ───────────────────────────
    # These are used by SemanticMatcher during scoring
    skill_embeddings = {}
    if skills_list:
        skill_vecs = await asyncio.to_thread(
            task.embedder.embed_skills, skills_list
        )
        skill_embeddings = {
            skill: vec.tolist()
            for skill, vec in zip(skills_list, skill_vecs)
        }

    await mongo_db[Collections.RESUMES].update_one(
        {"_id": resume_id},
        {
            "$set": {
                "embeddings": {
                    "full": full_embedding,
                    "skills": skills_embedding,
                },
                "skill_embeddings": skill_embeddings,
                "embedding_version": "all-mpnet-base-v2",
            }
        },
    )

    # ── Update status → SCORING ───────────────────────────────────────────
    await set_resume_status(resume_id, ResumeStatus.SCORING)
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Resume).where(Resume.id == resume_id).values(status="SCORING")
        )
        await db.commit()

    # ── Chain scoring task ────────────────────────────────────────────────
    # Check resume mode to determine which scoring task to run
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume_record = result.scalar_one_or_none()

    if resume_record and resume_record.mode == "INTERNSHIP" and resume_record.jd_id:
        from workers.tasks.score_internship import score_internship_task
        score_internship_task.delay(resume_id, resume_record.jd_id)
        log.info("score_internship_task_chained", jd_id=resume_record.jd_id)
    else:
        from workers.tasks.score_global import score_global_task
        score_global_task.delay(resume_id)
        log.info("score_global_task_chained")

    return {"status": "success", "resume_id": resume_id, "embedding_dim": len(full_embedding)}


async def _set_status_error(resume_id: str, error_msg: str) -> None:
    try:
        from db.postgres import AsyncSessionLocal
        from db.redis_client import set_resume_status, ResumeStatus
        from models.resume import Resume
        from sqlalchemy import update

        await set_resume_status(resume_id, ResumeStatus.ERROR, error_msg=error_msg)
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Resume).where(Resume.id == resume_id)
                .values(status="ERROR", error_message=error_msg[:500])
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to set error status: {e}")