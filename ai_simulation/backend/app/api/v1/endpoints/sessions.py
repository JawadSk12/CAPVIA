"""
Session Endpoints
Manages test sessions
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin_user, get_optional_user
from app.models.user import User
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionDetailResponse,
    SessionStartRequest,
    SessionStartResponse,
    SessionListResponse
)
from app.repositories.session_repository import session_repository
from app.repositories.question_repository import question_repository
from app.services.task_generator import task_generator
from app.core.security import generate_session_token, generate_test_access_code
from app.models.session import SessionStatus
from loguru import logger


router = APIRouter()


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create new test session (Admin only)
    
    Args:
        session_in: Session creation data
        db: Database session
        current_user: Current admin user
    
    Returns:
        Created session
    """
    from app.models.session import Session as SessionModel
    
    # Generate session token and access code
    session_token = generate_session_token()
    access_code = generate_test_access_code()
    
    # Create session
    session = SessionModel(
        session_token=session_token,
        access_code=access_code,
        candidate_email=session_in.candidate_email,
        candidate_name=session_in.candidate_name,
        test_name=session_in.test_name,
        test_description=session_in.test_description,
        role_being_tested=session_in.role_being_tested,
        duration_minutes=session_in.duration_minutes,
        question_ids=session_in.question_ids,
        scheduled_start=session_in.scheduled_start,
        is_proctored=session_in.is_proctored,
        allow_code_execution=session_in.allow_code_execution,
        status=SessionStatus.CREATED,
        created_by=current_user.id,
        module_status={}
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    logger.info(f"Session created: {session.id} for {session.candidate_email}")
    
    return session


@router.post("/start", response_model=SessionDetailResponse)
def start_session(
    request: SessionStartRequest,
    db: Session = Depends(get_db)
):
    """
    Start a test session using access code
    
    Args:
        request: Start session request with access code
        db: Database session
    
    Returns:
        Session details and first question
    """
    # Get session by access code
    session = session_repository.get_by_access_code(
        db,
        access_code=request.access_code
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid access code"
        )
    
    # Check session status
    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already completed"
        )
    
    if session.status == SessionStatus.EXPIRED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has expired"
        )
    
    # Start session
    if session.status == SessionStatus.CREATED:
        session_repository.start_session(db, session=session)
    
    # Get all questions
    questions = []
    for q_id in session.question_ids:
        question = question_repository.get(db, id=q_id)
        if question:
            questions.append(question)
    
    logger.info(f"Session started: {session.id}")
    
    from fastapi.encoders import jsonable_encoder
    response_data = jsonable_encoder(session)
    response_data["questions"] = [jsonable_encoder(q) for q in questions]
    response_data["time_remaining_seconds"] = session.time_remaining_seconds
    
    return response_data


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get session details
    
    Args:
        session_id: Session ID
        db: Database session
        current_user: Current user
    
    Returns:
        Session details
    """
    session = session_repository.get(db, id=session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check permissions
    if not current_user.is_admin and session.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    # Get questions
    questions = []
    for q_id in session.question_ids:
        question = question_repository.get(db, id=q_id)
        if question:
            questions.append(question)
    
    response = SessionDetailResponse(**session.dict())
    response.questions = questions
    response.time_remaining_seconds = session.time_remaining_seconds
    
    return response


@router.get("/", response_model=SessionListResponse)
def list_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    List all sessions (Admin only)
    
    Args:
        skip: Number to skip
        limit: Maximum to return
        db: Database session
        current_user: Current admin user
    
    Returns:
        List of sessions
    """
    sessions = session_repository.get_multi(
        db,
        skip=skip,
        limit=limit,
        order_by="created_at",
        order_dir="desc"
    )
    
    total = session_repository.count(db)
    
    return {
        "sessions": sessions,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/{session_id}/complete", response_model=SessionResponse)
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark session as completed
    
    Args:
        session_id: Session ID
        db: Database session
        current_user: Current user
    
    Returns:
        Updated session
    """
    session = session_repository.get(db, id=session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check permissions
    if not current_user.is_admin and session.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Complete session
    session = session_repository.complete_session(db, session=session)
    
    logger.info(f"Session completed: {session.id}")
    
    return session


@router.get("/candidate/my-sessions", response_model=SessionListResponse)
def get_my_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's sessions
    
    Args:
        skip: Number to skip
        limit: Maximum to return
        db: Database session
        current_user: Current user
    
    Returns:
        User's sessions
    """
    sessions = session_repository.get_by_candidate(
        db,
        candidate_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    total = session_repository.count(db, candidate_id=current_user.id)
    
    return {
        "sessions": sessions,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/generate", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def generate_test_session(
    candidate_email: str,
    candidate_name: str,
    role: str,
    domain: str = "general",
    language: str = "python",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Auto-generate test session with AI-generated questions
    
    Args:
        candidate_email: Candidate email
        candidate_name: Candidate name
        role: Job role
        domain: Domain/industry
        language: Programming language
        db: Database session
        current_user: Current admin user
    
    Returns:
        Created session with generated questions
    """
    from app.models.question import ProgrammingLanguage
    from app.models.session import Session as SessionModel
    
    # Generate questions
    lang_enum = ProgrammingLanguage(language.lower())
    question_ids = task_generator.generate_complete_test(
        db,
        role=role,
        domain=domain,
        language=lang_enum
    )
    
    # Create or get candidate user if not authenticated
    from app.repositories.user_repository import user_repository
    from app.schemas.user import UserCreate
    from app.models.user import UserRole
    
    candidate_user = None
    if current_user:
        candidate_user = current_user
    else:
        candidate_user = user_repository.get_by_email(db, email=candidate_email)
        if not candidate_user:
            new_user = UserCreate(
                email=candidate_email,
                username=candidate_email.split('@')[0],
                full_name=candidate_name,
                password="auto_generated_123!", # Should be random in production
                role=UserRole.CANDIDATE
            )
            candidate_user = user_repository.create_user(db, obj_in=new_user)
            
    session_token = generate_session_token()
    access_code = generate_test_access_code()
    
    session = SessionModel(
        session_token=session_token,
        access_code=access_code,
        candidate_id=candidate_user.id,
        candidate_email=candidate_email,
        candidate_name=candidate_name,
        test_name=f"{role} Assessment",
        test_description=f"AI-generated assessment for {role} position",
        role_being_tested=role,
        duration_minutes=60,
        question_ids=question_ids,
        status=SessionStatus.CREATED,
        created_by=current_user.id if current_user else candidate_user.id,
        module_status={}
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    logger.info(f"Auto-generated session: {session.id} with {len(question_ids)} questions")
    
    return session