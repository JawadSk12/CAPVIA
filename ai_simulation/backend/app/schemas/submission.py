"""
Submission Schemas
Pydantic schemas for submission API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class SubmissionBase(BaseModel):
    """Base submission schema"""
    question_id: int
    answer_text: Optional[str] = None
    code_answer: Optional[str] = None
    selected_option: Optional[str] = None
    explanation: Optional[str] = None


class SubmissionCreate(SubmissionBase):
    """Schema for creating submission"""
    session_id: int
    time_spent_seconds: Optional[int] = None


class SubmissionUpdate(BaseModel):
    """Schema for updating submission"""
    answer_text: Optional[str] = None
    code_answer: Optional[str] = None
    selected_option: Optional[str] = None
    explanation: Optional[str] = None


class SubmissionResponse(SubmissionBase):
    """Schema for submission response"""
    id: int
    session_id: int
    
    submitted_at: datetime
    time_spent_seconds: Optional[int] = None
    attempt_count: int
    
    execution_results: Optional[Dict[str, Any]] = None
    
    typing_pattern: Optional[Dict[str, Any]] = None
    paste_count: int
    copy_count: int
    tab_switches: int
    
    score: Optional[float] = None
    max_score: Optional[float] = None
    is_correct: Optional[str] = None
    
    ai_detection_score: Optional[float] = None
    similarity_score: Optional[float] = None
    
    is_flagged: str
    flag_reason: Optional[str] = None
    requires_manual_review: str
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class SubmissionWithQuestion(SubmissionResponse):
    """Submission with question details"""
    question: Any  # Will be populated with question data


class BehaviorEventCreate(BaseModel):
    """Schema for creating behavioral event"""
    session_id: int
    question_id: Optional[int] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    severity: str = "low"
    description: Optional[str] = None


class CodeExecutionRequest(BaseModel):
    """Request to execute code"""
    code: str
    language: str
    test_cases: Optional[List[Dict[str, Any]]] = None
    input_data: Optional[str] = None


class CodeExecutionResponse(BaseModel):
    """Response from code execution"""
    status: str
    output: Optional[str] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[float] = None
    memory_used_mb: Optional[float] = None
    test_cases_passed: int = 0
    test_cases_total: int = 0
    test_cases_results: Optional[List[Dict[str, Any]]] = None