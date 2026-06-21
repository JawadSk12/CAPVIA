from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.session import TestSession, SessionStatus
from app.schemas.session import SessionUpdate
from app.core.exceptions import NotFoundError

class SessionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, test_id: str, candidate_id: str) -> TestSession:
        session = TestSession(
            test_id=test_id,
            candidate_id=candidate_id,
            status=SessionStatus.ACTIVE,
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=2),
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session(self, session_id: str) -> TestSession:
        result = await self.db.execute(select(TestSession).where(TestSession.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise NotFoundError("Session")
        return session

    async def update_session(self, session_id: str, data: SessionUpdate) -> TestSession:
        session = await self.get_session(session_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(session, field, value)
        await self.db.flush()
        return session

    async def complete_session(self, session_id: str) -> TestSession:
        session = await self.get_session(session_id)
        session.status = SessionStatus.COMPLETED
        await self.db.flush()
        return session
