"""
Report Schemas
Pydantic schemas for report generation
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class QuestionPerformance(BaseModel):
    """Performance on individual question"""
    question_id: int
    question_title: str
    question_type: str
    difficulty: str
    score: float
    max_score: float
    percentage: float
    time_spent_seconds: int
    is_correct: bool


class ModulePerformance(BaseModel):
    """Performance on a module"""
    module_number: int
    module_name: str
    questions_count: int
    score: float
    max_score: float
    percentage: float
    time_spent_seconds: int


class BehaviorAnalysis(BaseModel):
    """Behavioral analysis"""
    tab_switches: int
    copy_events: int
    paste_events: int
    idle_time_seconds: int
    suspicious_events: List[Dict[str, Any]]
    risk_level: str
    risk_factors: List[str]


class DetailedReport(BaseModel):
    """Comprehensive evaluation report"""
    # Session info
    session_id: int
    session_token: str
    candidate_name: str
    candidate_email: str
    test_name: str
    role_being_tested: str
    
    # Timing
    started_at: datetime
    completed_at: datetime
    duration_minutes: int
    
    # Overall scores
    total_score: float
    max_possible_score: float
    percentage: float
    grade: str
    
    # Component scores
    accuracy_score: float
    logic_score: float
    speed_score: float
    explanation_score: float
    behavior_score: float
    
    # Module breakdown
    modules: List[ModulePerformance]
    
    # Question details
    questions: List[QuestionPerformance]
    
    # Behavior analysis
    behavior: BehaviorAnalysis
    
    # AI detection
    ai_detection_score: float
    ai_detected: bool
    ai_detection_reasons: List[str]
    
    # Code analysis (if applicable)
    code_quality_score: Optional[float] = None
    plagiarism_detected: bool = False
    similarity_score: Optional[float] = None
    
    # Final assessment
    strengths: List[str]
    weaknesses: List[str]
    recommendations: str
    hiring_recommendation: str  # "strong_hire", "hire", "maybe", "reject"
    
    # Flags
    requires_manual_review: bool
    flagged_for_cheating: bool
    cheating_risk_level: str


class SummaryReport(BaseModel):
    """Summary report for quick overview"""
    session_id: int
    candidate_name: str
    candidate_email: str
    total_score: float
    percentage: float
    grade: str
    hiring_recommendation: str
    cheating_risk_level: str
    completed_at: datetime