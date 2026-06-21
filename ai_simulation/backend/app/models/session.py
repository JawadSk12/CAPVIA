"""
Session Model
Represents a test session for a candidate
"""

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum as SQLEnum, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum
from app.models.base import BaseModel


class SessionStatus(str, enum.Enum):
    """Session status enumeration"""
    CREATED = "created"  # Session created, not started
    IN_PROGRESS = "in_progress"  # Candidate is taking test
    COMPLETED = "completed"  # Test completed
    EXPIRED = "expired"  # Time limit exceeded
    TERMINATED = "terminated"  # Manually terminated by admin


class Session(BaseModel):
    """
    Test Session model
    Tracks individual candidate test attempts
    """
    __tablename__ = "sessions"
    
    # Session Identification
    session_token = Column(String(100), unique=True, index=True, nullable=False)
    access_code = Column(String(20), unique=True, index=True, nullable=False)
    
    # Candidate Information
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    candidate_email = Column(String(255), nullable=False)
    candidate_name = Column(String(255), nullable=True)
    
    # Session Configuration
    test_name = Column(String(255), nullable=False)
    test_description = Column(Text, nullable=True)
    role_being_tested = Column(String(100), nullable=True)  # e.g., "Backend Developer"
    role_key = Column(String(100), nullable=True, index=True)  # e.g., "ml_engineer"
    difficulty_level = Column(String(20), nullable=True, default="mid")  # junior, mid, senior
    
    # Timing
    duration_minutes = Column(Integer, default=60, nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    scheduled_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    
    # Status
    status = Column(
        SQLEnum(SessionStatus),
        default=SessionStatus.CREATED,
        nullable=False,
        index=True
    )
    
    # Questions in this session
    question_ids = Column(JSON, default=list, nullable=False)
    # [1, 5, 10, 15, 20] - List of question IDs
    
    current_question_index = Column(Integer, default=0, nullable=False)
    completed_questions = Column(JSON, default=list, nullable=False)
    # [1, 5] - IDs of completed questions
    
    # Modules completion tracking
    module_status = Column(JSON, default=dict, nullable=False)
    # {
    #     "1": {"completed": true, "time_spent": 600},
    #     "2": {"completed": false, "time_spent": 300}
    # }
    
    # Session Metadata
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    browser_info = Column(JSON, nullable=True)
    
    # Scores (calculated after completion)
    total_score = Column(String(10), nullable=True)
    module_scores = Column(JSON, nullable=True)
    # {
    #     "module_1": 85.5,
    #     "module_2": 70.0,
    #     ...
    # }
    
    behavior_score = Column(String(10), nullable=True)
    cheating_risk_level = Column(String(20), nullable=True)  # low, medium, high
    
    # Flags
    has_suspicious_activity = Column(String(10), default="false")
    is_proctored = Column(String(10), default="true")
    allow_code_execution = Column(String(10), default="true")
    
    # Admin tracking
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)  # Admin notes
    
    # Relationships
    candidate = relationship(
        "User",
        back_populates="sessions",
        foreign_keys=[candidate_id]
    )
    
    created_by_user = relationship(
        "User",
        back_populates="created_sessions",
        foreign_keys=[created_by]
    )
    
    submissions = relationship(
        "Submission",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    
    behavioral_events = relationship(
        "BehavioralEvent",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    
    evaluations = relationship(
        "Evaluation",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Session {self.session_token} - {self.candidate_email}>"
    
    @property
    def is_active(self) -> bool:
        """Check if session is currently active"""
        return self.status == SessionStatus.IN_PROGRESS
    
    @property
    def is_expired(self) -> bool:
        """Check if session has expired"""
        if not self.start_time:
            return False
        
        expiry_time = self.start_time + timedelta(minutes=self.duration_minutes)
        return datetime.utcnow() > expiry_time
    
    @property
    def time_remaining_seconds(self) -> int:
        """Calculate remaining time in seconds"""
        if not self.start_time:
            return self.duration_minutes * 60
        
        expiry_time = self.start_time + timedelta(minutes=self.duration_minutes)
        remaining = (expiry_time - datetime.utcnow()).total_seconds()
        return max(0, int(remaining))
    
    def start_session(self):
        """Mark session as started"""
        self.status = SessionStatus.IN_PROGRESS
        self.start_time = datetime.utcnow()
        self.end_time = self.start_time + timedelta(minutes=self.duration_minutes)
    
    def complete_session(self):
        """Mark session as completed"""
        self.status = SessionStatus.COMPLETED
        self.actual_end = datetime.utcnow()