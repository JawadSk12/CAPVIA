# CAPVIA Platform — Project Foundation

This is the central orchestrator and backend gateway for the next-generation recruitment pipeline. It integrates three specialized subsystems:
1. **CAPVIA ATS** (Resume Screening & Gaps Analysis)
2. **AssessAI** (Coding Challenge Simulation Platform)
3. **IntelliRecruit** (AI Speech Video Interview & Proctoring Engine)

---

## 1. Directory Structure

```
capvia_platform/
├── Dockerfile.backend      # Production-ready backend Docker instructions
├── docker-compose.yml      # Multi-container local orchestration (FastAPI + Next.js + Redis)
├── requirements.txt        # Backend dependencies
├── main.py                 # FastAPI application creation and lifespan
├── api/
│   └── dependencies.py     # Async DB, Redis, and JWT verification dependencies
├── core/
│   ├── config.py           # BaseSettings loading from environment variables
│   ├── logger.py           # Custom Python stdout logger
│   └── exceptions.py       # Standardized API Exception classes
├── middleware/
│   ├── logging.py          # Structured request logging
│   └── rate_limit.py       # Redis sliding/fixed-window Rate Limiter
├── models/
│   ├── base.py             # SQLAlchemy Declarative base & timestamp mixins
│   └── models.py           # Central DB models mapping tables and triggers
├── repositories/
│   ├── base.py             # Generic repository pattern
│   └── repositories.py     # Custom repositories for Applications, Candidates, etc.
├── schemas/
│   ├── base.py             # API response wrappers (APIResponse, PaginatedResponse)
│   └── schemas.py          # Pydantic schemas validating all lifecycle payloads
├── routers/
│   ├── health.py           # Health-checks for service and DB connections
│   ├── ats.py              # Resume screening and comparison endpoints
│   ├── simulation.py       # Interactive coding registration and answer endpoints
│   ├── interview.py        # Video interview session starts and fallback completion
│   └── webhooks.py         # Dynamic webhook configuration & signature listeners
├── services/
│   └── services.py         # Core lifecycle flow orchestration and updates
├── scripts/
│   ├── start-dev.sh        # Startup script for development
│   └── start-prod.sh       # Startup script for production
├── docs/
│   └── architecture_diagram.md # Mermaid sequence detailing webhook signature flows
└── frontend/               # Next.js 14 App Router dashboard client
    ├── package.json        
    ├── Dockerfile          
    └── src/
        ├── app/
        │   ├── layout.tsx  # Root Layout injected with React Query Providers
        │   ├── page.tsx    # Portal landing page
        │   └── dashboard/  # Premium recruiter dashboard with Recharts visualization
        ├── lib/
        │   └── providers.tsx # React Query query client wrapper
        ├── services/
        │   └── api.ts      # Axios client with webhook test helper methods
        ├── store/
        │   └── index.ts    # Zustand global UI dashboard filter state
        └── types/
            └── index.ts    # TypeScript interfaces matching backend models
```

---

## 2. API Endpoints

### ATS Stage (Resume Screening)
* `POST /api/v1/resume/upload` — Upload candidate resume (System JWT).
* `POST /api/v1/internship/{jd_id}/compare/{resume_id}` — Trigger comparison matching (System JWT).
* `GET /api/v1/internship/{jd_id}/result/{resume_id}` — Retrieve resume scores and gap data (System JWT).

### Coding Simulation Stage
* `POST /api/v1/system/internships/{internship_id}/register-candidate` — Register applicant for challenges (System JWT).
* `POST /api/v1/applications/{application_id}/start-simulation` — Initialize attempt token and timer (Candidate JWT).
* `POST /api/v1/gateway/applications/{application_id}/sync-attempt` — Sync client-side generated attempt metadata (Candidate JWT).
* `POST /api/v1/attempts/{attempt_id}/answer` — Save challenge code progress (Candidate JWT).
* `POST /api/v1/attempts/{attempt_id}/events` — Stream telemetry proctoring events (Candidate JWT).
* `POST /api/v1/attempts/{attempt_id}/submit` — Conclude challenge and return scores (Candidate JWT).

### Video Interview Stage
* `POST /api/v1/interview/start` — Initialize video proctoring session and fetch questions (System JWT).
* `POST /api/v1/interview/answer` — Upload voice answers and proctoring violations (Candidate JWT).
* `POST /api/v1/interview/complete` — Conclude interview (Candidate JWT). Supports multipart/form-data with local baselining fields if evaluation servers are offline.
* `GET /api/v1/interview/result/{application_id}` — Fetch recruiter dashboard evaluation stats (System JWT).

### Webhook Gateways
* `POST /api/v1/webhooks/configure` — Register subscriber targets and rotate secrets.
* `POST /api/v1/gateway/webhooks` — HMAC-SHA256 authenticated listener processing lifecycle status updates.

### Test / Simulation Helpers
* `POST /api/v1/test/trigger-webhook` — Simulates signed subsystem webhook delivery. Used by the recruiter dashboard.
* `GET /api/v1/applications` — Lists candidate application cards for the recruiter dashboard.

---

## 3. Webhook Signature Verification

All incoming webhooks trigger a verification middleware checking the `X-CAPVIA-Signature` header:
1. Extracted format is: `t=TIMESTAMP,v1=HMAC_HASH`.
2. Validates timestamp drift: `|current_time - TIMESTAMP| <= 300` seconds.
3. Computes expected hash: `HMAC-SHA256(signing_secret, TIMESTAMP || RawBodyBytes)`.
4. Securely compares bytes using constant-time `hmac.compare_digest`.

---

## 4. Run Guide

### Quick Start (Docker Compose)
To launch the entire platform stack (FastAPI Backend, Next.js Frontend, Redis cache):

1. **Development Mode** (with hot-reload):
   ```bash
   ./scripts/start-dev.sh
   ```
   * Backend API: `http://localhost:8000/docs`
   * Recruiter Dashboard: `http://localhost:3000`

2. **Production Mode** (standalone Next.js and optimized Python server):
   ```bash
   ./scripts/start-prod.sh
   ```
