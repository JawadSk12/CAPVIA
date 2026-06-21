# CAPVIA — Founder Manual

> **This document is your operating handbook, demo script, pitch framework, and investor briefing in one.**

---

## Executive Summary

**CAPVIA** is an AI-powered recruitment platform that evaluates candidates across four measurable dimensions — resume intelligence, coding performance, interview quality, and behavioral integrity — and produces a ranked, explainable leaderboard for HR teams.

**Problem solved:** Legacy ATS systems reject 75% of qualified candidates based on keyword matching alone. CAPVIA replaces keyword matching with capability verification.

**Traction ready:** The full technical platform is built and functional. The documentation package you're reading demonstrates production readiness.

**Business model:** SaaS (per-company subscription, priced per internship posted or per candidate evaluated).

---

## Platform Value Proposition

| Feature | What it does | Why it matters |
|---------|-------------|---------------|
| ATS Engine | NLP + SBERT semantic resume analysis | Detects actual skills, not just keywords |
| Simulation Engine | Proctored coding rounds | Tests real performance under pressure |
| Interview Engine | AI-scored Q&A + webcam proctoring | Measures communication + authenticity |
| Integrity Engine | Cross-phase fraud detection | Trust index from behavioral signals |
| DNA Engine | 9-dimension capability profile | Replaces intuition with data |
| Ranking Engine | Weighted composite leaderboard | Defensible, explainable rankings |

---

## Demo Script

### Prerequisites

1. All services running (see LOCAL_DEVELOPMENT_GUIDE.md)
2. Browser open at http://localhost:3000
3. Swagger UI open at http://localhost:8000/docs

### Demo Flow (10-12 minutes)

---

#### Part 1: The Problem (2 minutes)

Show a traditional ATS rejection email. Describe how:
- "We sent 200 applications and got 5 interviews"
- "Someone with Python on their resume got selected over someone who built a FastAPI production system"
- "We rejected candidates from tier-2 colleges who were 3x more capable than those we interviewed"

---

#### Part 2: CAPVIA Overview (2 minutes)

Open the CAPVIA dashboard. Walk through the navigation:

1. **Internships board** — show the published Backend Developer Intern role
2. **Applications list** — show 47 applicants with status pills
3. **Leaderboard** — show sorted by `final_score` with tier badges

Key message: *"This replaces your spreadsheet and your gut feeling with a ranked, explainable list."*

---

#### Part 3: Live Demo — Full Pipeline (5 minutes)

**Step 1 — Create candidate application:**
```bash
# In browser or terminal
APPLICATION_ID=$(curl -s -X POST http://localhost:8000/api/v1/applications \
  -H "Authorization: Bearer <candidate_token>" \
  -H "Content-Type: application/json" \
  -d '{"internship_id":"<uuid>","cover_letter":"Demo application"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

echo "Application ID: $APPLICATION_ID"
```

**Step 2 — Run ATS evaluation:**
```bash
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=ATS_PROCESSED"
```

Show: Application status changes to `ATS_COMPLETED`. ATS score: 82.5/100 (GOOD band).

**Step 3 — Simulate coding round:**
```bash
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=SIMULATION_SUBMITTED"
```

Show: Simulation score: 85.5/100. Cheating risk: LOW. AI dependency: 12%.

**Step 4 — Simulate interview:**
```bash
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=INTERVIEW_EVALUATED"
```

Show: Interview score: 78/100. Recommendation: **Strong Hire**. Risk: LOW.

**Step 5 — Show the result:**

Refresh the leaderboard. The candidate now appears with:
- `final_score: 82.5`
- `tier: GOLD`
- `rank: 2 of 47`

Open the DNA radar chart. Show the 9 dimensions.

Open the ranking explainability:
```
"Candidate achieved a Final Score of 82.5/100, placing them in the GOLD tier. 
Data completeness: 100%. Strengths: Simulation: 85.5/100 — strong performance."
```

Key message: *"Every hiring decision is now auditable, explainable, and defensible."*

---

#### Part 4: Differentiation (2 minutes)

| Capability | Workday/Lever | HackerRank | CAPVIA |
|------------|--------------|------------|--------|
| Resume parsing | ✅ Keywords | ❌ No ATS | ✅ Semantic |
| Coding test | ❌ | ✅ | ✅ + Proctoring |
| Interview scoring | ❌ | ❌ | ✅ AI-scored |
| Integrity tracking | ❌ | ❌ | ✅ Full pipeline |
| DNA profile | ❌ | ❌ | ✅ 9 dimensions |
| Explainability | ❌ | ❌ | ✅ Every decision |
| Leaderboard | ❌ | ❌ | ✅ Weighted ranking |

---

### Demo Reset

After each demo, reset application state:

```bash
# Delete test applications (soft delete)
python3 -c "
import asyncio, uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import update
from datetime import datetime
from capvia_platform.models.models import Application
from capvia_platform.core.config import settings

async def reset(app_id):
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        await s.execute(
            update(Application)
            .where(Application.id==uuid.UUID(app_id))
            .values(deleted_at=datetime.utcnow())
        )
        await s.commit()
        print('Reset:', app_id)
asyncio.run(reset('$APPLICATION_ID'))
"
```

---

## Investor Pitch Framework

### The Narrative

```
HIRING IS BROKEN.

Companies waste 23 hours per hire on manual screening.
75% of qualified candidates are rejected by keyword-matching ATS systems.
Résumé fraud costs companies $14,000+ per bad hire.
Campus bias means the best engineers from tier-2 colleges are invisible.

CAPVIA FIXES THIS.

Four-stage capability verification:
  Semantic resume analysis → What they know
  Proctored coding → What they can build  
  AI-scored interview → How they communicate
  Integrity scoring → How they behave under pressure

The result: A ranked, explainable list of candidates, ordered by proven capability — not keywords.

We're starting with internship hiring because:
  - 400M+ applications per year globally
  - Companies are most willing to experiment
  - Internship quality is a leading indicator of full-time pipeline

The technology is built. The documentation is production-ready. We need distribution.
```

### Market Sizing

| Segment | Size |
|---------|------|
| India internship applications/year | 120M+ |
| Companies hiring interns (India) | 500,000+ |
| Global internship market (TAM) | $4.2B |
| B2B SaaS addressable at launch (SAM) | $400M |

### Revenue Model

**Per-internship pricing:**
- Starter: ₹2,999/internship (up to 50 applicants)
- Growth: ₹5,999/internship (up to 200 applicants)
- Scale: Custom enterprise pricing

**ACV targets:**
- SMB (1-3 internships/year): ₹9,000–18,000/year
- Mid-market (5-20 internships/year): ₹30,000–120,000/year
- Enterprise: Custom

---

## Onboarding New Developers

### Day 1 Checklist

```
Morning:
  [ ] Read README.md (30 min)
  [ ] Clone repo and run through FULL_SETUP_GUIDE.md
  [ ] Start all services locally
  [ ] Run smoke tests (curl all health endpoints)

Afternoon:
  [ ] Read SYSTEM_ARCHITECTURE.md
  [ ] Walk through the Swagger UI at localhost:8000/docs
  [ ] Run the E2E webhook flow (test trigger → see ranking)
  [ ] Read DATABASE_GUIDE.md (understand the 17 tables)
```

### Week 1 Milestones

```
Day 2: Read all service source files (main.py, models.py, routers/)
Day 3: Write and run a failing test — fix it
Day 4: Add a new field to a model + migration
Day 5: Submit your first PR — any improvement or bug fix
```

### Codebase Rules

1. **Never commit `.env` files**
2. **All DB queries use the async ORM** — no raw SQL except reporting
3. **Soft delete always** — set `deleted_at`, never `DELETE FROM`
4. **Type hints everywhere** — Python strict mode
5. **Every new endpoint needs a test** in `tests/`
6. **No secret in code** — use settings from `config.py`

---

## Key Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Time to first ranking | Candidate applies → gets ranked | < 72 hours |
| Platform completion rate | Candidates who complete all 4 stages | > 60% |
| HR adoption rate | HRs returning for 2nd internship | > 70% |
| Ranking accuracy | Hired candidates were in top 30% | > 80% |
| Support tickets/evaluation | Errors requiring manual intervention | < 2% |

---

## Platform Limitations (Current v1.0)

| Limitation | Impact | Planned Fix |
|------------|--------|-------------|
| Interview Electron app runs locally | Candidate must install desktop app | Web-based proctoring (WebRTC) |
| Webhook config stored in-memory | Config lost on restart | Move to database/Redis |
| No real-time notifications | Frontend polls | WebSocket upgrade |
| No candidate fraud training data | Fraud detection uses rules | ML classifier with labeled data |
| Single-region PostgreSQL | Higher latency for global users | Multi-region replica |

---

## Critical Contact Points

| Service | Dashboard | Alert Email |
|---------|-----------|-------------|
| Neon (DB) | neon.tech/app | Configure in Neon alerts |
| Upstash (Redis) | console.upstash.com | Configure in Upstash alerts |
| Sentry | sentry.io | Set to founder's email |
| Railway (Backend) | railway.app | Set to DevOps email |
| Vercel (Frontend) | vercel.com | Set to DevOps email |
| GitHub | github.com/JawadSk12/CAPVIA | Watch for security alerts |
