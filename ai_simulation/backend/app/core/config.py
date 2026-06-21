"""
Core Configuration Module
Manages all application settings using Pydantic BaseSettings
Supports multiple environments (dev, staging, prod)
"""

from typing import List, Optional, Union
from pydantic import AnyHttpUrl, Field, validator
from pydantic_settings import BaseSettings
import secrets


class Settings(BaseSettings):
    """
    Application Settings
    All configuration loaded from environment variables
    """
    
    # ========================================
    # APPLICATION SETTINGS
    # ========================================
    PROJECT_NAME: str = "AI Simulation Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    
    # ========================================
    # SECURITY SETTINGS
    # ========================================
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        env="SECRET_KEY"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    ALGORITHM: str = "HS256"
    
    # Password hashing
    PWD_CONTEXT_SCHEMES: List[str] = ["bcrypt"]
    PWD_CONTEXT_DEPRECATED: str = "auto"
    
    # ========================================
    # CORS SETTINGS
    # ========================================
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3003",
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            return json.loads(v)
        return v
    
    # ========================================
    # DATABASE SETTINGS
    # ========================================
    POSTGRES_SERVER: str = Field(default="localhost", env="POSTGRES_SERVER")
    POSTGRES_USER: str = Field(default="postgres", env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(default="postgres", env="POSTGRES_PASSWORD")
    POSTGRES_DB: str = Field(default="ai_simulation", env="POSTGRES_DB")
    POSTGRES_PORT: int = Field(default=5432, env="POSTGRES_PORT")
    
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: dict) -> str:
        if isinstance(v, str):
            return v
        
        # Safely encode password to support special characters like @
        from urllib.parse import quote_plus
        raw_password = values.get('POSTGRES_PASSWORD', '')
        encoded_password = quote_plus(str(raw_password)) if raw_password else ''
        
        return f"postgresql://{values.get('POSTGRES_USER')}:{encoded_password}@{values.get('POSTGRES_SERVER')}:{values.get('POSTGRES_PORT')}/{values.get('POSTGRES_DB')}"

    
    # Database pool settings
    SQLALCHEMY_POOL_SIZE: int = 20
    SQLALCHEMY_MAX_OVERFLOW: int = 40
    SQLALCHEMY_POOL_TIMEOUT: int = 30
    SQLALCHEMY_POOL_RECYCLE: int = 3600
    
    # ========================================
    # REDIS SETTINGS (for Celery & Caching)
    # ========================================
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # ========================================
    # CELERY SETTINGS
    # ========================================
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    
    @validator("CELERY_BROKER_URL", pre=True)
    def assemble_celery_broker(cls, v: Optional[str], values: dict) -> str:
        if isinstance(v, str):
            return v
        # Use Redis as Celery broker
        redis_host = values.get('REDIS_HOST', 'localhost')
        redis_port = values.get('REDIS_PORT', 6379)
        return f"redis://{redis_host}:{redis_port}/1"
    
    @validator("CELERY_RESULT_BACKEND", pre=True)
    def assemble_celery_backend(cls, v: Optional[str], values: dict) -> str:
        if isinstance(v, str):
            return v
        redis_host = values.get('REDIS_HOST', 'localhost')
        redis_port = values.get('REDIS_PORT', 6379)
        return f"redis://{redis_host}:{redis_port}/2"
    
    # ========================================
    # AI & ML SETTINGS
    # ========================================
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field(default="gpt-4", env="OPENAI_MODEL")
    OPENAI_EMBEDDING_MODEL: str = Field(default="text-embedding-3-small", env="OPENAI_EMBEDDING_MODEL")
    
    # AI Detection Thresholds
    AI_DETECTION_THRESHOLD: float = 0.75  # Probability threshold for AI-generated content
    SIMILARITY_THRESHOLD: float = 0.85  # Code similarity threshold
    TYPING_SPEED_THRESHOLD: int = 150  # Words per minute (suspiciously fast)
    
    # ========================================
    # CODE EXECUTION SETTINGS
    # ========================================
    CODE_EXECUTION_TIMEOUT: int = 30  # seconds
    MAX_CODE_OUTPUT_LENGTH: int = 10000  # characters
    DOCKER_ENABLED: bool = Field(default=True, env="DOCKER_ENABLED")
    DOCKER_MEMORY_LIMIT: str = "512m"
    DOCKER_CPU_LIMIT: float = 1.0
    
    # Supported languages
    SUPPORTED_LANGUAGES: List[str] = ["python", "javascript", "java"]
    
    # ========================================
    # SIMULATION SETTINGS
    # ========================================
    SIMULATION_DURATION_MINUTES: int = 60  # Total simulation time
    MODULE_1_DURATION: int = 10  # Problem Understanding (minutes)
    MODULE_2_DURATION: int = 25  # Execution (minutes)
    MODULE_3_DURATION: int = 10  # Decision Making (minutes)
    MODULE_4_DURATION: int = 10  # Explanation (minutes)
    MODULE_5_DURATION: int = 15  # Debugging (minutes)
    
    # Auto-save interval
    AUTO_SAVE_INTERVAL_SECONDS: int = 30
    
    # ========================================
    # BEHAVIOR TRACKING SETTINGS
    # ========================================
    TRACK_MOUSE_MOVEMENTS: bool = True
    TRACK_KEYBOARD_PATTERNS: bool = True
    TRACK_TAB_SWITCHES: bool = True
    TRACK_CLIPBOARD_EVENTS: bool = True
    
    # Suspicious behavior thresholds
    MAX_TAB_SWITCHES: int = 5
    MAX_COPY_PASTE_EVENTS: int = 3
    MIN_IDLE_TIME_SECONDS: int = 300  # 5 minutes considered suspicious
    
    # ========================================
    # SCORING WEIGHTS
    # ========================================
    WEIGHT_ACCURACY: float = 0.40
    WEIGHT_LOGIC: float = 0.25
    WEIGHT_SPEED: float = 0.15
    WEIGHT_EXPLANATION: float = 0.10
    WEIGHT_BEHAVIOR: float = 0.10
    
    # ========================================
    # LOGGING SETTINGS
    # ========================================
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: str = "logs/app.log"
    LOG_ROTATION: str = "500 MB"
    LOG_RETENTION: str = "30 days"
    
    # ========================================
    # EMAIL SETTINGS (for notifications)
    # ========================================
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: Optional[str] = Field(default=None, env="SMTP_HOST")
    SMTP_USER: Optional[str] = Field(default=None, env="SMTP_USER")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    EMAILS_FROM_EMAIL: Optional[str] = Field(default=None, env="EMAILS_FROM_EMAIL")
    EMAILS_FROM_NAME: str = "AI Simulation Engine"
    
    # ========================================
    # FILE STORAGE SETTINGS
    # ========================================
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: List[str] = [".py", ".js", ".java", ".txt", ".pdf"]
    
    # ========================================
    # RATE LIMITING
    # ========================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # ========================================
    # MONITORING & METRICS
    # ========================================
    ENABLE_PROMETHEUS: bool = Field(default=False, env="ENABLE_PROMETHEUS")
    ENABLE_SENTRY: bool = Field(default=False, env="ENABLE_SENTRY")
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# ========================================
# SINGLETON INSTANCE
# ========================================
settings = Settings()


# ========================================
# HELPER FUNCTIONS
# ========================================
def get_settings() -> Settings:
    """
    Dependency function to get settings instance
    Useful for FastAPI dependency injection
    """
    return settings


def is_production() -> bool:
    """Check if running in production environment"""
    return settings.ENVIRONMENT.lower() == "production"


def is_development() -> bool:
    """Check if running in development environment"""
    return settings.ENVIRONMENT.lower() == "development"


def is_testing() -> bool:
    """Check if running in testing environment"""
    return settings.ENVIRONMENT.lower() == "testing"