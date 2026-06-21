"""
Internship Application Model — with proper FK declarations
"""

from sqlalchemy import Column, String, Text, JSON, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    UNDER_REVIEW = "under_review"
    SIMULATION_INVITED = "simulation_invited"
    SIMULATION_STARTED = "simulation_started"
    SIMULATION_COMPLETED = "simulation_completed"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    HIRED = "hired"


class InternshipApplication(BaseModel):
    __tablename__ = "internship_applications"

    internship_id = Column(Integer, ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Application Details
    cover_letter = Column(Text, nullable=True)
    resume_url = Column(String(500), nullable=True)
    answers = Column(JSON, nullable=True)

    # Status
    status = Column(
        SQLEnum(ApplicationStatus),
        default=ApplicationStatus.APPLIED,
        nullable=False,
        index=True
    )

    # Simulation Link
    attempt_id = Column(Integer, nullable=True)

    # HR notes
    hr_notes = Column(Text, nullable=True)
    hr_rating = Column(Integer, nullable=True)

    # Rankings
    final_score = Column(String(20), nullable=True)
    rank = Column(Integer, nullable=True)
    recommendation = Column(String(50), nullable=True)

    # Relationships
    internship = relationship("Internship", back_populates="applications")
    candidate = relationship("User", back_populates="applications", foreign_keys=[candidate_id])
    attempt = relationship(
        "SimulationAttempt",
        back_populates="application",
        primaryjoin="InternshipApplication.id == SimulationAttempt.application_id",
        foreign_keys="[SimulationAttempt.application_id]",
        uselist=False
    )

    def __repr__(self):
        return f"<Application candidate={self.candidate_id} internship={self.internship_id}>"
