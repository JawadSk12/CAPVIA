"""
Evaluation Model
Stores evaluation results for each submission
"""

from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Evaluation(BaseModel):
    """
    Evaluation model
    Stores detailed evaluation results
    """
    __tablename__ = "evaluations"
    
    # References
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True, index=True)
    
    # Score Components
    accuracy_score = Column(Float, nullable=True)  # Correctness
    logic_score = Column(Float, nullable=True)  # Approach quality
    speed_score = Column(Float, nullable=True)  # Time efficiency
    explanation_score = Column(Float, nullable=True)  # Clarity of explanation
    behavior_score = Column(Float, nullable=True)  # Anti-cheating score
    
    # Total Score
    total_score = Column(Float, nullable=True)
    max_possible_score = Column(Float, default=100.0)
    
    # Detailed Analysis
    keyword_matches = Column(JSON, nullable=True)  # Keywords found in answer
    semantic_score = Column(Float, nullable=True)  # Semantic similarity score
    code_quality_metrics = Column(JSON, nullable=True)
    # {
    #     "complexity": "O(n)",
    #     "code_style": 85,
    #     "best_practices": 90
    # }
    
    # AI Detection
    ai_probability = Column(Float, nullable=True)  # 0-1
    ai_detection_reasons = Column(JSON, nullable=True)
    # ["Overly perfect grammar", "Unusual word choices"]
    
    # Similarity Analysis
    plagiarism_score = Column(Float, nullable=True)
    similar_solutions_found = Column(JSON, nullable=True)
    
    # Behavior Analysis
    suspicious_events = Column(JSON, nullable=True)
    # [
    #     {"type": "tab_switch", "count": 5, "severity": "high"},
    #     ...
    # ]
    
    cheating_indicators = Column(JSON, nullable=True)
    cheating_risk_level = Column(String(20), nullable=True)  # low, medium, high
    
    # Feedback
    strengths = Column(JSON, nullable=True)  # List of strengths
    weaknesses = Column(JSON, nullable=True)  # List of weaknesses
    recommendations = Column(Text, nullable=True)
    
    # Final Assessment
    passed = Column(String(10), nullable=True)
    grade = Column(String(5), nullable=True)  # A, B, C, D, F
    recommendation = Column(String(50), nullable=True)  # strong_hire, hire, maybe, reject
    
    # Evaluator Information
    evaluated_by = Column(String(50), default="AI")  # AI or manual reviewer
    evaluation_method = Column(String(50), nullable=True)
    
    # Relationships
    session = relationship("Session", back_populates="evaluations")
    
    def __repr__(self):
        return f"<Evaluation {self.id} - Session:{self.session_id} Score:{self.total_score}>"