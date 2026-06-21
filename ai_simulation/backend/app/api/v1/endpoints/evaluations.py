"""
Evaluation Endpoints
Handles evaluation and scoring
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.schemas.evaluation import EvaluationResponse, FinalReportResponse
from app.repositories.evaluation_repository import evaluation_repository
from app.repositories.session_repository import session_repository
from app.services.evaluation_orchestrator import evaluation_orchestrator
from loguru import logger


router = APIRouter()


@router.post("/session/{session_id}", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
def evaluate_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Trigger evaluation for a session (Admin only)
    
    Args:
        session_id: Session ID to evaluate
        background_tasks: Background task handler
        db: Database session
        current_user: Current admin user
    
    Returns:
        Evaluation result
    """
    # Check if session exists
    session = session_repository.get(db, id=session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if already evaluated
    existing_eval = evaluation_repository.get_by_session(db, session_id=session_id)
    
    if existing_eval:
        logger.info(f"Session {session_id} already evaluated, returning existing evaluation")
        return existing_eval
    
    # Trigger evaluation
    result = evaluation_orchestrator.evaluate_session(
        db,
        session_id=session_id,
        generate_report=True
    )
    
    # Get created evaluation
    evaluation = evaluation_repository.get(db, id=result["evaluation_id"])
    
    logger.info(f"Session {session_id} evaluated: {result['total_score']:.2f}")
    
    return evaluation


@router.get("/session/{session_id}", response_model=EvaluationResponse)
def get_session_evaluation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get evaluation for a session
    
    Args:
        session_id: Session ID
        db: Database session
        current_user: Current user
    
    Returns:
        Evaluation details
    """
    # Check permissions
    session = session_repository.get(db, id=session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not current_user.is_admin and session.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Get evaluation
    evaluation = evaluation_repository.get_by_session(db, session_id=session_id)
    
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found. Session may not be evaluated yet."
        )
    
    return evaluation


@router.get("/session/{session_id}/report", response_model=FinalReportResponse)
def get_evaluation_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get detailed evaluation report (Admin only)
    
    Args:
        session_id: Session ID
        db: Database session
        current_user: Current admin user
    
    Returns:
        Detailed evaluation report
    """
    from app.repositories.submission_repository import submission_repository
    from app.models.behavioral_event import BehavioralEvent
    
    # Get session
    session = session_repository.get(db, id=session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get evaluation
    evaluation = evaluation_repository.get_by_session(db, session_id=session_id)
    
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )
    
    # Get submissions
    submissions = submission_repository.get_by_session(db, session_id=session_id)
    
    # Get behavioral events
    behavioral_events = db.query(BehavioralEvent).filter(
        BehavioralEvent.session_id == session_id
    ).all()
    
    # Build report
    report = FinalReportResponse(
        session_id=session.id,
        candidate_name=session.candidate_name,
        candidate_email=session.candidate_email,
        test_name=session.test_name,
        
        total_score=float(session.total_score) if session.total_score else 0.0,
        percentage=(float(session.total_score) if session.total_score else 0.0),
        grade=evaluation.grade,
        
        module_scores=session.module_scores or {},
        
        accuracy_score=evaluation.accuracy_score or 0.0,
        logic_score=evaluation.logic_score or 0.0,
        speed_score=evaluation.speed_score or 0.0,
        explanation_score=evaluation.explanation_score or 0.0,
        behavior_score=evaluation.behavior_score or 0.0,
        
        cheating_risk_level=evaluation.cheating_risk_level or "unknown",
        has_suspicious_activity=session.has_suspicious_activity == "true",
        
        strengths=evaluation.strengths or [],
        weaknesses=evaluation.weaknesses or [],
        recommendation=evaluation.recommendation or "unknown",
        
        detailed_feedback=evaluation.recommendations or "No detailed feedback available",
        
        completed_at=session.actual_end or session.updated_at
    )
    
    return report


@router.get("/high-risk", response_model=List[EvaluationResponse])
def get_high_risk_evaluations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get evaluations with high cheating risk (Admin only)
    
    Args:
        skip: Number to skip
        limit: Maximum to return
        db: Database session
        current_user: Current admin user
    
    Returns:
        List of high-risk evaluations
    """
    evaluations = evaluation_repository.get_high_risk_evaluations(
        db,
        skip=skip,
        limit=limit
    )
    
    return evaluations


@router.get("/recommendation/{recommendation}", response_model=List[EvaluationResponse])
def get_evaluations_by_recommendation(
    recommendation: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get evaluations by hiring recommendation (Admin only)
    
    Args:
        recommendation: Recommendation type (strong_hire, hire, maybe, reject)
        skip: Number to skip
        limit: Maximum to return
        db: Database session
        current_user: Current admin user
    
    Returns:
        List of evaluations
    """
    evaluations = evaluation_repository.get_by_recommendation(
        db,
        recommendation=recommendation,
        skip=skip,
        limit=limit
    )
    
    return evaluations