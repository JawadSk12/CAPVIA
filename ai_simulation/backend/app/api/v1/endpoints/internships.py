"""
Internship Endpoints — Create, list, manage internships (HR)
and browse/apply (Candidates)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_active_user, get_optional_user, require_hr, require_candidate
from app.models.user import User
from app.models.internship import Internship, InternshipStatus
from app.models.company import Company
from app.models.simulation_blueprint import SimulationBlueprint
from app.schemas.internship import InternshipCreate, InternshipUpdate, InternshipResponse
from app.services.internship_understanding_engine import internship_understanding_engine
from app.services.simulation_blueprint_generator import simulation_blueprint_generator
from loguru import logger

router = APIRouter()


@router.post("/", response_model=InternshipResponse, status_code=201)
def create_internship(
    data: InternshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """HR creates an internship. Platform auto-detects role and optionally generates simulation."""
    # Get HR's company
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Please complete your company profile first.")

    # Role intelligence
    role_intel = internship_understanding_engine.analyze(data.dict())

    internship = Internship(
        title=data.title,
        company_id=company.id,
        created_by=current_user.id,
        description=data.description,
        responsibilities=data.responsibilities,
        requirements=data.requirements,
        required_skills=data.required_skills,
        technologies=data.technologies,
        preferred_qualifications=data.preferred_qualifications,
        stipend_min=data.stipend_min,
        stipend_max=data.stipend_max,
        stipend_currency=data.stipend_currency,
        duration_months=data.duration_months,
        start_date=data.start_date,
        location=data.location,
        work_mode=data.work_mode,
        openings=data.openings,
        deadline=data.deadline,
        simulation_enabled=data.simulation_enabled,
        tags=data.tags,
        perks=data.perks,
        status=InternshipStatus.ACTIVE,
        detected_role=role_intel["detected_role_name"],
        detected_role_key=role_intel["detected_role_key"],
        detected_specialization=role_intel["detected_specialization"],
        role_confidence=role_intel["role_confidence"],
        role_taxonomy_category=role_intel["role_taxonomy_category"],
    )
    db.add(internship)
    db.commit()
    db.refresh(internship)

    # Auto-generate simulation blueprint if enabled
    if data.simulation_enabled:
        _generate_blueprint(db, internship, role_intel, data.dict())

    logger.info(f"Internship created: {internship.title} by HR={current_user.id}")
    internship.company = company
    return internship


@router.get("/", response_model=List[InternshipResponse])
def list_internships(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """List internships. HR sees only their own; candidates/guests see all active."""
    q = db.query(Internship)

    if current_user and current_user.is_hr:
        q = q.filter(Internship.created_by == current_user.id)
    else:
        q = q.filter(Internship.status == InternshipStatus.ACTIVE)

    if status_filter:
        try:
            q = q.filter(Internship.status == InternshipStatus(status_filter))
        except ValueError:
            pass
    if search:
        q = q.filter(Internship.title.ilike(f"%{search}%"))

    internships = q.order_by(Internship.created_at.desc()).offset(skip).limit(limit).all()

    # Attach company
    for i in internships:
        i.company = db.query(Company).filter(Company.id == i.company_id).first()
    return internships


@router.get("/{internship_id}", response_model=InternshipResponse)
def get_internship(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    internship.company = db.query(Company).filter(Company.id == internship.company_id).first()
    return internship


@router.put("/{internship_id}", response_model=InternshipResponse)
def update_internship(
    internship_id: int,
    data: InternshipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    internship = db.query(Internship).filter(
        Internship.id == internship_id,
        Internship.created_by == current_user.id
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(internship, field, value)

    # Re-run role detection if key fields changed
    if any(f in data.dict(exclude_unset=True) for f in ["title", "description", "required_skills", "technologies"]):
        role_intel = internship_understanding_engine.analyze(internship.__dict__)
        internship.detected_role = role_intel["detected_role_name"]
        internship.detected_role_key = role_intel["detected_role_key"]
        internship.detected_specialization = role_intel["detected_specialization"]
        internship.role_confidence = role_intel["role_confidence"]

    # (Re-)generate blueprint if simulation just enabled
    if data.simulation_enabled and not internship.blueprint_id:
        role_intel = internship_understanding_engine.analyze(internship.__dict__)
        _generate_blueprint(db, internship, role_intel, internship.__dict__)

    db.commit()
    db.refresh(internship)
    internship.company = db.query(Company).filter(Company.id == internship.company_id).first()
    return internship


@router.get("/{internship_id}/blueprint")
def get_blueprint(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get blueprint — accessible by HR (manage) and candidates (during simulation)."""
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    if not internship.blueprint_id:
        raise HTTPException(status_code=404, detail="No simulation blueprint generated yet. Enable AI Simulation first.")
    blueprint = db.query(SimulationBlueprint).filter(SimulationBlueprint.id == internship.blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return {
        "blueprint_id": blueprint.id,
        "role_name": blueprint.role_name,
        "specialization": blueprint.specialization,
        "difficulty": blueprint.difficulty,
        "total_duration_minutes": blueprint.total_duration_minutes,
        "total_tasks": blueprint.total_tasks,
        "rounds": blueprint.rounds,
        "round_weights": blueprint.round_weights,
        "keywords_detected": blueprint.keywords_detected,
    }


@router.post("/{internship_id}/generate-simulation")
def generate_simulation(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """Manually trigger simulation blueprint generation."""
    internship = db.query(Internship).filter(
        Internship.id == internship_id,
        Internship.created_by == current_user.id
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    role_intel = internship_understanding_engine.analyze(internship.__dict__)
    blueprint = _generate_blueprint(db, internship, role_intel, internship.__dict__)

    internship.simulation_enabled = True
    db.commit()
    return {"message": "Simulation generated", "blueprint_id": blueprint.id, "role_detected": blueprint.role_name}


@router.get("/{internship_id}/rankings")
def get_rankings(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """Get ranked candidates for an internship."""
    from app.models.simulation_attempt import SimulationAttempt, AttemptStatus
    from app.schemas.application import RankingEntry

    attempts = db.query(SimulationAttempt).filter(
        SimulationAttempt.internship_id == internship_id,
        SimulationAttempt.status == AttemptStatus.EVALUATED
    ).order_by(SimulationAttempt.total_score.desc()).all()

    rankings = []
    for rank, attempt in enumerate(attempts, start=1):
        candidate = db.query(User).filter(User.id == attempt.candidate_id).first()
        if not candidate:
            continue
        rankings.append({
            "rank": rank,
            "candidate_id": attempt.candidate_id,
            "candidate_name": candidate.full_name or candidate.email,
            "candidate_email": candidate.email,
            "total_score": attempt.total_score or 0,
            "round_scores": attempt.round_scores or {},
            "cheating_risk_level": attempt.cheating_risk_level or "LOW",
            "ai_dependency_score": attempt.ai_dependency_score or 0,
            "recommendation": attempt.evaluation_report.get("recommendation", "consider") if attempt.evaluation_report else "consider",
            "attempt_id": attempt.id,
            "submitted_at": attempt.submitted_at,
        })
    return {"internship_id": internship_id, "total_candidates": len(rankings), "rankings": rankings}

def _generate_blueprint(db: Session, internship: Internship, role_intel: dict, raw_data: dict) -> SimulationBlueprint:
    """Dynamic blueprint — synthesized from full internship context."""
    existing = db.query(SimulationBlueprint).filter(SimulationBlueprint.internship_id == internship.id).first()
    if existing:
        db.delete(existing)
        db.flush()

    # Full internship context for the dynamic synthesis engine
    full_data = {
        "id": internship.id,
        "title": internship.title,
        "description": getattr(internship, "description", "") or "",
        "responsibilities": getattr(internship, "responsibilities", "") or "",
        "requirements": getattr(internship, "requirements", "") or "",
        "required_skills": list(getattr(internship, "required_skills", []) or []),
        "technologies": list(getattr(internship, "technologies", []) or []),
    }

    bp_data = simulation_blueprint_generator.generate(
        internship_id=internship.id,
        role_key=role_intel.get("detected_role_key", "general"),
        role_name=internship.title,
        specialization=role_intel.get("detected_specialization"),
        internship_data=full_data,
    )

    blueprint = SimulationBlueprint(
        internship_id=internship.id,
        role_key=bp_data["role_key"],
        role_name=internship.title or bp_data["role_name"],
        specialization=bp_data.get("specialization"),
        difficulty=bp_data["difficulty"],
        randomization_seed=bp_data["randomization_seed"],
        rounds=bp_data["rounds"],
        total_duration_minutes=bp_data["total_duration_minutes"],
        total_tasks=bp_data["total_tasks"],
        round_weights=[r["scoring_weight"] for r in bp_data["rounds"]],
        keywords_detected=bp_data.get("capability_graph_summary", {}).get("primary_skills", []),
        datasets_used=[bp_data.get("capability_graph_summary", {}).get("dataset_used", "")],
    )
    db.add(blueprint)
    db.flush()
    internship.blueprint_id = blueprint.id
    db.commit()
    db.refresh(blueprint)
    return blueprint

