"""
Session Repository
Database operations for Session model
"""

from typing import Optional, List
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from app.models.session import Session, SessionStatus
from app.repositories.base import BaseRepository
from app.schemas.session import SessionCreate, SessionUpdate


class SessionRepository(BaseRepository[Session, SessionCreate, SessionUpdate]):
    """
    Session repository with custom methods
    """
    
    def get_by_token(self, db: DBSession, *, token: str) -> Optional[Session]:
        """
        Get session by token
        
        Args:
            db: Database session
            token: Session token
        
        Returns:
            Session instance or None
        """
        return db.query(Session).filter(Session.session_token == token).first()
    
    def get_by_access_code(self, db: DBSession, *, access_code: str) -> Optional[Session]:
        """
        Get session by access code
        
        Args:
            db: Database session
            access_code: Access code
        
        Returns:
            Session instance or None
        """
        return db.query(Session).filter(Session.access_code == access_code).first()
    
    def get_by_candidate(
        self,
        db: DBSession,
        *,
        candidate_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Session]:
        """
        Get all sessions for a candidate
        
        Args:
            db: Database session
            candidate_id: Candidate user ID
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of sessions
        """
        return db.query(Session).filter(
            Session.candidate_id == candidate_id
        ).order_by(Session.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_active_sessions(
        self,
        db: DBSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Session]:
        """
        Get all active sessions
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of active sessions
        """
        return db.query(Session).filter(
            Session.status == SessionStatus.IN_PROGRESS
        ).offset(skip).limit(limit).all()
    
    def get_completed_sessions(
        self,
        db: DBSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Session]:
        """
        Get all completed sessions
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of completed sessions
        """
        return db.query(Session).filter(
            Session.status == SessionStatus.COMPLETED
        ).offset(skip).limit(limit).all()
    
    def get_expired_sessions(self, db: DBSession) -> List[Session]:
        """
        Get all expired sessions that need to be marked as expired
        
        Args:
            db: Database session
        
        Returns:
            List of expired sessions
        """
        current_time = datetime.utcnow()
        
        return db.query(Session).filter(
            and_(
                Session.status == SessionStatus.IN_PROGRESS,
                Session.end_time < current_time
            )
        ).all()
    
    def mark_as_expired(self, db: DBSession, *, session: Session) -> Session:
        """
        Mark session as expired
        
        Args:
            db: Database session
            session: Session instance
        
        Returns:
            Updated session
        """
        session.status = SessionStatus.EXPIRED
        session.actual_end = datetime.utcnow()
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    def start_session(self, db: DBSession, *, session: Session) -> Session:
        """
        Start a session
        
        Args:
            db: Database session
            session: Session instance
        
        Returns:
            Updated session
        """
        session.start_session()
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    def complete_session(self, db: DBSession, *, session: Session) -> Session:
        """
        Mark session as completed
        
        Args:
            db: Database session
            session: Session instance
        
        Returns:
            Updated session
        """
        session.complete_session()
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    def update_current_question(
        self,
        db: DBSession,
        *,
        session: Session,
        question_index: int
    ) -> Session:
        """
        Update current question index
        
        Args:
            db: Database session
            session: Session instance
            question_index: New question index
        
        Returns:
            Updated session
        """
        session.current_question_index = question_index
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    def mark_question_completed(
        self,
        db: DBSession,
        *,
        session: Session,
        question_id: int
    ) -> Session:
        """
        Mark a question as completed
        
        Args:
            db: Database session
            session: Session instance
            question_id: Question ID
        
        Returns:
            Updated session
        """
        if question_id not in session.completed_questions:
            completed = session.completed_questions or []
            completed.append(question_id)
            session.completed_questions = completed
            db.add(session)
            db.commit()
            db.refresh(session)
        return session

session_repository = SessionRepository(Session)