"""
Question Endpoints
Manages questions and question generation
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionWithSolution,
    QuestionListResponse
)
from app.repositories.question_repository import question_repository
from app.services.task_generator import task_generator
from app.models.question import QuestionType, DifficultyLevel, ProgrammingLanguage
from loguru import logger


router = APIRouter()


@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create new question (Admin only)
    
    Args:
        question_in: Question data
        db: Database session
        current_user: Current admin user
    
    Returns:
        Created question
    """
    question = question_repository.create(db, obj_in=question_in)
    
    logger.info(f"Question created: {question.id} - {question.title}")
    
    return question


@router.get("/", response_model=QuestionListResponse)
def list_questions(
    skip: int = 0,
    limit: int = 100,
    question_type: Optional[QuestionType] = None,
    difficulty: Optional[DifficultyLevel] = None,
    module_number: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    List questions with filters (Admin only)
    
    Args:
        skip: Number to skip
        limit: Maximum to return
        question_type: Filter by question type
        difficulty: Filter by difficulty
        module_number: Filter by module
        db: Database session
        current_user: Current admin user
    
    Returns:
        List of questions
    """
    if question_type:
        questions = question_repository.get_by_type(
            db,
            question_type=question_type,
            skip=skip,
            limit=limit
        )
    elif module_number:
        questions = question_repository.get_by_module(
            db,
            module_number=module_number,
            skip=skip,
            limit=limit
        )
    elif difficulty:
        questions = question_repository.get_by_difficulty(
            db,
            difficulty=difficulty,
            skip=skip,
            limit=limit
        )
    else:
        questions = question_repository.get_multi(
            db,
            skip=skip,
            limit=limit
        )
    
    total = question_repository.count(db)
    
    return {
        "questions": questions,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get question by ID (without solution for candidates)
    
    Args:
        question_id: Question ID
        db: Database session
        current_user: Current user
    
    Returns:
        Question details
    """
    question = question_repository.get(db, id=question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    return question


@router.get("/{question_id}/solution", response_model=QuestionWithSolution)
def get_question_with_solution(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get question with solution (Admin only)
    
    Args:
        question_id: Question ID
        db: Database session
        current_user: Current admin user
    
    Returns:
        Question with solution
    """
    question = question_repository.get(db, id=question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    return question


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    question_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Update question (Admin only)
    
    Args:
        question_id: Question ID
        question_in: Update data
        db: Database session
        current_user: Current admin user
    
    Returns:
        Updated question
    """
    question = question_repository.get(db, id=question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    question = question_repository.update(
        db,
        db_obj=question,
        obj_in=question_in
    )
    
    logger.info(f"Question updated: {question.id}")
    
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete question (Admin only)
    
    Args:
        question_id: Question ID
        db: Database session
        current_user: Current admin user
    """
    question = question_repository.get(db, id=question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    question_repository.delete(db, id=question_id)
    
    logger.info(f"Question deleted: {question_id}")


@router.post("/generate", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def generate_question(
    question_type: QuestionType,
    role: str,
    domain: str = "general",
    language: Optional[ProgrammingLanguage] = None,
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Generate question using AI (Admin only)
    
    Args:
        question_type: Type of question to generate
        role: Job role
        domain: Domain/industry
        language: Programming language (for coding questions)
        difficulty: Difficulty level
        db: Database session
        current_user: Current admin user
    
    Returns:
        Generated question
    """
    question = task_generator.generate_custom_question(
        db,
        question_type=question_type,
        role=role,
        domain=domain,
        language=language,
        difficulty=difficulty
    )
    
    logger.info(f"AI-generated question: {question.id}")
    
    return question


@router.post("/{question_id}/activate", response_model=QuestionResponse)
def activate_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Activate question (Admin only)
    
    Args:
        question_id: Question ID
        db: Database session
        current_user: Current admin user
    
    Returns:
        Activated question
    """
    question = question_repository.get(db, id=question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    question = question_repository.activate(db, question=question)
    
    logger.info(f"Question activated: {question.id}")
    
    return question


@router.post("/{question_id}/deactivate", response_model=QuestionResponse)
def deactivate_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Deactivate question (Admin only)
    
    Args:
        question_id: Question ID
        db: Database session
        current_user: Current admin user
    
    Returns:
        Deactivated question
    """
    question = question_repository.get(db, id=question_id)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    question = question_repository.deactivate(db, question=question)
    
    logger.info(f"Question deactivated: {question.id}")
    
    return question