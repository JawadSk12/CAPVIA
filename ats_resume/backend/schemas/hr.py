"""
backend/schemas/hr.py
──────────────────────
Pydantic schemas for HR Analytics and Candidate Management.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

class HRAnalytics(BaseModel):
    """Overall recruitment funnel analytics for HR dashboard."""
    total_active_jds: int
    total_candidates: int
    total_shortlisted: int
    avg_ats_score: float
    applicants_by_day: list[dict[str, Any]]
    score_distribution: dict[str, int]
    top_skills_requested: list[dict[str, Any]]

class CandidateActionRequest(BaseModel):
    """POST /hr/candidate/{id}/action — HR moves candidate through funnel."""
    action: str = Field(description="SHORTLIST | REJECT | UNDO")
    jd_id: str | None = None
    notes: str | None = None

class HRCandidateDetail(BaseModel):
    """Detailed view of a candidate for HR evaluation."""
    id: str
    full_name: str | None
    email: str
    phone: str | None
    resume_url: str | None
    current_status: str
    applied_at: datetime
    ats_scores: list[dict[str, Any]]  # Score per JD
