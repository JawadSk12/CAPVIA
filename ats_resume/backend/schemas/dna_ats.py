"""
backend/schemas/dna_ats.py
───────────────────────────
DNA-compatible capability graph schemas for ATS output.
This replaces the old basic JSON with a standardized intelligence layer.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class RoleMatch(BaseModel):
    technical_alignment: float = Field(ge=0, le=100)
    project_alignment: float = Field(ge=0, le=100)
    experience_alignment: float = Field(ge=0, le=100)
    domain_alignment: float = Field(ge=0, le=100)
    semantic_match_strength: float = Field(ge=0, le=100)

class ResumeQuality(BaseModel):
    readability: float = Field(ge=0, le=100)
    clarity: float = Field(ge=0, le=100)
    structure_quality: float = Field(ge=0, le=100)
    ats_compatibility: float = Field(ge=0, le=100)
    achievement_quality: float = Field(ge=0, le=100)

class SkillIntelligence(BaseModel):
    technical_depth: float = Field(ge=0, le=100)
    practical_exposure: float = Field(ge=0, le=100)
    tool_relevance: float = Field(ge=0, le=100)
    framework_alignment: float = Field(ge=0, le=100)
    proof_of_skill_strength: float = Field(ge=0, le=100)

class GapAnalysisDNA(BaseModel):
    missing_skill_severity: float = Field(ge=0, le=100)
    project_gap_severity: float = Field(ge=0, le=100)
    learning_gap_score: float = Field(ge=0, le=100)
    readiness_gap_score: float = Field(ge=0, le=100)
    missing_skills: List[str] = Field(default_factory=list)
    weak_areas: List[str] = Field(default_factory=list)
    recommended_skills: List[str] = Field(default_factory=list)

class ReadinessIntelligence(BaseModel):
    internship_readiness: float = Field(ge=0, le=100)
    role_fit_score: float = Field(ge=0, le=100)
    recruiter_interest_probability: float = Field(ge=0, le=100)
    hiring_readiness_score: float = Field(ge=0, le=100)

class FraudFlagDNA(BaseModel):
    type: str
    detail: str
    severity: str

class FraudAnalysisDNA(BaseModel):
    risk_level: str
    is_flagged: bool
    flags: List[FraudFlagDNA] = Field(default_factory=list)

class ExplainabilityDNA(BaseModel):
    top_strengths: List[str] = Field(default_factory=list)
    top_weaknesses: List[str] = Field(default_factory=list)
    matching_reasons: List[str] = Field(default_factory=list)
    risk_reasons: List[str] = Field(default_factory=list)
    reason_for_scores: List[str] = Field(default_factory=list)

class HeatmapDNA(BaseModel):
    section_name: str
    relevance_score: float = Field(ge=0, le=100)
    issues: List[str] = Field(default_factory=list)
    word_count: int

class OverallDNA(BaseModel):
    capability_score: float = Field(ge=0, le=100)
    candidate_level: str
    recommendation: str

class DNACapabilityGraph(BaseModel):
    """
    Standardized final output JSON architecture 
    consumable by CAPVIA Capability DNA Engine.
    """
    candidate_id: str
    job_id: str
    ats_analysis_id: str
    
    role_match: RoleMatch
    resume_quality: ResumeQuality
    skill_intelligence: SkillIntelligence
    gap_analysis: GapAnalysisDNA
    readiness_intelligence: ReadinessIntelligence
    fraud_analysis: FraudAnalysisDNA
    explainability: ExplainabilityDNA
    heatmap: List[HeatmapDNA] = Field(default_factory=list)
    overall: OverallDNA
