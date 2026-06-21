"""
Evaluation Orchestrator
Orchestrates the complete evaluation process for sessions
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from loguru import logger
from app.ai.scoring.scoring_engine import scoring_engine
from app.repositories.session_repository import session_repository
from app.repositories.submission_repository import submission_repository
from app.repositories.evaluation_repository import evaluation_repository
from app.models.evaluation import Evaluation
from app.models.behavioral_event import BehavioralEvent
from datetime import datetime


class EvaluationOrchestrator:
    """
    Orchestrates complete evaluation process
    Coordinates scoring, AI detection, and report generation
    """
    
    def __init__(self):
        """Initialize orchestrator"""
        self.scoring = scoring_engine
    
    def evaluate_session(
        self,
        db: Session,
        session_id: int,
        generate_report: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate complete test session
        
        Args:
            db: Database session
            session_id: Session ID to evaluate
            generate_report: Whether to generate detailed report
        
        Returns:
            Evaluation result dictionary
        """
        logger.info(f"Starting evaluation for session {session_id}")
        
        try:
            # 1. Get session data
            session = session_repository.get(db, session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # 2. Get all submissions
            submissions = submission_repository.get_by_session(
                db,
                session_id=session_id
            )
            
            if not submissions:
                logger.warning(f"No submissions found for session {session_id}")
                return self._create_empty_evaluation(db, session_id)
            
            # 3. Get behavioral events
            behavioral_events = db.query(BehavioralEvent).filter(
                BehavioralEvent.session_id == session_id
            ).all()
            
            behavioral_data = [
                {
                    "event_type": e.event_type,
                    "event_data": e.event_data,
                    "event_timestamp": e.event_timestamp,
                    "severity": e.severity
                }
                for e in behavioral_events
            ]
            
            # 4. Calculate comprehensive scores
            scores = self.scoring.calculate_session_scores(
                db,
                session_id,
                submissions,
                behavioral_data
            )
            
            # 5. Create evaluation record
            evaluation = self._create_evaluation_record(
                db,
                session_id,
                scores
            )
            
            # 6. Update session with scores
            self._update_session_scores(db, session, scores)
            
            # 7. Generate report if requested
            report = None
            if generate_report:
                report = self._generate_evaluation_report(
                    db,
                    session,
                    evaluation,
                    scores
                )
            
            result = {
                "evaluation_id": evaluation.id,
                "session_id": session_id,
                "total_score": scores["total_score"],
                "percentage": scores["percentage"],
                "grade": scores["grade"],
                "recommendation": scores["hiring_recommendation"],
                "behavior_risk": scores["behavior_analysis"]["risk_level"],
                "report": report
            }
            
            logger.info(f"Evaluation completed for session {session_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error evaluating session {session_id}: {str(e)}")
            raise
    
    def evaluate_submission(
        self,
        db: Session,
        submission_id: int
    ) -> Dict[str, Any]:
        """
        Evaluate single submission
        
        Args:
            db: Database session
            submission_id: Submission ID
        
        Returns:
            Evaluation result
        """
        from app.models.submission import Submission
        from app.models.question import Question
        
        submission = db.query(Submission).get(submission_id)
        if not submission:
            raise ValueError(f"Submission {submission_id} not found")
        
        question = db.query(Question).get(submission.question_id)
        if not question:
            raise ValueError(f"Question {submission.question_id} not found")
        
        # Score submission
        result = self.scoring.score_submission(db, submission, question)
        
        # Update submission with score
        submission_repository.update_score(
            db,
            submission=submission,
            score=result["total_score"],
            max_score=question.max_score
        )
        
        return result
    
    def _create_evaluation_record(
        self,
        db: Session,
        session_id: int,
        scores: Dict[str, Any]
    ) -> Evaluation:
        """Create evaluation database record"""
        
        component_scores = scores["component_scores"]
        behavior = scores["behavior_analysis"]
        
        evaluation = Evaluation(
            session_id=session_id,
            
            # Component scores
            accuracy_score=component_scores["accuracy"],
            logic_score=component_scores["logic"],
            speed_score=component_scores["speed"],
            explanation_score=component_scores["explanation"],
            behavior_score=component_scores["behavior"],
            
            # Total
            total_score=scores["total_score"],
            max_possible_score=100.0,
            
            # Behavior analysis
            suspicious_events=behavior.get("suspicious_events", []),
            cheating_indicators=behavior.get("analysis", {}),
            cheating_risk_level=behavior["risk_level"],
            
            # Final assessment
            passed="true" if scores["percentage"] >= 60 else "false",
            grade=scores["grade"],
            recommendation=scores["hiring_recommendation"],
            
            # Metadata
            evaluated_by="AI",
            evaluation_method="automated"
        )
        
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
        
        logger.info(f"Created evaluation record {evaluation.id}")
        
        return evaluation
    
    def _update_session_scores(
        self,
        db: Session,
        session: Any,
        scores: Dict[str, Any]
    ):
        """Update session with calculated scores"""
        
        session.total_score = str(scores["total_score"])
        session.behavior_score = str(scores["component_scores"]["behavior"])
        session.cheating_risk_level = scores["behavior_analysis"]["risk_level"]
        
        # Update module scores
        session.module_scores = {}
        for module_key, module_data in scores["module_scores"].items():
            session.module_scores[module_key] = module_data["percentage"]
        
        # Flag suspicious activity
        if scores["behavior_analysis"]["risk_level"] in ["medium", "high"]:
            session.has_suspicious_activity = "true"
        
        db.add(session)
        db.commit()
        
        logger.info(f"Updated session {session.id} with scores")
    
    def _create_empty_evaluation(
        self,
        db: Session,
        session_id: int
    ) -> Dict[str, Any]:
        """Create empty evaluation for sessions with no submissions"""
        
        evaluation = Evaluation(
            session_id=session_id,
            total_score=0.0,
            max_possible_score=100.0,
            passed="false",
            grade="F",
            recommendation="reject",
            evaluated_by="AI",
            evaluation_method="automated"
        )
        
        db.add(evaluation)
        db.commit()
        
        return {
            "evaluation_id": evaluation.id,
            "session_id": session_id,
            "total_score": 0.0,
            "percentage": 0.0,
            "grade": "F",
            "recommendation": "reject"
        }
    
    def _generate_evaluation_report(
        self,
        db: Session,
        session: Any,
        evaluation: Evaluation,
        scores: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive evaluation report"""
        
        report = {
            "session_info": {
                "session_id": session.id,
                "candidate_name": session.candidate_name,
                "candidate_email": session.candidate_email,
                "test_name": session.test_name,
                "role": session.role_being_tested,
                "started_at": session.start_time.isoformat() if session.start_time else None,
                "completed_at": session.actual_end.isoformat() if session.actual_end else None,
                "duration_minutes": session.duration_minutes
            },
            
            "scores": {
                "total_score": scores["total_score"],
                "percentage": scores["percentage"],
                "grade": scores["grade"],
                
                "component_breakdown": scores["component_scores"],
                "module_breakdown": scores["module_scores"],
                
                "weighted_breakdown": scores.get("score_breakdown", {})
            },
            
            "performance_analysis": {
                "strengths": self._identify_strengths(scores),
                "weaknesses": self._identify_weaknesses(scores),
                "recommendations": scores["behavior_analysis"].get("recommendations", [])
            },
            
            "behavior_analysis": {
                "behavior_score": scores["component_scores"]["behavior"],
                "risk_level": scores["behavior_analysis"]["risk_level"],
                "suspicious_events": scores["behavior_analysis"]["suspicious_events"],
                "detailed_analysis": scores["behavior_analysis"]["analysis"]
            },
            
            "final_assessment": {
                "passed": evaluation.passed == "true",
                "grade": evaluation.grade,
                "hiring_recommendation": evaluation.recommendation,
                "requires_review": scores["behavior_analysis"]["risk_level"] == "high"
            },
            
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return report
    
    def _identify_strengths(self, scores: Dict[str, Any]) -> List[str]:
        """Identify candidate strengths"""
        strengths = []
        
        components = scores["component_scores"]
        
        if components["accuracy"] >= 85:
            strengths.append("Excellent accuracy in solutions")
        if components["logic"] >= 80:
            strengths.append("Strong logical reasoning and problem-solving")
        if components["speed"] >= 80:
            strengths.append("Efficient time management")
        if components["explanation"] >= 80:
            strengths.append("Clear communication and explanation skills")
        if components["behavior"] >= 90:
            strengths.append("Professional test-taking behavior")
        
        if not strengths:
            # Find best component
            best_component = max(components.items(), key=lambda x: x[1])
            if best_component[1] > 60:
                strengths.append(f"Demonstrated competence in {best_component[0]}")
        
        return strengths
    
    def _identify_weaknesses(self, scores: Dict[str, Any]) -> List[str]:
        """Identify areas for improvement"""
        weaknesses = []
        
        components = scores["component_scores"]
        
        if components["accuracy"] < 60:
            weaknesses.append("Needs improvement in solution accuracy")
        if components["logic"] < 60:
            weaknesses.append("Could strengthen logical reasoning skills")
        if components["speed"] < 50:
            weaknesses.append("Work on time management")
        if components["explanation"] < 60:
            weaknesses.append("Improve technical communication")
        if components["behavior"] < 70:
            weaknesses.append("Concerning behavioral patterns during test")
        
        return weaknesses


# Singleton instance
evaluation_orchestrator = EvaluationOrchestrator()