"""
Task Generator Service
Orchestrates question generation for complete test sessions
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from loguru import logger
from app.core.config import settings
from app.models.question import Question, QuestionType, DifficultyLevel, ProgrammingLanguage
from app.repositories.question_repository import question_repository
from app.ai.generators.question_generator import question_generator
from app.ai.generators.code_generator import code_generator
from app.ai.generators.bug_injector import bug_injector
import random


class TaskGeneratorService:
    """
    Generates complete test sessions with all modules
    Ensures balanced difficulty and diversity
    """
    
    def __init__(self):
        """Initialize service"""
        self.question_gen = question_generator
        self.code_gen = code_generator
        self.bug_inject = bug_injector
    
    def generate_complete_test(
        self,
        db: Session,
        role: str,
        domain: str,
        language: ProgrammingLanguage,
        difficulty_distribution: Optional[Dict[str, int]] = None
    ) -> List[int]:
        """
        Generate a complete test with all 5 modules
        
        Args:
            db: Database session
            role: Job role (e.g., "Backend Developer")
            domain: Domain (e.g., "E-commerce")
            language: Programming language
            difficulty_distribution: Dict with difficulty counts
                Example: {"easy": 2, "medium": 5, "hard": 3}
        
        Returns:
            List of question IDs for the test
        """
        logger.info(f"Generating complete test for {role} in {domain}")
        
        if difficulty_distribution is None:
            difficulty_distribution = {
                "easy": 2,
                "medium": 6,
                "hard": 2
            }
        
        question_ids = []
        
        # Module 1: Problem Understanding (2 questions)
        module_1_ids = self._generate_module_1_questions(
            db, role, domain, count=2
        )
        question_ids.extend(module_1_ids)
        
        # Module 2: Coding/Implementation (3 questions)
        module_2_ids = self._generate_module_2_questions(
            db, role, language, count=3
        )
        question_ids.extend(module_2_ids)
        
        # Module 3: Decision Making (2 questions)
        module_3_ids = self._generate_module_3_questions(
            db, role, domain, count=2
        )
        question_ids.extend(module_3_ids)
        
        # Module 4: Explanation (2 questions)
        module_4_ids = self._generate_module_4_questions(
            db, role, domain, count=2
        )
        question_ids.extend(module_4_ids)
        
        # Module 5: Debugging (1 question)
        module_5_ids = self._generate_module_5_questions(
            db, role, language, count=1
        )
        question_ids.extend(module_5_ids)
        
        logger.info(f"Generated test with {len(question_ids)} questions")
        return question_ids
    
    def _generate_module_1_questions(
        self,
        db: Session,
        role: str,
        domain: str,
        count: int = 2
    ) -> List[int]:
        """Generate Module 1 questions"""
        question_ids = []
        
        difficulties = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM]
        
        for i in range(count):
            difficulty = difficulties[i % len(difficulties)]
            
            # Check if we have existing questions
            existing = question_repository.get_random_by_criteria(
                db,
                question_type=QuestionType.PROBLEM_UNDERSTANDING,
                difficulty=difficulty,
                count=1
            )
            
            if existing:
                question_ids.append(existing[0].id)
                logger.info(f"Using existing Module 1 question: {existing[0].id}")
            else:
                # Generate new question
                question_data = self.question_gen.generate_module_1_question(
                    role=role,
                    domain=domain,
                    difficulty=difficulty
                )
                
                # Save to database
                question = self._save_question(db, question_data)
                question_ids.append(question.id)
                logger.info(f"Created new Module 1 question: {question.id}")
        
        return question_ids
    
    def _generate_module_2_questions(
        self,
        db: Session,
        role: str,
        language: ProgrammingLanguage,
        count: int = 3
    ) -> List[int]:
        """Generate Module 2 coding questions"""
        question_ids = []
        
        difficulties = [
            DifficultyLevel.EASY,
            DifficultyLevel.MEDIUM,
            DifficultyLevel.HARD
        ]
        
        for i in range(count):
            difficulty = difficulties[i % len(difficulties)]
            
            # Check for existing
            existing = question_repository.get_random_by_criteria(
                db,
                question_type=QuestionType.CODING,
                language=language,
                difficulty=difficulty,
                count=1
            )
            
            if existing:
                question_ids.append(existing[0].id)
                logger.info(f"Using existing Module 2 question: {existing[0].id}")
            else:
                # Generate new
                question_data = self.question_gen.generate_module_2_coding_question(
                    role=role,
                    language=language,
                    difficulty=difficulty
                )
                
                question = self._save_question(db, question_data)
                question_ids.append(question.id)
                logger.info(f"Created new Module 2 question: {question.id}")
        
        return question_ids
    
    def _generate_module_3_questions(
        self,
        db: Session,
        role: str,
        domain: str,
        count: int = 2
    ) -> List[int]:
        """Generate Module 3 decision-making questions"""
        question_ids = []
        
        for i in range(count):
            difficulty = DifficultyLevel.MEDIUM
            
            existing = question_repository.get_random_by_criteria(
                db,
                question_type=QuestionType.DECISION_MAKING,
                difficulty=difficulty,
                count=1
            )
            
            if existing:
                question_ids.append(existing[0].id)
            else:
                question_data = self.question_gen.generate_module_3_question(
                    role=role,
                    domain=domain,
                    difficulty=difficulty
                )
                
                question = self._save_question(db, question_data)
                question_ids.append(question.id)
        
        return question_ids
    
    def _generate_module_4_questions(
        self,
        db: Session,
        role: str,
        domain: str,
        count: int = 2
    ) -> List[int]:
        """Generate Module 4 explanation questions"""
        question_ids = []
        
        for i in range(count):
            difficulty = DifficultyLevel.MEDIUM
            
            existing = question_repository.get_random_by_criteria(
                db,
                question_type=QuestionType.EXPLANATION,
                difficulty=difficulty,
                count=1
            )
            
            if existing:
                question_ids.append(existing[0].id)
            else:
                question_data = self.question_gen.generate_module_4_question(
                    role=role,
                    domain=domain,
                    difficulty=difficulty
                )
                
                question = self._save_question(db, question_data)
                question_ids.append(question.id)
        
        return question_ids
    
    def _generate_module_5_questions(
        self,
        db: Session,
        role: str,
        language: ProgrammingLanguage,
        count: int = 1
    ) -> List[int]:
        """Generate Module 5 debugging questions"""
        question_ids = []
        
        for i in range(count):
            difficulty = DifficultyLevel.MEDIUM
            
            existing = question_repository.get_random_by_criteria(
                db,
                question_type=QuestionType.DEBUGGING,
                language=language,
                difficulty=difficulty,
                count=1
            )
            
            if existing:
                question_ids.append(existing[0].id)
            else:
                question_data = self.question_gen.generate_module_5_debugging_question(
                    role=role,
                    language=language,
                    difficulty=difficulty
                )
                
                question = self._save_question(db, question_data)
                question_ids.append(question.id)
        
        return question_ids
    
    def _save_question(self, db: Session, question_data: Dict[str, Any]) -> Question:
        """
        Save question to database
        
        Args:
            db: Database session
            question_data: Question data dictionary
        
        Returns:
            Created Question instance
        """
        # Convert enums to values
        if isinstance(question_data.get('question_type'), str):
            question_data['question_type'] = QuestionType(question_data['question_type'])
        
        if isinstance(question_data.get('difficulty'), str):
            question_data['difficulty'] = DifficultyLevel(question_data['difficulty'])
        
        if isinstance(question_data.get('language'), str):
            question_data['language'] = ProgrammingLanguage(question_data['language'])
            
        # Map fields from AI response to DB schema
        if 'sample_good_answer' in question_data:
            question_data['solution'] = question_data.pop('sample_good_answer')
            
        # Filter out any extra keys generated by AI that are not in the database schema
        valid_keys = {column.name for column in Question.__table__.columns}
        filtered_data = {k: v for k, v in question_data.items() if k in valid_keys}
            
        # Create question
        question = question_repository.create_from_dict(db, obj_in=filtered_data)
        
        return question
    
    def generate_custom_question(
        self,
        db: Session,
        question_type: QuestionType,
        role: str,
        domain: str,
        language: Optional[ProgrammingLanguage] = None,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> Question:
        """
        Generate a single custom question
        
        Args:
            db: Database session
            question_type: Type of question
            role: Job role
            domain: Domain
            language: Programming language (for coding questions)
            difficulty: Difficulty level
        
        Returns:
            Created Question instance
        """
        logger.info(f"Generating custom {question_type} question")
        
        if question_type == QuestionType.PROBLEM_UNDERSTANDING:
            question_data = self.question_gen.generate_module_1_question(
                role, domain, difficulty
            )
        elif question_type == QuestionType.CODING:
            if not language:
                language = ProgrammingLanguage.PYTHON
            question_data = self.question_gen.generate_module_2_coding_question(
                role, language, difficulty
            )
        elif question_type == QuestionType.DECISION_MAKING:
            question_data = self.question_gen.generate_module_3_question(
                role, domain, difficulty
            )
        elif question_type == QuestionType.EXPLANATION:
            question_data = self.question_gen.generate_module_4_question(
                role, domain, difficulty
            )
        elif question_type == QuestionType.DEBUGGING:
            if not language:
                language = ProgrammingLanguage.PYTHON
            question_data = self.question_gen.generate_module_5_debugging_question(
                role, language, difficulty
            )
        else:
            raise ValueError(f"Unknown question type: {question_type}")
        
        question = self._save_question(db, question_data)
        return question
    
    def get_or_generate_questions(
        self,
        db: Session,
        role: str,
        domain: str,
        language: ProgrammingLanguage,
        use_existing: bool = True
    ) -> List[int]:
        """
        Get existing questions or generate new ones
        
        Args:
            db: Database session
            role: Job role
            domain: Domain
            language: Programming language
            use_existing: Whether to use existing questions
        
        Returns:
            List of question IDs
        """
        if use_existing:
            # Try to get existing questions
            all_questions = []
            
            for question_type in QuestionType:
                questions = question_repository.get_by_type(
                    db, question_type=question_type, limit=20
                )
                all_questions.extend(questions)
            
            if len(all_questions) >= 10:
                # We have enough questions, randomly select
                selected = random.sample(all_questions, min(10, len(all_questions)))
                return [q.id for q in selected]
        
        # Generate new test
        return self.generate_complete_test(db, role, domain, language)


# Singleton instance
task_generator = TaskGeneratorService()