"""
Evaluation Repository
Database operations for Evaluation model
"""

from typing import Optional, List
from sqlalchemy.orm import Session as DBSession
from app.models.evaluation import Evaluation
from app.repositories.base import BaseRepository
from app.schemas.evaluation import EvaluationCreate, EvaluationUpdate


class EvaluationRepository(BaseRepository[Evaluation, EvaluationCreate, EvaluationUpdate]):
    """
    Evaluation repository with custom methods
    """
    
    def get_by_session(self, db: DBSession, *, session_id: int) -> Optional[Evaluation]:
        """
        Get evaluation for a session
        
        Args:
            db: Database session
            session_id: Session ID
        
        Returns:
            Evaluation instance or None
        """
        return db.query(Evaluation).filter(
            Evaluation.session_id == session_id
        ).first()
    
    def get_by_submission(
        self,
        db: DBSession,
        *,
        submission_id: int
    ) -> Optional[Evaluation]:
        """
        Get evaluation for a submission
        
        Args:
            db: Database session
            submission_id: Submission ID
        
        Returns:
            Evaluation instance or None
        """
        return db.query(Evaluation).filter(
            Evaluation.submission_id == submission_id
        ).first()
    
    def get_high_risk_evaluations(
        self,
        db: DBSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Evaluation]:
        """
        Get evaluations with high cheating risk
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of evaluations
        """
        return db.query(Evaluation).filter(
            Evaluation.cheating_risk_level == "high"
        ).offset(skip).limit(limit).all()
    
    def get_passed_evaluations(
        self,
        db: DBSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Evaluation]:
        """
        Get passed evaluations
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of evaluations
        """
        return db.query(Evaluation).filter(
            Evaluation.passed == "true"
        ).offset(skip).limit(limit).all()
    
    def get_by_recommendation(
        self,
        db: DBSession,
        *,
        recommendation: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Evaluation]:
        """
        Get evaluations by recommendation
        
        Args:
            db: Database session
            recommendation: Recommendation type
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of evaluations
        """
        return db.query(Evaluation).filter(
            Evaluation.recommendation == recommendation
        ).offset(skip).limit(limit).all()


# Singleton instance
evaluation_repository = EvaluationRepository(Evaluation)