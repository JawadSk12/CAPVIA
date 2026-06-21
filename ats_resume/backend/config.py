"""
backend/config.py
─────────────────
Central configuration loaded from environment variables.
Uses pydantic-settings so every value is type-validated on startup.
Missing required variables raise ValidationError immediately — fail fast.

Usage anywhere in the codebase:
    from config import settings
    db_url = settings.DATABASE_URL
"""

from __future__ import annotations

import os
import secrets
from functools import lru_cache
from typing import Any, Literal

from pydantic import AnyHttpUrl, EmailStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings.
    All values read from environment variables or .env file.
    Pydantic validates types at startup — no silent misconfiguration.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # ignore unknown env vars silently
    )

    # ── Application ─────────────────────────────────────────────────────────────
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    APP_NAME: str = "CAPVIA ATS"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(64)   # fallback for dev only

    # ── API ─────────────────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    DOCS_URL: str | None = "/docs"        # set to None in production
    REDOC_URL: str | None = "/redoc"

    # ── CORS ─────────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins
    # Example: "http://localhost:3000,https://capvia.io"
    CORS_ORIGINS: Any = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        """Accept either a list or a comma-separated string from .env"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── JWT Authentication ───────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15       # short-lived access token
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7          # long-lived refresh token

    # ── PostgreSQL ───────────────────────────────────────────────────────────────
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    DATABASE_URL: str = "postgresql+asyncpg://capvia:capvia_dev@localhost:5432/capvia"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40
    DATABASE_POOL_TIMEOUT: int = 30       # seconds to wait for a connection
    DATABASE_ECHO: bool = False           # set True to log all SQL (dev only)

    # ── MongoDB ──────────────────────────────────────────────────────────────────
    MONGO_URL: str = "mongodb+srv://jawadshaikh465_db_user:v3z7y1LtgD4nTgvt@cluster0.xfsftbl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    MONGO_DB_NAME: str = "capvia"
    MONGO_MAX_POOL_SIZE: int = 50
    MONGO_MIN_POOL_SIZE: int = 10

    # ── Redis ────────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DB: int = 0
    REDIS_MAX_CONNECTIONS: int = 100

    # Cache TTLs (seconds)
    CACHE_ATS_SCORE_TTL: int = 3600          # 1 hour
    CACHE_STATUS_TTL: int = 300              # 5 minutes
    CACHE_ROLE_DETECTION_TTL: int = 86400   # 24 hours

    # ── Celery ───────────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_TIMEZONE: str = "UTC"
    CELERY_TASK_TRACK_STARTED: bool = True
    CELERY_TASK_TIME_LIMIT: int = 600       # 10 min hard limit per task
    CELERY_TASK_SOFT_TIME_LIMIT: int = 540  # 9 min soft limit (cleanup)

    # ── AWS S3 ───────────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"          # Mumbai region (matches CAPVIA HQ)
    AWS_S3_BUCKET: str = "capvia-resumes-dev"
    AWS_S3_PRESIGNED_URL_EXPIRY: int = 900  # 15 minutes

    # ── AI Engine ────────────────────────────────────────────────────────────────
    AI_ENGINE_URL: str = "http://localhost:8001"
    AI_ENGINE_TIMEOUT: int = 120            # seconds (embedding generation can be slow)
    OPENAI_API_KEY: str = ""                # needed for rewrite suggestions

    # ── File Upload ──────────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 5
    ALLOWED_MIME_TYPES: list[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    @property
    def MAX_FILE_SIZE_BYTES(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    # ── Rate Limiting ────────────────────────────────────────────────────────────
    RATE_LIMIT_UPLOAD: str = "60/minute"
    # resume upload
    RATE_LIMIT_ANALYSIS: str = "30/minute"  # analysis fetch
    RATE_LIMIT_AUTH: str = "60/minute"       # login/register

    # ── Email (notifications) ────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: EmailStr = "noreply@capvia.io"  # type: ignore[assignment]
    EMAIL_FROM_NAME: str = "CAPVIA Platform"

    # ── Sentry ───────────────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1   # 10% of transactions

    # ── Feature Flags ────────────────────────────────────────────────────────────
    ENABLE_AI_REWRITE: bool = True
    ENABLE_FAKE_SKILL_DETECTION: bool = True
    ENABLE_VECTOR_SEARCH: bool = True

    # ── CAPVIA DNA Platform Integration ───────────────────────────────────
    # ATS pushes scored signals here after analysis completes
    CAPVIA_DNA_PLATFORM_URL: str = "http://localhost:8002"
    CAPVIA_DNA_API_KEY: str = "dev-api-key-secure"
    DNA_INGEST_TIMEOUT: int = 10

    # ── Cross-Engine URLs ──────────────────────────────────────────
    INTERVIEW_ENGINE_URL: str = "http://localhost:5001"
    SIMULATION_ENGINE_URL: str = "http://localhost:8001"

    # ── Derived properties ───────────────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @model_validator(mode="after")
    def production_safety_checks(self) -> "Settings":
        """Fail hard if production environment has development defaults."""
        if self.is_production:
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production")
            if self.DOCS_URL is not None:
                raise ValueError("DOCS_URL must be None in production")
            if not self.AWS_ACCESS_KEY_ID:
                raise ValueError("AWS_ACCESS_KEY_ID required in production")
            if not self.SENTRY_DSN:
                raise ValueError("SENTRY_DSN required in production")
        return self


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    lru_cache ensures the .env file is read only once per process.
    Call get_settings() anywhere — no global state, fully testable.
    """
    return Settings()


# Module-level alias for convenience: `from config import settings`
settings: Settings = get_settings()