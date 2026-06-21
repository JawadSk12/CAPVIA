"""
Database Session Management
Handles SQLAlchemy session creation and lifecycle
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session as SQLSession
from typing import Generator
from app.core.config import settings
from loguru import logger

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=settings.SQLALCHEMY_POOL_SIZE,
    max_overflow=settings.SQLALCHEMY_MAX_OVERFLOW,
    pool_timeout=settings.SQLALCHEMY_POOL_TIMEOUT,
    pool_recycle=settings.SQLALCHEMY_POOL_RECYCLE,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for declarative models
Base = declarative_base()


def get_db() -> Generator[SQLSession, None, None]:
    """
    Dependency function to get database session
    Automatically handles session lifecycle
    
    Yields:
        SQLSession: Database session
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database - create all tables
    Should be called on application startup
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise