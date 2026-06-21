"""
Submission Endpoints
Handles answer submissions
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    BehaviorEventCreate,
    CodeExecutionRequest,
    CodeExecutionResponse
)
from app.repositories.submission_repository import submission_repository
from app.repositories.session_repository import session_repository
from app.repositories.question_repository import question_repository
from app.models.submission import Submission
from app.models.behavioral_event import BehavioralEvent
from app.services.code_executor import code_executor
from app.services.evaluation_orchestrator import evaluation_orchestrator
from loguru import logger


router = APIRouter()


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
def create_submission(
    submission_in: SubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit answer to a question
    
    Args:
        submission_in: Submission data
        background_tasks: Background task handler
        db: Database session
        current_user: Current user
    
    Returns:
        Created submission
    """
    # Get session
    session = session_repository.get(db, id=submission_in.session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if session belongs to user
    if session.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Check if session is active
    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active"
        )
    
    # Check if already submitted
    existing = submission_repository.get_by_session_and_question(
        db,
        session_id=submission_in.session_id,
        question_id=submission_in.question_id
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question already answered"
        )
    
    # Get question
    question = question_repository.get(db, id=submission_in.question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Create submission
    submission = Submission(
        session_id=submission_in.session_id,
        question_id=submission_in.question_id,
        answer_text=submission_in.answer_text,
        code_answer=submission_in.code_answer,
        selected_option=submission_in.selected_option,
        explanation=submission_in.explanation,
        time_spent_seconds=submission_in.time_spent_seconds
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # Mark question as completed in session
    session_repository.mark_question_completed(
        db,
        session=session,
        question_id=submission_in.question_id
    )
    
    # Schedule evaluation in background
    background_tasks.add_task(
        evaluation_orchestrator.evaluate_submission,
        db,
        submission.id
    )
    
    logger.info(f"Submission created: {submission.id} for question {question.id}")
    
    return submission


@router.post("/execute-code", response_model=CodeExecutionResponse)
def execute_code(
    request: CodeExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute code and return results
    
    Args:
        request: Code execution request
        db: Database session
        current_user: Current user
    
    Returns:
        Execution results
    """
    # Execute code
    result = code_executor.execute_code(
        db,
        code=request.code,
        language=request.language,
        test_cases=request.test_cases,
        input_data=request.input_data
    )
    
    logger.info(f"Code executed for user {current_user.id}: {result.get('status')}")
    
    return result


@router.post("/behavior-event", status_code=status.HTTP_201_CREATED)
def log_behavior_event(
    event: BehaviorEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log behavioral event
    
    Args:
        event: Behavioral event data
        db: Database session
        current_user: Current user
    
    Returns:
        Success message
    """
    # Create behavioral event
    behavioral_event = BehavioralEvent(
        session_id=event.session_id,
        question_id=event.question_id,
        event_type=event.event_type,
        event_data=event.event_data,
        severity=event.severity,
        description=event.description
    )
    
    db.add(behavioral_event)
    db.commit()
    
    # Flag session if high severity
    if event.severity == "high":
        session = session_repository.get(db, id=event.session_id)
        if session:
            session_repository.flag_suspicious_activity(db, session=session)
    
    return {"status": "logged"}


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get submission by ID
    
    Args:
        submission_id: Submission ID
        db: Database session
        current_user: Current user
    
    Returns:
        Submission details
    """
    submission = submission_repository.get(db, id=submission_id)
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    session = session_repository.get(db, id=submission.session_id)
    if not current_user.is_admin and session.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    return submission


@router.get("/session/{session_id}", response_model=List[SubmissionResponse])
def get_session_submissions(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all submissions for a session
    
    Args:
        session_id: Session ID
        db: Database session
        current_user: Current user
    
    Returns:
        List of submissions
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
    
    # Get submissions
    submissions = submission_repository.get_by_session(
        db,
        session_id=session_id
    )
    
    return submissions