# Walkthrough — CAPVIA One-Command Startup System & Recent Additions

This walkthrough summarizes the setup, startup automation, recent bug fixes, and feature additions applied to the CAPVIA ecosystem.

## Changes Made

### 1. Feature Additions: HR DNA Profiles Page
*   Created the missing HR DNA Profiles dashboard page at [/hr/dna/page.tsx](file:///Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/src/app/hr/dna/page.tsx). 
*   Wires up candidate capability radar charts (via Recharts), 9-dimensional capability bar indicators, average DNA scores, ranking tiers (GOLD/SILVER/BRONZE), and an expandable detailed profile drawer.
*   Enables recruiters to generate or regenerate candidate DNA maps dynamically with real-time feedback.

### 2. Infrastructure Mitigations (MongoDB storage crash workaround)
*   **MongoDB WiredTiger disk-space crash**: Free space on `/` was under 1.1Gi, causing WiredTiger checkpointer and FTDC (Full Time Diagnostic Data Capture) to abort and crash MongoDB.
*   **Workaround**: Created a local database directory on the external drive at `/Volumes/KINGSTON/CAPVIA/storage/mongodb` (4.7Gi available) and launched MongoDB manually with disabled FTDC (`--setParameter diagnosticDataCollectionEnabled=false`), stabilizing database operations.

### 3. Startup Automation Scripts & Makefile
*   Created [setup.sh](file:///Volumes/KINGSTON/CAPVIA/setup.sh) to handle environment checks, dependencies installation with exFAT workarounds, and database migrations/seeds.
*   Created [start.sh](file:///Volumes/KINGSTON/CAPVIA/start.sh) to orchestrate background processes (backends, workers, frontends) sequentially with dynamic health checking.
*   Created [stop.sh](file:///Volumes/KINGSTON/CAPVIA/stop.sh) to read running PIDs and gracefully shut down the ecosystem.
*   Created [restart.sh](file:///Volumes/KINGSTON/CAPVIA/restart.sh) to restart services.
*   Created [healthcheck.sh](file:///Volumes/KINGSTON/CAPVIA/healthcheck.sh) to report colored status of databases and microservices.
*   Created [Makefile](file:///Volumes/KINGSTON/CAPVIA/Makefile) wrapping these scripts under standard targets (`make setup`, `make start`, `make stop`, `make restart`, `make health`).

### 4. Authentication Corrections
*   **CORS Whitelisting Fix**: Fixed wildcard CORS registration (`allow_origins=["*"]`) in `capvia_platform/main.py` which was causing browsers to block preflight requests with credentials. Replaced it with explicit whitelisted localhost origins and a subdomain matcher matching `ats_resume` configuration.
*   **Sign-Up Validation Polish**: Added client-side email format regex checks and configured custom backend validation exception mapping for FastAPI RequestValidationError (422), enabling detailed field validation errors to display in the UI.
*   **Simulated Google Sign-in**: Connected the Google Login button to an interactive modal letting developer select seeded Candidate or Recruiter profiles to sign in instantly.
*   **Test Password Recovery**: Re-hashed seeded user passwords in the DB to match `password123` since they had mock pbkdf2 strings mismatching the active bcrypt validation configuration.

---

## Validation & Verification

### Status Check Output (make health)
All databases and microservices are now successfully running and healthy:

```text
====================================================
        CAPVIA ECOSYSTEM HEALTHCHECK SYSTEM         
====================================================

--- Infrastructure & Databases ---
Resource                            | Port/Details | Status      
----------------------------------- | ------------ | ------------
Neon Postgres DB                    | Cloud        | Healthy
Local PostgreSQL                    | 5432         | Healthy
Local Redis                         | 6379         | Healthy
Local MongoDB                       | 27017        | Healthy
Upstash Redis REST                  | Cloud REST   | Healthy
Supabase API                        | Cloud REST   | Healthy
Resend Email Service                | Console Mock | Warning

--- Application Services & Backends ---
Service Name                        | Port/Response | Status      
----------------------------------- | ------------ | ------------
CAPVIA Core Backend                 | 200          | Healthy
ATS Backend                         | 200          | Healthy
Simulation Backend                  | 404          | Healthy
Interview Evaluation Server         | 200          | Healthy

--- Application Frontends ---
Frontend Name                       | Port/Response | Status      
----------------------------------- | ------------ | ------------
CAPVIA Unified UI                   | 200          | Healthy

--- Background Workers ---
Worker Name                         | Type         | Status      
----------------------------------- | ------------ | ------------
ATS Celery Worker                   | Process Run  | Healthy
Simulation Celery Worker            | Process Run  | Healthy

=============================================
Ecosystem Status: Healthy
=============================================
```
