import redis.asyncio as aioredis
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from capvia_platform.core.config import settings
from capvia_platform.middleware.error_handler import global_exception_handler
from capvia_platform.middleware.logging import RequestLoggingMiddleware
from capvia_platform.routers import health, ats, simulation, interview, webhooks, auth, companies, internships, applications, integrity, dna, rankings, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup and shutdown events for the application resources.
    """
    # Startup: Initialize Redis connection pool
    url = settings.REDIS_URL or "redis://localhost:6379/0"
    app.state.redis_pool = aioredis.ConnectionPool.from_url(url)
    
    yield
    
    # Shutdown: Close Redis pool connections
    await app.state.redis_pool.disconnect()

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )

    # Setup CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Update for production environments
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Setup custom logging middleware
    app.add_middleware(RequestLoggingMiddleware)
    
    # Register global exception handler
    app.add_exception_handler(Exception, global_exception_handler)

    # Include routers under the API v1 string prefix
    app.include_router(health.router, prefix="/api", tags=["Health"])
    app.include_router(ats.router, prefix=settings.API_V1_STR)
    app.include_router(simulation.router, prefix=settings.API_V1_STR)
    app.include_router(interview.router, prefix=settings.API_V1_STR)
    app.include_router(webhooks.router, prefix=settings.API_V1_STR)
    app.include_router(auth.router, prefix=settings.API_V1_STR)
    app.include_router(companies.router, prefix=settings.API_V1_STR)
    app.include_router(internships.router, prefix=settings.API_V1_STR)
    app.include_router(applications.router, prefix=settings.API_V1_STR)
    app.include_router(integrity.router, prefix=settings.API_V1_STR)
    app.include_router(dna.router, prefix=settings.API_V1_STR)
    app.include_router(rankings.router, prefix=settings.API_V1_STR)
    app.include_router(reports.router, prefix=settings.API_V1_STR)

    return app

app = create_app()
