"""
Database Base Configuration
Imports all models to ensure they are registered with SQLAlchemy
"""

from app.db.session import Base

# Import all models here so Alembic can detect them
from app.models.user import User
from app.models.session import Session
from app.models.question import Question
from app.models.submission import Submission
from app.models.evaluation import Evaluation
from app.models.score import Score
from app.models.behavioral_event import BehavioralEvent
from app.models.execution import CodeExecution

# This allows Alembic to auto-generate migrations
__all__ = [
    "Base",
    "User",
    "Session",
    "Question",
    "Submission",
    "Evaluation",
    "Score",
    "BehavioralEvent",
    "CodeExecution",
]