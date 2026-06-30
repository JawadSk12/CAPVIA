"""Internship Schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.internship import InternshipStatus, WorkMode


class InternshipCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = []
    technologies: Optional[List[str]] = []
    preferred_qualifications: Optional[str] = None
    stipend_min: Optional[int] = None
    stipend_max: Optional[int] = None
    stipend_currency: str = "INR"
    duration_months: Optional[int] = None
    start_date: Optional[str] = None
    location: Optional[str] = None
    work_mode: WorkMode = WorkMode.REMOTE
    openings: int = 1
    deadline: Optional[str] = None
    simulation_enabled: bool = False
    tags: Optional[List[str]] = []
    perks: Optional[List[str]] = []


class InternshipUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    stipend_min: Optional[int] = None
    stipend_max: Optional[int] = None
    duration_months: Optional[int] = None
    location: Optional[str] = None
    work_mode: Optional[WorkMode] = None
    openings: Optional[int] = None
    deadline: Optional[str] = None
    simulation_enabled: Optional[bool] = None
    status: Optional[InternshipStatus] = None
    tags: Optional[List[str]] = None


class CompanyBasic(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    class Config:
        from_attributes = True


class InternshipResponse(BaseModel):
    id: int
    title: str
    company_id: int
    created_by: Optional[int] = None
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    required_skills: Optional[List[str]] = []
    technologies: Optional[List[str]] = []
    stipend_min: Optional[int] = None
    stipend_max: Optional[int] = None
    stipend_currency: str = "INR"
    duration_months: Optional[int] = None
    start_date: Optional[str] = None
    location: Optional[str] = None
    work_mode: WorkMode = WorkMode.REMOTE
    openings: int = 1
    applications_count: int = 0
    status: InternshipStatus
    deadline: Optional[str] = None
    simulation_enabled: bool = False
    detected_role: Optional[str] = None
    detected_specialization: Optional[str] = None
    role_confidence: Optional[float] = None
    tags: Optional[List[str]] = []
    perks: Optional[List[str]] = []
    is_featured: bool = False
    created_at: datetime
    company: Optional[CompanyBasic] = None

    class Config:
        from_attributes = True
