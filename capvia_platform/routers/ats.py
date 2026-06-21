import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.api.dependencies import get_db, get_system_auth, get_candidate_auth
from capvia_platform.schemas.schemas import (
    ResumeUploadResponse, ResumeComparisonResponse, ATSResultResponse, RequiredSkillsAnalysis, SkillMatchItem
)

router = APIRouter()

@router.post("/resume/upload", response_model=ResumeUploadResponse, tags=["ATS"])
async def upload_resume(
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 1.1: Uploads a resume to start parsing. Securely authorized via System JWT.
    """
    mock_resume_id = str(uuid.uuid4())
    return ResumeUploadResponse(resume_id=mock_resume_id, status="UPLOADED")

@router.post("/internship/{jd_id}/compare/{resume_id}", response_model=ResumeComparisonResponse, tags=["ATS"])
async def compare_resume(
    jd_id: str,
    resume_id: str,
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 1.2: Compares a resume against a Job Description. Securely authorized via System JWT.
    """
    return ResumeComparisonResponse(resume_id=resume_id, jd_id=jd_id, status="PENDING")

@router.get("/internship/{jd_id}/result/{resume_id}", response_model=ATSResultResponse, tags=["ATS"])
async def get_ats_result(
    jd_id: str,
    resume_id: str,
    system_claims: dict = Depends(get_system_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    Sequence 1.3: Fetches final parsed results and skill gap analysis. Securely authorized via System JWT.
    """
    # Return mock ATS evaluation data conforming strictly to contract
    return ATSResultResponse(
        resume_id=resume_id,
        overall_score=82.5,
        required_skills_analysis=RequiredSkillsAnalysis(
            matches=[
                SkillMatchItem(target="Python", match="Python", score=1.0),
                SkillMatchItem(target="SQL", match="SQL", score=1.0)
            ]
        )
    )
