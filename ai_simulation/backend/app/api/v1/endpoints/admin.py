"""
Admin Endpoints
Administrative functions and analytics
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.repositories.session_repository import session_repository
from app.repositories.submission_repository import submission_repository
from app.repositories.question_repository import question_repository
from app.repositories.evaluation_repository import evaluation_repository
from app.repositories.user_repository import user_repository
from datetime import datetime, timedelta
from loguru import logger


router = APIRouter()


@router.get("/dashboard", response_model=Dict[str, Any])
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get admin dashboard statistics
    
    Args:
        db: Database session
        current_user: Current admin user
    
    Returns:
        Dashboard statistics
    """
    # Session statistics
    total_sessions = session_repository.count(db)
    active_sessions = len(session_repository.get_active_sessions(db))
    completed_sessions = len(session_repository.get_completed_sessions(db))
    
    # User statistics
    total_candidates = user_repository.count(db, role="candidate")
    total_admins = user_repository.count(db, role="admin")
    
    # Question statistics
    total_questions = question_repository.count(db)
    active_questions = question_repository.count(db, is_active="true")
    
    # Evaluation statistics
    total_evaluations = evaluation_repository.count(db)
    high_risk_count = len(evaluation_repository.get_high_risk_evaluations(db, limit=1000))
    
    # Recent sessions (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_sessions = session_repository.get_sessions_by_date_range(
        db,
        start_date=week_ago,
        end_date=datetime.utcnow(),
        limit=1000
    )
    
    dashboard = {
        "sessions": {
            "total": total_sessions,
            "active": active_sessions,
            "completed": completed_sessions,
            "recent_7_days": len(recent_sessions)
        },
        "users": {
            "total_candidates": total_candidates,
            "total_admins": total_admins
        },
        "questions": {
            "total": total_questions,
            "active": active_questions
        },
        "evaluations": {
            "total": total_evaluations,
            "high_risk": high_risk_count,
            "high_risk_percentage": (high_risk_count / total_evaluations * 100) if total_evaluations > 0 else 0
        }
    }
    
    return dashboard


@router.get("/analytics/sessions", response_model=Dict[str, Any])
def get_session_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get session analytics
    
    Args:
        days: Number of days to analyze
        db: Database session
        current_user: Current admin user
    
    Returns:
        Session analytics
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    sessions = session_repository.get_sessions_by_date_range(
        db,
        start_date=start_date,
        end_date=datetime.utcnow(),
        limit=10000
    )
    
    # Calculate statistics
    total = len(sessions)
    completed = len([s for s in sessions if s.status.value == "completed"])
    expired = len([s for s in sessions if s.status.value == "expired"])
    
    # Average scores
    scores = [float(s.total_score) for s in sessions if s.total_score]
    avg_score = sum(scores) / len(scores) if scores else 0
    
    # Completion rate
    completion_rate = (completed / total * 100) if total > 0 else 0
    
    analytics = {
        "period_days": days,
        "total_sessions": total,
        "completed_sessions": completed,
        "expired_sessions": expired,
        "completion_rate": completion_rate,
        "average_score": avg_score,
        "sessions_by_day": _get_sessions_by_day(sessions)
    }
    
    return analytics


@router.get("/analytics/performance", response_model=Dict[str, Any])
def get_performance_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get candidate performance analytics
    
    Args:
        db: Database session
        current_user: Current admin user
    
    Returns:
        Performance analytics
    """
    from app.models.evaluation import Evaluation
    
    evaluations = db.query(Evaluation).all()
    
    if not evaluations:
        return {
            "total_evaluated": 0,
            "average_scores": {},
            "grade_distribution": {},
            "recommendation_distribution": {}
        }
    
    # Average component scores
    avg_accuracy = sum(e.accuracy_score or 0 for e in evaluations) / len(evaluations)
    avg_logic = sum(e.logic_score or 0 for e in evaluations) / len(evaluations)
    avg_speed = sum(e.speed_score or 0 for e in evaluations) / len(evaluations)
    avg_explanation = sum(e.explanation_score or 0 for e in evaluations) / len(evaluations)
    avg_behavior = sum(e.behavior_score or 0 for e in evaluations) / len(evaluations)
    
    # Grade distribution
    grade_dist = {}
    for eval in evaluations:
        grade = eval.grade or "F"
        grade_dist[grade] = grade_dist.get(grade, 0) + 1
    
    # Recommendation distribution
    rec_dist = {}
    for eval in evaluations:
        rec = eval.recommendation or "unknown"
        rec_dist[rec] = rec_dist.get(rec, 0) + 1
    
    analytics = {
        "total_evaluated": len(evaluations),
        "average_scores": {
            "accuracy": avg_accuracy,
            "logic": avg_logic,
            "speed": avg_speed,
            "explanation": avg_explanation,
            "behavior": avg_behavior
        },
        "grade_distribution": grade_dist,
        "recommendation_distribution": rec_dist
    }
    
    return analytics


@router.get("/sessions/flagged", response_model=List[Dict[str, Any]])
def get_flagged_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get sessions flagged for review
    
    Args:
        skip: Number to skip
        limit: Maximum to return
        db: Database session
        current_user: Current admin user
    
    Returns:
        List of flagged sessions
    """
    sessions = session_repository.get_sessions_for_review(
        db,
        skip=skip,
        limit=limit
    )
    
    result = []
    for session in sessions:
        result.append({
            "session_id": session.id,
            "candidate_name": session.candidate_name,
            "candidate_email": session.candidate_email,
            "test_name": session.test_name,
            "has_suspicious_activity": session.has_suspicious_activity,
            "cheating_risk_level": session.cheating_risk_level,
            "total_score": session.total_score,
            "completed_at": session.actual_end
        })
    
    return result


@router.get("/questions/stats", response_model=Dict[str, Any])
def get_question_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get question usage statistics
    
    Args:
        db: Database session
        current_user: Current admin user
    
    Returns:
        Question statistics
    """
    from app.models.question import Question
    
    questions = db.query(Question).all()
    
    # Count by type
    type_dist = {}
    for q in questions:
        q_type = q.question_type.value
        type_dist[q_type] = type_dist.get(q_type, 0) + 1
    
    # Count by difficulty
    diff_dist = {}
    for q in questions:
        diff = q.difficulty.value
        diff_dist[diff] = diff_dist.get(diff, 0) + 1
    
    # Count by module
    module_dist = {}
    for q in questions:
        module = f"module_{q.module_number}"
        module_dist[module] = module_dist.get(module, 0) + 1
    
    # Most used questions
    most_used = sorted(questions, key=lambda x: x.usage_count, reverse=True)[:10]
    
    stats = {
        "total_questions": len(questions),
        "active_questions": len([q for q in questions if q.is_active == "true"]),
        "by_type": type_dist,
        "by_difficulty": diff_dist,
        "by_module": module_dist,
        "most_used": [
            {
                "id": q.id,
                "title": q.title,
                "usage_count": q.usage_count,
                "average_score": q.average_score
            }
            for q in most_used
        ]
    }
    
    return stats


def _get_sessions_by_day(sessions: List[Any]) -> Dict[str, int]:
    """Helper to group sessions by day"""
    by_day = {}
    
    for session in sessions:
        day = session.created_at.date().isoformat()
        by_day[day] = by_day.get(day, 0) + 1
    
    return by_day