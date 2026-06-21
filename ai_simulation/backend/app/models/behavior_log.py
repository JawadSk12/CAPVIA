"""
Candidate Behavior Log Model — with proper FKs
Anti-cheating behavioral telemetry events
"""

from sqlalchemy import Column, String, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class CandidateBehaviorLog(BaseModel):
    __tablename__ = "candidate_behavior_logs"

    attempt_id = Column(Integer, ForeignKey("simulation_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    event_type = Column(String(100), nullable=False, index=True)
    event_data = Column(JSON, nullable=True)
    timestamp = Column(String(50), nullable=False)
    round_number = Column(Integer, nullable=True)
    task_index = Column(Integer, nullable=True)

    page_url = Column(String(500), nullable=True)
    session_duration_at_event = Column(Integer, nullable=True)

    severity = Column(String(20), default="info")

    # Relationships
    attempt = relationship(
        "SimulationAttempt",
        back_populates="behavior_logs",
        foreign_keys=[attempt_id]
    )

    def __repr__(self):
        return f"<BehaviorLog attempt={self.attempt_id} type={self.event_type}>"
