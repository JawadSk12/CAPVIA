# CAPVIA — API Documentation

> **Base URL:** `http://localhost:8000` (dev) | `https://api.capvia.io` (prod)  
> **Authentication:** JWT Bearer token in `Authorization` header  
> **Content-Type:** `application/json`  
> **Interactive Explorer:** `{base_url}/docs`

---

## Authentication

### `POST /api/v1/auth/register`

Register a new user account.

**Request:**
```json
{
  "email": "candidate@example.com",
  "password": "SecurePass123!",
  "full_name": "Jawad Sheikh",
  "role": "candidate"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "simulated_token": "abc123xyz"
}
```

**Errors:**
- `400 EMAIL_ALREADY_EXISTS` — Email already registered
- `422` — Validation error (password < 8 chars, invalid email)

---

### `POST /api/v1/auth/verify-email`

Verify email address using token from registration response.

**Request:**
```json
{
  "token": "abc123xyz"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login."
}
```

---

### `POST /api/v1/auth/login`

Authenticate user and receive JWT pair.

**Request:**
```json
{
  "email": "candidate@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "candidate",
  "full_name": "Jawad Sheikh",
  "email": "candidate@example.com"
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` — Wrong email or password
- `401 ACCOUNT_INACTIVE` — Email not verified
- `401 ACCOUNT_SUSPENDED` — Account suspended by admin

---

### `POST /api/v1/auth/refresh`

Refresh access token using refresh token (RTR — old token invalidated).

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:**
- `401 TOKEN_EXPIRED` — Refresh token expired
- `401 REPLAY_ATTACK_DETECTED` — Token already used; all sessions terminated

---

### `POST /api/v1/auth/logout`

Revoke current session.

**Headers:** `Authorization: Bearer <access_token>`

**Response 200:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `POST /api/v1/auth/forgot-password`

Request password reset email.

**Request:**
```json
{
  "email": "candidate@example.com"
}
```

**Response 200:** Always returns 200 (security: don't reveal if email exists)
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link will be sent."
}
```

---

### `POST /api/v1/auth/reset-password`

Reset password using token from email.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

---

## Companies

### `POST /api/v1/companies`

Create a company. **Role:** HR, ADMIN

**Request:**
```json
{
  "name": "TechStartup India",
  "description": "AI-first product company",
  "website": "https://techstartup.io",
  "industry": "Technology",
  "headquarters": "Bangalore, India",
  "founded_year": 2022,
  "employee_count": "11-50"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "TechStartup India",
    "is_verified": false,
    "created_at": "2024-06-21T10:00:00Z"
  }
}
```

---

### `GET /api/v1/companies`

List companies. **Role:** Any authenticated user

**Query Params:** `page`, `page_size`, `search`, `industry`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "TechStartup India",
      "industry": "Technology",
      "is_verified": true,
      "openings_count": 3
    }
  ],
  "pagination": {"page": 1, "page_size": 20, "total": 42}
}
```

---

## Internships

### `POST /api/v1/internships`

Create an internship posting. **Role:** HR, ADMIN

**Request:**
```json
{
  "company_id": "550e8400-...",
  "title": "Backend Developer Intern",
  "description": "Build scalable APIs using FastAPI and PostgreSQL.",
  "responsibilities": ["Write REST APIs", "Optimize DB queries"],
  "required_skills": ["Python", "FastAPI", "PostgreSQL"],
  "technologies": ["Python", "Docker", "SQLAlchemy"],
  "experience_level": "ENTRY",
  "work_mode": "REMOTE",
  "duration_weeks": 12,
  "stipend_min": 15000,
  "stipend_max": 25000,
  "stipend_currency": "INR",
  "openings": 5,
  "application_deadline": "2024-08-01T00:00:00Z"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "Backend Developer Intern",
    "status": "DRAFT",
    "is_active": true
  }
}
```

---

### `POST /api/v1/internships/{id}/publish`

Publish an internship (makes it visible to candidates). **Role:** HR, ADMIN

**Response 200:**
```json
{
  "success": true,
  "message": "Internship published successfully",
  "data": {"status": "PUBLISHED"}
}
```

---

### `GET /api/v1/internships`

List all published internships. **Role:** Any authenticated user

**Query Params:** `search`, `skills`, `work_mode`, `company_id`, `page`, `page_size`

---

## Applications

### `POST /api/v1/applications`

Submit an application. **Role:** CANDIDATE

**Request:**
```json
{
  "internship_id": "550e8400-...",
  "cover_letter": "I am excited to apply for this position...",
  "resume_url": "https://supabase.co/storage/resumes/user_id/resume.pdf"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "internship_id": "...",
    "status": "APPLIED",
    "applied_at": "2024-06-21T10:00:00Z"
  }
}
```

**Errors:**
- `409 ALREADY_APPLIED` — Candidate has existing application for this internship
- `400 INTERNSHIP_CLOSED` — Internship not accepting applications

---

### `GET /api/v1/applications/me`

Get current candidate's applications. **Role:** CANDIDATE

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "internship": {"id": "...", "title": "Backend Developer Intern"},
      "status": "EVALUATED",
      "applied_at": "2024-06-21T10:00:00Z",
      "ranking": {
        "final_score": 82.5,
        "recommendation_tier": "GOLD",
        "internship_rank": 2
      }
    }
  ]
}
```

---

### `POST /api/v1/applications/{id}/shortlist`

Shortlist an application. **Role:** HR, ADMIN

**Response 200:**
```json
{
  "success": true,
  "message": "Application shortlisted",
  "data": {"status": "SHORTLISTED"}
}
```

---

### `POST /api/v1/applications/{id}/reject`

Reject an application. **Role:** HR, ADMIN

**Request (optional):**
```json
{
  "reason": "Did not meet technical requirements"
}
```

---

### `POST /api/v1/applications/{id}/hire`

Mark as hired. **Role:** HR, ADMIN

---

## Webhooks

### `POST /api/v1/gateway/webhooks`

Receive evaluation events from ATS/Simulation/Interview engines.

**Headers:**
```
X-CAPVIA-Signature: t={unix_timestamp},v1={hmac_sha256_hex}
Content-Type: application/json
```

**Request (ATS_PROCESSED):**
```json
{
  "event": "ATS_PROCESSED",
  "timestamp": "2024-06-21T10:00:00Z",
  "data": {
    "application_id": "550e8400-...",
    "resume_id": "resume_uuid",
    "jd_id": "jd_uuid",
    "status": "SUCCESS",
    "overall_ats_score": 82.5,
    "score_band": "GOOD",
    "is_suspicious": false,
    "fraud_probability": 0.05,
    "matched_skills": ["Python", "SQL", "FastAPI"],
    "missing_skills": ["Docker", "Redis"]
  }
}
```

**Request (SIMULATION_SUBMITTED):**
```json
{
  "event": "SIMULATION_SUBMITTED",
  "timestamp": "2024-06-21T11:00:00Z",
  "data": {
    "application_id": "550e8400-...",
    "attempt_id": 42,
    "total_score": 85.5,
    "cheating_risk_level": "LOW",
    "ai_dependency_score": 0.12,
    "recommendation": "hire",
    "round_scores": {"round_1": 88, "round_2": 83}
  }
}
```

**Request (INTERVIEW_EVALUATED):**
```json
{
  "event": "INTERVIEW_EVALUATED",
  "timestamp": "2024-06-21T12:00:00Z",
  "data": {
    "application_id": "550e8400-...",
    "session_id": "session_uuid",
    "overall_answer_score_pct": 78,
    "overall_integrity_score": 88,
    "cheating_probability_pct": 12,
    "risk_level": "LOW",
    "recommendation": "Strong Hire",
    "video_url": "https://supabase.co/interview-videos/session.webm",
    "phone_detections_count": 0,
    "multi_face_events": 0,
    "face_absences_count": 1,
    "look_away_count": 3,
    "tab_switches": 0,
    "copy_paste_count": 0,
    "suspicious_key_count": 0
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "event": "ATS_PROCESSED",
  "processed_at": "2024-06-21T10:00:01Z"
}
```

**Errors:**
- `401 INVALID_SIGNATURE` — HMAC verification failed
- `400 BAD_REQUEST` — Missing event or application_id
- `422` — Validation error

---

### HMAC Signature Calculation

```python
import hmac, hashlib, time, json

def compute_signature(secret: str, payload_bytes: bytes) -> str:
    timestamp = str(int(time.time()))
    signed_payload = f"{timestamp}.".encode() + payload_bytes
    sig = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={sig}"
```

---

## Rankings

### `GET /api/v1/rankings/{application_id}`

Get ranking for a specific application. **Role:** HR, ADMIN, CANDIDATE (own application)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "application_id": "...",
    "final_score": 82.5,
    "ats_component": 20.62,
    "simulation_component": 25.65,
    "interview_component": 19.5,
    "integrity_component": 16.8,
    "internship_rank": 2,
    "company_rank": 5,
    "global_percentile": 87.5,
    "is_top_candidate": false,
    "recommendation_tier": "GOLD",
    "data_completeness": 1.0,
    "score_breakdown": {
      "final_score": 82.5,
      "weights": {"ats": 0.25, "simulation": 0.30, "interview": 0.25, "integrity": 0.20},
      "components": {
        "ats": {"raw_score": 82.5, "weight": 0.25, "contribution": 20.62},
        "simulation": {"raw_score": 85.5, "weight": 0.30, "contribution": 25.65},
        "interview": {"raw_score": 78.0, "weight": 0.25, "contribution": 19.5},
        "integrity": {"raw_score": 84.0, "weight": 0.20, "contribution": 16.8}
      }
    },
    "explainability": {
      "summary": "Candidate achieved a Final Score of 82.5/100, placing them in the GOLD tier.",
      "strengths": ["Simulation (30%): 85.5/100 — strong performance."],
      "risk_signals": []
    }
  }
}
```

---

### `GET /api/v1/rankings/{internship_id}/leaderboard`

Get ranked leaderboard for an internship. **Role:** HR, ADMIN

**Query Params:** `limit` (default 50), `offset` (default 0)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "internship_rank": 1,
      "application_id": "...",
      "candidate_name": "Alice Smith",
      "final_score": 91.2,
      "recommendation_tier": "PLATINUM",
      "is_top_candidate": true,
      "ats_raw_score": 88,
      "simulation_raw_score": 94,
      "interview_raw_score": 89,
      "integrity_raw_score": 92
    },
    {
      "internship_rank": 2,
      "application_id": "...",
      "candidate_name": "Jawad Sheikh",
      "final_score": 82.5,
      "recommendation_tier": "GOLD",
      "is_top_candidate": false
    }
  ],
  "pagination": {"total": 47, "limit": 50, "offset": 0}
}
```

---

## Integrity Engine

### `POST /api/v1/integrity/{application_id}/calculate`

Manually trigger Integrity Engine calculation. **Role:** HR, ADMIN

**Response 200:**
```json
{
  "success": true,
  "application_id": "...",
  "integrity_score": 87.0,
  "trust_index": 84.2,
  "risk_level": "LOW",
  "confidence_level": 0.67,
  "explainability": {
    "summary": "Integrity Score: 87/100. Trust Index: 84/100. 0 critical violations. 1 signal(s) reviewed.",
    "signals": [],
    "formula": "trust_index = integrity_score×0.45 + (1-ai_dep)×100×0.30 + ats_norm×100×0.25"
  }
}
```

---

## DNA Engine

### `POST /api/v1/dna/{application_id}/generate`

Generate DNA profile. **Role:** HR, ADMIN

**Response 200:**
```json
{
  "success": true,
  "application_id": "...",
  "dimensions": {
    "problem_solving": 78,
    "execution": 82,
    "communication": 74,
    "learning_ability": 71,
    "adaptability": 68,
    "consistency": 84,
    "confidence": 76,
    "role_fit": 80,
    "leadership_potential": 72
  },
  "candidate_level": "STRONG",
  "capability_score": 76.1,
  "radar_chart_data": {
    "type": "radar",
    "labels": ["Problem Solving", "Execution", "Communication", "Learning Ability", "Adaptability", "Consistency", "Confidence", "Role Fit", "Leadership Potential"],
    "datasets": [{
      "label": "Candidate DNA",
      "data": [78, 82, 74, 71, 68, 84, 76, 80, 72]
    }]
  }
}
```

---

## Health

### `GET /api/health`

System health check. No authentication required.

**Response 200:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development",
  "database": "connected",
  "redis": "connected"
}
```

---

## Test Endpoints

### `POST /api/v1/test/trigger-webhook`

Simulate a webhook from an evaluation engine. **For development/testing only.**

**Query Params:**
- `application_id` (UUID): Target application
- `event` (string): `ATS_PROCESSED`, `SIMULATION_SUBMITTED`, `INTERVIEW_EVALUATED`

**Response 200:**
```json
{
  "success": true,
  "event": "ATS_PROCESSED",
  "processed_at": "2024-06-21T10:00:01Z"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password.",
    "details": null
  },
  "status_code": 401
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `REPLAY_ATTACK_DETECTED` | 401 | Refresh token reuse detected |
| `INSUFFICIENT_PERMISSIONS` | 403 | Missing required role |
| `NOT_FOUND` | 404 | Resource not found |
| `EMAIL_ALREADY_EXISTS` | 400 | Registration: email taken |
| `ALREADY_APPLIED` | 409 | Candidate already applied |
| `INTERNSHIP_CLOSED` | 400 | Internship not accepting applications |
| `INVALID_SIGNATURE` | 401 | Webhook HMAC verification failed |
| `BAD_REQUEST` | 400 | Missing required fields |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| `/api/v1/auth/login` | 5 requests | 1 minute |
| `/api/v1/auth/forgot-password` | 3 requests | 15 minutes |
| `/api/v1/auth/register` | 10 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1719003600
```

On limit exceeded:
```json
{
  "error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Please try again in 60 seconds."},
  "status_code": 429
}
```
