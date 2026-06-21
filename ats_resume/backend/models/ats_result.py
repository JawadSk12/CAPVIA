"""
backend/models/ats_result.py
────────────────────────────
SQLAlchemy ORM model for ATS Results summary.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.postgres import Base


class ATSResult(Base):
    __tablename__ = "ats_results"

    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    resume_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    jd_id: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("internships.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    user_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mode: Mapped[str] = mapped_column(String(50), nullable=False, default="GLOBAL")
    
    overall_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    score_band: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    semantic_skill_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    project_relevance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    experience_depth_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    education_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    format_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    detected_role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    is_suspicious: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fraud_probability: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fraud_flag_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    hr_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    percentile: Mapped[float | None] = mapped_column(Float, nullable=True)

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
    )

    # Relationships
    resume: Mapped["Resume"] = relationship(  # type: ignore[name-defined]
        "Resume",
        lazy="select",
    )
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User",
        lazy="select",
    )
    internship: Mapped["Internship | None"] = relationship(  # type: ignore[name-defined]
        "Internship",
        lazy="select",
    )

    __table_args__ = (
        Index("ix_ats_results_resume_jd", "resume_id", "jd_id", unique=True),
    )

    def __repr__(self) -> str:
        return f"<ATSResult id={self.id!r} resume_id={self.resume_id!r} score={self.overall_score}>"