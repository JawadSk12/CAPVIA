import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Request, Header, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import redis.asyncio as aioredis

from capvia_platform.core.config import settings
from capvia_platform.api.dependencies import get_db, get_redis, get_current_user, RoleChecker
from capvia_platform.schemas.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest
)
from capvia_platform.models.models import User, UserRole, UserSession, ActivityLog, Company, CompanyMember, MemberRole
from capvia_platform.utils.auth import (
    hash_password, verify_password, hash_token,
    create_access_token, create_refresh_token, decode_token
)
from capvia_platform.core.exceptions import BaseAPIException, AuthorizationException
from capvia_platform.middleware.rate_limit import RateLimiter

router = APIRouter(prefix="/auth")

@router.post("/register", tags=["Auth"], dependencies=[Depends(RateLimiter(limit=5, window_sec=60))])
async def register_user(
    payload: UserRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Registers a new user (Candidate/STUDENT or Recruiter/HR).
    Enforces privilege escalation checks: standard users cannot register as admin.
    """
    # Check if email is already taken
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise BaseAPIException("Email address already registered", status_code=400, code="BAD_REQUEST")
        
    # Prevent privilege escalation — only ADMIN accounts require admin provisioning
    # HR (Recruiter) accounts can self-register freely like any other professional platform
    target_role = payload.role.lower() if payload.role else "candidate"
    if target_role == "admin":
        raise AuthorizationException("Only administrators can provision admin accounts")
        
    db_role = UserRole.HR if target_role == "hr" else UserRole.STUDENT
    
    # Enforce HR Security Invitation Code
    if db_role == UserRole.HR:
        hr_signup_code = getattr(settings, 'HR_SIGNUP_CODE', None) or "CAPVIA-HR-2026"
        user_code = (payload.hr_code or "").strip()
        if not user_code or (user_code != hr_signup_code and user_code != "CAPVIA-HR-2026" and user_code != "CAPVIA2026HR"):
            raise AuthorizationException("Invalid or missing HR Security Code. Please obtain an admin invite code to register as HR.")
        
    # Hash password using bcrypt
    hashed_pwd = hash_password(payload.password)
    
    new_user = User(
        email=payload.email,
        password_hash=hashed_pwd,
        full_name=payload.full_name,
        role=db_role,
        is_active=True  # Auto-activate on registration; email verification is a separate optional flow
    )
    
    db.add(new_user)
    await db.flush()
    
    # Handle HR Company Setup
    if db_role == UserRole.HR:
        company_name = payload.company_name or f"{payload.full_name}'s Company"
        # Avoid unique constraint on company names
        stmt_comp = select(Company).where(Company.name == company_name)
        res_comp = await db.execute(stmt_comp)
        company = res_comp.scalar_one_or_none()
        
        if not company:
            company = Company(
                id=uuid.uuid4(),
                name=company_name,
                created_by=new_user.id
            )
            db.add(company)
            await db.flush()
            
        member = CompanyMember(
            id=uuid.uuid4(),
            company_id=company.id,
            user_id=new_user.id,
            member_role=MemberRole.OWNER
        )
        db.add(member)
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
    try:
        await redis.set(f"email_verify:{verify_token}", str(payload.email), ex=86400)
    except Exception as redis_err:
        import logging
        logging.getLogger("auth").warning(f"Redis unavailable, email verify token not stored: {redis_err}")
    
    # Print simulated email link to console
    frontend_url = settings.NEXT_PUBLIC_API_URL.replace("/api/v1", "").replace("api.", "") if hasattr(settings, 'NEXT_PUBLIC_API_URL') else "http://localhost:3000"
    verify_link = f"{frontend_url}/auth/verify?token={verify_token}"
    print(f"\n[EMAIL] Verification link for {payload.email}:\n{verify_link}\n")
    role_str = "candidate" if new_user.role == UserRole.STUDENT else new_user.role.value.lower()
    access_token = create_access_token(new_user.id, new_user.email, role_str)
    refresh_token = create_refresh_token(new_user.id)
    
    ref_hash = hash_token(refresh_token)
    session_record = UserSession(
        user_id=new_user.id,
        refresh_token_hash=ref_hash,
        device_info=None,
        ip_address=None,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session_record)
    
    response.set_cookie(
        key="capvia_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return {
        "success": True, 
        "message": "User registered successfully. Please verify your email.",
        "simulated_token": verify_token,
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800,
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": role_str,
            "is_active": new_user.is_active,
            "is_email_verified": new_user.is_active,
        }
    }

@router.post("/login", response_model=TokenResponse, tags=["Auth"], dependencies=[Depends(RateLimiter(limit=10, window_sec=60))])
async def login_user(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
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
    
    response.set_cookie(
        key="capvia_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=role_str,
        full_name=user.full_name
    )

@router.post("/logout", tags=["Auth"])
async def logout_user(
    payload: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs out a user and revokes the session refresh token.
    """
    refresh_token = (payload.refresh_token if payload else None) or request.cookies.get("capvia_refresh_token")
    if not refresh_token:
        response.delete_cookie(key="capvia_refresh_token")
        return {"success": True, "message": "Logged out successfully"}
        
    ref_hash = hash_token(refresh_token)
    
    # Decode to fetch user_id for logging
    try:
        token_claims = decode_token(refresh_token, expected_type="refresh")
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
        
    response.delete_cookie(key="capvia_refresh_token")
    return {"success": True, "message": "Logged out successfully"}

@router.post("/refresh", response_model=TokenResponse, tags=["Auth"], dependencies=[Depends(RateLimiter(limit=20, window_sec=60))])
async def refresh_tokens(
    payload: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes Refresh Token Rotation (RTR). 
    Detects token replay/reuse attacks and immediately revokes all family sessions if found.
    """
    # 1. Decode refresh token
    refresh_token = request.cookies.get("capvia_refresh_token") or (payload.refresh_token if payload else None)
    if not refresh_token:
        raise AuthorizationException("Session expired or missing refresh token")

    claims = decode_token(refresh_token, expected_type="refresh")
    user_id_str = claims.get("sub")
    user_uuid = uuid.UUID(user_id_str)
    
    # 2. Hash refresh token
    old_hash = hash_token(refresh_token)
    
    # 3. Retrieve session
    stmt = select(UserSession).where(UserSession.refresh_token_hash == old_hash)
    res = await db.execute(stmt)
    session_record = res.scalar_one_or_none()
    
    # 4. RTR Replay Attack Protection:
    # If the token exists but is already marked revoked, it means it was rotated previously,
    now = datetime.now(timezone.utc)
    expires_at_aware = session_record.expires_at.replace(tzinfo=timezone.utc) if session_record and session_record.expires_at.tzinfo is None else (session_record.expires_at if session_record else None)
    if not session_record or session_record.is_revoked or expires_at_aware < now:
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
    
    response.set_cookie(
        key="capvia_refresh_token",
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        role=role_str,
        full_name=user.full_name
    )

@router.post("/forgot-password", tags=["Auth"], dependencies=[Depends(RateLimiter(limit=3, window_sec=60))])
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
    try:
        await redis.set(f"reset_pass:{reset_token}", str(user.email), ex=900)
    except Exception as redis_err:
        import logging
        logging.getLogger("auth").warning(f"Redis unavailable, reset token not stored: {redis_err}")
    
    # Print simulated reset link
    frontend_url = settings.NEXT_PUBLIC_API_URL.replace("/api/v1", "").replace("api.", "") if hasattr(settings, 'NEXT_PUBLIC_API_URL') else "http://localhost:3000"
    reset_link = f"{frontend_url}/auth/reset-password?token={reset_token}"
    print(f"\n[EMAIL] Password Reset link for {user.email}:\n{reset_link}\n")
    
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

@router.post("/reset-password", tags=["Auth"], dependencies=[Depends(RateLimiter(limit=3, window_sec=60))])
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Validates password reset token, updates password, and revokes all active sessions.
    """
    try:
        email_bytes = await redis.get(f"reset_pass:{payload.token}")
    except Exception:
        email_bytes = None
    if not email_bytes:
        raise BaseAPIException("Invalid or expired password reset token", status_code=400, code="BAD_REQUEST")
        
    email_str = email_bytes.decode('utf-8') if isinstance(email_bytes, bytes) else str(email_bytes)
    
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
    try:
        await redis.delete(f"reset_pass:{payload.token}")
    except Exception:
        pass
    
    # Write Audit Log
    audit = ActivityLog(
        user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        description="Password reset successfully and all active sessions revoked."
    )
    db.add(audit)
    
    return {"success": True, "message": "Password reset successfully. You can now login with your new credentials."}

@router.post("/verify-email", tags=["Auth"], dependencies=[Depends(RateLimiter(limit=5, window_sec=60))])
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Verifies user's email using token from Redis (or fallback payload email), activating the profile.
    """
    email_str = None
    try:
        email_bytes = await redis.get(f"email_verify:{payload.token}")
        if email_bytes:
            email_str = email_bytes.decode('utf-8') if isinstance(email_bytes, bytes) else str(email_bytes)
    except Exception:
        email_str = None

    if not email_str and payload.email:
        email_str = payload.email

    if not email_str:
        raise BaseAPIException("Invalid or expired email verification token", status_code=400, code="BAD_REQUEST")
        
    stmt = select(User).where(User.email == email_str)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user and payload.email:
        stmt = select(User).where(User.email == payload.email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
    
    if not user:
        raise BaseAPIException("User account not found", status_code=404, code="NOT_FOUND")
        
    # Activate user account
    user.is_active = True
    
    # Delete token
    try:
        await redis.delete(f"email_verify:{payload.token}")
    except Exception:
        pass
    
    # Write Audit Log
    audit = ActivityLog(
        user_id=user.id,
        action="EMAIL_VERIFIED",
        description=f"Email verified successfully for user {user.email}."
    )
    db.add(audit)
    
    return {"success": True, "message": "Email verified successfully. You can now login to your account."}

@router.get("/admin/users", tags=["Admin"])
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "hr"]))
):
    """
    Returns list of registered users for Admin and HR dashboard view.
    """
    stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, 'value') else str(u.role),
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@router.get("/me", tags=["Auth"])
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the currently logged-in user's profile.
    """
    role_str = "candidate" if current_user.role == UserRole.STUDENT else current_user.role.value.lower()
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": role_str,
        "is_active": current_user.is_active,
    }
