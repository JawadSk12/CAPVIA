"""
Simulation Blueprint Model — with proper FK on internship_id
"""

from sqlalchemy import Column, String, JSON, Boolean, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SimulationBlueprint(BaseModel):
    __tablename__ = "simulation_blueprints"

    internship_id = Column(Integer, ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    role_key = Column(String(100), nullable=False)
    role_name = Column(String(200), nullable=False)
    specialization = Column(String(100), nullable=True)
    difficulty = Column(String(30), default="mid")

    randomization_seed = Column(String(100), nullable=True)
    generation_version = Column(String(20), default="1.0")
    datasets_used = Column(JSON, nullable=True)
    keywords_detected = Column(JSON, nullable=True)

    rounds = Column(JSON, nullable=False)
    total_duration_minutes = Column(Integer, default=90)
    total_tasks = Column(Integer, default=15)

    is_active = Column(Boolean, default=True)
    attempts_count = Column(Integer, default=0)

    round_weights = Column(JSON, nullable=True)

    # Relationships
    internship = relationship(
        "Internship",
        back_populates="blueprint",
        foreign_keys=[internship_id]
    )
    attempts = relationship(
        "SimulationAttempt",
        back_populates="blueprint",
        foreign_keys="[SimulationAttempt.blueprint_id]",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<SimulationBlueprint role={self.role_key} internship={self.internship_id}>"
