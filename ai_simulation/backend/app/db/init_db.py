"""
Database Initialization
Creates initial data and admin user
"""

from sqlalchemy.orm import Session
from app.core.config import settings
from app.repositories.user_repository import user_repository
from app.schemas.user import UserCreate
from app.models.user import UserRole
from loguru import logger


def init_db(db: Session) -> None:
    """
    Initialize database with initial data
    
    Args:
        db: Database session
    """
    logger.info("Initializing database...")
    
    # Create super admin user if not exists
    admin_email = "admin@aisimulation.com"
    admin = user_repository.get_by_email(db, email=admin_email)
    
    if not admin:
        logger.info("Creating super admin user...")
        admin_user = UserCreate(
            email=admin_email,
            username="admin",
            full_name="System Administrator",
            password="admin123",  # Change this in production!
            role=UserRole.SUPER_ADMIN
        )
        admin = user_repository.create_user(db, obj_in=admin_user)
        logger.info(f"Super admin created: {admin.email}")
    else:
        logger.info("Super admin already exists")
    
    # Create demo candidate user
    candidate_email = "candidate@demo.com"
    candidate = user_repository.get_by_email(db, email=candidate_email)
    
    if not candidate:
        logger.info("Creating demo candidate user...")
        candidate_user = UserCreate(
            email=candidate_email,
            username="candidate_demo",
            full_name="Demo Candidate",
            password="demo1234",
            role=UserRole.CANDIDATE
        )
        candidate = user_repository.create_user(db, obj_in=candidate_user)
        logger.info(f"Demo candidate created: {candidate.email}")
    else:
        logger.info("Demo candidate already exists")
    
    logger.info("Database initialization complete")


def create_sample_questions(db: Session) -> None:
    """
    Create sample questions for testing
    
    Args:
        db: Database session
    """
    from app.services.task_generator import task_generator
    from app.models.question import QuestionType, DifficultyLevel, ProgrammingLanguage
    
    logger.info("Creating sample questions...")
    
    try:
        # Module 1: Problem Understanding
        task_generator.generate_custom_question(
            db,
            question_type=QuestionType.PROBLEM_UNDERSTANDING,
            role="Backend Developer",
            domain="E-commerce",
            difficulty=DifficultyLevel.MEDIUM
        )
        
        # Module 2: Coding
        task_generator.generate_custom_question(
            db,
            question_type=QuestionType.CODING,
            role="Backend Developer",
            domain="Algorithms",
            language=ProgrammingLanguage.PYTHON,
            difficulty=DifficultyLevel.EASY
        )
        
        # Module 3: Decision Making
        task_generator.generate_custom_question(
            db,
            question_type=QuestionType.DECISION_MAKING,
            role="Backend Developer",
            domain="System Design",
            difficulty=DifficultyLevel.MEDIUM
        )
        
        # Module 4: Explanation
        task_generator.generate_custom_question(
            db,
            question_type=QuestionType.EXPLANATION,
            role="Backend Developer",
            domain="Architecture",
            difficulty=DifficultyLevel.MEDIUM
        )
        
        # Module 5: Debugging
        task_generator.generate_custom_question(
            db,
            question_type=QuestionType.DEBUGGING,
            role="Backend Developer",
            domain="Debugging",
            language=ProgrammingLanguage.PYTHON,
            difficulty=DifficultyLevel.MEDIUM
        )
        
        logger.info("Sample questions created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create sample questions: {str(e)}")