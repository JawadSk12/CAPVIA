import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.models.models import SimulationResult, RiskLevel

class SimulationRepository:
    """
    Repository for handling persistence of Simulation Results.
    """
    async def get_simulation_result(self, session: AsyncSession, application_id: uuid.UUID) -> Optional[SimulationResult]:
        stmt = select(SimulationResult).where(
            and_(SimulationResult.application_id == application_id, SimulationResult.deleted_at == None)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_simulation_result(
        self,
        session: AsyncSession,
        application_id: uuid.UUID,
        attempt_id: int,
        total_score: float,
        recommendation: str,
        cheating_risk_level: RiskLevel,
        ai_dependency_score: float = 0.0,
        round_scores: Dict[str, Any] = None,
        submitted_at: datetime = None
    ) -> SimulationResult:
        sim_result = await self.get_simulation_result(session, application_id)
        if not sim_result:
            sim_result = SimulationResult(
                application_id=application_id,
                attempt_id=attempt_id,
                total_score=total_score,
                recommendation=recommendation,
                cheating_risk_level=cheating_risk_level,
                ai_dependency_score=ai_dependency_score,
                round_scores=round_scores or {},
                submitted_at=submitted_at or datetime.utcnow()
            )
            session.add(sim_result)
        else:
            sim_result.attempt_id = attempt_id
            sim_result.total_score = total_score
            sim_result.recommendation = recommendation
            sim_result.cheating_risk_level = cheating_risk_level
            sim_result.ai_dependency_score = ai_dependency_score
            sim_result.round_scores = round_scores or {}
            sim_result.submitted_at = submitted_at or datetime.utcnow()
            
        await session.flush()
        return sim_result
