from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CAPVIA API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str
    
    # Redis (For Celery/Tasks/Rate Limiting)
    REDIS_URL: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # ATS Engine Settings
    ATS_ENGINE_URL: str = "http://localhost:8000"
    
    # Simulation Engine Settings
    SIMULATION_ENGINE_URL: str = "http://localhost:8001"
    
    # Interview Engine Settings
    INTERVIEW_ENGINE_URL: str = "http://localhost:8765"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
