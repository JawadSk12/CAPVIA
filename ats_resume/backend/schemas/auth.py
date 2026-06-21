"""
backend/schemas/auth.py
────────────────────────
Pydantic v2 schemas for authentication API.

Schemas are the data contracts between frontend and backend.
Pydantic validates, coerces, and serializes all request/response data.

Separation:
  - Request schemas: validate incoming data (passwords, emails)
  - Response schemas: control what gets serialized back to client
    (NEVER include password_hash in responses)
"""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ─── Request Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """
    POST /auth/register request body.
    Validates email format and password strength.
    """
    full_name: str = Field(
        min_length=2,
        max_length=100,
        description="User's full name",
        examples=["Arjun Kumar"],
    )
    email: EmailStr = Field(
        description="Email address (used as login)",
        examples=["arjun@example.com"],
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Password (min 8 chars, must contain uppercase + number)",
    )
    role: str = Field(
        default="STUDENT",
        description="User role: STUDENT or HR",
        examples=["STUDENT"],
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Only STUDENT and HR can self-register. ADMIN is created by existing admin."""
        allowed = {"STUDENT", "HR"}
        if v.upper() not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(allowed)}")
        return v.upper()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Password strength rules:
        - At least 8 characters
        - At least one uppercase letter
        - At least one digit
        - At least one special character
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Names should only contain letters, spaces, hyphens, apostrophes."""
        if not re.match(r"^[a-zA-Z\s\-'\.]+$", v):
            raise ValueError("Name contains invalid characters")
        return v.strip()


class LoginRequest(BaseModel):
    """POST /auth/login request body."""
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    """POST /auth/refresh request body."""
    refresh_token: str = Field(min_length=1)


class PasswordResetRequest(BaseModel):
    """POST /auth/forgot-password request body."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """POST /auth/reset-password request body."""
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


# ─── Response Schemas ─────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """
    User object returned to frontend.
    NEVER includes password_hash, email verification tokens, etc.
    """
    id: str
    email: str
    full_name: str | None
    role: str
    is_active: bool
    is_email_verified: bool
    created_at: datetime
    last_login_at: datetime | None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """
    Response from login and register endpoints.
    Contains access token (in body) and info about refresh token.
    Refresh token itself is set as httpOnly cookie by the route handler.
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds")
    user: UserResponse


class RefreshResponse(BaseModel):
    """Response from token refresh endpoint."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MessageResponse(BaseModel):
    """Generic success message response."""
    message: str
    success: bool = True