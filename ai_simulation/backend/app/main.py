"""
Main Application
FastAPI application entry point
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from contextlib import asynccontextmanager
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import BaseAppException, to_http_exception
from app.db.session import init_db
from app.api.v1.router import api_router


# Setup logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting AI Simulation Engine...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Simulation Engine...")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)


# ========================================
# MIDDLEWARE
# ========================================

# CORS Middleware — allow all local dev origins
_allowed_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
_dev_origins = [f"http://localhost:{p}" for p in range(3000, 3010)] + \
               [f"http://127.0.0.1:{p}" for p in range(3000, 3010)] + \
               ["http://localhost:5173", "http://127.0.0.1:5173"]
_cors_origins = list(set(_allowed_origins + _dev_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response


# ========================================
# EXCEPTION HANDLERS
# ========================================

@app.exception_handler(BaseAppException)
async def custom_exception_handler(request: Request, exc: BaseAppException):
    """Handle custom application exceptions"""
    http_exc = to_http_exception(exc)
    return JSONResponse(
        status_code=http_exc.status_code,
        content=http_exc.detail
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "message": "Validation error",
            "details": exc.errors()
        }
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"Database error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "Database error occurred",
            "details": str(exc) if settings.DEBUG else "Internal server error"
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "Internal server error",
            "details": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# ========================================
# ROUTES
# ========================================

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": f"{settings.API_V1_STR}/docs"
    }


# ========================================
# STARTUP MESSAGE
# ========================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info("=" * 60)
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")
    logger.info(f"API Docs: http://localhost:8000{settings.API_V1_STR}/docs")
    logger.info("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )