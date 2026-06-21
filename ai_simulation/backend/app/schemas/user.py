"""
User Schemas — Extended for CAPVIA
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    position: Optional[str] = None


class HRRegister(BaseModel):
    """HR signup schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    company_name: str
    position: Optional[str] = None
    phone: Optional[str] = None


class CandidateRegister(BaseModel):
    """Candidate signup schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    skills: Optional[List[str]] = []
    linkedin_url: Optional[str] = None
    years_of_experience: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: Optional[UserRole] = UserRole.CANDIDATE


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    position: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    years_of_experience: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole
    status: UserStatus
    is_active: bool
    is_verified: bool
    organization: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    years_of_experience: Optional[str] = None
    last_login: Optional[str] = None
    login_count: str = "0"
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class VerifyEmailRequest(BaseModel):
    token: str