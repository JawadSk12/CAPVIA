"""
Question Repository
Database operations for Question model
"""

from typing import Optional, List
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import and_
from app.models.question import Question, QuestionType, DifficultyLevel, ProgrammingLanguage
from app.repositories.base import BaseRepository
from app.schemas.question import QuestionCreate, QuestionUpdate
import random


class QuestionRepository(BaseRepository[Question, QuestionCreate, QuestionUpdate]):
    """
    Question repository with custom methods
    """
    
    def get_by_type(
        self,
        db: DBSession,
        *,
        question_type: QuestionType,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Get questions by type
        
        Args:
            db: Database session
            question_type: Type of question
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of questions
        """
        return db.query(Question).filter(
            and_(
                Question.question_type == question_type,
                Question.is_active == "true"
            )
        ).offset(skip).limit(limit).all()
    
    def get_by_module(
        self,
        db: DBSession,
        *,
        module_number: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Get questions by module number
        
        Args:
            db: Database session
            module_number: Module number (1-5)
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of questions
        """
        return db.query(Question).filter(
            and_(
                Question.module_number == module_number,
                Question.is_active == "true"
            )
        ).offset(skip).limit(limit).all()
    
    def get_by_difficulty(
        self,
        db: DBSession,
        *,
        difficulty: DifficultyLevel,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Get questions by difficulty
        
        Args:
            db: Database session
            difficulty: Difficulty level
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of questions
        """
        return db.query(Question).filter(
            and_(
                Question.difficulty == difficulty,
                Question.is_active == "true"
            )
        ).offset(skip).limit(limit).all()
    
    def get_by_language(
        self,
        db: DBSession,
        *,
        language: ProgrammingLanguage,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Get coding questions by language
        
        Args:
            db: Database session
            language: Programming language
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of questions
        """
        return db.query(Question).filter(
            and_(
                Question.language == language,
                Question.is_active == "true"
            )
        ).offset(skip).limit(limit).all()
    
    def get_random_by_criteria(
        self,
        db: DBSession,
        *,
        question_type: Optional[QuestionType] = None,
        module_number: Optional[int] = None,
        difficulty: Optional[DifficultyLevel] = None,
        language: Optional[ProgrammingLanguage] = None,
        count: int = 1
    ) -> List[Question]:
        """
        Get random questions matching criteria
        
        Args:
            db: Database session
            question_type: Question type filter
            module_number: Module filter
            difficulty: Difficulty filter
            language: Language filter
            count: Number of questions to return
        
        Returns:
            List of random questions
        """
        query = db.query(Question).filter(Question.is_active == "true")
        
        if question_type:
            query = query.filter(Question.question_type == question_type)
        if module_number:
            query = query.filter(Question.module_number == module_number)
        if difficulty:
            query = query.filter(Question.difficulty == difficulty)
        if language:
            query = query.filter(Question.language == language)
        
        all_questions = query.all()
        
        if len(all_questions) <= count:
            return all_questions
        
        return random.sample(all_questions, count)
    
    def increment_usage(self, db: DBSession, *, question: Question) -> Question:
        """
        Increment question usage count
        
        Args:
            db: Database session
            question: Question instance
        
        Returns:
            Updated question
        """
        question.usage_count += 1
        db.add(question)
        db.commit()
        db.refresh(question)
        return question
    
    def update_average_score(
        self,
        db: DBSession,
        *,
        question: Question,
        new_score: float
    ) -> Question:
        """
        Update average score for question
        
        Args:
            db: Database session
            question: Question instance
            new_score: New score to incorporate
        
        Returns:
            Updated question
        """
        if question.average_score is None:
            question.average_score = new_score
        else:
            # Running average calculation
            total_scores = question.average_score * question.usage_count
            question.average_score = (total_scores + new_score) / (question.usage_count + 1)
        
        db.add(question)
        db.commit()
        db.refresh(question)
        return question
    
    def deactivate(self, db: DBSession, *, question: Question) -> Question:
        """
        Deactivate a question
        
        Args:
            db: Database session
            question: Question instance
        
        Returns:
            Updated question
        """
        question.is_active = "false"
        db.add(question)
        db.commit()
        db.refresh(question)
        return question
    
    def activate(self, db: DBSession, *, question: Question) -> Question:
        """
        Activate a question
        
        Args:
            db: Database session
            question: Question instance
        
        Returns:
            Updated question
        """
        question.is_active = "true"
        db.add(question)
        db.commit()
        db.refresh(question)
        return question
    
    def search_by_tags(
        self,
        db: DBSession,
        *,
        tags: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Search questions by tags
        
        Args:
            db: Database session
            tags: List of tags to search for
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of questions containing any of the tags
        """
        # This requires PostgreSQL JSONB operations
        # For SQLite, we'll do a simple check
        questions = db.query(Question).filter(
            Question.is_active == "true"
        ).all()
        
        matching_questions = []
        for question in questions:
            if question.tags:
                question_tags = set(question.tags)
                search_tags = set(tags)
                if question_tags & search_tags:  # Intersection
                    matching_questions.append(question)
        
        return matching_questions[skip:skip+limit]


# Singleton instance
question_repository = QuestionRepository(Question)