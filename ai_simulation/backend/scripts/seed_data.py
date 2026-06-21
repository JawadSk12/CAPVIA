#!/usr/bin/env python3
"""
Seed Data Script
Populates database with sample data for testing
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
import app.db.base  # Pre-loads all models to avoid Mapper relationship errors
from app.db.init_db import init_db, create_sample_questions
from app.services.task_generator import task_generator
from app.models.question import ProgrammingLanguage, DifficultyLevel
from loguru import logger


def seed_questions(db):
    """Create diverse sample questions"""
    logger.info("Creating sample questions...")
    
    roles = ["Backend Developer", "Frontend Developer", "Full Stack Developer", "Data Engineer"]
    domains = ["E-commerce", "FinTech", "Healthcare", "SaaS"]
    languages = [ProgrammingLanguage.PYTHON, ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.JAVA]
    
    question_count = 0
    
    for role in roles[:2]:  # Create for 2 roles
        for domain in domains[:2]:  # Create for 2 domains
            for language in languages[:2]:  # Create for 2 languages
                try:
                    # Generate complete test
                    question_ids = task_generator.generate_complete_test(
                        db,
                        role=role,
                        domain=domain,
                        language=language
                    )
                    question_count += len(question_ids)
                    logger.info(f"Created {len(question_ids)} questions for {role} - {domain} - {language.value}")
                except Exception as e:
                    logger.error(f"Failed to create questions: {str(e)}")
    
    logger.info(f"Total questions created: {question_count}")


def seed_test_sessions(db):
    """Create sample test sessions"""
    from app.models.session import Session, SessionStatus
    from app.core.security import generate_session_token, generate_test_access_code
    from app.repositories.question_repository import question_repository
    from datetime import datetime, timedelta
    
    logger.info("Creating sample test sessions...")
    
    # Get some questions
    questions = question_repository.get_multi(db, limit=10)
    if not questions:
        logger.warning("No questions available for sessions")
        return
    
    question_ids = [q.id for q in questions]
    
    # Create 3 sample sessions
    sessions_data = [
        {
            "candidate_email": "john.doe@example.com",
            "candidate_name": "John Doe",
            "test_name": "Backend Developer Assessment",
            "status": SessionStatus.COMPLETED
        },
        {
            "candidate_email": "jane.smith@example.com",
            "candidate_name": "Jane Smith",
            "test_name": "Full Stack Developer Assessment",
            "status": SessionStatus.IN_PROGRESS
        },
        {
            "candidate_email": "bob.wilson@example.com",
            "candidate_name": "Bob Wilson",
            "test_name": "Python Developer Assessment",
            "status": SessionStatus.CREATED
        }
    ]
    
    for session_data in sessions_data:
        session = Session(
            session_token=generate_session_token(),
            access_code=generate_test_access_code(),
            candidate_email=session_data["candidate_email"],
            candidate_name=session_data["candidate_name"],
            test_name=session_data["test_name"],
            role_being_tested="Backend Developer",
            duration_minutes=60,
            question_ids=question_ids,
            status=session_data["status"],
            module_status={},
            start_time=datetime.utcnow() - timedelta(hours=1) if session_data["status"] != SessionStatus.CREATED else None
        )
        
        db.add(session)
    
    db.commit()
    logger.info(f"Created {len(sessions_data)} sample sessions")


def main():
    """Main seeding function"""
    logger.info("=" * 60)
    logger.info("Starting database seeding...")
    logger.info("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Initialize basic data
        logger.info("Step 1: Initializing basic data...")
        init_db(db)
        
        # Create sample questions
        logger.info("Step 2: Creating sample questions...")
        create_sample_questions(db)
        
        # Seed more questions
        logger.info("Step 3: Seeding additional questions...")
        seed_questions(db)
        
        # Seed test sessions
        logger.info("Step 4: Creating sample sessions...")
        seed_test_sessions(db)
        
        logger.info("=" * 60)
        logger.info("Database seeding completed successfully!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Seeding failed: {str(e)}", exc_info=True)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()