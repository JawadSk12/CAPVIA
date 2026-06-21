# CAPVIA Backend API

> FastAPI + PostgreSQL + Redis + Celery backend serving the CAPVIA ATS platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (async) |
| Database | PostgreSQL (SQLAlchemy async ORM) |
| Document Store | MongoDB (resume text, heatmaps) |
| Cache / Queue | Redis |
| Task Queue | Celery (resume AI pipeline) |
| Auth | JWT access tokens (memory) + httpOnly refresh cookie |
| File Storage | AWS S3 / MinIO |
| AI Engine | `ai_engine/` (same repo) |

---

## Directory Structure

```
backend/
├── main.py                    # FastAPI app factory, middleware, lifespan
├── config.py                  # Settings (pydantic-settings, .env loading)
├── dependencies.py            # Reusable FastAPI Depends: DB, Auth, Pagination
├── api/
│   └── v1/
│       ├── router.py          # Includes all sub-routers
│       └── routes/
│           ├── auth.py        # POST /register, /login, /refresh, /logout, /me
│           ├── resume.py      # POST /resume/upload, GET /resume/{id}/status, /analysis
│           ├── internship.py  # CRUD /internship, GET /internship/{id}/candidates
│           ├── hr.py          # GET /hr/candidates, /hr/analytics, PATCH /hr/candidate/{id}
│           └── admin.py       # GET /admin/health, /admin/users
├── core/
│   ├── auth.py                # JWT encode/decode, get_current_user dependency
│   ├── rbac.py                # Role-based access control decorators
│   └── audit.py              # Audit log middleware
├── db/
│   ├── postgres.py            # AsyncEngine, Session factory, Base declarative
│   ├── mongodb.py             # Motor async client
│   └── redis_client.py        # aioredis pool
├── models/                    # SQLAlchemy ORM models
│   ├── user.py
│   ├── resume.py
│   ├── internship.py
│   └── audit_log.py
├── schemas/                   # Pydantic request/response schemas
│   ├── auth.py
│   ├── resume.py
│   └── internship.py
├── services/                  # Business logic
│   ├── auth_service.py
│   ├── ats_service.py         # ← calls ai_engine pipeline
│   ├── storage_service.py     # S3/MinIO file ops
│   └── internship_service.py
└── workers/
    ├── celery_app.py          # Celery config + Redis broker
    └── ats_worker.py          # Celery task: run ATS pipeline on uploaded resume
```

---

## API Endpoints

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Create student or HR account |
| POST | `/login` | — | Returns JWT access token + sets refresh cookie |
| POST | `/refresh` | Cookie | Rotate access token |
| POST | `/logout` | Bearer | Invalidate session |
| GET | `/me` | Bearer | Current user profile |

### Resume — `/api/v1/resume`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | Student | Upload PDF → triggers Celery ATS pipeline |
| GET | `/{id}/status` | Student | Poll processing status + progress % |
| GET | `/{id}/analysis` | Student | Full ATS result (score, heatmap, SHAP, fraud) |
| GET | `/history` | Student | All past analyses for current user |
| POST | `/{id}/rewrite` | Student | SSE stream — AI-powered section rewrite |
| POST | `/{id}/compare/{jd_id}` | Student | Run ATS against a specific JD |

### Internship — `/api/v1/internship`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List active internship postings |
| POST | `/` | HR | Create new internship / JD |
| GET | `/{id}` | Any | Internship detail + JD text |
| GET | `/{id}/candidates` | HR | Ranked candidate list for JD |
| PATCH | `/{id}` | HR | Update internship details |

### HR — `/api/v1/hr`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/candidates` | HR | Filtered + ranked candidate list |
| PATCH | `/candidate/{id}` | HR | Update status (SHORTLIST / REJECT / INTERVIEW) |
| GET | `/analytics` | HR | Hiring funnel, score distribution, top skills |

### Admin — `/api/v1/admin`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Admin | Service health (DB, Redis, worker) |
| GET | `/users` | Admin | All users with roles |

---

## Database Schema (PostgreSQL)

```sql
users          (id, email, full_name, role, hashed_password, is_active, created_at)
resumes        (id, user_id, original_filename, status, mode, overall_score, detected_role, …)
internships    (id, title, company_name, jd_text, required_skills[], deadline, created_by)
applications   (id, resume_id, jd_id, ats_score, hr_status, fraud_flags JSONB)
audit_logs     (id, user_id, action, resource_type, resource_id, timestamp)
```

---

## Worker Flow

```
User uploads PDF
       │
       ▼
FastAPI POST /resume/upload
       │  saves file → S3
       │  creates DB row (status=PENDING)
       │  enqueues Celery task
       ▼
Celery Worker (ats_worker.py)
       │
       ├── 1. OCR / PDF extract    (ai_engine/utils/pdf_extractor.py)
       ├── 2. Text clean           (ai_engine/utils/text_cleaner.py)
       ├── 3. NER parse            (ai_engine/models/ner_extractor.py)
       ├── 4. Embed                (ai_engine/utils/embedder.py)
       ├── 5. ATS score            (ai_engine/scoring/ats_scorer.py)
       ├── 6. Heatmap              (ai_engine/scoring/heatmap_builder.py)
       ├── 7. SHAP explainability  (ai_engine/scoring/dimension_scorer.py)
       ├── 8. Fraud detection      (ai_engine/models/fraud_detector.py)
       └── 9. Persist → DB + Mongo (status=DONE)
                │
                ▼
        Frontend polls GET /status → auto-navigates to result
```

---

## Setup & Run

### 1. Prerequisites
```bash
# Install system deps
brew install postgresql redis

# Python 3.11+
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment
```bash
cp .env.example .env
# Fill in: DATABASE_URL, MONGODB_URL, REDIS_URL, JWT_SECRET, S3_*, OPENAI_API_KEY
```

### 3. Database Migrations
```bash
alembic upgrade head
```

### 4. Start Services
```bash
# Terminal 1 — API server
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Celery worker
celery -A backend.workers.celery_app worker --loglevel=info --concurrency=4

# Terminal 3 — Redis (if not running)
redis-server
```

### 5. Docker (recommended)
```bash
docker-compose up --build
```
---

## Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pw@localhost/capvia` | PostgreSQL |
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis |
| `JWT_SECRET` | `super-secret-key` | JWT signing key |
| `JWT_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `REFRESH_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `S3_BUCKET` | `capvia-resumes` | File storage bucket |
| `S3_ENDPOINT` | `https://s3.amazonaws.com` | S3 or MinIO endpoint |
| `AWS_ACCESS_KEY_ID` | `AKIA…` | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | `…` | S3 credentials |
| `OPENAI_API_KEY` | `sk-…` | AI Rewrite endpoint |
| `PINECONE_API_KEY` | `…` | Vector DB (optional) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS whitelist |
