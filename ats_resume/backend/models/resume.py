"""
backend/models/resume.py
────────────────────────
SQLAlchemy ORM model for Resume metadata.

Design principle:
  PostgreSQL stores METADATA (IDs, statuses, FKs, timestamps).
  MongoDB stores CONTENT  (parsed text, entities, AI results).

This split lets us:
  - Run relational queries on PG (joins, filters, counts)
  - Store variable-schema AI output in Mongo without migrations
  - Scale each store independently

Status state machine:
  PENDING → OCR → PARSING → EMBEDDING → SCORING → DONE
                                                  ↘ ERROR (from any stage)

Mode:
  GLOBAL      → role is auto-detected from resume content
  INTERNSHIP  → resume compared against a specific JD (jd_id set)
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.postgres import Base


class ResumeStatus(str, enum.Enum):
    """Processing pipeline stages. Frontend polls this."""
    PENDING   = "PENDING"
    OCR       = "OCR"
    PARSING   = "PARSING"
    EMBEDDING = "EMBEDDING"
    SCORING   = "SCORING"
    DONE      = "DONE"
    ERROR     = "ERROR"


class ResumeMode(str, enum.Enum):
    """Analysis mode."""
    GLOBAL     = "GLOBAL"
    INTERNSHIP = "INTERNSHIP"


# Stage ordering for progress percentage calculation
STAGE_PROGRESS: dict[str, int] = {
    ResumeStatus.PENDING:   0,
    ResumeStatus.OCR:       15,
    ResumeStatus.PARSING:   35,
    ResumeStatus.EMBEDDING: 60,
    ResumeStatus.SCORING:   85,
    ResumeStatus.DONE:      100,
    ResumeStatus.ERROR:     -1,
}


class Resume(Base):
    """
    Resume upload metadata.

    Every resume upload creates one row here. The actual:
    - Raw file        → AWS S3 at s3_key
    - Parsed content  → MongoDB resumes collection (keyed by this .id)
    - ATS result      → MongoDB ats_results collection (keyed by this .id)
    """

    __tablename__ = "resumes"

    # ── Identity ──────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # ── Ownership ─────────────────────────────────────────────────────────────
    user_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── File Info ─────────────────────────────────────────────────────────────
    original_filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Original filename as uploaded by user",
    )
    s3_key: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        unique=True,
        comment="S3 object key: resumes/{user_id}/{resume_id}/{filename}",
    )
    file_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="MIME type: application/pdf or application/vnd.openxmlformats...",
    )
    file_size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="File size in bytes. Max 5MB enforced at upload.",
    )
    file_hash: Mapped[str | None] = mapped_column(
        String(64),
        comment="SHA-256 hash of file contents. Detect duplicate uploads.",
    )

    # ── Processing State ──────────────────────────────────────────────────────
    status: Mapped[ResumeStatus] = mapped_column(
        Enum(ResumeStatus, name="resume_status_enum"),
        nullable=False,
        default=ResumeStatus.PENDING,
        server_default="PENDING",
        index=True,
    )
    mode: Mapped[ResumeMode] = mapped_column(
        Enum(ResumeMode, name="resume_mode_enum"),
        nullable=False,
        default=ResumeMode.GLOBAL,
        server_default="GLOBAL",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        comment="Last error message if status=ERROR",
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Number of Celery retry attempts",
    )

    # ── Internship Link ───────────────────────────────────────────────────────
    jd_id: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("internships.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Set when mode=INTERNSHIP; links to the target JD",
    )

    # ── Celery Task Tracking ──────────────────────────────────────────────────
    celery_task_id: Mapped[str | None] = mapped_column(
        String(255),
        comment="Celery task ID for the current/last processing task",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User",
        back_populates="resumes",
        lazy="select",
    )
    internship: Mapped["Internship | None"] = relationship(  # type: ignore[name-defined]
        "Internship",
        back_populates="resumes",
        lazy="select",
    )

    # ── Indexes ───────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_resumes_user_status", "user_id", "status"),
        Index("ix_resumes_user_created", "user_id", "created_at"),
        Index("ix_resumes_jd_status", "jd_id", "status"),
        {"comment": "Resume upload records — metadata only, content in MongoDB/S3"},
    )

    def __repr__(self) -> str:
        return f"<Resume id={self.id!r} status={self.status} mode={self.mode}>"

    @property
    def progress_percent(self) -> int:
        """Returns 0-100 progress for frontend progress bar."""
        return STAGE_PROGRESS.get(self.status, 0)

    @property
    def is_complete(self) -> bool:
        return self.status == ResumeStatus.DONE

    @property
    def has_error(self) -> bool:
        return self.status == ResumeStatus.ERROR

    @property
    def s3_public_key(self) -> str:
        """S3 key for the processed/cleaned version of the resume."""
        return self.s3_key.replace("raw/", "processed/")

# Import here to avoid circular dependency but ensure registration
from . import internship # noqa: F401