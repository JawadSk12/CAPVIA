"""
backend/models/internship.py
────────────────────────────
SQLAlchemy ORM model for Internship Job Descriptions.

HR creates internship postings here. Each posting contains:
  - Title, company, experience level
  - Application deadline, active status
  - Reference to full JD content in MongoDB (keyed by this .id)

The full JD content (responsibilities, required_skills, preferred_skills,
tools, expected_projects, jd_embedding) lives in MongoDB because:
  - It's a variable-length document
  - The embedding (768-dim float array) is too large for PG columns
  - It never needs to be JOINed with other tables
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class ExperienceLevel(str, enum.Enum):
    """Expected candidate experience level for this internship."""
    ENTRY      = "ENTRY"         # 0–1 year, freshers
    JUNIOR     = "JUNIOR"        # 1–2 years
    MID        = "MID"           # 2–4 years
    SENIOR     = "SENIOR"        # 4+ years (rare for internship)


class Internship(Base):
    """
    Internship job description posting.

    Created by HR users. Students apply by uploading resumes
    in INTERNSHIP mode with jd_id = this record's id.
    """

    __tablename__ = "internships"

    # ── Identity ──────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # ── Ownership ─────────────────────────────────────────────────────────────
    created_by: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="HR user who created this JD",
    )
    org_id: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── JD Metadata ───────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Job title e.g. 'Machine Learning Engineer Intern'",
    )
    company: Mapped[str | None] = mapped_column(String(255))
    department: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    experience_level: Mapped[ExperienceLevel] = mapped_column(
        Enum(ExperienceLevel, name="experience_level_enum"),
        nullable=False,
        default=ExperienceLevel.ENTRY,
        server_default="ENTRY",
    )

    # ── Short description (for listing page) ──────────────────────────────────
    short_description: Mapped[str | None] = mapped_column(
        Text,
        comment="2-3 sentence JD summary for listing cards",
    )

    # ── Application Window ────────────────────────────────────────────────────
    application_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        comment="Deadline for applications",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        index=True,
        comment="Inactive JDs hidden from students",
    )

    # ── Stats (denormalized for fast queries) ─────────────────────────────────
    total_applicants: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Incremented when a resume is submitted for this JD",
    )
    shortlisted_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    # ── MongoDB Reference ─────────────────────────────────────────────────────
    # The full JD document in MongoDB uses this .id as its _id field.
    # No foreign key needed — application code maintains this contract.

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()"), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    creator: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[created_by], lazy="select"
    )
    org: Mapped["Organization | None"] = relationship(  # type: ignore[name-defined]
        "Organization", back_populates="internships", lazy="select"
    )
    resumes: Mapped[list["Resume"]] = relationship(  # type: ignore[name-defined]
        "Resume", back_populates="internship", lazy="select"
    )

    # ── Indexes ───────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_internships_active_created", "is_active", "created_at"),
        Index("ix_internships_org_active", "org_id", "is_active"),
        {"comment": "Internship job descriptions posted by HR users"},
    )

    def __repr__(self) -> str:
        return f"<Internship id={self.id!r} title={self.title!r} active={self.is_active}>"

    @property
    def is_expired(self) -> bool:
        if self.application_deadline is None:
            return False
        from datetime import timezone
        return datetime.now(timezone.utc) > self.application_deadline

# Import here to avoid circular dependency but ensure registration
from . import resume # noqa: F401