"""
System-to-Service Router for CAPVIA Integration
Handles vacancy registration and candidate mapping with System JWT authorization
"""

import uuid
import secrets
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError

from app.db.session import get_db
from app.core.config import settings
from app.models.user import User, UserRole, UserStatus
from app.models.company import Company
from app.models.internship import Internship, InternshipStatus
from app.models.application import InternshipApplication, ApplicationStatus
from app.models.simulation_blueprint import SimulationBlueprint
from app.services.internship_understanding_engine import internship_understanding_engine
from app.services.simulation_blueprint_generator import simulation_blueprint_generator
from loguru import logger

router = APIRouter()

# ========================================
# SCHEMAS
# ========================================
class SystemInternshipCreate(BaseModel):
    title: str
    company_name: str
    description: Optional[str] = None
    required_skills: List[str] = []
    technologies: List[str] = []

class SystemInternshipResponse(BaseModel):
    simulation_internship_id: int

class SystemRegisterCandidate(BaseModel):
    external_application_uuid: str
    external_candidate_uuid: str
    email: EmailStr
    full_name: str
    skills_from_resume: List[str] = []

class SystemRegisterCandidateResponse(BaseModel):
    simulation_candidate_id: int
    simulation_application_id: int


# ========================================
# SECURITY DEPENDENCY
# ========================================
def verify_system_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required in Authorization header"
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if "system_admin" not in payload.get("roles", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bypassing HR gate requires system_admin privileges"
            )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


# ========================================
# BLUEPRINT GENERATION HELPER
# ========================================
def _generate_blueprint(db: Session, internship: Internship, role_intel: dict) -> SimulationBlueprint:
    existing = db.query(SimulationBlueprint).filter(SimulationBlueprint.internship_id == internship.id).first()
    if existing:
        db.delete(existing)
        db.flush()

    full_data = {
        "id": internship.id,
        "title": internship.title,
        "description": internship.description or "",
        "responsibilities": "",
        "requirements": "",
        "required_skills": list(internship.required_skills or []),
        "technologies": list(internship.technologies or []),
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


# ========================================
# ROUTE HANDLERS
# ========================================
@router.post("/internships", response_model=SystemInternshipResponse)
def register_internship_system(
    data: SystemInternshipCreate,
    db: Session = Depends(get_db),
    _token_payload: dict = Depends(verify_system_token)
):
    """System endpoint to register a new internship vacancy in the simulation engine."""
    # 1. Resolve company
    company = db.query(Company).filter(Company.name == data.company_name).first()
    if not company:
        slug = re.sub(r"[^a-z0-9]+", "-", data.company_name.lower()).strip("-") + "-" + secrets.token_hex(2)
        company = Company(
            name=data.company_name,
            slug=slug,
            is_active=True,
            is_verified=True
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    # 2. Run role intelligence
    role_intel = internship_understanding_engine.analyze(data.dict())

    # 3. Create internship
    internship = Internship(
        title=data.title,
        company_id=company.id,
        description=data.description,
        required_skills=data.required_skills,
        technologies=data.technologies,
        simulation_enabled=True,
        status=InternshipStatus.ACTIVE,
        detected_role=role_intel.get("detected_role_name", "Backend Developer"),
        detected_role_key=role_intel.get("detected_role_key", "general"),
        detected_specialization=role_intel.get("detected_specialization"),
        role_confidence=role_intel.get("role_confidence", 0.90),
    )
    db.add(internship)
    db.commit()
    db.refresh(internship)

    # 4. Generate blueprint
    _generate_blueprint(db, internship, role_intel)

    logger.info(f"[SYSTEM] Registered internship '{internship.title}' (ID: {internship.id}) for company '{company.name}'")
    return SystemInternshipResponse(simulation_internship_id=internship.id)


@router.post("/internships/{internship_id}/register-candidate", response_model=SystemRegisterCandidateResponse)
def register_candidate_system(
    internship_id: int,
    data: SystemRegisterCandidate,
    db: Session = Depends(get_db),
    _token_payload: dict = Depends(verify_system_token)
):
    """System endpoint to register a candidate mapping and create an application in the simulation engine."""
    # 1. Verify internship exists
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    # 2. Resolve candidate user
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        random_pw = secrets.token_urlsafe(16)
        user = User(
            email=data.email,
            username=data.email.split("@")[0] + "_" + secrets.token_hex(2),
            full_name=data.full_name,
            hashed_password=get_password_hash(random_pw) if 'get_password_hash' in globals() else random_pw,
            role=UserRole.CANDIDATE.value,
            status=UserStatus.ACTIVE.value,
            is_active=True,
            is_verified=True,
            skills=data.skills_from_resume
        )
        # Import password hashing helper from security if needed
        from app.core.security import get_password_hash
        user.hashed_password = get_password_hash(random_pw)
        
        db.add(user)
        db.commit()
        db.refresh(user)

    # 3. Resolve application
    app = db.query(InternshipApplication).filter(
        InternshipApplication.internship_id == internship_id,
        InternshipApplication.candidate_id == user.id
    ).first()

    if not app:
        app = InternshipApplication(
            internship_id=internship_id,
            candidate_id=user.id,
            status=ApplicationStatus.APPLIED,
            cover_letter="System registered application"
        )
        db.add(app)
        internship.applications_count = (internship.applications_count or 0) + 1
        db.commit()
        db.refresh(app)

    logger.info(f"[SYSTEM] Registered candidate '{user.email}' (ID: {user.id}) for internship ID {internship_id}")
    return SystemRegisterCandidateResponse(
        simulation_candidate_id=user.id,
        simulation_application_id=app.id
    )
