from .user import User, Organization, UserRole
from .internship import Internship, ExperienceLevel
from .resume import Resume, ResumeStatus, ResumeMode
from .ats_result import ATSResult
from .audit_log import AuditLog, AuditAction

# This ensures all models are known to SQLAlchemy when any model is imported.
__all__ = [
    "User",
    "Organization",
    "UserRole",
    "Internship",
    "ExperienceLevel",
    "Resume",
    "ResumeStatus",
    "ResumeMode",
    "ATSResult",
    "AuditLog",
    "AuditAction",
]
