"""
backend/schemas/resume.py
──────────────────────────
Pydantic v2 schemas for resume upload, status, and analysis API.

These schemas define the API contract for:
  - Resume upload response (what we return after accepting a file)
  - Processing status polling (frontend polls every 2s)
  - Full analysis result (the main result page)
  - Heatmap data (section-level breakdown)
  - Rewrite suggestion (AI-generated improvements)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ─── Upload ───────────────────────────────────────────────────────────────────

class ResumeUploadResponse(BaseModel):
    """
    Returned immediately after file is accepted.
    Frontend uses resume_id to poll status.
    """
    resume_id: str = Field(description="UUID of the created resume record")
    status: str = Field(default="PENDING", description="Initial processing status")
    message: str = Field(default="Resume uploaded. Processing started.")
    estimated_seconds: int = Field(
        default=45,
        description="Estimated processing time in seconds",
    )


# ─── Status ───────────────────────────────────────────────────────────────────

class ResumeStatusResponse(BaseModel):
    """
    Returned by GET /resume/{id}/status
    Frontend polls this every 2 seconds until status=DONE or ERROR.
    """
    resume_id: str
    status: str = Field(
        description="PENDING|OCR|PARSING|EMBEDDING|SCORING|DONE|ERROR"
    )
    progress_percent: int = Field(ge=0, le=100)
    stage_label: str = Field(
        description="Human-readable stage description"
    )
    error_message: str | None = None
    estimated_seconds_remaining: int | None = None


STAGE_LABELS: dict[str, str] = {
    "PENDING":   "Queued for processing...",
    "OCR":       "Extracting text from document...",
    "PARSING":   "Analyzing resume structure...",
    "EMBEDDING": "Generating semantic embeddings...",
    "SCORING":   "Computing ATS scores...",
    "DONE":      "Analysis complete!",
    "ERROR":     "Processing failed",
}


# ─── Skill Analysis ───────────────────────────────────────────────────────────

class SkillMatch(BaseModel):
    """A resume skill that matched a target skill."""
    target_skill: str
    matched_by: str = Field(description="The resume skill that matched")
    similarity_score: float = Field(ge=0.0, le=1.0)
    match_type: str = Field(description="DIRECT|SEMANTIC|PARTIAL")


class SkillGap(BaseModel):
    """A required skill missing from the resume."""
    skill: str
    closest_match: str | None = Field(
        description="Closest resume skill (even if too dissimilar)"
    )
    similarity: float = Field(ge=0.0, le=1.0)
    priority: str = Field(description="HIGH|MEDIUM|LOW")
    learning_resource: str | None = Field(
        description="Suggested learning link (e.g. Coursera URL)",
        default=None,
    )


class SkillAnalysis(BaseModel):
    """Complete skill match analysis."""
    matches: list[SkillMatch]
    gaps: list[SkillGap]
    coverage: float = Field(ge=0.0, le=1.0, description="Fraction of target skills covered")
    semantic_score: float = Field(ge=0.0, le=1.0)
    matched_count: int
    gap_count: int


# ─── Section Heatmap ──────────────────────────────────────────────────────────

class HeatmapSection(BaseModel):
    """A resume section with its relevance score and issues."""
    section_name: str
    content_preview: str = Field(description="First 200 chars of section content")
    relevance_score: float = Field(ge=0.0, le=1.0)
    issues: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    feedback: str = Field(description="One actionable feedback sentence")
    word_count: int


# ─── Explainability ───────────────────────────────────────────────────────────

class ExplainabilityFactor(BaseModel):
    """One SHAP-derived factor explaining the score."""
    feature_name: str
    display_name: str
    impact: float = Field(description="SHAP value — positive raises score, negative lowers")
    direction: str = Field(description="'positive' or 'negative'")
    raw_value: float
    explanation: str = Field(description="Natural language explanation of this factor")
    fix_suggestion: str | None = Field(
        description="Actionable advice to improve this dimension",
        default=None,
    )


class ExplainabilityReport(BaseModel):
    """Full explainability report for a score."""
    factors: list[ExplainabilityFactor]
    summary: str = Field(description="2-3 sentence overall explanation")
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_label: str = Field(description="HIGH|MEDIUM|LOW")


# ─── Fraud Detection ──────────────────────────────────────────────────────────

class FraudFlag(BaseModel):
    """One detected fraud indicator."""
    flag_type: str = Field(
        description="SKILL_INFLATION|KEYWORD_STUFFING|UNSUBSTANTIATED_SKILL"
    )
    severity: str = Field(description="HIGH|MEDIUM|LOW")
    detail: str
    affected_skill: str | None = None


class FraudAnalysis(BaseModel):
    """Complete fraud / fake skill detection report."""
    is_suspicious: bool
    fraud_probability: float = Field(ge=0.0, le=1.0)
    flags: list[FraudFlag]
    proof_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Fraction of claimed skills substantiated by project evidence",
    )
    verdict: str = Field(description="CLEAN|SUSPICIOUS|LIKELY_FRAUD")


# ─── Dimension Scores ─────────────────────────────────────────────────────────

class DimensionScores(BaseModel):
    """Individual dimension scores (0-100 each)."""
    semantic_skill_match: float
    project_relevance: float
    experience_depth: float
    education_alignment: float
    ats_format: float
    keyword_intelligence: float
    certification_bonus: float | None = None
    skill_proof_score: float | None = None


# ─── Full Analysis Result ─────────────────────────────────────────────────────

class ATSAnalysisResponse(BaseModel):
    """
    Full ATS analysis result.
    Returned by GET /resume/{id}/analysis
    This is the main data source for the student analysis dashboard.
    """
    # Identity
    resume_id: str
    user_id: str
    mode: str
    created_at: datetime

    # Core score
    overall_score: float = Field(ge=0.0, le=100.0)
    score_band: str = Field(description="STRONG|GOOD|FAIR|WEAK")
    percentile: float | None = Field(
        description="Beats X% of candidates in same role",
        ge=0.0,
        le=100.0,
    )

    # Role detection
    detected_role: str
    role_confidence: float = Field(ge=0.0, le=1.0)
    role_alternatives: list[dict[str, Any]] = Field(
        description="Top 3 alternative role detections with confidences",
        default_factory=list,
    )

    # Dimension breakdown
    dimensions: DimensionScores

    # Skill analysis
    skill_analysis: SkillAnalysis

    # Section heatmap
    heatmap: list[HeatmapSection]

    # Explainability
    explainability: ExplainabilityReport

    # Fraud detection
    fraud_analysis: FraudAnalysis

    # AI confidence
    ai_confidence: float = Field(ge=0.0, le=1.0)
    confidence_label: str


# ─── Rewrite Suggestion ───────────────────────────────────────────────────────

class RewriteRequest(BaseModel):
    """POST /resume/{id}/rewrite request body."""
    section: str = Field(
        description="Section to rewrite: skills|experience|summary|projects",
        examples=["skills"],
    )
    target_role: str | None = Field(
        default=None,
        description="Override target role for rewrite (default: detected role)",
    )
    jd_id: str | None = Field(
        default=None,
        description="JD to optimize for (optional)",
    )


class RewriteSuggestion(BaseModel):
    """A single AI rewrite suggestion for one section."""
    section: str
    original_content: str
    suggested_content: str
    improvement_rationale: str
    keywords_added: list[str]
    expected_score_impact: float = Field(
        description="Estimated score improvement if suggestion is applied",
        ge=0.0,
        le=20.0,
    )


# ─── Resume List (history) ────────────────────────────────────────────────────

class ResumeSummary(BaseModel):
    """Resume item for the history list."""
    id: str
    original_filename: str
    status: str
    mode: str
    overall_score: float | None
    detected_role: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}