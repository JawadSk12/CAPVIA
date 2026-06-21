"""
Code Execution Model
Stores code execution history and results
"""

from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, Float, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import BaseModel


class ExecutionStatus(str, enum.Enum):
    """Code execution status"""
    SUCCESS = "success"
    COMPILATION_ERROR = "compilation_error"
    RUNTIME_ERROR = "runtime_error"
    TIMEOUT = "timeout"
    MEMORY_LIMIT = "memory_limit"


class CodeExecution(BaseModel):
    """
    Code Execution model
    Tracks every code execution attempt
    """
    __tablename__ = "code_executions"
    
    # References
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    
    # Code Details
    language = Column(String(20), nullable=False)
    code = Column(Text, nullable=False)
    input_data = Column(Text, nullable=True)
    
    # Execution Results
    status = Column(
        SQLEnum(ExecutionStatus),
        nullable=False,
        index=True
    )
    
    output = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Performance Metrics
    execution_time_ms = Column(Float, nullable=True)
    memory_used_mb = Column(Float, nullable=True)
    cpu_usage_percent = Column(Float, nullable=True)
    
    # Test Cases
    test_cases_results = Column(JSON, nullable=True)
    # [
    #     {"input": "...", "expected": "...", "actual": "...", "passed": true},
    #     ...
    # ]
    
    test_cases_passed = Column(Integer, default=0)
    test_cases_total = Column(Integer, default=0)
    
    # Environment Info
    container_id = Column(String(100), nullable=True)
    execution_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    submission = relationship("Submission", back_populates="code_executions")
    
    def __repr__(self):
        return f"<CodeExecution {self.id} - {self.language} - {self.status}>"
    
    @property
    def pass_rate(self) -> float:
        """Calculate pass rate percentage"""
        if self.test_cases_total == 0:
            return 0.0
        return (self.test_cases_passed / self.test_cases_total) * 100