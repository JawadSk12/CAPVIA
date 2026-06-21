from sqlalchemy.ext.asyncio import AsyncSession
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate, BatchSubmissionCreate

class SubmissionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit(self, session_id: str, data: SubmissionCreate) -> Submission:
        sub = Submission(session_id=session_id, question_id=data.question_id, content=data.content, time_spent=data.time_spent)
        self.db.add(sub)
        await self.db.flush()
        return sub

    async def batch_submit(self, session_id: str, data: BatchSubmissionCreate) -> dict:
        submissions = [Submission(session_id=session_id, question_id=s.question_id, content=s.content, time_spent=s.time_spent) for s in data.submissions]
        self.db.add_all(submissions)
        await self.db.flush()
        if data.finalize:
            from app.tasks.evaluation_tasks import evaluate_session
            evaluate_session.delay(session_id)
        return {"submitted": len(submissions), "session_id": session_id}
