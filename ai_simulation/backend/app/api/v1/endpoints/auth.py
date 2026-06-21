"""
Auth Endpoints — Full system: register HR, register candidate,
email verification, forgot/reset password, login, me
"""

import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import (
    HRRegister, CandidateRegister, UserLogin, UserResponse,
    TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest
)
from app.repositories.user_repository import user_repository
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.api.deps import get_current_active_user
from app.models.user import User, UserRole, UserStatus
from loguru import logger

router = APIRouter()


def _make_token() -> str:
    return secrets.token_urlsafe(32)


@router.post("/register/hr", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_hr(data: HRRegister, db: Session = Depends(get_db)):
    """Register a new HR user and auto-create company."""
    if user_repository.get_by_email(db, email=data.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = _make_token()
    expires = (datetime.utcnow() + timedelta(hours=48)).isoformat()

    user = User(
        email=data.email,
        username=data.email.split("@")[0] + "_hr",
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.HR,
        status=UserStatus.ACTIVE,   # Dev: skip email verification gate
        is_active=True,
        is_verified=True,           # Dev: auto-verify
        organization=data.company_name,
        position=data.position,
        phone=data.phone,
        verification_token=verification_token,
        verification_token_expires=expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-create company
    from app.models.company import Company
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", data.company_name.lower()).strip("-")
    company = Company(
        name=data.company_name,
        slug=f"{slug}-{user.id}",
        owner_id=user.id,
        email=data.email,
        is_active=True,
    )
    db.add(company)
    db.commit()

    logger.info(f"HR registered: {user.email} company={data.company_name}")
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}


@router.post("/register/candidate", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_candidate(data: CandidateRegister, db: Session = Depends(get_db)):
    """Register a new candidate."""
    if user_repository.get_by_email(db, email=data.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = _make_token()
    expires = (datetime.utcnow() + timedelta(hours=48)).isoformat()

    user = User(
        email=data.email,
        username=data.email.split("@")[0],
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.CANDIDATE,
        status=UserStatus.ACTIVE,
        is_active=True,
        is_verified=True,  # Dev: auto-verify
        skills=data.skills or [],
        linkedin_url=data.linkedin_url,
        years_of_experience=data.years_of_experience,
        verification_token=verification_token,
        verification_token_expires=expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"Candidate registered: {user.email}")
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    user.is_verified = True
    user.status = UserStatus.ACTIVE
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = user_repository.get_by_email(db, email=data.email)
    if user:
        token = _make_token()
        expires = (datetime.utcnow() + timedelta(hours=2)).isoformat()
        user.password_reset_token = token
        user.password_reset_expires = expires
        db.commit()
        # In production: send email with reset link containing token
        logger.info(f"Password reset token for {user.email}: {token}")
    # Always return success to prevent email enumeration
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.password_reset_expires:
        try:
            expires = datetime.fromisoformat(user.password_reset_expires)
            if datetime.utcnow() > expires:
                raise HTTPException(status_code=400, detail="Reset token has expired")
        except ValueError:
            pass
    user.hashed_password = get_password_hash(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = user_repository.authenticate(db, email=credentials.email, password=credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    user_repository.increment_login_count(db, user=user)
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    logger.info(f"Login: {user.email} ({user.role})")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    from app.core.security import decode_token, verify_token_type
    try:
        payload = decode_token(refresh_token)
        if not verify_token_type(payload, "refresh"):
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = user_repository.get(db, id=int(payload.get("sub")))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(subject=user.id)
        new_refresh = create_refresh_token(subject=user.id)
        return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer", "user": user}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user


# Legacy register endpoint (keep for backwards compat)
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: dict, db: Session = Depends(get_db)):
    from app.schemas.user import UserCreate
    from pydantic import ValidationError
    try:
        validated = UserCreate(**user_in)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid registration data")
    if user_repository.get_by_email(db, email=validated.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return user_repository.create_user(db, obj_in=validated)