"""
Simulations API Endpoint
HR-facing endpoints for role simulation management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from loguru import logger

from app.db.session import get_db
from app.api.deps import get_current_admin_user
from app.services.role_simulation_engine import role_simulation_engine
from app.models.user import User
from pydantic import BaseModel, EmailStr

router = APIRouter()


class CreateSimulationRequest(BaseModel):
    role_key: str
    candidate_email: EmailStr
    candidate_name: Optional[str] = None
    difficulty: str = "mid"  # junior, mid, senior


class CreateSimulationResponse(BaseModel):
    session_id: int
    access_code: str
    session_token: str
    candidate_email: str
    role: str
    difficulty: str
    duration_minutes: int
    total_rounds: int
    total_questions: int
    instructions_url: str


@router.get("/roles")
async def get_available_roles(
    current_user: User = Depends(get_current_admin_user)
):
    """Get all available role simulations for HR selection."""
    try:
        roles = role_simulation_engine.get_available_roles()
        return {"roles": roles, "total": len(roles)}
    except Exception as e:
        logger.error(f"Error fetching roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roles/{role_key}/rounds")
async def get_role_rounds(
    role_key: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Get round structure for a specific role."""
    rounds = role_simulation_engine.get_round_info(role_key)
    if not rounds:
        raise HTTPException(status_code=404, detail=f"Role '{role_key}' not found")
    return {"role_key": role_key, "rounds": rounds}


@router.post("/assign", response_model=CreateSimulationResponse)
async def assign_simulation(
    request: CreateSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Assign a role simulation to a candidate.
    Creates session with access code + all 5 rounds of questions.
    """
    if request.difficulty not in ["junior", "mid", "senior"]:
        raise HTTPException(status_code=400, detail="difficulty must be junior, mid, or senior")

    try:
        result = role_simulation_engine.create_session_from_role(
            db=db,
            role_key=request.role_key,
            candidate_email=request.candidate_email,
            candidate_name=request.candidate_name,
            difficulty=request.difficulty,
            created_by_id=current_user.id
        )
        return CreateSimulationResponse(
            **result,
            instructions_url=f"/test/access?code={result['access_code']}"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create simulation")


@router.get("/sessions/{session_id}/questions")
async def get_session_questions(
    session_id: int,
    round_number: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get all questions for a simulation session (admin view with solutions)."""
    try:
        questions = role_simulation_engine.get_session_questions(db, session_id, round_number)
        return {"session_id": session_id, "questions": questions, "total": len(questions)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/leaderboard")
async def get_simulation_leaderboard(
    role_key: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get ranked candidates for a role simulation."""
    from app.models.session import Session as DBSession, SessionStatus
    from app.models.evaluation import Evaluation

    query = db.query(DBSession).filter(DBSession.status == SessionStatus.COMPLETED)
    if role_key:
        query = query.filter(DBSession.role_key == role_key)

    sessions = query.order_by(DBSession.updated_at.desc()).limit(200).all()

    ranked = []
    for s in sessions:
        eval_record = db.query(Evaluation).filter(Evaluation.session_id == s.id).first()
        score = float(s.total_score) if s.total_score else 0.0
        ranked.append({
            "rank": 0,
            "session_id": s.id,
            "candidate_name": s.candidate_name or s.candidate_email,
            "candidate_email": s.candidate_email,
            "role": s.role_being_tested,
            "role_key": s.role_key,
            "difficulty": s.difficulty_level,
            "total_score": round(score, 2),
            "grade": eval_record.grade if eval_record else "N/A",
            "recommendation": eval_record.recommendation if eval_record else "pending",
            "behavior_risk": s.cheating_risk_level or "low",
            "has_suspicious_activity": s.has_suspicious_activity == "true",
            "completed_at": s.actual_end.isoformat() if s.actual_end else None,
        })

    ranked.sort(key=lambda x: x["total_score"], reverse=True)
    for i, r in enumerate(ranked[:limit]):
        r["rank"] = i + 1

    return {"leaderboard": ranked[:limit], "total": len(ranked)}
