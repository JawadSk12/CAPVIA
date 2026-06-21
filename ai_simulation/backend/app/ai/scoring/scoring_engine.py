"""
Scoring Engine
Main scoring orchestrator that combines all evaluation components
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from loguru import logger
from app.ai.evaluators.answer_evaluator import answer_evaluator
from app.ai.evaluators.code_analyzer import code_analyzer
from app.ai.evaluators.llm_detector import llm_detector
from app.ai.evaluators.similarity_engine import similarity_engine
from app.ai.evaluators.behavior_scorer import behavior_scorer
from app.ai.scoring.weighted_scorer import weighted_scorer
from app.models.question import Question, QuestionType
from app.models.submission import Submission
from app.models.evaluation import Evaluation


class ScoringEngine:
    """
    Main scoring engine
    Orchestrates all evaluation components to produce final scores
    """
    
    def __init__(self):
        """Initialize scoring engine"""
        self.answer_eval = answer_evaluator
        self.code_analyzer = code_analyzer
        self.llm_detector = llm_detector
        self.similarity = similarity_engine
        self.behavior = behavior_scorer
        self.weighted = weighted_scorer
    
    def score_submission(
        self,
        db: Session,
        submission: Submission,
        question: Question
    ) -> Dict[str, Any]:
        """
        Score a single submission
        
        Args:
            db: Database session
            submission: Submission to score
            question: Associated question
        
        Returns:
            Scoring result dictionary
        """
        logger.info(f"Scoring submission {submission.id} for question {question.id}")
        
        result = {
            "submission_id": submission.id,
            "question_id": question.id,
            "question_type": question.question_type,
            "scores": {},
            "total_score": 0.0,
            "max_score": question.max_score,
            "feedback": []
        }
        
        # Route to appropriate scorer based on question type
        if question.question_type in [QuestionType.CODING, QuestionType.DEBUGGING]:
            score_result = self._score_coding_submission(submission, question)
        elif question.question_type == QuestionType.DECISION_MAKING:
            score_result = self._score_decision_submission(submission, question)
        elif question.question_type in [QuestionType.PROBLEM_UNDERSTANDING, QuestionType.EXPLANATION]:
            score_result = self._score_text_submission(submission, question)
        else:
            score_result = {"score": 0.0, "feedback": ["Unknown question type"]}
        
        result["scores"] = score_result
        result["total_score"] = score_result.get("total_score", 0.0)
        result["feedback"] = score_result.get("feedback", [])
        
        # AI detection for text answers
        if submission.answer_text or submission.explanation:
            text_to_check = submission.answer_text or submission.explanation
            ai_detection = self.llm_detector.detect_ai_content(text_to_check)
            result["ai_detection"] = ai_detection
        
        return result
    
    def _score_coding_submission(
        self,
        submission: Submission,
        question: Question
    ) -> Dict[str, Any]:
        """Score coding/debugging submission"""
        code = submission.code_answer
        
        if not code:
            return {
                "total_score": 0.0,
                "feedback": ["No code submitted"]
            }
        
        # 1. Code analysis
        test_results = submission.execution_results
        analysis = self.code_analyzer.analyze_code(
            code=code,
            language=question.language.value,
            test_results=test_results
        )
        
        # 2. Calculate component scores
        scores = {
            "correctness": analysis.get("correctness_score", 0.0),
            "quality": analysis.get("quality_score", 0.0),
            "style": analysis.get("style_score", 0.0)
        }
        
        # 3. Speed score
        time_spent = submission.time_spent_seconds or 0
        time_limit = question.time_limit_seconds or 1800  # Default 30 min
        
        speed_score = self.weighted.calculate_speed_score(
            time_spent,
            time_limit,
            scores["quality"]
        )
        
        # 4. Weight and combine
        weights = {
            "correctness": 0.50,
            "quality": 0.30,
            "style": 0.10,
            "speed": 0.10
        }
        
        total = 0.0
        for component, weight in weights.items():
            if component == "speed":
                total += speed_score * weight
            else:
                total += scores.get(component, 0.0) * weight
        
        return {
            "total_score": total,
            "correctness_score": scores["correctness"],
            "quality_score": scores["quality"],
            "style_score": scores["style"],
            "speed_score": speed_score,
            "code_analysis": analysis,
            "feedback": analysis.get("suggestions", [])
        }
    
    def _score_decision_submission(
        self,
        submission: Submission,
        question: Question
    ) -> Dict[str, Any]:
        """Score decision-making submission"""
        selected = submission.selected_option
        correct = question.correct_option
        explanation = submission.explanation or ""
        
        # 1. Choice correctness (50%)
        choice_score = 100.0 if selected == correct else 0.0
        
        # 2. Justification quality (50%)
        if explanation:
            criteria = question.evaluation_criteria or {}
            justification_eval = self.answer_eval.evaluate_answer(
                explanation,
                criteria,
                max_score=100.0
            )
            justification_score = justification_eval["total_score"]
            feedback = justification_eval["feedback"]
        else:
            justification_score = 0.0
            feedback = ["No justification provided"]
        
        # 3. Combine
        total = (choice_score * 0.5) + (justification_score * 0.5)
        
        return {
            "total_score": total,
            "choice_score": choice_score,
            "justification_score": justification_score,
            "correct_option": correct,
            "selected_option": selected,
            "is_correct": selected == correct,
            "feedback": feedback
        }
    
    def _score_text_submission(
        self,
        submission: Submission,
        question: Question
    ) -> Dict[str, Any]:
        """Score text-based submission"""
        answer = submission.answer_text or ""
        
        if not answer:
            return {
                "total_score": 0.0,
                "feedback": ["No answer provided"]
            }
        
        # Evaluate answer
        criteria = question.evaluation_criteria or {}
        evaluation = self.answer_eval.evaluate_answer(
            answer,
            criteria,
            max_score=question.max_score
        )
        
        # For explanation questions, use AI evaluation
        if question.question_type == QuestionType.EXPLANATION:
            key_points = question.key_points or []
            if key_points:
                ai_eval = self.answer_eval.evaluate_explanation(
                    answer,
                    question.scenario or question.title,
                    key_points
                )
                
                # Combine evaluations
                evaluation["ai_evaluation"] = ai_eval
                evaluation["total_score"] = (
                    evaluation["total_score"] * 0.5 +
                    ai_eval["total_score"] * 0.5
                )
        
        return evaluation
    
    def calculate_session_scores(
        self,
        db: Session,
        session_id: int,
        submissions: List[Submission],
        behavioral_events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive scores for entire session
        
        Args:
            db: Database session
            session_id: Session ID
            submissions: All submissions
            behavioral_events: All behavioral events
        
        Returns:
            Complete session scoring
        """
        logger.info(f"Calculating session scores for session {session_id}")
        
        result = {
            "session_id": session_id,
            "total_score": 0.0,
            "percentage": 0.0,
            "grade": "F",
            "module_scores": {},
            "component_scores": {},
            "behavior_analysis": {},
            "hiring_recommendation": "reject"
        }
        
        # 1. Calculate individual submission scores
        submission_scores = []
        total_accuracy = 0.0
        total_max = 0.0
        
        for submission in submissions:
            question = db.query(Question).get(submission.question_id)
            if not question:
                continue
            
            score_result = self.score_submission(db, submission, question)
            submission_scores.append(score_result)
            
            total_accuracy += score_result["total_score"]
            total_max += question.max_score
        
        # 2. Calculate module-wise scores
        modules = {1: [], 2: [], 3: [], 4: [], 5: []}
        for submission in submissions:
            question = db.query(Question).get(submission.question_id)
            if question:
                modules[question.module_number].append({
                    "score": submission.score or 0.0,
                    "max_score": question.max_score,
                    "is_correct": submission.is_correct
                })
        
        for module_num, module_subs in modules.items():
            if module_subs:
                module_score = self.weighted.calculate_module_score(
                    module_subs,
                    module_num
                )
                result["module_scores"][f"module_{module_num}"] = module_score
        
        # 3. Calculate accuracy score
        accuracy_score = (total_accuracy / total_max * 100) if total_max > 0 else 0.0
        
        # 4. Calculate logic score (based on decision-making and problem understanding)
        logic_submissions = [
            s for s in submissions
            if s.question_id in [
                q.id for q in db.query(Question).filter(
                    Question.question_type.in_([
                        QuestionType.DECISION_MAKING,
                        QuestionType.PROBLEM_UNDERSTANDING
                    ])
                ).all()
            ]
        ]
        
        logic_score = 0.0
        if logic_submissions:
            logic_total = sum(s.score or 0.0 for s in logic_submissions)
            logic_max = len(logic_submissions) * 100
            logic_score = (logic_total / logic_max * 100) if logic_max > 0 else 0.0
        else:
            logic_score = accuracy_score  # Fallback
        
        # 5. Calculate speed score
        total_time = sum(s.time_spent_seconds or 0 for s in submissions)
        expected_time = 3600  # 60 minutes
        speed_score = self.weighted.calculate_speed_score(
            total_time,
            expected_time,
            accuracy_score
        )
        
        # 6. Calculate explanation score
        explanation_submissions = [
            s for s in submissions
            if s.question_id in [
                q.id for q in db.query(Question).filter(
                    Question.question_type == QuestionType.EXPLANATION
                ).all()
            ]
        ]
        
        explanation_score = 0.0
        if explanation_submissions:
            expl_total = sum(s.score or 0.0 for s in explanation_submissions)
            expl_max = len(explanation_submissions) * 100
            explanation_score = (expl_total / expl_max * 100) if expl_max > 0 else 0.0
        else:
            explanation_score = accuracy_score  # Fallback
        
        # 7. Calculate behavior score
        from app.models.session import Session
        session = db.query(Session).get(session_id)
        
        behavior_analysis = self.behavior.calculate_behavior_score(
            behavioral_events,
            [s.dict() for s in submissions],
            session.duration_minutes if session else 60
        )
        
        result["behavior_analysis"] = behavior_analysis
        behavior_score = behavior_analysis["behavior_score"]
        
        # 8. Combine all component scores
        component_scores = {
            "accuracy": accuracy_score,
            "logic": logic_score,
            "speed": speed_score,
            "explanation": explanation_score,
            "behavior": behavior_score
        }
        
        result["component_scores"] = component_scores
        
        # 9. Calculate weighted total
        weighted_result = self.weighted.calculate_weighted_score(
            component_scores,
            max_score=100.0
        )
        
        result["total_score"] = weighted_result["total_score"]
        result["percentage"] = weighted_result["percentage"]
        result["score_breakdown"] = weighted_result["breakdown"]
        
        # 10. Assign grade
        result["grade"] = self.weighted.assign_grade(result["percentage"])
        
        # 11. Determine hiring recommendation
        result["hiring_recommendation"] = self.weighted.determine_hiring_recommendation(
            result["total_score"],
            behavior_score,
            behavior_analysis["risk_level"]
        )
        
        logger.info(f"Session {session_id} final score: {result['total_score']:.2f}")
        
        return result


# Singleton instance
scoring_engine = ScoringEngine()