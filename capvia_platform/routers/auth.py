import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import redis.asyncio as aioredis

from capvia_platform.api.dependencies import get_db, get_redis, get_current_user
from capvia_platform.schemas.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest
)
from capvia_platform.models.models import User, UserRole, UserSession, ActivityLog
from capvia_platform.utils.auth import (
    hash_password, verify_password, hash_token,
    create_access_token, create_refresh_token, decode_token
)
from capvia_platform.core.exceptions import BaseAPIException, AuthorizationException

router = APIRouter(prefix="/auth")

@router.post("/register", tags=["Auth"])
async def register_user(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Registers a new user (defaulting to STUDENT/candidate).
    Enforces privilege escalation checks: standard users cannot register as admin or hr.
    """
    # Check if email is already taken
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise BaseAPIException("Email address already registered", status_code=400, code="BAD_REQUEST")
        
    # Prevent privilege escalation
    target_role = payload.role.lower() if payload.role else "candidate"
    if target_role in ["hr", "admin"]:
        raise AuthorizationException("Only administrators can provision staff/HR accounts")
        
    db_role = UserRole.STUDENT # candidate
    
    # Hash password using bcrypt
    hashed_pwd = hash_password(payload.password)
    
    new_user = User(
        email=payload.email,
        password_hash=hashed_pwd,
        full_name=payload.full_name,
        role=db_role,
        is_active=False # Inactive until email is verified
    )
    
    db.add(new_user)
    await db.flush()
    
    # Write Audit Log
    audit = ActivityLog(
        user_id=new_user.id,
        action="USER_REGISTRATION",
        description=f"User {payload.email} registered successfully as {target_role}."
    )
    db.add(audit)
    
    # Generate Email Verification Token
    verify_token = secrets.token_urlsafe(32)
    # Store token in Redis pointing to user email (24-hour expiration)
    await redis.set(f"email_verify:{verify_token}", str(payload.email), ex=86400)
    
    # Print simulated email link to console
    verify_link = f"http://localhost:3000/auth/verify?token={verify_token}"
    print(f"\n[SIMULATED EMAIL SENDER] Verification link for {payload.email}:\n{verify_link}\n")
    
    return {
        "success": True, 
        "message": "User registered successfully. Please verify your email.",
        "simulated_token": verify_token
    }

@router.post("/login", response_model=TokenResponse, tags=["Auth"])
async def login_user(
    payload: UserLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs in a user, records device info/IP, tracks the session, and writes to audit logs.
    """
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        raise AuthorizationException("Incorrect email or password")
        
    if not verify_password(payload.password, user.password_hash):
        # Audit Log failed attempt
        audit = ActivityLog(
            user_id=user.id,
            action="LOGIN_FAILED",
            description="Failed login attempt due to incorrect password.",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(audit)
        raise AuthorizationException("Incorrect email or password")
        
    if not user.is_active:
        raise AuthorizationException("Email address is not verified. Please verify your email first.")
        
    # Generate Access & Refresh Tokens
    # Translate STUDENT -> candidate
    role_str = "candidate" if user.role == UserRole.STUDENT else user.role.value.lower()
    
    access_token = create_access_token(user.id, user.email, role_str)
    refresh_token = create_refresh_token(user.id)
    
    # Hash refresh token for DB storage
    ref_hash = hash_token(refresh_token)
    
    # Create persistent session record for device tracking / rotation
    session_record = UserSession(
        user_id=user.id,
        refresh_token_hash=ref_hash,
        device_info=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session_record)
    
    # Log successful login
    audit = ActivityLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        description="User logged in successfully.",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(audit)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=role_str,
        full_name=user.full_name
    )

@router.post("/logout", tags=["Auth"])
async def logout_user(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs out a user and revokes the session refresh token.
    """
    ref_hash = hash_token(payload.refresh_token)
    
    # Decode to fetch user_id for logging
    try:
        token_claims = decode_token(payload.refresh_token, expected_type="refresh")
        user_uuid = uuid.UUID(token_claims.get("sub"))
    except Exception:
        user_uuid = None
        
    # Mark session as revoked
    stmt = update(UserSession).where(UserSession.refresh_token_hash == ref_hash).values(is_revoked=True)
    await db.execute(stmt)
    
    if user_uuid:
        audit = ActivityLog(
            user_id=user_uuid,
            action="LOGOUT",
            description="User logged out and session revoked."
        )
        db.add(audit)
        
    return {"success": True, "message": "Logged out successfully"}

@router.post("/refresh", response_model=TokenResponse, tags=["Auth"])
async def refresh_tokens(
    payload: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes Refresh Token Rotation (RTR). 
    Detects token replay/reuse attacks and immediately revokes all family sessions if found.
    """
    # 1. Decode refresh token
    claims = decode_token(payload.refresh_token, expected_type="refresh")
    user_id_str = claims.get("sub")
    user_uuid = uuid.UUID(user_id_str)
    
    # 2. Hash refresh token
    old_hash = hash_token(payload.refresh_token)
    
    # 3. Retrieve session
    stmt = select(UserSession).where(UserSession.refresh_token_hash == old_hash)
    res = await db.execute(stmt)
    session_record = res.scalar_one_or_none()
    
    # 4. RTR Replay Attack Protection:
    # If the token exists but is already marked revoked, it means it was rotated previously,
    # indicating a reuse attempt (someone stole the token).
    if not session_record or session_record.is_revoked or session_record.expires_at < datetime.utcnow():
        # Threat detected: Revoke ALL sessions for this user
        revoke_all = update(UserSession).where(UserSession.user_id == user_uuid).values(is_revoked=True)
        await db.execute(revoke_all)
        
        audit = ActivityLog(
            user_id=user_uuid,
            action="SECURITY_ALERT",
            description="Refresh token reuse detected. Revoking all active user sessions.",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(audit)
        raise AuthorizationException("Replay attack detected. All active sessions have been terminated.")
        
    # 5. Revoke the old token
    session_record.is_revoked = True
    
    # 6. Retrieve User Details
    user = await db.get(User, user_uuid)
    if not user or not user.is_active:
        raise AuthorizationException("User account is inactive or disabled")
        
    # 7. Generate a new Token Pair
    role_str = "candidate" if user.role == UserRole.STUDENT else user.role.value.lower()
    new_access = create_access_token(user.id, user.email, role_str)
    new_refresh = create_refresh_token(user.id)
    
    # 8. Create a new active session
    new_hash = hash_token(new_refresh)
    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=new_hash,
        device_info=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(new_session)
    
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        role=role_str,
        full_name=user.full_name
    )

@router.post("/forgot-password", tags=["Auth"])
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Generates a password reset token if email exists, saving it to Redis.
    """
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    # Fail silently to avoid email enumeration attacks
    if not user:
        return {"success": True, "message": "If the email is registered, a password reset link will be sent."}
        
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    # Store token with 15-minute TTL
    await redis.set(f"reset_pass:{reset_token}", str(user.email), ex=900)
    
    # Print simulated reset link
    reset_link = f"http://localhost:3000/auth/reset-password?token={reset_token}"
    print(f"\n[SIMULATED EMAIL SENDER] Password Reset link for {user.email}:\n{reset_link}\n")
    
    # Write Audit Log
    audit = ActivityLog(
        user_id=user.id,
        action="FORGOT_PASSWORD_REQUESTED",
        description="Password reset token generated and simulated."
    )
    db.add(audit)
    
    return {
        "success": True, 
        "message": "If the email is registered, a password reset link will be sent.",
        "simulated_token": reset_token
    }

@router.post("/reset-password", tags=["Auth"])
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Validates password reset token, updates password, and revokes all active sessions.
    """
    email_bytes = await redis.get(f"reset_pass:{payload.token}")
    if not email_bytes:
        raise BaseAPIException("Invalid or expired password reset token", status_code=400, code="BAD_REQUEST")
        
    email_str = email_bytes.decode('utf-8')
    
    stmt = select(User).where(User.email == email_str)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        raise BaseAPIException("User account not found", status_code=404, code="NOT_FOUND")
        
    # Update password hash
    user.password_hash = hash_password(payload.new_password)
    
    # Force revoke all active user sessions to protect credentials
    revoke_all = update(UserSession).where(UserSession.user_id == user.id).values(is_revoked=True)
    await db.execute(revoke_all)
    
    # Delete token from Redis
    await redis.delete(f"reset_pass:{payload.token}")
    
    # Write Audit Log
    audit = ActivityLog(
        user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        description="Password reset successfully and all active sessions revoked."
    )
    db.add(audit)
    
    return {"success": True, "message": "Password reset successfully. You can now login with your new credentials."}

@router.post("/verify-email", tags=["Auth"])
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Verifies user's email using token from Redis, activating the profile.
    """
    email_bytes = await redis.get(f"email_verify:{payload.token}")
    if not email_bytes:
        raise BaseAPIException("Invalid or expired email verification token", status_code=400, code="BAD_REQUEST")
        
    email_str = email_bytes.decode('utf-8')
    
    stmt = select(User).where(User.email == email_str)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        raise BaseAPIException("User account not found", status_code=404, code="NOT_FOUND")
        
    # Activate user account
    user.is_active = True
    
    # Delete token
    await redis.delete(f"email_verify:{payload.token}")
    
    # Write Audit Log
    audit = ActivityLog(
        user_id=user.id,
        action="EMAIL_VERIFIED",
        description="Email address verified and user account activated."
    )
    db.add(audit)
    
    return {"success": True, "message": "Email address verified successfully. Your account is now active."}
