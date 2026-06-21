"""
Applications & Simulation Attempt Endpoints
Candidate applies → starts simulation → submits → AI evaluates
"""

import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_active_user, require_candidate
from app.models.user import User
from app.models.internship import Internship
from app.models.application import InternshipApplication, ApplicationStatus
from app.models.simulation_attempt import SimulationAttempt, AttemptStatus
from app.models.simulation_blueprint import SimulationBlueprint
from app.models.behavior_log import CandidateBehaviorLog
from app.schemas.application import (
    ApplicationCreate, ApplicationResponse,
    AttemptStartResponse, AnswerSubmit, BehaviorEvent, AttemptResponse
)
from app.services.ai_evaluation_engine import ai_evaluation_engine
from loguru import logger

router = APIRouter()


# ─── Applications ─────────────────────────────────────────────────────────────

@router.post("/internships/{internship_id}/apply", response_model=ApplicationResponse, status_code=201)
def apply_to_internship(
    internship_id: int,
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    existing = db.query(InternshipApplication).filter(
        InternshipApplication.internship_id == internship_id,
        InternshipApplication.candidate_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this internship.")

    app = InternshipApplication(
        internship_id=internship_id,
        candidate_id=current_user.id,
        cover_letter=data.cover_letter,
        resume_url=data.resume_url or current_user.resume_url,
        status=ApplicationStatus.APPLIED,
    )
    db.add(app)
    internship.applications_count = (internship.applications_count or 0) + 1
    db.commit()
    db.refresh(app)
    logger.info(f"Candidate {current_user.id} applied to internship {internship_id}")
    return app


@router.get("/my-applications", response_model=List[ApplicationResponse])
def my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    apps = db.query(InternshipApplication).filter(
        InternshipApplication.candidate_id == current_user.id
    ).order_by(InternshipApplication.created_at.desc()).all()
    return apps


@router.get("/internships/{internship_id}/applications")
def internship_applications(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """HR views all applicants for their internship."""
    apps = db.query(InternshipApplication).filter(
        InternshipApplication.internship_id == internship_id
    ).all()
    result = []
    for app in apps:
        candidate = db.query(User).filter(User.id == app.candidate_id).first()
        result.append({
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.full_name if candidate else "Unknown",
            "candidate_email": candidate.email if candidate else "",
            "status": app.status,
            "applied_at": app.created_at.isoformat(),
            "attempt_id": app.attempt_id,
            "final_score": app.final_score,
            "rank": app.rank,
            "recommendation": app.recommendation,
        })
    return {"internship_id": internship_id, "count": len(result), "applications": result}


# ─── Simulation Attempts ──────────────────────────────────────────────────────

@router.post("/applications/{application_id}/start-simulation", response_model=AttemptStartResponse)
def start_simulation(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    """Candidate starts the simulation for their application."""
    app = db.query(InternshipApplication).filter(
        InternshipApplication.id == application_id,
        InternshipApplication.candidate_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    internship = db.query(Internship).filter(Internship.id == app.internship_id).first()
    if not internship or not internship.simulation_enabled:
        raise HTTPException(status_code=400, detail="Simulation not enabled for this internship")

    blueprint = db.query(SimulationBlueprint).filter(
        SimulationBlueprint.internship_id == internship.id
    ).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Simulation blueprint not generated yet")

    # Check for existing attempt
    existing = db.query(SimulationAttempt).filter(
        SimulationAttempt.application_id == application_id,
        SimulationAttempt.candidate_id == current_user.id,
    ).first()
    if existing:
        if existing.status in [AttemptStatus.SUBMITTED, AttemptStatus.EVALUATED]:
            raise HTTPException(status_code=400, detail="Simulation already submitted.")
        # Resume
        return AttemptStartResponse(
            attempt_id=existing.id,
            access_token=existing.access_token,
            blueprint={"rounds": blueprint.rounds, "total_duration_minutes": blueprint.total_duration_minutes, "role_name": blueprint.role_name},
            expires_at=existing.expires_at or "",
        )

    now = datetime.utcnow()
    expires = now + timedelta(minutes=blueprint.total_duration_minutes + 30)
    access_token = secrets.token_urlsafe(32)

    attempt = SimulationAttempt(
        blueprint_id=blueprint.id,
        candidate_id=current_user.id,
        internship_id=internship.id,
        application_id=application_id,
        status=AttemptStatus.IN_PROGRESS,
        current_round=1,
        completed_rounds=[],
        answers={},
        code_submissions={},
        started_at=now.isoformat(),
        expires_at=expires.isoformat(),
        access_token=access_token,
    )
    db.add(attempt)
    app.status = ApplicationStatus.SIMULATION_STARTED
    blueprint.attempts_count = (blueprint.attempts_count or 0) + 1
    db.commit()
    db.refresh(attempt)

    return AttemptStartResponse(
        attempt_id=attempt.id,
        access_token=access_token,
        blueprint={"rounds": blueprint.rounds, "total_duration_minutes": blueprint.total_duration_minutes, "role_name": blueprint.role_name},
        expires_at=expires.isoformat(),
    )


@router.get("/attempts/{attempt_id}", response_model=AttemptResponse)
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    attempt = db.query(SimulationAttempt).filter(SimulationAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.candidate_id != current_user.id and not current_user.is_hr:
        raise HTTPException(status_code=403, detail="Access denied")
    return attempt


@router.post("/attempts/{attempt_id}/answer")
def submit_answer(
    attempt_id: int,
    data: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    """Save candidate's answer for a task (auto-save)."""
    attempt = db.query(SimulationAttempt).filter(
        SimulationAttempt.id == attempt_id,
        SimulationAttempt.candidate_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status in [AttemptStatus.SUBMITTED, AttemptStatus.EVALUATED]:
        raise HTTPException(status_code=400, detail="Attempt already submitted.")

    rkey = f"round_{data.round_number}"
    answers = dict(attempt.answers or {})
    code_subs = dict(attempt.code_submissions or {})

    if rkey not in answers:
        answers[rkey] = {}
    if rkey not in code_subs:
        code_subs[rkey] = {}

    if data.answer:
        answers[rkey][data.task_id] = data.answer
    if data.selected_option:
        answers[rkey][data.task_id] = data.selected_option
    if data.code:
        code_subs[rkey][data.task_id] = data.code

    attempt.answers = answers
    attempt.code_submissions = code_subs
    attempt.current_round = max(attempt.current_round, data.round_number)
    db.commit()
    return {"status": "saved", "round": data.round_number, "task": data.task_id}


@router.post("/attempts/{attempt_id}/complete-round")
def complete_round(
    attempt_id: int,
    round_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    attempt = db.query(SimulationAttempt).filter(
        SimulationAttempt.id == attempt_id,
        SimulationAttempt.candidate_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    completed = list(attempt.completed_rounds or [])
    if round_number not in completed:
        completed.append(round_number)
    attempt.completed_rounds = completed
    attempt.current_round = min(round_number + 1, 5)
    db.commit()
    return {"status": "round_completed", "next_round": attempt.current_round}


@router.post("/attempts/{attempt_id}/submit")
def submit_simulation(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    """Final submission — triggers AI evaluation."""
    attempt = db.query(SimulationAttempt).filter(
        SimulationAttempt.id == attempt_id,
        SimulationAttempt.candidate_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == AttemptStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Already submitted.")

    blueprint = db.query(SimulationBlueprint).filter(
        SimulationBlueprint.id == attempt.blueprint_id
    ).first()

    # Gather behavior events
    events = db.query(CandidateBehaviorLog).filter(
        CandidateBehaviorLog.attempt_id == attempt_id
    ).all()
    event_dicts = [{"event_type": e.event_type, "event_data": e.event_data, "severity": e.severity} for e in events]

    # AI Evaluation
    eval_result = ai_evaluation_engine.evaluate_attempt(
        attempt_data={
            "answers": attempt.answers,
            "code_submissions": attempt.code_submissions,
            "behavior_events": event_dicts,
        },
        blueprint={"rounds": blueprint.rounds} if blueprint else {"rounds": []}
    )

    now = datetime.utcnow().isoformat()
    attempt.status = AttemptStatus.EVALUATED
    attempt.submitted_at = now
    attempt.total_score = eval_result["total_score"]
    attempt.round_scores = eval_result["round_scores"]
    attempt.cheating_risk_score = eval_result["cheating_risk_score"]
    attempt.ai_dependency_score = eval_result["ai_dependency_score"]
    attempt.cheating_risk_level = eval_result["cheating_risk_level"]
    attempt.evaluation_report = eval_result

    # Update application
    app = db.query(InternshipApplication).filter(
        InternshipApplication.id == attempt.application_id
    ).first()
    if app:
        app.status = ApplicationStatus.SIMULATION_COMPLETED
        app.attempt_id = attempt_id
        app.final_score = str(round(eval_result["total_score"], 1))
        app.recommendation = eval_result["recommendation"]

    db.commit()
    logger.info(f"Simulation submitted: attempt={attempt_id} score={eval_result['total_score']}")
    return {
        "status": "submitted",
        "total_score": eval_result["total_score"],
        "recommendation": eval_result["recommendation"],
        "cheating_risk_level": eval_result["cheating_risk_level"],
    }


@router.post("/attempts/{attempt_id}/events")
def log_behavior_event(
    attempt_id: int,
    events: List[BehaviorEvent],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    """Log anti-cheat behavioral events."""
    for ev in events:
        log = CandidateBehaviorLog(
            attempt_id=attempt_id,
            candidate_id=current_user.id,
            event_type=ev.event_type,
            timestamp=ev.timestamp,
            round_number=ev.round_number,
            task_index=ev.task_index,
            event_data=ev.event_data,
            severity=ev.severity,
        )
        db.add(log)
    db.commit()
    return {"status": "logged", "count": len(events)}


@router.get("/attempts/{attempt_id}/report")
def get_evaluation_report(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    attempt = db.query(SimulationAttempt).filter(SimulationAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.candidate_id != current_user.id and not current_user.is_hr:
        raise HTTPException(status_code=403, detail="Access denied")
    if not attempt.evaluation_report:
        raise HTTPException(status_code=404, detail="Evaluation not yet completed")

    candidate = db.query(User).filter(User.id == attempt.candidate_id).first()
    blueprint = db.query(SimulationBlueprint).filter(SimulationBlueprint.id == attempt.blueprint_id).first()
    events = db.query(CandidateBehaviorLog).filter(CandidateBehaviorLog.attempt_id == attempt_id).all()

    return {
        "attempt_id": attempt_id,
        "candidate": {"id": candidate.id, "name": candidate.full_name, "email": candidate.email} if candidate else {},
        "role": blueprint.role_name if blueprint else "Unknown",
        "specialization": blueprint.specialization if blueprint else None,
        "total_score": attempt.total_score,
        "round_scores": attempt.round_scores,
        "cheating_risk_score": attempt.cheating_risk_score,
        "ai_dependency_score": attempt.ai_dependency_score,
        "cheating_risk_level": attempt.cheating_risk_level,
        "evaluation_report": attempt.evaluation_report,
        "behavior_events": len(events),
        "submitted_at": attempt.submitted_at,
    }
