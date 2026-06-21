"""
backend/core/audit.py
──────────────────────
Audit logging system.

Two components:
  1. AuditMiddleware  → ASGI middleware that logs every API request
  2. log_audit_event  → Explicit event logger for business actions (shortlist, etc.)

The middleware captures HTTP-level metadata.
Explicit events capture business-level actions with richer context.

Both write to the audit_logs PostgreSQL table (append-only).
"""

from __future__ import annotations

import time
import uuid
from typing import Any

import structlog
from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from db.postgres import AsyncSessionLocal
from models.audit_log import AuditLog, AuditAction

logger = structlog.get_logger(__name__)


# ─── Audit Middleware ─────────────────────────────────────────────────────────

class AuditMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that logs all authenticated API requests.

    Captures:
      - user_id, user_email, user_role (from JWT if present)
      - HTTP method, endpoint, status code
      - IP address, User-Agent
      - Request ID (for cross-service tracing)
      - Response time (for performance monitoring)

    Skips:
      - Health check endpoints (/health, /metrics)
      - Static files
      - OPTIONS requests (CORS preflight)
    """

    SKIP_PATHS = {"/health", "/metrics", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip unimportant paths
        if request.url.path in self.SKIP_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        # Generate request ID for correlation
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Add request ID to response headers for frontend correlation
        response.headers["X-Request-ID"] = request_id

        # Extract user info from request state (populated by auth dependency)
        user_id = getattr(request.state, "user_id", None)
        user_email = getattr(request.state, "user_email", None)
        user_role = getattr(request.state, "user_role", None)

        # Determine action from method + path
        action = _infer_action(request.method, request.url.path)

        # Fire and forget: write to DB without blocking response
        # Uses a separate session from the request session to avoid
        # the audit write being rolled back if the request fails.
        try:
            async with AsyncSessionLocal() as session:
                log_entry = AuditLog(
                    user_id=user_id,
                    user_email=user_email,
                    user_role=user_role,
                    action=action,
                    method=request.method,
                    endpoint=str(request.url.path),
                    status_code=response.status_code,
                    ip_address=_get_client_ip(request),
                    user_agent=request.headers.get("user-agent"),
                    request_id=request_id,
                    metadata_={"duration_ms": round(duration_ms, 2)},
                )
                session.add(log_entry)
                await session.commit()
        except Exception as e:
            # Audit failure should NEVER break the API response
            logger.error("audit_log_write_failed", error=str(e), request_id=request_id)

        return response


def _get_client_ip(request: Request) -> str:
    """
    Extract real client IP, respecting proxy headers.
    X-Forwarded-For is set by AWS ALB / nginx.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _infer_action(method: str, path: str) -> str:
    """
    Map HTTP method + path to a meaningful action string.
    Falls back to "method.path" format for unmapped routes.
    """
    path_lower = path.lower()

    if "auth/login" in path_lower:
        return AuditAction.AUTH_LOGIN
    if "auth/register" in path_lower:
        return AuditAction.AUTH_REGISTER
    if "auth/logout" in path_lower:
        return AuditAction.AUTH_LOGOUT
    if "resume/upload" in path_lower:
        return AuditAction.RESUME_UPLOAD
    if "resume" in path_lower and method == "DELETE":
        return AuditAction.RESUME_DELETE
    if "rewrite" in path_lower:
        return AuditAction.ATS_REWRITE_REQUEST
    if "shortlist" in path_lower:
        return AuditAction.CANDIDATE_SHORTLIST
    if "reject" in path_lower:
        return AuditAction.CANDIDATE_REJECT
    if "internship" in path_lower and method == "POST":
        return AuditAction.JD_CREATE

    return f"{method.lower()}.{path.replace('/', '.').strip('.')}"


# ─── Explicit Audit Logger ────────────────────────────────────────────────────

async def log_audit_event(
    session: AsyncSession,
    action: str,
    user_id: str | None = None,
    user_email: str | None = None,
    user_role: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> None:
    """
    Explicitly log a business event to the audit trail.

    Use this for important HR actions that need rich context:
      - Candidate shortlisted / rejected
      - JD created / deleted
      - User deactivated (admin)
      - Data exported

    This writes within the SAME session as the business transaction,
    so if the business action fails, the audit log is also rolled back.
    That's intentional: we don't want audit logs for failed actions.

    Usage:
        await log_audit_event(
            session=db,
            action=AuditAction.CANDIDATE_SHORTLIST,
            user_id=current_user.user_id,
            resource_type="ats_result",
            resource_id=result_id,
            metadata={"internship_id": jd_id, "score": score},
        )
    """
    log_entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_=metadata or {},
        request_id=request_id,
    )
    session.add(log_entry)
    # Note: caller is responsible for session.commit()