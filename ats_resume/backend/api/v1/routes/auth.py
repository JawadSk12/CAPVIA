"""
backend/api/v1/routes/auth.py
───────────────────────────────
Authentication routes: register, login, refresh, logout, me.

Token strategy:
  - Access token in JSON response body (frontend stores in memory)
  - Refresh token in httpOnly cookie (can't be accessed by JS)

Security:
  - bcrypt password hashing (cost 12)
  - Rate limited: 5 requests/minute per IP
  - Audit logged: all auth events
  - Duplicate email check with timing-safe comparison
"""



from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.auth import (
    TokenPayload,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_payload,
    hash_password,
    verify_password,
    AuthenticationError,
)
from core.security import limiter
from core.audit import log_audit_event
from db.postgres import get_db
from db.redis_client import (
    blacklist_token,
    get_redis,
    is_token_blacklisted,
)
from models.audit_log import AuditAction
from models.user import User, UserRole
from schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshResponse,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = structlog.get_logger(__name__)

REFRESH_COOKIE_NAME = "capvia_refresh_token"


# ─── Register ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> TokenResponse:
    """
    Register a new STUDENT or HR account.

    - Validates email uniqueness
    - Hashes password with bcrypt (cost 12)
    - Creates user record in PostgreSQL
    - Returns JWT access token + sets refresh token cookie
    """
    # Check if email already taken
    existing = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create user
    new_user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role=UserRole(body.role),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    await db.flush()  # Get the generated UUID
    await db.refresh(new_user)

    # Audit log
    await log_audit_event(
        session=db,
        action=AuditAction.AUTH_REGISTER,
        user_id=new_user.id,
        user_email=new_user.email,
        user_role=new_user.role,
        metadata={"role": body.role},
    )

    await db.commit()

    # Generate tokens
    access_token = create_access_token(new_user.id, new_user.role)
    refresh_token = create_refresh_token(new_user.id, new_user.role)

    # Set refresh token as httpOnly cookie
    _set_refresh_cookie(response, refresh_token)

    logger.info("user_registered", user_id=new_user.id, role=body.role)

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(new_user),
    )


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> TokenResponse:
    """
    Authenticate with email + password.

    Returns access token in body, sets refresh cookie.
    Uses timing-safe comparison to prevent email enumeration.
    """
    # Find user
    with open("login_debug.log", "a") as f:
        f.write(f"--- Login attempt at {datetime.now()} ---\n")
        f.write(f"Email: {body.email.lower()}\n")

    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user:
        with open("login_debug.log", "a") as f:
            f.write("User NOT found in DB\n")
    else:
        with open("login_debug.log", "a") as f:
            f.write(f"User found: {user.id}\n")

    # Constant-time failure to prevent email enumeration
    # This is a real valid bcrypt hash for the word 'dummy'
    dummy_hash = "$2b$12$w2G4uY6e2fGjW4/rXpX9sOWJc0j4/FfWjX3Z9/Jk.2/K.7X5J/P6W"
    stored_hash = user.password_hash if user else dummy_hash
    
    try:
        password_ok = verify_password(body.password, stored_hash)
    except ValueError:
        password_ok = False

    if not user or not password_ok:
        with open("login_debug.log", "a") as f:
            f.write(f"Auth failed: user_found={bool(user)}, password_ok={password_ok}\n")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Contact support.",
        )

    # Update last login timestamp
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(last_login_at=datetime.now(timezone.utc))
    )

    # Audit log
    await log_audit_event(
        session=db,
        action=AuditAction.AUTH_LOGIN,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
    )
    await db.commit()

    # Store user info in request state for audit middleware
    request.state.user_id = user.id
    request.state.user_email = user.email
    request.state.user_role = user.role

    # Generate tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    _set_refresh_cookie(response, refresh_token)

    logger.info("user_logged_in", user_id=user.id)

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


# ─── Refresh ──────────────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh access token using refresh cookie",
)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> RefreshResponse:
    """
    Exchange refresh token for a new access token.

    Reads refresh token from httpOnly cookie.
    Returns new access token in response body.
    Rotates refresh token (old one blacklisted).
    """
    refresh_token_raw = request.cookies.get(REFRESH_COOKIE_NAME)

    if not refresh_token_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found. Please log in again.",
        )

    try:
        payload = decode_token(refresh_token_raw, expected_type="refresh")
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Check blacklist
    if await is_token_blacklisted(payload.jti, redis=redis):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    # Verify user still exists and is active
    user = await db.get(User, payload.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
        )

    # Blacklist old refresh token (token rotation)
    await blacklist_token(payload.jti, payload.expires_in_seconds, redis=redis)

    # Issue new tokens
    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id, user.role)
    _set_refresh_cookie(response, new_refresh)

    return RefreshResponse(
        access_token=new_access,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout and invalidate tokens",
)
async def logout(
    request: Request,
    response: Response,
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> MessageResponse:
    """
    Logout: blacklist current access token and clear refresh cookie.

    Both tokens are invalidated server-side:
    - Access token → blacklisted in Redis (expires naturally after 15 min)
    - Refresh token → blacklisted and cookie cleared
    """
    # Blacklist current access token
    await blacklist_token(
        current_user.jti,
        current_user.expires_in_seconds,
        redis=redis,
    )

    # Also blacklist refresh token if present
    refresh_token_raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token_raw:
        try:
            refresh_payload = decode_token(refresh_token_raw, expected_type="refresh")
            await blacklist_token(
                refresh_payload.jti,
                refresh_payload.expires_in_seconds,
                redis=redis,
            )
        except AuthenticationError:
            pass  # Already expired — no action needed

    # Clear cookie
    response.delete_cookie(REFRESH_COOKIE_NAME)

    # Audit log
    async with __import__("db.postgres", fromlist=["AsyncSessionLocal"]).AsyncSessionLocal() as db_session:
        await log_audit_event(
            session=db_session,
            action=AuditAction.AUTH_LOGOUT,
            user_id=current_user.user_id,
        )
        await db_session.commit()

    logger.info("user_logged_out", user_id=current_user.user_id)
    return MessageResponse(message="Logged out successfully")


# ─── Current User ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(
    current_user: TokenPayload = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Return the authenticated user's profile."""
    user = await db.get(User, current_user.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _set_refresh_cookie(response: Response, token: str) -> None:
    """
    Set the refresh token as a secure httpOnly cookie.

    httpOnly: JS cannot access — XSS-safe
    secure:   HTTPS only in production
    samesite: Lax prevents CSRF for cross-site navigation
    """
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/api/v1/auth",  # Only sent to auth endpoints
    )