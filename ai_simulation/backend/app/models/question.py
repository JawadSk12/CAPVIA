"""
Question Model
Represents different types of questions in the simulation
"""

from sqlalchemy import Column, String, Text, Integer, JSON, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
import enum
from app.models.base import BaseModel


class QuestionType(str, enum.Enum):
    """Question type enumeration"""
    PROBLEM_UNDERSTANDING = "problem_understanding"  # Module 1
    CODING = "coding"  # Module 2
    IMPLEMENTATION = "implementation"  # Module 2
    DATA_HANDLING = "data_handling"  # Module 2
    DECISION_MAKING = "decision_making"  # Module 3
    EXPLANATION = "explanation"  # Module 4
    DEBUGGING = "debugging"  # Module 5 (Debugging)


class DifficultyLevel(str, enum.Enum):
    """Difficulty level enumeration"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ProgrammingLanguage(str, enum.Enum):
    """Supported programming languages"""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    JAVA = "java"


class Question(BaseModel):
    """
    Question model - stores all types of questions
    Flexible schema to support different question formats
    """
    __tablename__ = "questions"
    
    # Basic Information
    simulation_question_id = Column(String(100), nullable=True, index=True, unique=True)  # e.g. 'ml_r1_q1'
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    question_type = Column(
        SQLEnum(QuestionType),
        nullable=False,
        index=True
    )
    
    # Categorization
    difficulty = Column(
        SQLEnum(DifficultyLevel),
        default=DifficultyLevel.MEDIUM,
        nullable=False
    )
    module_number = Column(Integer, nullable=False, index=True)  # 1-5
    category = Column(String(100), nullable=True)  # e.g., "algorithms", "web_dev"
    tags = Column(JSON, default=list, nullable=True)  # ["arrays", "sorting"]
    
    # Question Content
    problem_statement = Column(Text, nullable=True)  # Detailed problem
    context = Column(Text, nullable=True)  # Background/scenario
    requirements = Column(JSON, nullable=True)  # List of requirements
    constraints = Column(JSON, nullable=True)  # Time/space constraints
    
    # For Coding Questions
    language = Column(
        SQLEnum(ProgrammingLanguage),
        nullable=True
    )
    starter_code = Column(Text, nullable=True)  # Template code
    test_cases = Column(JSON, nullable=True)  # Input/output test cases
    
    # For Debugging Questions
    buggy_code = Column(Text, nullable=True)  # Code with bugs
    expected_output = Column(Text, nullable=True)
    bug_description = Column(Text, nullable=True)
    
    # For Decision Making Questions
    options = Column(JSON, nullable=True)  # Multiple choice options
    correct_option = Column(String(10), nullable=True)  # Correct answer
    
    # For Explanation Questions
    scenario = Column(Text, nullable=True)  # Scenario to explain
    key_points = Column(JSON, nullable=True)  # Expected key points
    
    # Evaluation Criteria
    evaluation_criteria = Column(JSON, nullable=True)
    # {
    #     "keywords": ["array", "sort"],
    #     "must_include": ["time complexity"],
    #     "code_patterns": ["for loop", "comparison"]
    # }
    
    max_score = Column(Float, default=100.0, nullable=False)
    time_limit_seconds = Column(Integer, nullable=True)  # Per question time limit
    
    # Answer/Solution
    solution = Column(Text, nullable=True)  # Reference solution
    explanation = Column(Text, nullable=True)  # Explanation of solution
    hints = Column(JSON, nullable=True)  # Progressive hints
    
    # Metadata
    is_active = Column(String(10), default="true", nullable=False)
    usage_count = Column(Integer, default=0)  # How many times used
    average_score = Column(Float, nullable=True)  # Average candidate score
    
    # Relationships
    submissions = relationship(
        "Submission",
        back_populates="question",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Question {self.id}: {self.title} ({self.question_type})>"
    
    @property
    def is_coding_question(self) -> bool:
        """Check if this is a coding question"""
        return self.question_type in [
            QuestionType.CODING,
            QuestionType.IMPLEMENTATION,
            QuestionType.DEBUGGING
        ]
    
    @property
    def requires_code_execution(self) -> bool:
        """Check if this question requires code execution"""
        return self.is_coding_question and self.test_cases is not None