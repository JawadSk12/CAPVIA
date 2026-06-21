"""
backend/db/redis_client.py
──────────────────────────
Async Redis client using redis-py with hiredis parser.

Responsibilities:
  - Cache ATS scores (avoids re-running expensive AI pipeline)
  - Store resume processing status (polled by frontend every 2s)
  - Rate limiting counters (via slowapi)
  - Celery broker / result backend (separate DBs)
  - Session blacklist for JWT logout

Redis DB allocation:
  DB 0  → Application cache (scores, status, role detection)
  DB 1  → Celery broker
  DB 2  → Celery result backend
  DB 3  → Rate limiting counters

Key naming convention:
  status:{resume_id}           → processing stage string
  score:{resume_id}            → JSON ATS score summary
  role:{resume_id}             → detected role + confidence
  session_blacklist:{jti}      → "1" if token is revoked
  ratelimit:{ip}:{endpoint}    → counter
"""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis
from redis.asyncio import ConnectionPool, Redis
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff
from redis.exceptions import BusyLoadingError, ConnectionError, TimeoutError

from config import settings

logger = logging.getLogger(__name__)


# ─── Connection Pool ──────────────────────────────────────────────────────────

import asyncio
_pool: ConnectionPool | None = None
_redis_client: Redis | None = None
_last_loop: asyncio.AbstractEventLoop | None = None


def _build_pool() -> ConnectionPool:
    """
    Build a connection pool with retry logic.
    ExponentialBackoff retries on transient connection errors.
    """
    retry = Retry(
        backoff=ExponentialBackoff(cap=10, base=0.5),
        retries=3,
        supported_errors=(ConnectionError, TimeoutError, BusyLoadingError),
    )
    return aioredis.ConnectionPool.from_url(
        settings.REDIS_URL,
        db=settings.REDIS_DB,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
        decode_responses=True,          # return str, not bytes
        encoding="utf-8",
        retry=retry,
        retry_on_error=[ConnectionError, TimeoutError],
        socket_connect_timeout=5,
        socket_timeout=5,
    )


async def get_redis() -> Redis:
    """
    Returns the Redis client singleton.
    FastAPI dependency injection compatible.
    """
    global _pool, _redis_client, _last_loop
    current_loop = asyncio.get_running_loop()

    if _redis_client is None or _last_loop != current_loop:
        if _redis_client:
            # If loop changed, clean up old client safely without blocking
            logger.info("New event loop detected, re-initializing Redis client")

        _pool = _build_pool()
        _redis_client = Redis(connection_pool=_pool)
        _last_loop = current_loop
        logger.info("Redis client initialized for loop %s", id(current_loop))

    return _redis_client


async def close_redis() -> None:
    """Close connection pool. Called in FastAPI shutdown event."""
    global _pool, _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
    if _pool:
        await _pool.aclose()
        _pool = None
    logger.info("Redis connection closed")


# ─── Status Management ────────────────────────────────────────────────────────

class ResumeStatus:
    """Processing stage constants. Frontend polls these values."""
    PENDING    = "PENDING"
    OCR        = "OCR"
    PARSING    = "PARSING"
    EMBEDDING  = "EMBEDDING"
    SCORING    = "SCORING"
    DONE       = "DONE"
    ERROR      = "ERROR"


async def set_resume_status(
    resume_id: str,
    status: str,
    error_msg: str | None = None,
    redis: Redis | None = None,
) -> None:
    """
    Set the processing status for a resume.
    Also stores error message if status is ERROR.
    TTL: 5 minutes (frontend should fetch full result after DONE).
    """
    r = redis or await get_redis()
    payload: dict[str, Any] = {"status": status}
    if error_msg:
        payload["error"] = error_msg

    await r.set(
        f"status:{resume_id}",
        json.dumps(payload),
        ex=settings.CACHE_STATUS_TTL,
    )


async def get_resume_status(resume_id: str, redis: Redis | None = None) -> dict[str, Any] | None:
    """
    Get the current processing status.
    Returns None if key doesn't exist yet (expired or not set).
    """
    r = redis or await get_redis()
    raw = await r.get(f"status:{resume_id}")
    if raw is None:
        return None
    return json.loads(raw)


# ─── Score Cache ──────────────────────────────────────────────────────────────

async def cache_ats_score(
    resume_id: str,
    score_data: dict[str, Any],
    redis: Redis | None = None,
) -> None:
    """
    Cache the full ATS score summary (not the detailed result, that's in Mongo).
    Used for fast dashboard load — avoids hitting MongoDB for the score ring.
    TTL: 1 hour.
    """
    r = redis or await get_redis()
    await r.set(
        f"score:{resume_id}",
        json.dumps(score_data),
        ex=settings.CACHE_ATS_SCORE_TTL,
    )


async def get_cached_ats_score(
    resume_id: str,
    redis: Redis | None = None,
) -> dict[str, Any] | None:
    """
    Get cached ATS score. Returns None if cache miss.
    Caller should fall back to MongoDB if None.
    """
    r = redis or await get_redis()
    raw = await r.get(f"score:{resume_id}")
    if raw is None:
        return None
    return json.loads(raw)


async def invalidate_ats_score(resume_id: str, redis: Redis | None = None) -> None:
    """
    Invalidate cached score when re-analysis is triggered.
    """
    r = redis or await get_redis()
    await r.delete(f"score:{resume_id}")


# ─── Role Detection Cache ─────────────────────────────────────────────────────

async def cache_role_detection(
    resume_id: str,
    role_data: dict[str, Any],
    redis: Redis | None = None,
) -> None:
    """
    Cache role detection result. Role rarely changes for the same resume.
    TTL: 24 hours.
    """
    r = redis or await get_redis()
    await r.set(
        f"role:{resume_id}",
        json.dumps(role_data),
        ex=settings.CACHE_ROLE_DETECTION_TTL,
    )


async def get_cached_role(
    resume_id: str,
    redis: Redis | None = None,
) -> dict[str, Any] | None:
    r = redis or await get_redis()
    raw = await r.get(f"role:{resume_id}")
    return json.loads(raw) if raw else None


# ─── JWT Blacklist ────────────────────────────────────────────────────────────

async def blacklist_token(jti: str, expires_in: int, redis: Redis | None = None) -> None:
    """
    Add a JWT token ID (jti) to the blacklist.
    expires_in: remaining token lifetime in seconds.
    After expiry the key auto-deletes (no cleanup needed).
    """
    r = redis or await get_redis()
    await r.set(f"session_blacklist:{jti}", "1", ex=expires_in)


async def is_token_blacklisted(jti: str, redis: Redis | None = None) -> bool:
    """Check if a JWT has been revoked (logged out)."""
    r = redis or await get_redis()
    return await r.exists(f"session_blacklist:{jti}") == 1


# ─── Health Check ─────────────────────────────────────────────────────────────

async def redis_health_check(redis: Redis | None = None) -> bool:
    """Ping Redis. Returns True if healthy."""
    try:
        r = redis or await get_redis()
        return await r.ping()
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False