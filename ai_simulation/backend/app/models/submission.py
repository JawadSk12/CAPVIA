"""
Submission Model
Stores candidate answers to questions
"""

from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import BaseModel


class Submission(BaseModel):
    """
    Submission model - stores candidate answers
    One submission per question per session
    """
    __tablename__ = "submissions"
    
    # References
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    
    # Submission Content
    answer_text = Column(Text, nullable=True)  # Text answers
    code_answer = Column(Text, nullable=True)  # Code submissions
    selected_option = Column(String(10), nullable=True)  # For multiple choice
    explanation = Column(Text, nullable=True)  # Candidate's explanation
    
    # Metadata
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    time_spent_seconds = Column(Integer, nullable=True)  # Time on this question
    attempt_count = Column(Integer, default=1)  # Number of submission attempts
    
    # Code Execution Results (if applicable)
    execution_results = Column(JSON, nullable=True)
    # {
    #     "test_cases_passed": 8,
    #     "test_cases_total": 10,
    #     "execution_time_ms": 150,
    #     "memory_used_mb": 25
    # }
    
    # Behavioral Data
    typing_pattern = Column(JSON, nullable=True)  # Typing speed over time
    paste_count = Column(Integer, default=0)
    copy_count = Column(Integer, default=0)
    tab_switches = Column(Integer, default=0)
    
    # Evaluation Results (populated after evaluation)
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    is_correct = Column(String(10), nullable=True)
    
    # AI Detection Results
    ai_detection_score = Column(Float, nullable=True)  # 0-1, higher = more likely AI
    similarity_score = Column(Float, nullable=True)  # Code similarity to known solutions
    
    # Flags
    is_flagged = Column(String(10), default="false")
    flag_reason = Column(Text, nullable=True)
    requires_manual_review = Column(String(10), default="false")
    
    # Relationships
    session = relationship("Session", back_populates="submissions")
    question = relationship("Question", back_populates="submissions")
    code_executions = relationship(
        "CodeExecution",
        back_populates="submission",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Submission {self.id} - Session:{self.session_id} Q:{self.question_id}>"
    
    @property
    def pass_rate(self) -> float:
        """Calculate test case pass rate"""
        if not self.execution_results:
            return 0.0
        
        passed = self.execution_results.get("test_cases_passed", 0)
        total = self.execution_results.get("test_cases_total", 0)
        
        if total == 0:
            return 0.0
        
        return (passed / total) * 100