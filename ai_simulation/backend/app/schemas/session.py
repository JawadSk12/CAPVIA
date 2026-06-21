"""
Session Schemas
Pydantic schemas for test session API validation
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.session import SessionStatus


class SessionBase(BaseModel):
    """Base session schema"""
    test_name: str = Field(..., min_length=1)
    test_description: Optional[str] = None
    role_being_tested: Optional[str] = None
    duration_minutes: int = Field(default=60, ge=30, le=180)


class SessionCreate(SessionBase):
    """Schema for creating session"""
    candidate_email: EmailStr
    candidate_name: Optional[str] = None
    question_ids: List[int]
    scheduled_start: Optional[datetime] = None
    is_proctored: str = "true"
    allow_code_execution: str = "true"


class SessionUpdate(BaseModel):
    """Schema for updating session"""
    status: Optional[SessionStatus] = None
    current_question_index: Optional[int] = None
    notes: Optional[str] = None


class SessionResponse(SessionBase):
    """Schema for session response"""
    id: int
    session_token: str
    access_code: str
    candidate_id: int
    candidate_email: str
    candidate_name: Optional[str] = None
    
    status: SessionStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    
    question_ids: List[int]
    current_question_index: int
    completed_questions: List[int]
    module_status: Dict[str, Any]
    
    total_score: Optional[str] = None
    module_scores: Optional[Dict[str, float]] = None
    behavior_score: Optional[str] = None
    cheating_risk_level: Optional[str] = None
    
    has_suspicious_activity: str
    is_proctored: str
    allow_code_execution: str
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SessionDetailResponse(SessionResponse):
    """Detailed session response with questions"""
    questions: List[Any] = []  # Will be populated with question data
    time_remaining_seconds: int = 0


class SessionStartRequest(BaseModel):
    """Request to start a session"""
    access_code: str = Field(..., min_length=1)


class SessionStartResponse(BaseModel):
    """Response when session starts"""
    session: SessionResponse
    first_question: Any
    time_remaining_seconds: int


class SessionListResponse(BaseModel):
    """Paginated session list"""
    sessions: List[SessionResponse]
    total: int
    skip: int
    limit: int