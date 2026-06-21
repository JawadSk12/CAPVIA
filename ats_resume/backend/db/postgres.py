"""
backend/db/postgres.py
──────────────────────
Async PostgreSQL engine setup using SQLAlchemy 2.0 with asyncpg driver.

Responsibilities:
  - Create async engine with connection pooling
  - Expose async session factory (AsyncSessionLocal)
  - Provide get_db() dependency for FastAPI route injection
  - Expose Base for all ORM models
  - Enable pgvector extension on first connect

Usage in routes:
    async def my_route(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))

Usage in services:
    async with AsyncSessionLocal() as session:
        ...
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from config import settings


# ─── Engine ───────────────────────────────────────────────────────────────────

def _build_engine_kwargs() -> dict[str, Any]:
    """
    Build engine kwargs based on environment.
    - Production: connection pool with overflow
    - Testing: NullPool so connections aren't shared between tests
    """
    base_kwargs: dict[str, Any] = {
        "echo": settings.DATABASE_ECHO,
        "echo_pool": settings.DEBUG,
        "future": True,   # SQLAlchemy 2.0 mode
    }

    if settings.ENVIRONMENT == "testing":
        # NullPool: each connection is created fresh and not pooled.
        # Critical for pytest-asyncio to avoid cross-test contamination.
        base_kwargs["poolclass"] = NullPool
    else:
        base_kwargs.update({
            "pool_size": settings.DATABASE_POOL_SIZE,
            "max_overflow": settings.DATABASE_MAX_OVERFLOW,
            "pool_timeout": settings.DATABASE_POOL_TIMEOUT,
            "pool_pre_ping": True,   # validate connection before use
            "pool_recycle": 3600,    # recycle connections after 1 hour
        })

    return base_kwargs


import asyncio

_engine = None
_AsyncSessionLocal = None
_last_loop = None

def get_engine():
    global _engine, _last_loop
    current_loop = asyncio.get_running_loop()
    if _engine is None or _last_loop != current_loop:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            **_build_engine_kwargs(),
        )
        _last_loop = current_loop
    return _engine

def get_session_factory():
    global _AsyncSessionLocal, _last_loop
    current_loop = asyncio.get_running_loop()
    if _AsyncSessionLocal is None or _last_loop != current_loop:
        engine = get_engine()
        _AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _AsyncSessionLocal

def AsyncSessionLocal():
    """Wrapper that returns a new session from the current loop's factory."""
    return get_session_factory()()

# Use these for internal module operations
# engine = get_engine() 
# (We will use the functions instead to be safe)

# ─── Declarative Base ─────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    
    All models that inherit from Base are automatically tracked by Alembic
    for migration generation via `alembic revision --autogenerate`.
    """
    pass


# ─── pgvector Extension ───────────────────────────────────────────────────────

async def enable_pgvector() -> None:
    """
    Enable the pgvector extension in PostgreSQL.
    Called once at application startup.
    Required for vector(768) column type used in resume_embeddings table.
    """
    # Vector extension not used in models (using Pinecone)
    pass


# ─── Table Creation (Dev Only) ────────────────────────────────────────────────

async def create_all_tables() -> None:
    """
    Create all tables from ORM metadata.
    Only used in development and testing.
    Production uses Alembic migrations.
    """
    # Import all models so Base.metadata knows about them
    from models import (  # noqa: F401 - imports needed for metadata registration
        audit_log,
        ats_result,
        internship,
        resume,
        user,
    )

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_all_tables() -> None:
    """Drop all tables. Test cleanup only."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ─── FastAPI Dependency ───────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a database session per request.
    
    Guarantees:
    - Session is always closed after the request (even on exception)
    - Rollback happens automatically if commit was never called
    
    Example:
        @router.get("/users")
        async def list_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()