"""
Score Model
Aggregate scoring for sessions (deprecated in favor of Evaluation)
Kept for backward compatibility
"""

from sqlalchemy import Column, Integer, ForeignKey, Float, JSON
from app.models.base import BaseModel


class Score(BaseModel):
    """
    Score model - aggregate scores
    """
    __tablename__ = "scores"
    
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, unique=True, index=True)
    
    # Module Scores
    module_1_score = Column(Float, nullable=True)
    module_2_score = Column(Float, nullable=True)
    module_3_score = Column(Float, nullable=True)
    module_4_score = Column(Float, nullable=True)
    module_5_score = Column(Float, nullable=True)
    
    # Weighted Scores
    accuracy_score = Column(Float, nullable=True)
    logic_score = Column(Float, nullable=True)
    speed_score = Column(Float, nullable=True)
    explanation_score = Column(Float, nullable=True)
    behavior_score = Column(Float, nullable=True)
    
    # Final Score
    total_score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    
    # Additional Metrics
    metrics = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<Score Session:{self.session_id} Total:{self.total_score}>"