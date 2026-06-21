# Local Development Guide

This guide details the daily developer workflows, debugging utilities, migration steps, and logging structures.

---

## 1. Daily Startup Routine

To start the entire CAPVIA ecosystem for daily development, execute the following commands in separate terminal sessions:

### Service 1: Local Cache (Redis)
Ensure Redis is running locally on the standard port `6379`:
```bash
redis-cli ping
# Expected response: PONG
```
If not running:
```bash
brew services start redis
```

### Service 2: CAPVIA Core Backend
```bash
cd capvia_platform
source venv/bin/activate
uvicorn main.py --host 127.0.0.1 --port 8000 --reload
```

### Service 3: CAPVIA Web HR & Candidate Frontend
```bash
cd capvia_platform/frontend
npm run dev
```

### Service 4: Mock Microservice Pipelines
Spin up the ATS, Simulation, and Interview servers on their corresponding ports (ports `8001`, `8002`, `8003`).

---

## 2. Database Migrations & Administration

CAPVIA uses Alembic for tracking structural schema changes in PostgreSQL.

### Run Existing Migrations
```bash
cd capvia_platform
source venv/bin/activate
alembic upgrade head
```

### Create a New Schema Migration
When modifying model attributes in `capvia_platform/models/models.py`, generate a new migration script using auto-generation:
```bash
alembic revision --autogenerate -m "add_custom_profile_fields_to_user"
```
Review the auto-generated migration file created in `capvia_platform/alembic/versions/`. Once verified, apply it:
```bash
alembic upgrade head
```

### Roll Back the Latest Migration
```bash
alembic downgrade -1
```

### Reset Database Environment
To clean the local schema and reset all tables:
```bash
cd capvia_platform
source venv/bin/activate
python3 drop_tables.py
alembic upgrade head
```

---

## 3. Seeding Test Data

A helper script is provided to populate the database with realistic companies, internships, candidates, and multi-stage evaluation records:
```bash
cd capvia_platform
source venv/bin/activate
python3 scripts/seed_db.py
```
This adds:
- `jane.hr@recruiter.com` (HR role, password `RecruiterSecure123!`)
- `john.doe@candidate.com` (Student role, password `CandidateSecure123!`)
- 1 Verified Company (Acme Capvia AI Corp)
- 2 Internships (AI Platform Engineer Intern, Frontend Intern)
- Full evaluations in various stage statuses.

---

## 4. Debugging & Verification Routines

### Debugging REST APIs via Terminal
Query endpoint routers directly using `curl`:
```bash
# Health checks
curl -i http://localhost:8000/api/v1/health

# Public internship listings search
curl -i "http://localhost:8000/api/v1/internships?search=Platform&limit=10"
```

### Debugging Local PostgreSQL Records
Query database rows directly from the CLI:
```bash
psql capvia_dev_db
```
SQL checks:
```sql
-- View all applicants and current workflow stages
SELECT id, candidate_id, vacancy_id, status, current_stage FROM applications;

-- Check final rankings and recommendation tiers
SELECT application_id, final_score, internship_rank, recommendation_tier FROM rankings ORDER BY final_score DESC;
```

### Debugging Cache Keys in Redis
```bash
redis-cli
127.0.0.1:6379> keys *
127.0.0.1:6379> get "auth:refresh:john.doe@candidate.com"
```

---

## 5. Webhook Auditing and Integration Tests

For microservice webhook callback testing, trigger manual webhooks via `curl` to simulate the external candidate evaluations:

### Simulate ATS Resume Processing Completed Webhook
```bash
curl -X POST http://localhost:8000/api/v1/gateway/webhooks/ats \
  -H "Content-Type: application/json" \
  -H "X-CAPVIA-Signature: your_configured_ats_webhook_secret_key" \
  -d '{
    "ats_resume_uuid": "e30be906-8d6f-4d94-a159-450f38b0561e",
    "ats_job_uuid": "025db931-1b9a-4c28-98bc-a8863f6a2fe0",
    "candidate_email": "john.doe@candidate.com",
    "overall_score": 82.5,
    "score_band": "High Match",
    "detected_role": "AI Engineer",
    "matched_skills": ["Python", "PyTorch", "FastAPI"],
    "missing_skills": ["Docker"],
    "fraud_flags": []
  }'
```

---

## 6. Logs Monitoring

CAPVIA routes standard logs to stdout. To monitor errors, events, and background query logs:

### Core Backend logs
If reloading is active, tail the output of the terminal running `uvicorn`.
To write output to persistent logs in the workspace:
```bash
uvicorn main.py --reload >> local_app.log 2>&1 &
tail -f local_app.log
```
Look for keywords:
- `Greenlet` - indicates ORM lazy load exceptions (see [TROUBLESHOOTING_GUIDE.md](file:///Volumes/KINGSTON/CAPVIA/TROUBLESHOOTING_GUIDE.md)).
- `HTTPException` - standard API error codes (401, 403, 404).
- `IntegrityError` - foreign key or unique constraint violations.
