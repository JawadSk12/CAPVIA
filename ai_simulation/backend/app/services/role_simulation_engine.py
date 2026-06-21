"""
Role Simulation Engine
Converts role simulation data into active sessions and questions
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from loguru import logger

from app.data.role_simulations.registry import get_simulation, get_all_roles
from app.models.question import Question, QuestionType, DifficultyLevel, ProgrammingLanguage
from app.models.session import Session as DBSession
from app.models.user import User
import secrets
import string
from datetime import datetime, timedelta


class RoleSimulationEngine:
    """
    Core engine that generates complete assessment sessions from role simulations.
    HR selects a role — engine creates all 5 rounds automatically.
    """

    def get_available_roles(self) -> List[Dict]:
        """Return all available role simulations for HR selection."""
        return get_all_roles()

    def create_session_from_role(
        self,
        db: Session,
        role_key: str,
        candidate_email: str,
        candidate_name: Optional[str] = None,
        difficulty: str = "mid",
        created_by_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a complete assessment session for a candidate based on role.

        Args:
            db: Database session
            role_key: e.g. 'ml_engineer', 'backend_developer'
            candidate_email: Candidate's email
            candidate_name: Candidate's name
            difficulty: 'junior', 'mid', 'senior'
            created_by_id: HR user ID

        Returns:
            Session dict with access_code and session_token
        """
        simulation = get_simulation(role_key)
        if not simulation:
            raise ValueError(f"Unknown role: {role_key}. Available: {list(get_all_roles())}")

        logger.info(f"Creating {role_key} simulation for {candidate_email} at {difficulty} level")

        # 1. Create or get candidate user
        candidate = self._get_or_create_candidate(db, candidate_email, candidate_name)

        # 2. Create questions from simulation data
        question_ids = self._ensure_questions_exist(db, simulation, difficulty)

        # 3. Create session
        access_code = self._generate_access_code()
        session_token = secrets.token_urlsafe(32)

        duration = simulation["total_duration_minutes"]
        end_time = datetime.utcnow() + timedelta(minutes=duration + 60)  # 1hr buffer

        session = DBSession(
            session_token=session_token,
            access_code=access_code,
            candidate_id=candidate.id,
            candidate_email=candidate_email,
            candidate_name=candidate_name or candidate.full_name,
            test_name=f"{simulation['role']} Simulation — {difficulty.title()} Level",
            test_description=simulation["description"],
            role_being_tested=simulation["role"],
            duration_minutes=duration,
            end_time=end_time,
            status="created",
            question_ids=question_ids,
            current_question_index=0,
            completed_questions=[],
            module_status={},
            is_proctored="true",
            allow_code_execution="true",
            difficulty_level=difficulty,
            role_key=role_key,
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        logger.info(f"Session {session.id} created with access code {access_code}")

        return {
            "session_id": session.id,
            "access_code": access_code,
            "session_token": session_token,
            "candidate_email": candidate_email,
            "role": simulation["role"],
            "difficulty": difficulty,
            "duration_minutes": duration,
            "total_rounds": len(simulation["rounds"]),
            "total_questions": len(question_ids),
        }

    def get_session_questions(
        self,
        db: Session,
        session_id: int,
        round_number: Optional[int] = None
    ) -> List[Dict]:
        """Get questions for a session, optionally filtered by round."""
        session = db.query(DBSession).get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        simulation = get_simulation(session.role_key)
        if not simulation:
            return []

        questions = []
        for round_data in simulation["rounds"]:
            if round_number and round_data["round_number"] != round_number:
                continue
            for q in round_data["questions"]:
                q_with_round = {**q, "round_number": round_data["round_number"], "round_name": round_data["name"]}
                questions.append(q_with_round)

        return questions

    def get_round_info(self, role_key: str) -> List[Dict]:
        """Get round structure for a role."""
        simulation = get_simulation(role_key)
        if not simulation:
            return []

        return [
            {
                "round_number": r["round_number"],
                "name": r["name"],
                "duration_minutes": r["duration_minutes"],
                "description": r.get("description", ""),
                "question_count": len(r["questions"]),
            }
            for r in simulation["rounds"]
        ]

    def _get_or_create_candidate(self, db: Session, email: str, name: Optional[str]) -> User:
        """Find existing user or create a candidate user."""
        user = db.query(User).filter(User.email == email).first()
        if user:
            return user

        from app.core.security import get_password_hash
        temp_password = secrets.token_urlsafe(12)

        user = User(
            email=email,
            username=email.split("@")[0],
            full_name=name or email.split("@")[0].replace(".", " ").title(),
            hashed_password=get_password_hash(temp_password),
            role="candidate",
            status="active",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Created candidate user {email}")
        return user

    def _ensure_questions_exist(
        self, db: Session, simulation: Dict, difficulty: str
    ) -> List[int]:
        """
        Ensure all questions from the simulation exist in the database.
        Returns list of question IDs in order.
        """
        question_ids = []

        for round_data in simulation["rounds"]:
            for q_data in round_data["questions"]:
                # Check if question already exists by simulation_id
                existing = db.query(Question).filter(
                    Question.simulation_question_id == q_data["id"]
                ).first()

                if existing:
                    question_ids.append(existing.id)
                    continue

                # Create new question
                q_type_map = {
                    "problem_understanding": QuestionType.PROBLEM_UNDERSTANDING,
                    "coding": QuestionType.CODING,
                    "decision_making": QuestionType.DECISION_MAKING,
                    "explanation": QuestionType.EXPLANATION,
                    "debugging": QuestionType.DEBUGGING,
                    "implementation": QuestionType.IMPLEMENTATION,
                }

                lang_map = {
                    "python": ProgrammingLanguage.PYTHON,
                    "javascript": ProgrammingLanguage.JAVASCRIPT,
                    "java": ProgrammingLanguage.JAVA,
                }

                diff_map = {
                    "easy": DifficultyLevel.EASY,
                    "medium": DifficultyLevel.MEDIUM,
                    "hard": DifficultyLevel.HARD,
                }

                question = Question(
                    simulation_question_id=q_data["id"],
                    title=q_data["title"],
                    description=q_data.get("problem_statement", q_data["title"])[:500],
                    question_type=q_type_map.get(q_data["question_type"], QuestionType.PROBLEM_UNDERSTANDING),
                    difficulty=diff_map.get(q_data.get("difficulty", "medium"), DifficultyLevel.MEDIUM),
                    module_number=round_data["round_number"],
                    category=simulation["role"],
                    tags=[simulation["role"].lower().replace(" ", "_"), q_data["question_type"]],
                    problem_statement=q_data.get("problem_statement"),
                    language=lang_map.get(q_data.get("language")) if q_data.get("language") else None,
                    starter_code=q_data.get("starter_code"),
                    test_cases=q_data.get("test_cases"),
                    buggy_code=q_data.get("buggy_code"),
                    expected_output=q_data.get("expected_output"),
                    bug_description=q_data.get("bug_description"),
                    options=[
                        {
                            "id": o["id"],
                            "title": o["title"],
                            "description": o["description"],
                            "pros": o.get("pros", []),
                            "cons": o.get("cons", []),
                        }
                        for o in q_data.get("options", [])
                    ] if q_data.get("options") else None,
                    correct_option=q_data.get("correct_option"),
                    scenario=q_data.get("scenario"),
                    key_points=q_data.get("key_points"),
                    evaluation_criteria=q_data.get("evaluation_criteria"),
                    max_score=q_data.get("max_score", 100.0),
                    time_limit_seconds=q_data.get("time_limit_seconds"),
                    solution=q_data.get("solution"),
                    hints=q_data.get("hints"),
                    is_active="true",
                )

                db.add(question)
                db.flush()
                question_ids.append(question.id)

        db.commit()
        return question_ids

    def _generate_access_code(self, length: int = 8) -> str:
        """Generate a human-readable access code."""
        chars = string.ascii_uppercase + string.digits
        chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
        return "".join(secrets.choice(chars) for _ in range(length))


# Singleton
role_simulation_engine = RoleSimulationEngine()
