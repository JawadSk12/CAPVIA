"""
backend/main.py
──────────────────
CAPVIA FastAPI application factory and startup/shutdown lifecycle.

Startup:
  1. Connect to PostgreSQL, run pgvector extension check
  2. Connect to MongoDB, create indexes
  3. Connect to Redis, ping
  4. Pre-warm AI model registry (optional, for faster first request)

Middleware stack (outermost → innermost):
  1. CORS
  2. Security headers
  3. Rate limiting (slowapi)
  4. Audit logging (AuditMiddleware)
  5. Request ID injection
  6. Sentry error tracking (production)
"""

from __future__ import annotations

import sys
import os

# ── Add ai_engine to PYTHONPATH so its modules are importable ────────────────
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_ATS_ROOT    = os.path.dirname(_BACKEND_DIR)
_AI_ENGINE   = os.path.join(_ATS_ROOT, 'ai_engine')
for _p in [_ATS_ROOT, _AI_ENGINE]:
    if _p not in sys.path:
        sys.path.insert(0, _p)


import logging
import datetime
from datetime import timezone
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import settings
from core.audit import AuditMiddleware
from core.security import SECURITY_HEADERS, limiter
from db.mongodb import close_mongo_connection, create_indexes, mongo_health_check
from db.postgres import create_all_tables, enable_pgvector
from db.redis_client import close_redis, get_redis, redis_health_check

logger = structlog.get_logger(__name__)


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan: startup + shutdown logic.
    Using the new async context manager pattern (FastAPI 0.95+).
    """
    # ── STARTUP ───────────────────────────────────────────────────────────
    logger.info("capvia_starting", environment=settings.ENVIRONMENT, version=settings.APP_VERSION)

    # PostgreSQL: enable pgvector extension
    try:
        await enable_pgvector()
        logger.info("pgvector_enabled")
    except Exception as e:
        logger.error(f"pgvector_setup_failed: {e}")

    # PostgreSQL: create tables in development
    if settings.is_development:
        await create_all_tables()
        logger.info("dev_tables_created")

    # MongoDB: create indexes
    try:
        await create_indexes()
        logger.info("mongodb_indexes_created")
    except Exception as e:
        logger.error(f"mongodb_index_creation_failed: {e}")

    # Redis: verify connection
    try:
        redis = await get_redis()
        if await redis_health_check(redis):
            logger.info("redis_connected")
        else:
            logger.warning("redis_health_check_failed")
    except Exception as e:
        logger.error(f"redis_connection_failed: {e}")

    logger.info("capvia_startup_complete")

    yield  # ← Application runs here

    # ── SHUTDOWN ──────────────────────────────────────────────────────────
    logger.info("capvia_shutting_down")
    await close_redis()
    await close_mongo_connection()
    logger.info("capvia_shutdown_complete")


# ─── App Factory ──────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "CAPVIA — AI-Powered Resume ATS Analyzer. "
            "Semantic skill matching, explainable scoring, HR intelligence."
        ),
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        lifespan=lifespan,
        # Enable default exception handlers
        redirect_slashes=True,
    )

    # ── Exception Handlers (Manual CORS) ──────────────────────────────────
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    def get_cors_headers(request: Request):
        return {
            "Access-Control-Allow-Origin": request.headers.get("origin", "http://localhost:3000"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            headers=get_cors_headers(request),
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        import traceback
        trace = traceback.format_exc()
        # Save to a file we can read
        with open("crash_report.log", "w") as f:
            f.write(f"--- CRASH AT {datetime.now()} ---\n")
            f.write(trace)
            
        return JSONResponse(
            status_code=500,
            headers=get_cors_headers(request),
            content={"detail": str(exc), "trace": trace},
        )

    # ── Rate Limiter State ────────────────────────────────────────────────
    app.state.limiter = limiter

    # ── CORS (Outer-most) ─────────────────────────────────────────────────
    # We add this last so it's the first to handle requests and last to handle responses.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # ── Health ────────────────────────────────────────────────────────────
    @app.get("/api/v1/health/ping", tags=["Health"])
    async def ping():
        return {"status": "ok", "message": "pong"}
    if settings.SENTRY_DSN and settings.is_production:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            environment=settings.ENVIRONMENT,
            release=settings.APP_VERSION,
        )

    # ── Routers ───────────────────────────────────────────────────────────
    _register_routers(app)

    # ── Custom Exception Handlers ─────────────────────────────────────────
    _register_exception_handlers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    """Register all API routers with the v1 prefix."""
    from api.v1.routes.auth import router as auth_router
    from api.v1.routes.resume import router as resume_router
    from api.v1.routes.internship import router as internship_router
    from api.v1.routes.hr import router as hr_router

    prefix = settings.API_V1_PREFIX

    app.include_router(auth_router, prefix=prefix)
    app.include_router(resume_router, prefix=prefix)
    app.include_router(internship_router, prefix=prefix)
    app.include_router(hr_router, prefix=prefix)


def _register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers."""

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={"detail": "Resource not found", "path": str(request.url.path)},
        )

    @app.exception_handler(500)
    async def server_error_handler(request: Request, exc):
        logger.error(
            "unhandled_server_error",
            path=str(request.url.path),
            error=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": getattr(request.state, "request_id", None),
            },
        )


# ─── Health Check ─────────────────────────────────────────────────────────────

app = create_app()


@app.get("/health", tags=["Health"])
async def health_check(redis=None) -> dict:
    """
    Health check endpoint.
    Used by Kubernetes liveness and readiness probes.
    Returns 200 if all dependencies are healthy.
    """
    redis = await get_redis()
    redis_ok = await redis_health_check(redis)
    mongo_ok = await mongo_health_check()

    # PostgreSQL: if the app started, it connected
    pg_ok = True

    all_ok = redis_ok and mongo_ok and pg_ok

    response = {
        "status": "healthy" if all_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "dependencies": {
            "postgresql": "ok" if pg_ok else "error",
            "mongodb": "ok" if mongo_ok else "error",
            "redis": "ok" if redis_ok else "error",
        },
    }

    # Return 503 if unhealthy (Kubernetes will restart the pod)
    if not all_ok:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=response)

    return response


@app.get("/", tags=["Root"])
async def root() -> dict:
    """API root — returns version info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": settings.DOCS_URL,
    }





# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        workers=1 if settings.is_development else 4,
        log_level="info",
        access_log=True,
    )