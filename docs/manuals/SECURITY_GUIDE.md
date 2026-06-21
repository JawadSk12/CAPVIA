# CAPVIA — Security Guide

> **Audience:** Security reviewer, backend engineer, or DevOps setting up production hardening.

---

## Security Overview

CAPVIA implements defense-in-depth across four layers:

1. **Authentication** — bcrypt + JWT + Refresh Token Rotation
2. **Authorization** — Role-Based Access Control (RBAC)
3. **Webhook Security** — HMAC-SHA256 signature verification
4. **Infrastructure** — TLS everywhere, secrets management, rate limiting

---

## 1. Authentication

### Password Hashing

All passwords are hashed with **bcrypt** (cost factor 12).

```python
# capvia_platform/utils/auth.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)  # bcrypt, cost=12

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)  # constant-time
```

Properties:
- `$2b$12$` prefix confirms bcrypt with cost 12
- Constant-time comparison prevents timing attacks
- Plaintext password never stored, never logged

### Password Requirements (enforced by Pydantic)

- Minimum 8 characters
- Must pass `is_strong_password` check (Pydantic validator)
- No maximum length limit (bcrypt truncates at 72 bytes — acceptable for most passwords)

### JWT Access Tokens

```python
# Payload structure
{
    "sub": "user_uuid",
    "email": "user@example.com",
    "role": "candidate",  # "candidate", "hr", "admin"
    "type": "access",
    "exp": 1719003600  # unix timestamp, 30min from issue
}
```

- Algorithm: `HS256`
- Secret: `SECRET_KEY` from environment (minimum 32 bytes recommended)
- TTL: 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- No sensitive data in payload (no passwords, no PII beyond email)

### Refresh Token Rotation (RTR)

CAPVIA implements full Refresh Token Rotation to prevent token reuse attacks:

```
Login → issue (access_token, refresh_token_1)
                                      │
Refresh → returns (new_access_token, refresh_token_2)
          marks refresh_token_1 as used (is_active=False)
                                      │
If refresh_token_1 used again:
  → REPLAY ATTACK DETECTED
  → ALL user_sessions for this user set is_active=False
  → User must login again
  → All active sessions on all devices terminated
```

```python
# Storage: bcrypt hash of refresh token (not plaintext)
user_session = UserSession(
    user_id=user.id,
    token_hash=hash_password(refresh_token),  # bcrypt hash
    expires_at=datetime.utcnow() + timedelta(days=7),
    is_active=True
)
```

### Email Verification

- Verification token: stored as plaintext key in Redis with `email_verify:<token>` pattern
- TTL: 86400 seconds (24 hours)
- Token: URL-safe random bytes (`secrets.token_urlsafe(32)`)
- Accounts inactive (`is_active=False`) until verified

### Password Reset

- Reset token: stored in Redis with `reset_pass:<token>` pattern  
- TTL: 900 seconds (15 minutes)
- Token: `secrets.token_urlsafe(32)`
- One-time use: deleted from Redis after use

---

## 2. Authorization (RBAC)

### Roles

| Role | Code | Permissions |
|------|------|-------------|
| Candidate | `CANDIDATE` | Apply to internships, view own applications/results |
| HR | `HR` | Create companies/internships, view all applications for their company, shortlist/reject/hire |
| Admin | `ADMIN` | All HR permissions + user management, platform administration |

### Role Enforcement

```python
# capvia_platform/api/dependencies.py
from fastapi import Depends, HTTPException
from typing import List

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role.value not in self.allowed_roles:
            raise HTTPException(403, "Insufficient permissions")
        return current_user

# Usage in routers:
@router.post("/shortlist")
async def shortlist(
    user: User = Depends(RoleChecker(["hr", "admin"]))
):
    ...
```

### Ownership Checks

Candidates can only access their own data:

```python
# In applications router
async def get_application(app_id: UUID, current_user: User = Depends(get_current_user)):
    application = await get_application_by_id(app_id)
    
    if current_user.role == UserRole.CANDIDATE:
        if application.candidate_id != current_user.id:
            raise HTTPException(403, "Access denied")
    
    return application
```

### Soft Delete Filter

All queries automatically exclude soft-deleted records:

```python
# Repository pattern always filters deleted_at
select(Model).where(Model.deleted_at.is_(None))
```

---

## 3. Webhook Security (HMAC-SHA256)

### Signature Algorithm

```python
# capvia_platform/utils/signatures.py
import hmac, hashlib, time

def calculate_signature(secret: str, timestamp: str, payload: bytes) -> str:
    """Compute HMAC-SHA256 signature."""
    signed_payload = f"{timestamp}.".encode() + payload
    return hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()

def verify_webhook_signature(
    signature_header: str,
    secret: str,
    payload: bytes,
    tolerance_seconds: int = 300  # 5-minute replay window
) -> None:
    """
    Verify X-CAPVIA-Signature header.
    Format: t={timestamp},v1={hmac_sha256}
    """
    if not signature_header:
        raise AuthorizationException("Missing signature header")
    
    parts = dict(p.split("=", 1) for p in signature_header.split(","))
    ts = parts.get("t")
    v1 = parts.get("v1")
    
    if not ts or not v1:
        raise AuthorizationException("Malformed signature header")
    
    # Check timestamp staleness
    if abs(time.time() - int(ts)) > tolerance_seconds:
        raise AuthorizationException("Webhook timestamp too old — possible replay attack")
    
    # Compute expected signature
    expected = calculate_signature(secret, ts, payload)
    
    # Constant-time comparison
    if not hmac.compare_digest(expected, v1):
        raise AuthorizationException("Invalid webhook signature")
```

### Replay Attack Prevention

- Timestamp is embedded in the signature
- Tolerance: 5 minutes (configurable)
- Timestamps older than 5 minutes are rejected even with valid HMAC

### Secret Rotation

To rotate the webhook signing secret:

```bash
# 1. Generate new secret
NEW_SECRET=$(python3 -c "import secrets; print('whsec_' + secrets.token_hex(32))")

# 2. Update in Gateway
railway variables set --service capvia-gateway WEBHOOK_SIGNING_SECRET="$NEW_SECRET"

# 3. Update in each engine's .env
# ATS: CAPVIA_WEBHOOK_SECRET=<new_secret>
# Simulation: CAPVIA_WEBHOOK_SECRET=<new_secret>

# 4. Redeploy all services
```

---

## 4. Transport Security

### TLS Everywhere

- All external connections use TLS (Neon requires `?ssl=require`, Upstash uses `rediss://`)
- Railway and Vercel provision Let's Encrypt certificates automatically
- HTTP → HTTPS redirect enforced at CDN/proxy level

### CORS Configuration

```python
# Production: Restrict to exact domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://capvia.io",
        "https://www.capvia.io",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-CAPVIA-Signature"],
)

# Development only: wildcard (DO NOT use in production)
# allow_origins=["*"]
```

### Security Headers

Add these headers via middleware for production:

```python
# capvia_platform/middleware/security_headers.py
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
```

---

## 5. Rate Limiting

Rate limiting is implemented using Redis via `capvia_platform/middleware/rate_limit.py`.

| Endpoint | Window | Max Requests | Action on Limit |
|----------|--------|-------------|-----------------|
| `POST /auth/login` | 60s | 5 | `429 Too Many Requests` |
| `POST /auth/register` | 60s | 10 | `429` |
| `POST /auth/forgot-password` | 900s | 3 | `429` |
| All other `POST/PUT/DELETE` | 60s | 100 | `429` |
| `GET` endpoints | 60s | 300 | `429` |

Rate limit key: `rate_limit:{ip_address}:{endpoint}`

---

## 6. Secrets Management

### Required Secrets (Production)

| Secret | Description | Rotation |
|--------|-------------|---------|
| `SECRET_KEY` | JWT signing key | Monthly |
| Database password | Neon PostgreSQL | On breach |
| `REDIS_URL` token | Upstash access | Monthly |
| Supabase `service_role` key | Storage admin | On breach |
| `RESEND_API_KEY` | Email sending | Quarterly |
| Webhook signing secret | HMAC key | Monthly |

### Secret Generation

```bash
# 32-byte hex secret (JWT)
python3 -c "import secrets; print(secrets.token_hex(32))"

# 64-byte hex secret (webhook)
python3 -c "import secrets; print('whsec_' + secrets.token_hex(32))"
```

### What Should NEVER Be in Git

- `.env` files
- `.env.local`
- `alembic.ini` (contains database URL with password)
- Any file containing API keys

**Verify `.gitignore` covers:**
```
# Verify these patterns exist in .gitignore
grep -E "\.env|alembic.ini" .gitignore
```

---

## 7. OWASP Top 10 Compliance

| Risk | Status | Implementation |
|------|--------|---------------|
| A01: Broken Access Control | ✅ Mitigated | RBAC + ownership checks + soft-delete filters |
| A02: Cryptographic Failures | ✅ Mitigated | bcrypt passwords, TLS everywhere, no plaintext secrets in DB |
| A03: Injection | ✅ Mitigated | SQLAlchemy ORM (parameterized queries), Pydantic validation |
| A04: Insecure Design | ✅ Mitigated | RTR for tokens, HMAC webhooks, rate limiting |
| A05: Security Misconfiguration | ⚠️ Partial | CORS restricted in prod; security headers should be added |
| A06: Vulnerable Components | ⚠️ Monitor | Run `pip audit` and `npm audit` monthly |
| A07: Auth & Access Failures | ✅ Mitigated | RTR, email verification, rate limiting on auth endpoints |
| A08: Software & Data Integrity | ✅ Mitigated | HMAC webhook verification |
| A09: Logging & Monitoring | ✅ Mitigated | Sentry, activity_logs table, structured request logging |
| A10: SSRF | ⚠️ Review | Engine URLs from config — validate they don't accept user input |

---

## 8. Security Checklist

### Before Each Production Deploy

- [ ] `SECRET_KEY` is at least 32 bytes
- [ ] CORS `allow_origins` is restricted to production domains
- [ ] No `DEBUG=True` or development flags in environment
- [ ] All `.env` files excluded from git
- [ ] Webhook signing secret is not the default value
- [ ] Database password is not in source code
- [ ] `pip audit` shows no critical vulnerabilities
- [ ] `npm audit` shows no critical vulnerabilities

### Security Incident Response

```bash
# 1. Immediately rotate ALL secrets
# New SECRET_KEY (invalidates all JWTs — forces re-login)
python3 -c "import secrets; print(secrets.token_hex(32))"
railway variables set --service capvia-gateway SECRET_KEY="<new_key>"

# 2. Revoke all active sessions in database
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import update
from capvia_platform.models.models import UserSession
from capvia_platform.core.config import settings

async def revoke_all():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        await s.execute(update(UserSession).values(is_active=False))
        await s.commit()
        print('All sessions revoked')
asyncio.run(revoke_all())
"

# 3. Clear all Redis tokens
redis-cli --tls -u "$REDIS_URL" FLUSHALL

# 4. Notify affected users
# 5. Document incident in incident log
# 6. Review activity_logs for suspicious patterns
```
