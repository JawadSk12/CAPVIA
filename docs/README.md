# CAPVIA — Capability-Based Hiring Platform

> **Hiring Reimagined.** CAPVIA replaces keyword-matching résumé screeners with a full-stack intelligence pipeline that measures what candidates can actually *do*.

---

## Table of Contents

1. [What is CAPVIA?](#1-what-is-capvia)
2. [Problem Statement](#2-problem-statement)
3. [The CAPVIA Solution](#3-the-capvia-solution)
4. [Engine Architecture](#4-engine-architecture)
5. [Platform Architecture](#5-platform-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Repository Structure](#7-repository-structure)
8. [Quick Start](#8-quick-start)
9. [Development Workflow](#9-development-workflow)
10. [Documentation Index](#10-documentation-index)

---

## 1. What is CAPVIA?

CAPVIA (**Cap**ability **V**erification **I**ntelligence **A**rchitecture) is an end-to-end AI-powered recruitment platform built for internship hiring. It replaces legacy ATS keyword matching with a four-stage evaluation pipeline that measures real capability across:

- **Resume intelligence** (ATS Engine — NLP + SBERT)
- **Hands-on coding performance** (Simulation Engine — proctored IDE)
- **Verbal reasoning** (Interview Engine — AI semantic scoring + proctoring)
- **Behavioral integrity** (Integrity Engine — trust score aggregation)

Every evaluation feeds into the **DNA Engine** (9-dimension capability profiling) and **Ranking Engine** (weighted composite leaderboard), ultimately producing a **Candidate Report** that HR teams use to make data-driven hiring decisions.

---

## 2. Problem Statement

### The Market Problem

The global internship recruitment market processes **hundreds of millions** of applications annually. Existing tools:

| Problem | Current Reality |
|---------|----------------|
| **Keyword ATS** | Rejects 75% of qualified candidates based on buzzwords, not competence |
| **Manual screening** | HR teams spend 23 hours per hire on initial filtering |
| **No performance signal** | Résumé fraud is rampant — candidates lie, and ATS can't detect it |
| **Zero behavioral data** | No integrity signal until the candidate is already onboarded |
| **Campus bias** | Top-tier students from tier-2 colleges are invisible to recruiters |

### Why ATS Is Insufficient

Traditional Applicant Tracking Systems:
- Match keywords without semantic understanding
- Cannot detect inflated credentials or résumé fraud
- Produce no signal about a candidate's ability to perform under pressure
- Ignore behavioral patterns during evaluation
- Rank candidates arbitrarily with no explainability

### Why Capability-Based Hiring Matters

Capability-based hiring:
- Reduces time-to-hire by 40% (less manual screening)
- Increases quality-of-hire by 35% (performance-proven candidates)
- Eliminates demographic and institutional bias
- Provides full audit trail for every hiring decision
- Generates explainable, defensible rankings

---

## 3. The CAPVIA Solution

CAPVIA evaluates candidates across **four sequential stages**, each feeding the next:

```
Candidate Applies
      ↓
┌─────────────┐
│  ATS Engine │  ← Resume intelligence, fraud detection, skill matching
└──────┬──────┘
       ↓  (ATS_PROCESSED webhook)
┌──────────────────┐
│ Simulation Engine│  ← Proctored coding rounds, AI-dependency detection
└────────┬─────────┘
         ↓  (SIMULATION_SUBMITTED webhook)
┌──────────────────┐
│ Interview Engine │  ← AI-scored Q&A, webcam proctoring, behavioral tracking
└────────┬─────────┘
         ↓  (INTERVIEW_EVALUATED webhook)
┌──────────────────┐
│ Integrity Engine │  ← Aggregates all risk signals → Trust Index
└────────┬─────────┘
         ↓  (auto-triggered)
┌──────────────────┐
│   DNA Engine     │  ← 9-dimension capability profile + radar chart
└────────┬─────────┘
         ↓  (auto-triggered)
┌──────────────────┐
│ Ranking Engine   │  ← Weighted composite score, percentile, tier
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Report Engine   │  ← HR-facing summary: strengths, gaps, recommendation
└──────────────────┘
```

### Engine Descriptions

#### ATS Engine (`ats_resume/`)
- Python FastAPI service running on **port 8001**
- Uses **SBERT** (Sentence-BERT) for semantic resume-to-JD matching
- Detects resume fraud via **KeyBERT** keyword analysis and ML fraud classifier
- Outputs: `overall_score`, `score_band`, `matched_skills`, `missing_skills`, `fraud_probability`, `is_suspicious`
- 14 scoring dimensions including `technical_alignment`, `readability`, `hiring_readiness_score`

#### Simulation Engine (`ai_simulation/`)
- Python FastAPI service running on **port 8002** (simulation-specific)
- Provides proctored coding rounds with multi-round scoring
- Tracks copy-paste behavior, tab switches, and AI tool usage
- Outputs: `total_score`, `cheating_risk_level`, `ai_dependency_score`, `round_scores`

#### Interview Engine (`ai_interview/`)
- **Electron + React** desktop application (runs locally on candidate machine)
- **FastAPI evaluation server** running on **port 8765**
- Uses `SentenceTransformers` + `KeyBERT` for answer scoring
- Webcam proctoring: gaze tracking, face visibility, phone detection, multi-face detection
- Outputs: `overall_answer_score_pct`, `overall_integrity_score`, `cheating_probability_pct`, `risk_level`, `recommendation`, `video_url`

#### Integrity Engine (`capvia_platform/services/integrity_service.py`)
- Runs inside the CAPVIA gateway as a pure Python service
- Aggregates signals from all three evaluation phases
- **Scoring formula:**
  ```
  integrity_score = 100 - total_penalty  (bounded [0, 100])
  trust_index     = (integrity_score × 0.45)
                  + ((1 - ai_dependency) × 100 × 0.30)
                  + (ats_score_normalized × 100 × 0.25)
  ```
- Risk levels: `LOW` (≥80), `MEDIUM` (≥65), `HIGH` (≥50), `CRITICAL` (<50 or critical violation)
- Weights are configurable via Redis (key: `integrity_calibration_weights`)

#### DNA Engine (`capvia_platform/services/dna_service.py`)
- Auto-triggered by Integrity Engine on completion
- Computes **9 capability dimensions** (all 0–100):
  1. **Problem Solving** — Simulation score (60%) + Interview answer depth (40%)
  2. **Execution** — Simulation (50%) + ATS practical exposure (30%) + readiness (20%)
  3. **Communication** — Interview answer (50%) + ATS readability (25%) + clarity (25%)
  4. **Learning Ability** — Skill gap ratio (60%) + technical depth (40%)
  5. **Adaptability** — Interview improvements (40%) + simulation variance (40%) + strengths (20%)
  6. **Consistency** — Integrity trust index (70%) + proctoring violations (30%)
  7. **Confidence** — Risk level inverse (50%) + authenticity (30%) + face visibility (20%)
  8. **Role Fit** — ATS overall score (40%) + domain alignment (30%) + technical alignment (30%)
  9. **Leadership Potential** — Experience alignment (35%) + interview recommendation (35%) + hiring readiness (30%)
- Produces **radar chart data** (Chart.js format), **capability vectors** (unit-normalized), and **comparative analysis** (cohort percentile ranks)

#### Ranking Engine (`capvia_platform/services/ranking_service.py`)
- Auto-triggered by DNA Engine on completion
- **Scoring formula** (weights sum to 1.0):
  ```
  final_score = ATS × 0.25 + Simulation × 0.30 + Interview × 0.25 + Integrity × 0.20
  ```
- Computes `internship_rank`, `company_rank`, `global_percentile`, `is_top_candidate`
- Tier classification: `PLATINUM` (≥85), `GOLD` (≥70), `SILVER` (≥55), `BRONZE` (≥40), `UNRANKED` (<40)
- Produces full cohort analytics (mean, median, std-dev, score distribution)

#### Report Engine (`capvia_platform/services/report_service.py`)
- Synthesizes all evaluation results into an HR-facing candidate report
- Outputs: `summary`, `strengths[]`, `weaknesses[]`, `recommendations[]`, `pdf_url`

### HR Dashboard
- Built in **Next.js 14** (App Router)
- Features: internship management, applicant list with filters, leaderboard, shortlist/reject/hire actions
- Real-time notifications via polling

### Candidate Dashboard
- View application status, scores, and DNA radar chart
- Application timeline (event-by-event lifecycle)
- Notifications for every status change

---

## 4. Engine Architecture

### Data Flow Diagram

```
                        ┌──────────────────────────────────┐
                        │         CAPVIA Gateway            │
                        │      FastAPI  port 8000           │
                        │   PostgreSQL (Neon) via asyncpg   │
                        │   Redis (Upstash) for sessions    │
                        └─────────────┬────────────────────┘
                                      │
          ┌───────────────────────────┼──────────────────────────┐
          │                           │                          │
   ┌──────▼──────┐          ┌─────────▼────────┐      ┌─────────▼────────┐
   │  ATS Engine  │          │Simulation Engine │      │Interview Engine   │
   │ FastAPI :8001│          │ FastAPI   :8002  │      │ Electron + React  │
   │ MongoDB      │          │ PostgreSQL        │      │ FastAPI eval :8765│
   │ ats_resume/  │          │ ai_simulation/    │      │ ai_interview/     │
   └──────┬───────┘          └────────┬─────────┘      └────────┬──────────┘
          │                           │                          │
          │  X-CAPVIA-Signature HMAC  │                          │
          └──────────┐ webhooks ──────┘────────────────┘         │
                     ▼                                           │
            ┌────────────────┐                                   │
            │ /gateway/      │◄──────────────────────────────────┘
            │ webhooks       │
            └────────┬───────┘
                     │
          ┌──────────▼──────────┐
          │  Integrity Engine   │ (auto)
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │    DNA Engine       │ (auto)
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │  Ranking Engine     │ (auto)
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   Report Engine     │
          └─────────────────────┘
```

### Webhook Sequence

```
ATS Engine ──POST /api/v1/gateway/webhooks──► CAPVIA Gateway
  Headers:  X-CAPVIA-Signature: t={ts},v1={hmac_sha256}
  Body:     { "event": "ATS_PROCESSED", "data": { "application_id": "...", ... } }
  
  CAPVIA verifies HMAC → calls handle_ats_processed_webhook()
    → saves ATSResult row
    → advances application status to ATS_COMPLETED
    → creates ApplicationEvent (from=ATS_PENDING, to=ATS_COMPLETED)
    → sends candidate notification
    → emits SIMULATION_INVITED event
```

---

## 5. Platform Architecture

### Cloud Services

| Service | Provider | Purpose |
|---------|----------|---------|
| **Primary Database** | Neon PostgreSQL | Serverless Postgres, connection pooling, SSL |
| **Caching / Sessions** | Upstash Redis | Redis REST API, email verification tokens, password reset, integrity calibration weights |
| **File Storage** | Supabase Storage | Resume files, interview video recordings |
| **Email** | Resend (planned) | Transactional emails — verification, reset, notifications |
| **Backend Hosting** | Railway | Docker-based deployments for all Python services |
| **Frontend Hosting** | Vercel | Next.js SSR, edge CDN |
| **Error Monitoring** | Sentry | Client + server error capture with session replay |

### Service Ports

| Service | Port | Framework |
|---------|------|-----------|
| CAPVIA Gateway | 8000 | FastAPI (Python 3.12) |
| ATS Engine | 8001 | FastAPI (Python 3.12) |
| Simulation Engine | 8002 | FastAPI (Python 3.12) |
| Interview Eval Server | 8765 | FastAPI (Python 3.12) |
| Frontend | 3000 | Next.js 14 |

---

## 6. Technology Stack

### Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| HTTP Framework | FastAPI | ≥0.100.0 |
| ASGI Server | Uvicorn | ≥0.23.0 |
| ORM | SQLAlchemy (async) | ≥2.0.0 |
| Migrations | Alembic | ≥1.11.0 |
| DB Driver | asyncpg | ≥0.28.0 |
| Auth | python-jose + passlib[bcrypt] | ≥3.3.0 / ≥1.7.4 |
| Validation | Pydantic v2 | ≥2.0.0 |
| Config | pydantic-settings | ≥2.0.0 |
| Caching | redis (asyncio) | ≥5.0.0 |
| AI / NLP | sentence-transformers, keybert | latest |

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2.3 |
| Language | TypeScript | ≥5.0 |
| State | Zustand | ≥4.5.2 |
| Data fetching | TanStack Query | ≥5.40.0 |
| HTTP | Axios | ≥1.6.8 |
| Styling | Tailwind CSS | ≥3.4.1 |
| Charts | Recharts | ≥2.12.7 |
| Icons | Lucide React | ≥0.378.0 |
| Error tracking | @sentry/nextjs | ≥10.59.0 |

### Database Schema (17 tables)
`users`, `companies`, `company_members`, `internships`, `applications`, `application_events`, `candidate_mappings`, `vacancy_mappings`, `application_mappings`, `ats_results`, `simulation_results`, `interview_results`, `integrity_results`, `dna_profiles`, `rankings`, `reports`, `activity_logs`, `notifications`, `user_sessions`

---

## 7. Repository Structure

```
CAPVIA/
├── ats_resume/                     # ATS Engine — resume parsing & matching
│   ├── backend/                    # FastAPI API + ML pipeline
│   │   ├── main.py                 # ATS FastAPI app entrypoint
│   │   ├── config.py               # ATS configuration (MongoDB, Redis, etc.)
│   │   ├── dependencies.py         # FastAPI dependency injection
│   │   ├── app/                    # ATS business logic (parsers, scorers)
│   │   ├── api/                    # ATS HTTP routes
│   │   ├── models/                 # MongoDB/SQLAlchemy models
│   │   ├── services/               # Resume parsing, fraud detection services
│   │   ├── requirements.txt        # ATS Python dependencies
│   │   └── .env                    # ATS environment variables
│   ├── ai_engine/                  # SBERT model loading & inference
│   ├── frontend/                   # ATS candidate portal (React)
│   ├── resumes_data.json           # Sample resume seed data
│   └── ATS_API_SPEC.md             # ATS REST API specification
│
├── ai_simulation/                  # Simulation Engine — proctored coding
│   ├── backend/                    # Django REST backend
│   │   ├── app/                    # Django apps (rounds, scoring, proctoring)
│   │   ├── requirements.txt        # Simulation dependencies
│   │   └── .env                    # Simulation environment variables
│   ├── frontend/                   # Simulation candidate portal
│   └── SIMULATION_API_SPEC.md      # Simulation REST API specification
│
├── ai_interview/                   # Interview Engine — AI-scored video interview
│   ├── src/                        # React frontend (Electron renderer)
│   ├── electron/                   # Electron main process
│   ├── inference/                  # SentenceTransformer inference code
│   ├── ml_pipeline/                # Training pipeline for evaluators
│   ├── ai_models/                  # Downloaded model weights
│   ├── evaluation_server.py        # FastAPI eval server (port 8765)
│   ├── run_training.py             # ML model training entry point
│   └── INTERVIEW_API_SPEC.md       # Interview REST API specification
│
├── capvia_platform/                # CAPVIA Gateway — central orchestration
│   ├── main.py                     # FastAPI app factory + lifespan
│   ├── requirements.txt            # Gateway Python dependencies
│   ├── alembic.ini                 # Alembic migration configuration
│   ├── alembic/                    # Database migration scripts
│   │   └── versions/               # Versioned migration files
│   ├── core/
│   │   ├── config.py               # Pydantic settings (reads from .env)
│   │   ├── exceptions.py           # Custom exception classes
│   │   └── logger.py               # Structured logging setup
│   ├── api/
│   │   └── dependencies.py         # get_db, get_redis, get_current_user, RoleChecker
│   ├── models/
│   │   ├── base.py                 # SQLAlchemy Base + TimestampMixin + SoftDeleteMixin
│   │   └── models.py               # All 17 ORM models
│   ├── schemas/
│   │   ├── base.py                 # Shared schema primitives
│   │   └── schemas.py              # All Pydantic request/response schemas
│   ├── routers/
│   │   ├── health.py               # GET /api/health
│   │   ├── auth.py                 # /api/v1/auth/* (register, login, logout, refresh, etc.)
│   │   ├── companies.py            # /api/v1/companies/*
│   │   ├── internships.py          # /api/v1/internships/*
│   │   ├── applications.py         # /api/v1/applications/*
│   │   ├── ats.py                  # /api/v1/ats/*
│   │   ├── simulation.py           # /api/v1/simulation/*
│   │   ├── interview.py            # /api/v1/interview/*
│   │   ├── integrity.py            # /api/v1/integrity/*
│   │   ├── dna.py                  # /api/v1/dna/*
│   │   ├── rankings.py             # /api/v1/rankings/*
│   │   ├── reports.py              # /api/v1/reports/*
│   │   └── webhooks.py             # /api/v1/gateway/webhooks
│   ├── services/
│   │   ├── application_service.py  # Application lifecycle CRUD
│   │   ├── company_service.py      # Company + member management
│   │   ├── internship_service.py   # Internship CRUD + publication
│   │   ├── ats_connector.py        # HTTP client → ATS Engine
│   │   ├── simulation_connector.py # HTTP client → Simulation Engine
│   │   ├── interview_connector.py  # HTTP client → Interview Engine
│   │   ├── integrity_service.py    # Integrity Engine (pure Python)
│   │   ├── dna_service.py          # DNA Engine (pure Python)
│   │   ├── ranking_service.py      # Ranking Engine (pure Python)
│   │   ├── report_service.py       # Report generation
│   │   └── services.py             # MappingService, RecruitmentProgressService
│   ├── repositories/
│   │   ├── repositories.py         # Base async repository pattern
│   │   ├── ats_repository.py       # ATS result queries
│   │   ├── simulation_repository.py# Simulation result queries
│   │   ├── interview_repository.py # Interview result queries
│   │   └── application_repository.py # Application queries
│   ├── middleware/
│   │   ├── error_handler.py        # Global exception → JSON response
│   │   ├── logging.py              # Request/response logging middleware
│   │   └── rate_limit.py           # Rate limiting (Redis-backed)
│   ├── utils/
│   │   ├── auth.py                 # hash_password, verify_password, JWT creation
│   │   ├── jwt.py                  # JWT decode helpers
│   │   └── signatures.py           # HMAC-SHA256 webhook signature verification
│   ├── webhooks/
│   │   ├── ats_webhooks.py         # handle_ats_processed_webhook()
│   │   ├── simulation_webhooks.py  # handle_simulation_submitted_webhook()
│   │   └── interview_webhooks.py   # handle_interview_evaluated_webhook()
│   ├── tasks/
│   │   ├── ats_tasks.py            # Celery tasks for ATS processing
│   │   ├── simulation_tasks.py     # Celery tasks for simulation
│   │   └── interview_tasks.py      # Celery tasks for interview
│   ├── tests/                      # pytest test suite
│   │   ├── test_auth.py
│   │   ├── test_applications.py
│   │   ├── test_ats_integration.py
│   │   ├── test_simulation_integration.py
│   │   ├── test_interview_integration.py
│   │   ├── test_integrity_engine.py
│   │   ├── test_dna_engine.py
│   │   ├── test_ranking_engine.py
│   │   ├── test_report_engine.py
│   │   ├── test_companies.py
│   │   ├── test_internships.py
│   │   └── test_e2e_pipeline.py
│   ├── frontend/                   # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/                # Next.js App Router pages
│   │   │   ├── components/         # React components
│   │   │   ├── store/              # Zustand state stores
│   │   │   ├── services/           # API client (Axios)
│   │   │   ├── lib/                # Providers (React Query, etc.)
│   │   │   └── types/              # TypeScript type definitions
│   │   ├── next.config.mjs         # Next.js + Sentry configuration
│   │   ├── sentry.client.config.ts
│   │   ├── sentry.server.config.ts
│   │   ├── sentry.edge.config.ts
│   │   └── .env.local              # Frontend environment (git-ignored)
│   ├── .env.development            # Backend dev environment variables
│   └── .env.production             # Backend prod environment template
│
├── docs/                           # All project documentation
│   └── manuals/                    # Operational manuals
│       ├── README.md               # This file
│       ├── FULL_SETUP_GUIDE.md
│       ├── LOCAL_DEVELOPMENT_GUIDE.md
│       ├── CLOUD_SETUP_GUIDE.md
│       ├── DEPLOYMENT_GUIDE.md
│       ├── PRODUCTION_LAUNCH_GUIDE.md
│       ├── TESTING_GUIDE.md
│       ├── OPERATIONS_RUNBOOK.md
│       ├── SYSTEM_ARCHITECTURE.md
│       ├── DATABASE_GUIDE.md
│       ├── API_DOCUMENTATION.md
│       ├── TROUBLESHOOTING_GUIDE.md
│       ├── SECURITY_GUIDE.md
│       ├── CAPVIA_FOUNDER_MANUAL.md
│       └── CAPVIA_MASTER_DOCUMENTATION_INDEX.md
│
├── infrastructure/                 # IaC, CI/CD, Docker configs
├── scripts/                        # Utility scripts
├── storage/                        # Local file storage (dev only)
├── .gitignore
└── README.md                       # Root README (this file)
```

---

## 8. Quick Start

### Prerequisites

- Python 3.12
- Node.js 20+
- Git

> [!IMPORTANT]
> **exFAT Filesystem Warning:** If this repository resides on an exFAT formatted partition, creating virtual environments (`venv`) directly inside the project directories will cause package installation/runtime errors due to exFAT symlink/permission limitations. Create them on your internal Mac SSD drive (e.g. `~/capvia_gateway_venv`) and activate them from there.

### Clone & Setup

```bash
# 1. Clone the repository
git clone https://github.com/JawadSk12/CAPVIA.git
cd CAPVIA

# 2. Set up CAPVIA Gateway virtualenv
cd capvia_platform
# Standard (if on internal SSD):
python3.12 -m venv venv && source venv/bin/activate
# If on exFAT volume:
# python3.12 -m venv ~/capvia_gateway_venv && source ~/capvia_gateway_venv/bin/activate

pip install -r requirements.txt

# 3. Copy and configure environment
cp .env.development .env
# Edit .env — set your DATABASE_URL and REDIS_URL

# 4. Run database migrations
python3 -m alembic upgrade head

# 5. Start the gateway (from CAPVIA root)
cd ..
PYTHONPATH="." uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload
```

```bash
# 6. Set up and start the frontend (separate terminal)
cd CAPVIA/capvia_platform/frontend
npm install --no-bin-links
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

Gateway API docs: http://localhost:8000/docs  
Frontend: http://localhost:3000

### Verify Health

```bash
curl http://localhost:8000/api/health
# Expected: {"status": "healthy", "version": "1.0.0"}
```

---

## 9. Development Workflow

### Daily Workflow

```bash
# Pull latest
git pull origin main

# Activate environment
source venv/bin/activate  # Standard
# source ~/capvia_gateway_venv/bin/activate  # If on exFAT volume

# Start services (from CAPVIA root)
PYTHONPATH="." uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload &
cd capvia_platform/frontend && npm run dev &

# Run tests (from capvia_platform/) before committing
cd ../capvia_platform
pytest tests/ -v

# Commit with semantic versioning
git add -A
git commit -m "feat: add DNA radar chart endpoint"
git push origin feature/your-branch
```

### Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `feature/*` | New feature development |
| `fix/*` | Bug fixes |
| `hotfix/*` | Emergency production patches |

### Testing Strategy

```bash
# Unit tests
pytest capvia_platform/tests/ -v --tb=short

# Integration tests (requires running services)
pytest capvia_platform/tests/test_*_integration.py -v

# End-to-end pipeline
pytest capvia_platform/tests/test_e2e_pipeline.py -v
```

### Deployment Workflow

1. Merge PR to `main`
2. GitHub Actions CI runs tests
3. Railway auto-deploys backend on push to `main`
4. Vercel auto-deploys frontend on push to `main`

---

## 10. Documentation Index

| Document | Purpose |
|----------|---------|
| [FULL_SETUP_GUIDE.md](manuals/FULL_SETUP_GUIDE.md) | Fresh laptop → running platform, step by step |
| [LOCAL_DEVELOPMENT_GUIDE.md](manuals/LOCAL_DEVELOPMENT_GUIDE.md) | Daily developer commands and workflows |
| [CLOUD_SETUP_GUIDE.md](manuals/CLOUD_SETUP_GUIDE.md) | Neon, Upstash, Supabase, Resend, Railway, Vercel setup |
| [DEPLOYMENT_GUIDE.md](manuals/DEPLOYMENT_GUIDE.md) | Exact deployment order and commands |
| [PRODUCTION_LAUNCH_GUIDE.md](manuals/PRODUCTION_LAUNCH_GUIDE.md) | Pre-launch checklist and go-live procedure |
| [TESTING_GUIDE.md](manuals/TESTING_GUIDE.md) | All test types, commands, and success criteria |
| [OPERATIONS_RUNBOOK.md](manuals/OPERATIONS_RUNBOOK.md) | Daily ops, incident response, scaling |
| [SYSTEM_ARCHITECTURE.md](manuals/SYSTEM_ARCHITECTURE.md) | Full architecture with diagrams |
| [DATABASE_GUIDE.md](manuals/DATABASE_GUIDE.md) | All 17 tables, ERD, migrations |
| [API_DOCUMENTATION.md](manuals/API_DOCUMENTATION.md) | Every endpoint with examples |
| [TROUBLESHOOTING_GUIDE.md](manuals/TROUBLESHOOTING_GUIDE.md) | Diagnosis and fixes for all known issues |
| [SECURITY_GUIDE.md](manuals/SECURITY_GUIDE.md) | Auth, JWT, RBAC, webhooks, OWASP |
| [CAPVIA_FOUNDER_MANUAL.md](manuals/CAPVIA_FOUNDER_MANUAL.md) | Demo, pitch, onboarding, fundraising |
| [CAPVIA_MASTER_DOCUMENTATION_INDEX.md](manuals/CAPVIA_MASTER_DOCUMENTATION_INDEX.md) | Master index of all documentation |

---

*CAPVIA v1.0.0 — Built with FastAPI, Next.js 14, Neon PostgreSQL, Upstash Redis, SentenceTransformers*
