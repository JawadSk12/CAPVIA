from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from capvia_platform.api.dependencies import get_db

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "capvia_api"}

@router.get("/health/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "details": str(e)}
