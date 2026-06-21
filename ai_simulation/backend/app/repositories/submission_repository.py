"""
Submission Repository
Database operations for Submission model
"""

from typing import Optional, List
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import and_, desc
from app.models.submission import Submission
from app.repositories.base import BaseRepository
from app.schemas.submission import SubmissionCreate, SubmissionUpdate


class SubmissionRepository(BaseRepository[Submission, SubmissionCreate, SubmissionUpdate]):
    """
    Submission repository with custom methods
    """
    
    def get_by_session(
        self,
        db: DBSession,
        *,
        session_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Submission]:
        """
        Get all submissions for a session
        
        Args:
            db: Database session
            session_id: Session ID
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of submissions
        """
        return db.query(Submission).filter(
            Submission.session_id == session_id
        ).order_by(desc(Submission.submitted_at)).offset(skip).limit(limit).all()
    
    def get_by_question(
        self,
        db: DBSession,
        *,
        question_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Submission]:
        """
        Get all submissions for a question
        
        Args:
            db: Database session
            question_id: Question ID
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of submissions
        """
        return db.query(Submission).filter(
            Submission.question_id == question_id
        ).offset(skip).limit(limit).all()
    
    def get_by_session_and_question(
        self,
        db: DBSession,
        *,
        session_id: int,
        question_id: int
    ) -> Optional[Submission]:
        """
        Get specific submission for session and question
        
        Args:
            db: Database session
            session_id: Session ID
            question_id: Question ID
        
        Returns:
            Submission instance or None
        """
        return db.query(Submission).filter(
            and_(
                Submission.session_id == session_id,
                Submission.question_id == question_id
            )
        ).first()
    
    def get_flagged_submissions(
        self,
        db: DBSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Submission]:
        """
        Get all flagged submissions
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of flagged submissions
        """
        return db.query(Submission).filter(
            Submission.is_flagged == "true"
        ).offset(skip).limit(limit).all()
    
    def get_for_manual_review(
        self,
        db: DBSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Submission]:
        """
        Get submissions requiring manual review
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of submissions
        """
        return db.query(Submission).filter(
            Submission.requires_manual_review == "true"
        ).offset(skip).limit(limit).all()
    
    def flag_submission(
        self,
        db: DBSession,
        *,
        submission: Submission,
        reason: str
    ) -> Submission:
        """
        Flag a submission
        
        Args:
            db: Database session
            submission: Submission instance
            reason: Reason for flagging
        
        Returns:
            Updated submission
        """
        submission.is_flagged = "true"
        submission.flag_reason = reason
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission
    
    def mark_for_review(
        self,
        db: DBSession,
        *,
        submission: Submission
    ) -> Submission:
        """
        Mark submission for manual review
        
        Args:
            db: Database session
            submission: Submission instance
        
        Returns:
            Updated submission
        """
        submission.requires_manual_review = "true"
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission
    
    def update_score(
        self,
        db: DBSession,
        *,
        submission: Submission,
        score: float,
        max_score: float
    ) -> Submission:
        """
        Update submission score
        
        Args:
            db: Database session
            submission: Submission instance
            score: Score achieved
            max_score: Maximum possible score
        
        Returns:
            Updated submission
        """
        submission.score = score
        submission.max_score = max_score
        submission.is_correct = "true" if score >= (max_score * 0.7) else "false"
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission
    
    def get_high_similarity_submissions(
        self,
        db: DBSession,
        *,
        threshold: float = 0.85,
        skip: int = 0,
        limit: int = 100
    ) -> List[Submission]:
        """
        Get submissions with high similarity scores
        
        Args:
            db: Database session
            threshold: Similarity threshold
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of submissions
        """
        return db.query(Submission).filter(
            Submission.similarity_score >= threshold
        ).offset(skip).limit(limit).all()


# Singleton instance
submission_repository = SubmissionRepository(Submission)