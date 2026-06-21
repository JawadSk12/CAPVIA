"""
backend/db/mongodb.py
─────────────────────
Async MongoDB client using Motor (async wrapper around PyMongo).

MongoDB stores the RICH, document-heavy data:
  - Full parsed resume JSON (skills, experience, projects, entities)
  - Full ATS result breakdown (dimension scores, SHAP values, heatmap)
  - Internship JD documents with embeddings
  - Rewrite suggestion history

PostgreSQL stores relational metadata (IDs, statuses, foreign keys).
MongoDB stores everything that benefits from a flexible schema.

Collections:
  - resumes          : parsed resume documents
  - internships      : job description documents
  - ats_results      : full analysis results
  - rewrite_history  : AI rewrite suggestion logs

Usage:
    from db.mongodb import get_mongo_db, Collections

    async def my_service():
        db = await get_mongo_db()
        doc = await db[Collections.RESUMES].find_one({"_id": resume_id})
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel

from config import settings

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)


# ─── Collection Names ─────────────────────────────────────────────────────────

class Collections:
    """String constants for MongoDB collection names. Avoids typos."""
    RESUMES = "resumes"
    INTERNSHIPS = "internships"
    ATS_RESULTS = "ats_results"
    INTERNSHIP_RESULTS = "internship_results"
    REWRITE_HISTORY = "rewrite_history"
    SKILL_ONTOLOGY = "skill_ontology"       # cached ontology snapshots


# ─── Client Singleton ─────────────────────────────────────────────────────────

import asyncio

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None
_last_loop: asyncio.AbstractEventLoop | None = None


async def get_mongo_client() -> AsyncIOMotorClient:
    """
    Returns the Motor client singleton.
    Motor manages its own connection pool internally.
    """
    global _client, _last_loop
    current_loop = asyncio.get_running_loop()

    if _client is None or _last_loop != current_loop:
        _client = AsyncIOMotorClient(
            settings.MONGO_URL,
            maxPoolSize=settings.MONGO_MAX_POOL_SIZE,
            minPoolSize=settings.MONGO_MIN_POOL_SIZE,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=30000,
        )
        _last_loop = current_loop
        logger.info("MongoDB client initialized for loop %s", id(current_loop))

    return _client


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """
    Returns the database instance.
    """
    global _database, _last_loop
    current_loop = asyncio.get_running_loop()

    if _database is None or _last_loop != current_loop:
        client = await get_mongo_client()
        _database = client[settings.MONGO_DB_NAME]
    return _database


async def close_mongo_connection() -> None:
    """
    Close MongoDB connection pool.
    Called in FastAPI shutdown event.
    """
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection closed")


# ─── Index Setup ──────────────────────────────────────────────────────────────

async def create_indexes() -> None:
    """
    Create all MongoDB indexes on startup.
    Idempotent: safe to call multiple times.
    
    Index strategy:
    - resumes: by user_id for user-specific queries
    - ats_results: by resume_id for result lookup, by score for ranking
    - internship_results: compound (jd_id + score) for candidate ranking
    """
    db = await get_mongo_db()

    # ── resumes collection ────────────────────────────────────────────────────
    await db[Collections.RESUMES].create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
    ])

    # ── ats_results collection ────────────────────────────────────────────────
    await db[Collections.ATS_RESULTS].create_indexes([
        IndexModel([("resume_id", ASCENDING)], unique=True),
        IndexModel([("overall_score", DESCENDING)]),
        IndexModel([("detected_role", ASCENDING), ("overall_score", DESCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
    ])

    # ── internship_results collection ─────────────────────────────────────────
    await db[Collections.INTERNSHIP_RESULTS].create_indexes([
        IndexModel(
            [("jd_id", ASCENDING), ("resume_id", ASCENDING)],
            unique=True,
            name="unique_jd_resume_pair",
        ),
        IndexModel([("jd_id", ASCENDING), ("overall_score", DESCENDING)]),
        IndexModel([("is_suspicious", ASCENDING)]),
    ])

    # ── internships collection ────────────────────────────────────────────────
    await db[Collections.INTERNSHIPS].create_indexes([
        IndexModel([("created_by", ASCENDING)]),
        IndexModel([("is_active", ASCENDING), ("created_at", DESCENDING)]),
    ])

    logger.info("MongoDB indexes created successfully")


# ─── Health Check ─────────────────────────────────────────────────────────────

async def mongo_health_check() -> bool:
    """
    Ping MongoDB. Returns True if healthy, False otherwise.
    Used in GET /health endpoint.
    """
    try:
        client = await get_mongo_client()
        await client.admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        return False