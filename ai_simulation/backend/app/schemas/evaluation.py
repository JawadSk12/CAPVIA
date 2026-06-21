"""
Evaluation Schemas
Pydantic schemas for evaluation API validation
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class EvaluationBase(BaseModel):
    """Base evaluation schema"""
    session_id: int
    submission_id: Optional[int] = None


class EvaluationCreate(EvaluationBase):
    """Schema for creating evaluation"""
    pass


class EvaluationUpdate(BaseModel):
    """Schema for updating evaluation"""
    accuracy_score: Optional[float] = None
    logic_score: Optional[float] = None
    speed_score: Optional[float] = None
    explanation_score: Optional[float] = None
    behavior_score: Optional[float] = None
    total_score: Optional[float] = None


class EvaluationResponse(EvaluationBase):
    """Schema for evaluation response"""
    id: int
    
    accuracy_score: Optional[float] = None
    logic_score: Optional[float] = None
    speed_score: Optional[float] = None
    explanation_score: Optional[float] = None
    behavior_score: Optional[float] = None
    
    total_score: Optional[float] = None
    max_possible_score: float
    
    keyword_matches: Optional[Dict[str, Any]] = None
    semantic_score: Optional[float] = None
    code_quality_metrics: Optional[Dict[str, Any]] = None
    
    ai_probability: Optional[float] = None
    ai_detection_reasons: Optional[List[str]] = None
    
    plagiarism_score: Optional[float] = None
    similar_solutions_found: Optional[List[str]] = None
    
    suspicious_events: Optional[List[Dict[str, Any]]] = None
    cheating_indicators: Optional[Dict[str, Any]] = None
    cheating_risk_level: Optional[str] = None
    
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    recommendations: Optional[str] = None
    
    passed: Optional[str] = None
    grade: Optional[str] = None
    recommendation: Optional[str] = None
    
    evaluated_by: str
    evaluation_method: Optional[str] = None
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class FinalReportResponse(BaseModel):
    """Final evaluation report"""
    session_id: int
    candidate_name: str
    candidate_email: str
    test_name: str
    
    total_score: float
    percentage: float
    grade: str
    
    module_scores: Dict[str, float]
    
    accuracy_score: float
    logic_score: float
    speed_score: float
    explanation_score: float
    behavior_score: float
    
    cheating_risk_level: str
    has_suspicious_activity: bool
    
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str
    
    detailed_feedback: str
    
    completed_at: datetime