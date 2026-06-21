"""Application & Attempt Schemas"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.application import ApplicationStatus
from app.models.simulation_attempt import AttemptStatus


class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    internship_id: int
    candidate_id: int
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    attempt_id: Optional[int] = None
    final_score: Optional[str] = None
    rank: Optional[int] = None
    recommendation: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True


class AttemptStartResponse(BaseModel):
    attempt_id: int
    access_token: str
    blueprint: Dict[str, Any]
    expires_at: str


class AnswerSubmit(BaseModel):
    round_number: int
    task_id: str
    answer: Optional[str] = None
    code: Optional[str] = None
    selected_option: Optional[str] = None


class BehaviorEvent(BaseModel):
    event_type: str
    timestamp: str
    round_number: Optional[int] = None
    task_index: Optional[int] = None
    event_data: Optional[Dict[str, Any]] = None
    severity: str = "info"


class AttemptResponse(BaseModel):
    id: int
    blueprint_id: int
    candidate_id: int
    internship_id: int
    status: AttemptStatus
    current_round: int
    completed_rounds: List[int]
    answers: Dict[str, Any]
    code_submissions: Dict[str, Any]
    started_at: Optional[str] = None
    submitted_at: Optional[str] = None
    expires_at: Optional[str] = None
    total_score: Optional[float] = None
    round_scores: Optional[Dict[str, Any]] = None
    cheating_risk_level: Optional[str] = None
    evaluation_report: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True


class RankingEntry(BaseModel):
    rank: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    total_score: float
    round_scores: Dict[str, Any]
    cheating_risk_level: str
    ai_dependency_score: float
    recommendation: str
    attempt_id: int
    submitted_at: Optional[str] = None
