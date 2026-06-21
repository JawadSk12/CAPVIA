from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_admin_user, get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/sessions/{session_id}")
async def get_session_report(session_id: str, admin: dict = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return {"session_id": session_id, "status": "report generation in progress"}

@router.get("/tests/{test_id}/summary")
async def get_test_summary(test_id: str, admin: dict = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return {"test_id": test_id, "summary": {}}
