"""
backend/schemas/internship.py
──────────────────────────────
Pydantic schemas for Internship JD API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ─── Request Schemas ──────────────────────────────────────────────────────────

class InternshipCreateRequest(BaseModel):
    """
    POST /internship — HR creates a new JD.
    Contains both PG metadata and MongoDB full-content fields.
    """
    # PostgreSQL fields
    title: str = Field(min_length=5, max_length=500, examples=["ML Engineer Intern"])
    company: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    is_remote: bool = False
    experience_level: str = Field(
        default="entry",
        description="entry|junior|mid|senior",
    )
    short_description: str | None = Field(default=None, max_length=500)
    application_deadline: datetime | None = None

    # MongoDB content fields
    responsibilities: list[str] = Field(
        min_length=1,
        description="List of job responsibilities",
        examples=[["Build ML pipelines", "Deploy models to production"]],
    )
    required_skills: list[str] = Field(
        min_length=1,
        description="Skills that MUST be present (used in ATS scoring with high weight)",
        examples=[["Python", "TensorFlow", "SQL"]],
    )
    preferred_skills: list[str] = Field(
        default_factory=list,
        description="Nice-to-have skills (lower weight in scoring)",
    )
    tools_and_technologies: list[str] = Field(
        default_factory=list,
        description="Specific tools: Git, Docker, Jupyter, etc.",
    )
    expected_projects: list[str] = Field(
        default_factory=list,
        description="Types of projects candidate should have done",
    )
    full_jd_text: str | None = Field(
        default=None,
        description="Paste of the full JD text (used for NLP analysis)",
    )

    @field_validator("experience_level")
    @classmethod
    def validate_exp_level(cls, v: str) -> str:
        v_upper = v.upper()
        allowed = {"ENTRY", "JUNIOR", "MID", "SENIOR"}
        if v_upper not in allowed:
            # Also allow lowercase in input for backward compatibility
            v_lower = v.lower()
            if v_lower in {"entry", "junior", "mid", "senior"}:
                return v_lower.upper()
            raise ValueError(f"experience_level must be one of: {', '.join(allowed)}")
        return v_upper

    @field_validator("required_skills", "preferred_skills", "tools_and_technologies")
    @classmethod
    def clean_skills(cls, v: list[str]) -> list[str]:
        """Strip whitespace, remove empty strings, deduplicate."""
        seen: set[str] = set()
        result = []
        for skill in v:
            clean = skill.strip()
            if clean and clean.lower() not in seen:
                seen.add(clean.lower())
                result.append(clean)
        return result


class InternshipUpdateRequest(BaseModel):
    """PUT /internship/{id} — partial update, all fields optional."""
    title: str | None = Field(default=None, min_length=5, max_length=500)
    company: str | None = None
    is_remote: bool | None = None
    experience_level: str | None = None
    is_active: bool | None = None
    application_deadline: datetime | None = None
    responsibilities: list[str] | None = None
    required_skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    tools_and_technologies: list[str] | None = None
    expected_projects: list[str] | None = None


# ─── Response Schemas ─────────────────────────────────────────────────────────

class InternshipSummaryResponse(BaseModel):
    """Internship card for listing pages."""
    id: str
    title: str
    company: str | None
    location: str | None
    is_remote: bool
    experience_level: str
    is_active: bool
    is_expired: bool
    total_applicants: int
    shortlisted_count: int
    short_description: str | None
    application_deadline: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InternshipDetailResponse(InternshipSummaryResponse):
    """Full internship detail page."""
    responsibilities: list[str]
    required_skills: list[str]
    preferred_skills: list[str]
    tools_and_technologies: list[str]
    expected_projects: list[str]
    full_jd_text: str | None
    created_by_name: str | None = None


# ─── Comparison / ATS ─────────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    """POST /internship/{id}/compare/{resume_id} — trigger comparison."""
    force_rerun: bool = Field(
        default=False,
        description="Re-run even if result already exists",
    )


class InternshipDimensionScore(BaseModel):
    """One scoring dimension in internship ATS."""
    dimension: str
    score: float = Field(ge=0.0, le=100.0)
    weight: float = Field(ge=0.0, le=1.0)
    weighted_contribution: float
    explanation: str


class InternshipATSResponse(BaseModel):
    """
    Full internship ATS comparison result.
    One result per (resume_id, jd_id) pair.
    """
    resume_id: str
    jd_id: str
    overall_score: float
    score_band: str

    # Dimension breakdown
    dimensions: list[InternshipDimensionScore]

    # Skill comparison
    required_skills_analysis: dict[str, Any]   # matches, gaps, coverage
    preferred_skills_analysis: dict[str, Any]
    tool_match_analysis: dict[str, Any]

    # Gap priorities
    critical_gaps: list[str] = Field(description="High-priority required skills missing")
    nice_to_have_gaps: list[str] = Field(description="Preferred skills missing")
    action_items: list[str] = Field(description="Ordered list of improvement actions")

    # Fraud
    is_suspicious: bool
    fraud_flags: list[dict[str, Any]]

    # Meta
    ai_confidence: float
    created_at: datetime


# ─── Candidate Ranking ────────────────────────────────────────────────────────

class CandidateRankItem(BaseModel):
    """One candidate in the HR ranking list."""
    rank: int
    resume_id: str
    user_id: str
    user_name: str | None
    user_email: str
    overall_score: float
    score_band: str
    required_skill_match: float
    project_relevance: float
    is_suspicious: bool
    fraud_flag_count: int
    ai_confidence: float
    confidence_label: str
    hr_status: str
    applied_at: datetime


class CandidateRankingResponse(BaseModel):
    """HR candidate ranking for a specific internship."""
    jd_id: str
    jd_title: str
    total_applicants: int
    ranked_candidates: list[CandidateRankItem]
    score_distribution: dict[str, int] = Field(
        description="{'STRONG': 5, 'GOOD': 12, 'FAIR': 8, 'WEAK': 3}",
    )