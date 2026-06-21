"""
User Model
Represents HR users, candidates, and super admins
"""

from sqlalchemy import Column, String, Boolean, Text, JSON
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    """User role enumeration"""
    HR = "hr"
    CANDIDATE = "candidate"
    SUPER_ADMIN = "super_admin"


class UserStatus(str, enum.Enum):
    """User status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class User(BaseModel):
    """
    User model for authentication and authorization
    Supports HR users, candidates, and super admins
    """
    __tablename__ = "users"

    # Basic Information
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)

    # Authentication
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Role & Permissions — stored as plain VARCHAR to avoid native enum reflection issues
    role = Column(
        String(50),
        default=UserRole.CANDIDATE.value,
        nullable=False,
        index=True
    )
    status = Column(
        String(50),
        default=UserStatus.ACTIVE.value,
        nullable=False
    )

    # Profile Information
    phone = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    organization = Column(String(255), nullable=True)
    position = Column(String(255), nullable=True)

    # Candidate-specific fields
    skills = Column(JSON, nullable=True)           # List[str]
    resume_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    years_of_experience = Column(String(20), nullable=True)

    # HR-specific fields
    company_id = Column(String(50), nullable=True)  # FK handled at app level

    # Email verification
    verification_token = Column(String(255), nullable=True)
    verification_token_expires = Column(String(50), nullable=True)

    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(String(50), nullable=True)

    # Metadata
    last_login = Column(String(50), nullable=True)
    login_count = Column(String(50), default="0")

    # Relationships
    sessions = relationship(
        "Session",
        back_populates="candidate",
        foreign_keys="[Session.candidate_id]",
        cascade="all, delete-orphan"
    )

    created_sessions = relationship(
        "Session",
        back_populates="created_by_user",
        foreign_keys="[Session.created_by]",
        cascade="all, delete-orphan"
    )

    # New relationships
    applications = relationship(
        "InternshipApplication",
        back_populates="candidate",
        foreign_keys="[InternshipApplication.candidate_id]",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"

    @property
    def is_admin(self) -> bool:
        """Check if user is HR or super admin"""
        return self.role in [UserRole.HR, UserRole.SUPER_ADMIN]

    @property
    def is_hr(self) -> bool:
        """Check if user is HR"""
        return self.role == UserRole.HR

    @property
    def is_candidate(self) -> bool:
        """Check if user is candidate"""
        return self.role == UserRole.CANDIDATE