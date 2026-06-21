"""
Simulation Attempt Model — with proper FKs
"""

from sqlalchemy import Column, String, JSON, Integer, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class AttemptStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    SUBMITTED = "submitted"
    EVALUATED = "evaluated"
    EXPIRED = "expired"


class SimulationAttempt(BaseModel):
    __tablename__ = "simulation_attempts"

    blueprint_id = Column(Integer, ForeignKey("simulation_blueprints.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(SQLEnum(AttemptStatus), default=AttemptStatus.NOT_STARTED, index=True)
    current_round = Column(Integer, default=1)
    completed_rounds = Column(JSON, default=list)

    answers = Column(JSON, default=dict)
    code_submissions = Column(JSON, default=dict)

    started_at = Column(String(50), nullable=True)
    submitted_at = Column(String(50), nullable=True)
    expires_at = Column(String(50), nullable=True)
    time_spent_seconds = Column(Integer, default=0)

    total_score = Column(Float, nullable=True)
    round_scores = Column(JSON, nullable=True)
    percentile = Column(Float, nullable=True)
    rank_in_internship = Column(Integer, nullable=True)

    cheating_risk_score = Column(Float, nullable=True)
    ai_dependency_score = Column(Float, nullable=True)
    cheating_risk_level = Column(String(20), nullable=True)

    evaluation_report = Column(JSON, nullable=True)
    access_token = Column(String(255), nullable=True, unique=True, index=True)

    # Relationships
    blueprint = relationship(
        "SimulationBlueprint",
        back_populates="attempts",
        foreign_keys=[blueprint_id]
    )
    application = relationship(
        "InternshipApplication",
        back_populates="attempt",
        foreign_keys=[application_id],
        uselist=False
    )
    behavior_logs = relationship(
        "CandidateBehaviorLog",
        back_populates="attempt",
        foreign_keys="[CandidateBehaviorLog.attempt_id]",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<SimulationAttempt candidate={self.candidate_id} status={self.status}>"
