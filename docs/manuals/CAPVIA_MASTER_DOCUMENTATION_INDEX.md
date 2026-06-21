# CAPVIA — Master Documentation Index

> The definitive guide to all CAPVIA documentation. Every document, its audience, and when to read it.

---

## Quick Navigation

| I am a... | Start Here |
|-----------|-----------|
| **New developer** | [FULL_SETUP_GUIDE.md](FULL_SETUP_GUIDE.md) |
| **Existing developer (daily)** | [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md) |
| **DevOps / Deploying** | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| **Going to production** | [PRODUCTION_LAUNCH_GUIDE.md](PRODUCTION_LAUNCH_GUIDE.md) |
| **On-call / Incident** | [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) |
| **Debugging an issue** | [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) |
| **Architecture review** | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) |
| **Database work** | [DATABASE_GUIDE.md](DATABASE_GUIDE.md) |
| **API integration** | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| **Security audit** | [SECURITY_GUIDE.md](SECURITY_GUIDE.md) |
| **Cloud services** | [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md) |
| **Testing** | [TESTING_GUIDE.md](TESTING_GUIDE.md) |
| **Founder / Investor** | [CAPVIA_FOUNDER_MANUAL.md](CAPVIA_FOUNDER_MANUAL.md) |
| **Overview of everything** | [../README.md](../README.md) |

---

## Complete Documentation Map

```
docs/
├── README.md                           ← Platform overview, architecture, quick start
│
└── manuals/
    ├── CAPVIA_MASTER_DOCUMENTATION_INDEX.md  ← This file
    │
    ├── FULL_SETUP_GUIDE.md             ← Steps 1-22: Fresh laptop to running platform
    ├── LOCAL_DEVELOPMENT_GUIDE.md      ← Daily dev commands, migrations, debugging
    ├── CLOUD_SETUP_GUIDE.md            ← Neon, Upstash, Supabase, Resend, Railway, Vercel, Sentry
    ├── DEPLOYMENT_GUIDE.md             ← Exact deployment order + GitHub Actions CI/CD
    ├── PRODUCTION_LAUNCH_GUIDE.md      ← Pre-launch checklist + smoke tests + E2E validation
    ├── TESTING_GUIDE.md                ← Unit, integration, E2E, security, performance tests
    ├── OPERATIONS_RUNBOOK.md           ← Daily ops, alerting, backups, incident response
    ├── SYSTEM_ARCHITECTURE.md          ← Full architecture with flow diagrams
    ├── DATABASE_GUIDE.md               ← All 19 tables, columns, queries, migrations
    ├── API_DOCUMENTATION.md            ← Every endpoint with request/response examples
    ├── TROUBLESHOOTING_GUIDE.md        ← Symptom → cause → fix for all known issues
    ├── SECURITY_GUIDE.md               ← Auth, RBAC, webhooks, secrets, OWASP
    └── CAPVIA_FOUNDER_MANUAL.md        ← Demo script, investor pitch, onboarding, metrics
```

---

## Document Details

### [README.md](../README.md)
**Audience:** Everyone  
**Purpose:** First document anyone should read. Explains what CAPVIA is, the problem it solves, the evaluation pipeline, tech stack, and repository structure.  
**Key sections:** Problem statement, engine descriptions, quick start, documentation index

---

### [FULL_SETUP_GUIDE.md](FULL_SETUP_GUIDE.md)
**Audience:** New developer with a fresh machine  
**Purpose:** Take someone from zero installed software to running all 5 services in ~2 hours.  
**Key sections:** Homebrew → Python 3.12 → Node 20 → clone → venv → DB migration → start all services → verify

---

### [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md)
**Audience:** Active developer (daily reference)  
**Purpose:** Every command needed for day-to-day development — starting services, migrations, debugging, inspecting logs.  
**Key sections:** Service start commands, migration commands, database inspection, JWT debugging, webhook testing

---

### [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md)
**Audience:** DevOps / Developer setting up cloud services  
**Purpose:** Create and configure every cloud service from scratch with exact steps.  
**Key sections:** Neon, Upstash, Supabase, Resend, Railway, Vercel, Sentry — each with account setup, configuration, and verification commands

---

### [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
**Audience:** DevOps engineer deploying to production  
**Purpose:** Exact deployment order with commands. Includes GitHub Actions CI/CD config.  
**Key sections:** 12-step deployment order, Railway/Vercel deploy commands, environment variables checklist, rollback procedures

---

### [PRODUCTION_LAUNCH_GUIDE.md](PRODUCTION_LAUNCH_GUIDE.md)
**Audience:** Founder + DevOps on go-live day  
**Purpose:** Final verification before opening to users. Smoke tests, E2E tests, security validation, performance checks.  
**Key sections:** Pre-launch checklist, smoke test scripts, E2E pipeline test, security validation, performance benchmarks, rollback triggers

---

### [TESTING_GUIDE.md](TESTING_GUIDE.md)
**Audience:** Developer or QA engineer  
**Purpose:** Every type of test CAPVIA supports, how to run each, and what "passing" means.  
**Key sections:** Unit tests (pytest), integration tests, E2E pipeline, API tests (curl), security tests (OWASP), performance tests (wrk/locust), success criteria

---

### [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md)
**Audience:** On-call engineer or DevOps  
**Purpose:** Operational procedures for keeping CAPVIA running in production.  
**Key sections:** Daily health check, weekly/monthly tasks, alert handling (P0-P3), backup/restore, service restart, scaling, incident response template

---

### [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
**Audience:** Architect, senior developer, technical evaluator  
**Purpose:** Deep-dive into system design — all components, data flows, state machines, and deployment topology.  
**Key sections:** High-level architecture diagram, request flow sequence diagrams, application state machine, Integrity/DNA/Ranking data flows, security architecture, deployment diagram

---

### [DATABASE_GUIDE.md](DATABASE_GUIDE.md)
**Audience:** Developer or DBA working with data  
**Purpose:** Reference for all 19 database tables — columns, types, constraints, relationships, and indexes.  
**Key sections:** All 19 table definitions, ERD, common queries (leaderboard, DNA comparison, risk distribution), migration commands, backup/restore

---

### [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
**Audience:** Developer integrating with CAPVIA or testing endpoints  
**Purpose:** Complete REST API reference.  
**Key sections:** Auth endpoints, Companies, Internships, Applications, Webhooks (with HMAC calculation), Rankings, DNA Engine, Health, Error codes, Rate limiting

---

### [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
**Audience:** Developer or DevOps encountering errors  
**Purpose:** Symptom → cause → fix for all common issues.  
**Key sections:** Gateway startup failures, database connection issues, Redis TLS errors, JWT debugging, webhook signature verification, ATS/Interview engine issues, frontend issues, evaluation pipeline debugging

---

### [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
**Audience:** Security reviewer or backend engineer  
**Purpose:** Comprehensive security implementation reference.  
**Key sections:** bcrypt password hashing, JWT + RTR, RBAC, HMAC webhook signing, TLS configuration, CORS, rate limiting, secrets management, OWASP Top 10 compliance table, security checklist, incident response

---

### [CAPVIA_FOUNDER_MANUAL.md](CAPVIA_FOUNDER_MANUAL.md)
**Audience:** Founder, investor, or recruiter  
**Purpose:** Non-technical overview plus demo script, pitch deck framework, and business metrics.  
**Key sections:** Executive summary, platform value prop, 10-minute demo script, investor narrative, market sizing, revenue model, onboarding checklist, known limitations, critical contacts

---

## System Versions

| Component | Version |
|-----------|---------|
| CAPVIA Platform | v1.0.0 |
| FastAPI | ≥0.100.0 |
| Next.js | 14.2.3 |
| Python | 3.12 |
| Node.js | 20+ |
| SQLAlchemy | ≥2.0.0 |
| PostgreSQL | 16 (Neon) |
| Redis | 7 (Upstash) |
| Documentation | June 2024 |

---

## Key Phone Numbers / URLs

| Resource | URL |
|----------|-----|
| Production API | https://api.capvia.io |
| Production Frontend | https://capvia.io |
| Swagger UI (dev) | http://localhost:8000/docs |
| ReDoc (dev) | http://localhost:8000/redoc |
| Neon Dashboard | https://neon.tech/app |
| Upstash Console | https://console.upstash.com |
| Supabase Dashboard | https://supabase.com/dashboard |
| Railway Dashboard | https://railway.app |
| Vercel Dashboard | https://vercel.com/dashboard |
| Sentry Dashboard | https://sentry.io |
| GitHub Repo | https://github.com/JawadSk12/CAPVIA |
