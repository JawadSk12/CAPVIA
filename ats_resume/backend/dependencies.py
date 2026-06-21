"""
backend/dependencies.py
────────────────────────
Reusable FastAPI dependency functions injected via Depends().

Every route handler that needs auth, pagination, or a DB session
should declare these as parameters — never import them directly.

Usage:
    from dependencies import get_db, get_current_user, require_hr

    @router.get("/candidates")
    async def list_candidates(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(require_hr),
        pagination: PaginationParams = Depends(pagination_params),
    ):
        ...
"""

from __future__ import annotations

from typing import Annotated, AsyncGenerator
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# ── JWT auth scheme (Bearer token in Authorization header) ────────────────────
bearer_scheme = HTTPBearer(auto_error=False)


# ── Database Session ─────────────────────────────────────────────────────────

async def get_db():  # type: ignore[return]
    """
    Yields an async SQLAlchemy session per request.
    Session is committed on success, rolled back on exception, always closed.

    Usage:
        db: AsyncSession = Depends(get_db)
    """
    try:
        from db.postgres import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    except ImportError:
        # Graceful degradation when DB not configured (testing)
        yield None


# ── Current User ──────────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """
    Validates the Bearer JWT token and returns the authenticated user.
    Raises 401 if token is missing, expired, or invalid.

    Usage:
        current_user = Depends(get_current_user)
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        from core.auth import decode_access_token, get_user_from_token
        payload = decode_access_token(credentials.credentials)
        user    = await get_user_from_token(payload)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated",
            )
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Role Guards ───────────────────────────────────────────────────────────────

async def require_student(current_user=Depends(get_current_user)):
    """Dependency that allows STUDENT and ADMIN only."""
    if current_user.role not in ("STUDENT", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return current_user


async def require_hr(current_user=Depends(get_current_user)):
    """Dependency that allows HR and ADMIN only."""
    if current_user.role not in ("HR", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required",
        )
    return current_user


async def require_admin(current_user=Depends(get_current_user)):
    """Dependency that allows ADMIN only."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginationParams:
    """
    Standard pagination query parameters injected via Depends().
    Provides validated page/limit with sensible defaults and caps.
    """
    def __init__(
        self,
        page:  int = Query(default=1,  ge=1,         description="Page number (1-indexed)"),
        limit: int = Query(default=20, ge=1, le=100, description="Items per page (max 100)"),
    ):
        self.page   = page
        self.limit  = limit
        self.offset = (page - 1) * limit


def pagination_params(
    page:  int = Query(default=1,  ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> PaginationParams:
    """Convenience function form of PaginationParams for Depends()."""
    return PaginationParams(page=page, limit=limit)


# ── Resume Ownership Guard ────────────────────────────────────────────────────

async def get_resume_or_404(
    resume_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns a Resume ORM object only if:
    - The resume exists in the database
    - The caller is the owner OR an HR/ADMIN user

    Raises 404 if not found, 403 if not authorized.
    """
    try:
        from models.resume import Resume
        from sqlalchemy import select
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found")
        if current_user.role == "STUDENT" and resume.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this resume")
        return resume
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Resume not found")


# ── Type Aliases ──────────────────────────────────────────────────────────────

DbDep          = Annotated[object, Depends(get_db)]
CurrentUserDep = Annotated[object, Depends(get_current_user)]
StudentDep     = Annotated[object, Depends(require_student)]
HRDep          = Annotated[object, Depends(require_hr)]
AdminDep       = Annotated[object, Depends(require_admin)]
PageDep        = Annotated[PaginationParams, Depends(pagination_params)]
