"""
Updated Models __init__.py
Registers all models with SQLAlchemy
"""

from app.models.base import BaseModel
from app.models.user import User
from app.models.company import Company
from app.models.internship import Internship
from app.models.application import InternshipApplication
from app.models.simulation_blueprint import SimulationBlueprint
from app.models.simulation_attempt import SimulationAttempt
from app.models.behavior_log import CandidateBehaviorLog
# Legacy models (kept for backwards compatibility)
from app.models.session import Session
from app.models.question import Question
from app.models.submission import Submission
from app.models.evaluation import Evaluation
from app.models.behavioral_event import BehavioralEvent
from app.models.execution import CodeExecution
from app.models.score import Score

__all__ = [
    "BaseModel",
    "User",
    "Company",
    "Internship",
    "InternshipApplication",
    "SimulationBlueprint",
    "SimulationAttempt",
    "CandidateBehaviorLog",
    "Session",
    "Question",
    "Submission",
    "Evaluation",
    "BehavioralEvent",
    "CodeExecution",
    "Score",
]
