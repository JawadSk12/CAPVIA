import enum
import uuid
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import (
    String, Boolean, Integer, Numeric, ForeignKey, Enum, DateTime, Date, ARRAY, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from capvia_platform.models.base import Base, TimestampMixin, SoftDeleteMixin

# =========================================================================
# Custom Python Enums (for matching PostgreSQL Types)
# =========================================================================

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    HR = "HR"
    ADMIN = "ADMIN"

class MemberRole(str, enum.Enum):
    OWNER = "OWNER"
    MEMBER = "MEMBER"

class StageName(str, enum.Enum):
    ATS = "ATS"
    SIMULATION = "SIMULATION"
    INTERVIEW = "INTERVIEW"

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RecommendationType(str, enum.Enum):
    STRONG_HIRE = "Strong Hire"
    CONSIDER = "Consider"
    REVIEW_REQUIRED = "Review Required"
    NOT_RECOMMENDED = "Not Recommended"

class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    ATS_PENDING = "ATS_PENDING"
    ATS_COMPLETED = "ATS_COMPLETED"
    SIMULATION_INVITED = "SIMULATION_INVITED"
    SIMULATION_IN_PROGRESS = "SIMULATION_IN_PROGRESS"
    SIMULATION_COMPLETED = "SIMULATION_COMPLETED"
    INTERVIEW_INVITED = "INTERVIEW_INVITED"
    INTERVIEW_IN_PROGRESS = "INTERVIEW_IN_PROGRESS"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    EVALUATED = "EVALUATED"
    EVALUATED_LOCAL_BASELINE = "EVALUATED_LOCAL_BASELINE"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    HIRED = "HIRED"

class InternshipStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"

class WorkMode(str, enum.Enum):
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"
    ONSITE = "ONSITE"

# =========================================================================
# SQLAlchemy Models
# =========================================================================

# 1. Users Model
class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=UserRole.STUDENT)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    applications: Mapped[List["Application"]] = relationship(
        "Application", back_populates="candidate", cascade="all, delete-orphan"
    )
    candidate_mapping: Mapped[Optional["CandidateMapping"]] = relationship(
        "CandidateMapping", back_populates="user", cascade="all, delete-orphan"
    )
    activity_logs: Mapped[List["ActivityLog"]] = relationship(
        "ActivityLog", back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )

# 2. Companies Model
class Company(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    headquarters: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    founded_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    employee_count: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    internships: Mapped[List["Internship"]] = relationship(
        "Internship", back_populates="company", cascade="all, delete-orphan"
    )
    members: Mapped[List["CompanyMember"]] = relationship(
        "CompanyMember", back_populates="company", cascade="all, delete-orphan"
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by], lazy="select"
    )

# 2a. Company Members Model
class CompanyMember(Base):
    __tablename__ = "company_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    member_role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="company_member_role", create_type=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, default=MemberRole.MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="select")

# 3. Internships Model
class Internship(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "internships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responsibilities: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    required_skills: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    technologies: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    experience_level: Mapped[str] = mapped_column(String(50), nullable=False, default="ENTRY")

    # Lifecycle
    status: Mapped[InternshipStatus] = mapped_column(
        Enum(InternshipStatus, name="internship_status", create_type=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, default=InternshipStatus.DRAFT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Logistics
    work_mode: Mapped[WorkMode] = mapped_column(
        Enum(WorkMode, name="work_mode", create_type=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, default=WorkMode.ONSITE
    )
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration_weeks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Stipend
    stipend_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stipend_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stipend_currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")

    # Application controls
    openings: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    application_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    application_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Engagement
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Ownership
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # URL slug
    slug: Mapped[Optional[str]] = mapped_column(String(300), nullable=True, unique=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="internships")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by], lazy="select")
    applications: Mapped[List["Application"]] = relationship(
        "Application", back_populates="vacancy", cascade="all, delete-orphan"
    )
    vacancy_mapping: Mapped[Optional["VacancyMapping"]] = relationship(
        "VacancyMapping", back_populates="internship", cascade="all, delete-orphan"
    )
    rankings: Mapped[List["Ranking"]] = relationship(
        "Ranking", back_populates="internship", cascade="all, delete-orphan"
    )

# 4. Applications Model
class Application(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vacancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("internships.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus, name="application_status", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=ApplicationStatus.APPLIED)
    current_stage: Mapped[StageName] = mapped_column(Enum(StageName, name="stage_name", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=StageName.ATS)

    # Extra lifecycle columns (Phase 9)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    hired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    candidate: Mapped["User"] = relationship("User", back_populates="applications")
    vacancy: Mapped["Internship"] = relationship("Internship", back_populates="applications")
    events: Mapped[List["ApplicationEvent"]] = relationship(
        "ApplicationEvent", back_populates="application",
        order_by="ApplicationEvent.created_at", cascade="all, delete-orphan"
    )
    
    application_mapping: Mapped[Optional["ApplicationMapping"]] = relationship(
        "ApplicationMapping", back_populates="application", cascade="all, delete-orphan"
    )
    ats_result: Mapped[Optional["ATSResult"]] = relationship(
        "ATSResult", back_populates="application", cascade="all, delete-orphan"
    )
    simulation_result: Mapped[Optional["SimulationResult"]] = relationship(
        "SimulationResult", back_populates="application", cascade="all, delete-orphan"
    )
    interview_result: Mapped[Optional["InterviewResult"]] = relationship(
        "InterviewResult", back_populates="application", cascade="all, delete-orphan"
    )
    integrity_result: Mapped[Optional["IntegrityResult"]] = relationship(
        "IntegrityResult", back_populates="application", cascade="all, delete-orphan"
    )
    dna_profile: Mapped[Optional["DNAProfile"]] = relationship(
        "DNAProfile", back_populates="application", cascade="all, delete-orphan"
    )
    ranking: Mapped[Optional["Ranking"]] = relationship(
        "Ranking", back_populates="application", cascade="all, delete-orphan"
    )
    report: Mapped[Optional["Report"]] = relationship(
        "Report", back_populates="application", cascade="all, delete-orphan"
    )

# 4a. Application Events Model (Phase 9)
class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    event_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="events")
    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[actor_id], lazy="select")

# 5. Candidate Mappings Model
class CandidateMapping(Base):
    __tablename__ = "candidate_mappings"

    mapping_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    capvia_candidate_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    ats_user_uuid: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, unique=True)
    simulation_candidate_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    interview_candidate_uuid: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, unique=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_mapping")

# 6. Vacancy Mappings Model
class VacancyMapping(Base):
    __tablename__ = "vacancy_mappings"

    mapping_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    capvia_vacancy_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    ats_jd_uuid: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, unique=True)
    simulation_internship_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    internship: Mapped["Internship"] = relationship("Internship", back_populates="vacancy_mapping")

# 7. Application Mappings Model
class ApplicationMapping(Base):
    __tablename__ = "application_mappings"

    mapping_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    ats_resume_uuid: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, unique=True)
    simulation_attempt_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    simulation_application_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    interview_session_uuid: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, unique=True)
    
    ats_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    simulation_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    interview_answer_score_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    interview_integrity_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    combined_risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel, name="risk_level", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=RiskLevel.LOW)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="application_mapping")

# 8. ATS Results Model
class ATSResult(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "ats_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    score_band: Mapped[str] = mapped_column(String(20), nullable=False)
    detected_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    role_confidence: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    matched_skills: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    missing_skills: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    is_suspicious: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fraud_probability: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0.0)
    fraud_flags: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    raw_analysis: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="ats_result")

# 9. Simulation Results Model
class SimulationResult(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "simulation_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    attempt_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    total_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    recommendation: Mapped[str] = mapped_column(String(50), nullable=False)
    cheating_risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel, name="risk_level", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=RiskLevel.LOW)
    ai_dependency_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=0.0)
    round_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="simulation_result")

# 10. Interview Results Model
class InterviewResult(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "interview_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)
    overall_answer_score_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_integrity_score: Mapped[int] = mapped_column(Integer, nullable=False)
    cheating_probability_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel, name="risk_level", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=RiskLevel.LOW)
    recommendation: Mapped[RecommendationType] = mapped_column(Enum(RecommendationType, name="recommendation_type", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    video_url: Mapped[str] = mapped_column(String(512), nullable=False)
    baselined_locally: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    local_evaluation_report: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    strengths: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    improvements: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    raw_report: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="interview_result")

# 11. Integrity Results Model
class IntegrityResult(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "integrity_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # Raw proctoring metrics (from interview)
    focus_percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    look_away_count: Mapped[int] = mapped_column(Integer, nullable=False)
    head_stability_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    head_movements_count: Mapped[int] = mapped_column(Integer, nullable=False)
    face_visibility_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    face_absences_count: Mapped[int] = mapped_column(Integer, nullable=False)
    multi_face_events: Mapped[int] = mapped_column(Integer, nullable=False)
    phone_detections_count: Mapped[int] = mapped_column(Integer, nullable=False)
    tab_switches: Mapped[int] = mapped_column(Integer, nullable=False)
    copy_pastes: Mapped[int] = mapped_column(Integer, nullable=False)
    suspicious_keys: Mapped[int] = mapped_column(Integer, nullable=False)
    violations: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)

    # ---- Phase 13: Compiled Integrity Engine Results ----
    integrity_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_dependency_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    trust_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    compiled_risk_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    confidence_level: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    explainability: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    scoring_formula: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    calibration_logic: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    audit_trail: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    historical_tracking: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="integrity_result")


# 12. DNA Profiles Model
class DNAProfile(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "dna_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # ---- ATS SBERT-era dimensions (Phase 10 origin) ----
    technical_alignment: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    project_alignment: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    experience_alignment: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    domain_alignment: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    semantic_match_strength: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    readability: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    clarity: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    ats_compatibility: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    technical_depth: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    practical_exposure: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    internship_readiness: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    hiring_readiness_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    capability_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    candidate_level: Mapped[str] = mapped_column(String(50), nullable=False)

    # ---- Phase 14: Capability Intelligence Dimensions (0–100) ----
    problem_solving: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    execution: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    communication: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    learning_ability: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    adaptability: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    consistency: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    confidence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    role_fit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    leadership_potential: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ---- Phase 14: Derived Structures ----
    radar_chart_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    capability_vectors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    comparative_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    historical_trends: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="dna_profile")


# 13. Rankings Model
class Ranking(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "rankings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    internship_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("internships.id", ondelete="CASCADE"), nullable=False
    )

    # ---- Phase 15: Weighted composite score (0–100) ----
    final_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # ---- Phase 15: Per-component weighted contributions ----
    ats_component: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)       # raw * 0.25
    simulation_component: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True) # raw * 0.30
    interview_component: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # raw * 0.25
    integrity_component: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # raw * 0.20

    # ---- Phase 15: Raw source scores ----
    ats_raw_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    simulation_raw_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    interview_raw_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    integrity_raw_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # ---- Phase 15: Rankings ----
    internship_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)    # Rank within this internship
    company_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)       # Rank across company
    global_percentile: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # 0.00–100.00

    # ---- Phase 15: Derived signals ----
    is_top_candidate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)  # Top 10% flag
    recommendation_tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # PLATINUM/GOLD/SILVER/BRONZE/UNRANKED
    data_completeness: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)  # 0–1 confidence

    # ---- Phase 15: Explainability & Analytics JSONB ----
    explainability: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    score_breakdown: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ranking_analytics: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    audit_trail: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Legacy — kept for backward compatibility
    score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="ranking")
    internship: Mapped["Internship"] = relationship("Internship", back_populates="rankings")

# 14. Reports Model
class Report(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    summary: Mapped[str] = mapped_column(String, nullable=False)
    strengths: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    weaknesses: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    recommendations: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="report")

# 15. Activity Logs Model (Audit Trail)
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="activity_logs")

# 16. Notifications Model
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")

# 17. User Sessions Model
class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    device_info: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

