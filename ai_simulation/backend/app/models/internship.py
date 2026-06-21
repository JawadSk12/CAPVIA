"""
Internship Model — with proper FK declarations
"""

from sqlalchemy import Column, String, Text, JSON, Boolean, Integer, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class InternshipStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"


class WorkMode(str, enum.Enum):
    REMOTE = "remote"
    ONSITE = "onsite"
    HYBRID = "hybrid"


class Internship(BaseModel):
    __tablename__ = "internships"

    title = Column(String(255), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    description = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    required_skills = Column(JSON, nullable=True)
    technologies = Column(JSON, nullable=True)
    preferred_qualifications = Column(Text, nullable=True)

    stipend_min = Column(Integer, nullable=True)
    stipend_max = Column(Integer, nullable=True)
    stipend_currency = Column(String(10), default="INR")
    duration_months = Column(Integer, nullable=True)
    start_date = Column(String(30), nullable=True)

    location = Column(String(255), nullable=True)
    work_mode = Column(SQLEnum(WorkMode), default=WorkMode.REMOTE)

    openings = Column(Integer, default=1)
    applications_count = Column(Integer, default=0)

    status = Column(SQLEnum(InternshipStatus), default=InternshipStatus.DRAFT, index=True)
    deadline = Column(String(30), nullable=True)

    simulation_enabled = Column(Boolean, default=False, nullable=False)
    blueprint_id = Column(Integer, nullable=True)

    detected_role = Column(String(100), nullable=True)
    detected_role_key = Column(String(100), nullable=True)
    detected_specialization = Column(String(100), nullable=True)
    role_confidence = Column(Float, nullable=True)
    role_taxonomy_category = Column(String(100), nullable=True)

    tags = Column(JSON, nullable=True)
    perks = Column(JSON, nullable=True)
    is_featured = Column(Boolean, default=False)

    # Relationships
    company = relationship("Company", back_populates="internships", foreign_keys=[company_id])
    applications = relationship(
        "InternshipApplication",
        back_populates="internship",
        foreign_keys="[InternshipApplication.internship_id]",
        cascade="all, delete-orphan"
    )
    blueprint = relationship(
        "SimulationBlueprint",
        back_populates="internship",
        uselist=False,
        foreign_keys="[SimulationBlueprint.internship_id]",
        primaryjoin="Internship.id == SimulationBlueprint.internship_id"
    )

    def __repr__(self):
        return f"<Internship {self.title}>"
