"""
Question Schemas
Pydantic schemas for API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.question import QuestionType, DifficultyLevel, ProgrammingLanguage


class QuestionBase(BaseModel):
    """Base question schema"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str
    question_type: QuestionType
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    module_number: int = Field(..., ge=1, le=5)
    category: Optional[str] = None
    tags: Optional[List[str]] = []


class QuestionCreate(QuestionBase):
    """Schema for creating questions"""
    problem_statement: Optional[str] = None
    context: Optional[str] = None
    requirements: Optional[List[str]] = None
    constraints: Optional[List[str]] = None
    
    # Coding questions
    language: Optional[ProgrammingLanguage] = None
    starter_code: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    
    # Debugging questions
    buggy_code: Optional[str] = None
    expected_output: Optional[str] = None
    bug_description: Optional[str] = None
    
    # Decision making
    options: Optional[List[Dict[str, Any]]] = None
    correct_option: Optional[str] = None
    
    # Explanation
    scenario: Optional[str] = None
    key_points: Optional[List[str]] = None
    
    evaluation_criteria: Optional[Dict[str, Any]] = None
    max_score: float = 100.0
    time_limit_seconds: Optional[int] = None
    
    solution: Optional[str] = None
    explanation: Optional[str] = None
    hints: Optional[List[str]] = None


class QuestionUpdate(BaseModel):
    """Schema for updating questions"""
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    is_active: Optional[str] = None
    solution: Optional[str] = None
    explanation: Optional[str] = None


class QuestionResponse(QuestionBase):
    """Schema for question responses"""
    id: int
    problem_statement: Optional[str] = None
    context: Optional[str] = None
    requirements: Optional[List[str]] = None
    constraints: Optional[List[str]] = None
    
    language: Optional[ProgrammingLanguage] = None
    starter_code: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    
    buggy_code: Optional[str] = None
    expected_output: Optional[str] = None
    
    options: Optional[List[Dict[str, Any]]] = None
    
    scenario: Optional[str] = None
    key_points: Optional[List[str]] = None
    
    evaluation_criteria: Optional[Dict[str, Any]] = None
    max_score: float
    time_limit_seconds: Optional[int] = None
    hints: Optional[List[str]] = None
    
    is_active: str
    usage_count: int
    average_score: Optional[float] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class QuestionWithSolution(QuestionResponse):
    """Schema including solution (admin only)"""
    solution: Optional[str] = None
    explanation: Optional[str] = None
    bug_description: Optional[str] = None
    correct_option: Optional[str] = None


class QuestionListResponse(BaseModel):
    """Schema for paginated question list"""
    questions: List[QuestionResponse]
    total: int
    skip: int
    limit: int