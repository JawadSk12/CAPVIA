import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Neon database URL from user request
DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_tLEN1ylR7PGq@ep-bitter-sea-ao65dvct-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

# Load database URL from environment or fallback to default
database_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# SQLAlchemy async drivers require postgresql+asyncpg:// scheme
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
# For asyncpg, replace sslmode=require with ssl=require if passed from env
if "sslmode=require" in database_url:
    database_url = database_url.replace("sslmode=require", "ssl=require")
if "&channel_binding=require" in database_url:
    database_url = database_url.replace("&channel_binding=require", "")

# Asynchronous engine configuration with scalable pooling settings
engine = create_async_engine(
    database_url,
    echo=False,  # Set to True for SQL execution logging in dev environment
    pool_size=10,  # Scaled for 100,000+ candidates queries handling
    max_overflow=20,  # Limits maximum overflow connections under spike
    pool_recycle=1800,  # Recycle connection every 30 minutes to prevent timeouts
    pool_timeout=30,  # Connection timeout limit
    pool_pre_ping=True  # Ping connection before checkout to verify health
)

# Async session factory
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Asynchronous context manager providing db sessions.
    Automatically commits on success or rollbacks on failure/exception.
    """
    session = AsyncSessionFactory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
