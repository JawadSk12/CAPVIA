"""
backend/models/audit_log.py
────────────────────────────
Append-only audit trail for all API actions.

Captures every meaningful event for:
  - Security auditing (who accessed what, when)
  - GDPR compliance (data access logs)
  - HR accountability (who reviewed which candidate)
  - Debugging production issues

Design: NO UPDATE, NO DELETE on this table.
Enforced at DB level via PostgreSQL trigger (see migration).
Application code only ever calls INSERT.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from db.postgres import Base


class AuditLog(Base):
    """
    Immutable audit log entry.

    One row per meaningful API action.
    Sensitive data (file contents, passwords) is NEVER stored here.
    Only metadata: who, what, when, where (IP).
    """

    __tablename__ = "audit_logs"

    # ── Identity (BigSerial for append efficiency) ────────────────────────────
    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Sequential ID for audit log ordering",
    )

    # ── Actor ─────────────────────────────────────────────────────────────────
    user_id: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="NULL for unauthenticated requests",
    )
    user_email: Mapped[str | None] = mapped_column(
        String(255),
        comment="Denormalized email — preserved even if user is deleted",
    )
    user_role: Mapped[str | None] = mapped_column(
        String(20),
        comment="Role at time of action (role can change later)",
    )

    # ── Action ────────────────────────────────────────────────────────────────
    action: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Action name: resume.upload, candidate.shortlist, auth.login, etc.",
    )
    resource_type: Mapped[str | None] = mapped_column(
        String(100),
        comment="Resource type: resume, internship, user, ats_result",
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(255),
        comment="Resource UUID that was acted upon",
    )

    # ── Request Context ───────────────────────────────────────────────────────
    method: Mapped[str | None] = mapped_column(String(10), comment="HTTP method")
    endpoint: Mapped[str | None] = mapped_column(String(500), comment="API endpoint path")
    status_code: Mapped[int | None] = mapped_column(comment="HTTP response status code")
    ip_address: Mapped[str | None] = mapped_column(
        String(45),   # IPv6 max length
        comment="Client IP address",
    )
    user_agent: Mapped[str | None] = mapped_column(Text)

    # ── Metadata ──────────────────────────────────────────────────────────────
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata",
        JSONB,
        comment="Additional context: {file_size, score, role, etc.}. Never PII.",
    )
    request_id: Mapped[str | None] = mapped_column(
        String(36),
        comment="Correlation ID for tracing across services",
    )

    # ── Timestamp ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        index=True,
    )

    # ── Indexes ───────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_audit_user_created", "user_id", "created_at"),
        Index("ix_audit_action_created", "action", "created_at"),
        Index("ix_audit_resource", "resource_type", "resource_id"),
        Index("ix_audit_created_brin", "created_at", postgresql_using="brin"),
        # BRIN index on created_at is tiny and perfect for append-only tables
        {"comment": "Immutable audit trail — append only, never update or delete"},
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} "
            f"action={self.action!r} "
            f"user={self.user_email!r}>"
        )


# ─── Audit Action Constants ───────────────────────────────────────────────────

class AuditAction:
    """
    Centralized action name constants.
    Using constants avoids typos in audit log entries.
    """
    # Auth
    AUTH_LOGIN          = "auth.login"
    AUTH_LOGOUT         = "auth.logout"
    AUTH_REGISTER       = "auth.register"
    AUTH_PASSWORD_RESET = "auth.password_reset"
    AUTH_REFRESH        = "auth.token_refresh"

    # Resume
    RESUME_UPLOAD       = "resume.upload"
    RESUME_VIEW         = "resume.view"
    RESUME_DELETE       = "resume.delete"
    RESUME_REANALYZE    = "resume.reanalyze"

    # Analysis
    ATS_RESULT_VIEW     = "ats.result.view"
    ATS_REWRITE_REQUEST = "ats.rewrite.request"

    # HR Actions
    CANDIDATE_VIEW      = "candidate.view"
    CANDIDATE_SHORTLIST = "candidate.shortlist"
    CANDIDATE_REJECT    = "candidate.reject"
    CANDIDATE_EXPORT    = "candidate.export"

    # Internship
    JD_CREATE           = "internship.create"
    JD_UPDATE           = "internship.update"
    JD_DELETE           = "internship.delete"
    JD_VIEW             = "internship.view"

    # Admin
    ADMIN_USER_DEACTIVATE = "admin.user.deactivate"
    ADMIN_STATS_VIEW      = "admin.stats.view"