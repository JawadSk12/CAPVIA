"""
backend/core/rbac.py
─────────────────────
Role-Based Access Control (RBAC) system.

Architecture:
  - Permission matrix: role → set of permission strings
  - require_permission() decorator for route-level enforcement
  - require_role() decorator for simple role checks
  - Ownership checks for resource-level authorization

Permission format: "{resource}.{action}"
Examples:
  resume.upload, resume.read_own, candidate.shortlist, internship.create

Usage:
    # Single permission check
    @router.post("/resume/upload")
    @require_permission("resume.upload")
    async def upload_resume(...):
        ...

    # Role check (simpler)
    @router.get("/hr/dashboard")
    @require_role(UserRole.HR, UserRole.ADMIN)
    async def hr_dashboard(...):
        ...
"""

from __future__ import annotations

from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, status

from core.auth import TokenPayload, get_current_user_payload
from models.user import UserRole


# ─── Permission Matrix ────────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, set[str]] = {
    UserRole.STUDENT: {
        "resume.upload",
        "resume.read_own",
        "resume.delete_own",
        "resume.reanalyze_own",
        "internship.list",
        "internship.view",
        "ats.view_own",
        "rewrite.request_own",
        "user.update_own_profile",
    },
    UserRole.HR: {
        # All student permissions EXCEPT resume upload for own use
        "resume.read_all",           # can read any resume for their org
        "resume.read_own",
        "ats.view_all",
        "internship.create",
        "internship.update_own",
        "internship.delete_own",
        "internship.list",
        "internship.view",
        "candidate.view",
        "candidate.shortlist",
        "candidate.reject",
        "candidate.export",
        "analytics.view",
        "user.update_own_profile",
    },
    UserRole.ADMIN: {
        "*",                         # wildcard: all permissions
    },
}


def has_permission(role: str, permission: str) -> bool:
    """
    Check if a role has a specific permission.

    ADMIN role has wildcard "*" which matches everything.
    Other roles must have the exact permission string.
    """
    perms = ROLE_PERMISSIONS.get(role, set())
    return "*" in perms or permission in perms


# ─── Route Decorators ─────────────────────────────────────────────────────────

def require_permission(permission: str) -> Callable:
    """
    Route decorator: enforce a specific permission.

    The decorated route automatically gets `current_user: TokenPayload`
    injected as a dependency. The permission is checked against the user's
    role in the token. No DB hit required.

    Usage:
        @router.post("/internship")
        @require_permission("internship.create")
        async def create_internship(
            body: InternshipCreate,
            db: AsyncSession = Depends(get_db),
            current_user: TokenPayload = Depends(get_current_user_payload),
        ):
            ...

    Note: The decorated function MUST accept `current_user: TokenPayload`
    as a parameter. The decorator injects and validates it.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> any:
            # Extract current_user from kwargs (injected by FastAPI)
            payload: TokenPayload | None = kwargs.get("current_user")

            if payload is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )

            if not has_permission(payload.role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Permission denied: '{permission}' "
                        f"not available for role '{payload.role}'"
                    ),
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def require_role(*allowed_roles: str) -> Callable:
    """
    Route decorator: restrict access to specific roles.

    Simpler than require_permission for coarse-grained checks.

    Usage:
        @router.get("/hr/dashboard")
        @require_role(UserRole.HR, UserRole.ADMIN)
        async def hr_dashboard(
            current_user: TokenPayload = Depends(get_current_user_payload),
        ):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> any:
            payload: TokenPayload | None = kwargs.get("current_user")

            if payload is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )

            if payload.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Access restricted to: {', '.join(allowed_roles)}. "
                        f"Your role: {payload.role}"
                    ),
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


# ─── FastAPI Dependencies ─────────────────────────────────────────────────────

def require_hr_or_admin(
    current_user: TokenPayload = Depends(get_current_user_payload),
) -> TokenPayload:
    """
    FastAPI dependency: raise 403 if user is not HR or ADMIN.
    Use this in Depends() for HR-only routes.

    Usage:
        @router.get("/hr/candidates")
        async def get_candidates(
            _: TokenPayload = Depends(require_hr_or_admin),
        ):
            ...
    """
    if current_user.role not in (UserRole.HR, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR or Admin access required",
        )
    return current_user


def require_admin(
    current_user: TokenPayload = Depends(get_current_user_payload),
) -> TokenPayload:
    """FastAPI dependency: Admin only."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ─── Ownership Checks ─────────────────────────────────────────────────────────

def assert_owns_resource(
    resource_user_id: str,
    current_user: TokenPayload,
    resource_name: str = "resource",
) -> None:
    """
    Raise HTTP 403 if current_user doesn't own the resource.
    ADMIN bypasses ownership checks.

    Usage in service layer:
        resume = await get_resume_by_id(resume_id, db)
        assert_owns_resource(resume.user_id, current_user, "resume")
    """
    if current_user.role == UserRole.ADMIN:
        return  # Admin can access everything

    if resource_user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have access to this {resource_name}",
        )