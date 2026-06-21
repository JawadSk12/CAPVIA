# CAPVIA — Testing Guide

> **Audience:** Developer or QA engineer running any type of test on CAPVIA.

---

## Testing Overview

| Test Type | Tool | Location | Run Command |
|-----------|------|----------|-------------|
| Unit tests | pytest | `capvia_platform/tests/` | `pytest tests/ -v` |
| Integration tests | pytest + httpx | `capvia_platform/tests/` | `pytest tests/test_*_integration.py -v` |
| E2E pipeline | pytest | `capvia_platform/tests/test_e2e_pipeline.py` | `pytest tests/test_e2e_pipeline.py -v` |
| API tests | curl / httpie | Manual | See API section below |
| Frontend tests | Jest / Playwright | `capvia_platform/frontend/` | `npm test` |
| Load tests | wrk / locust | Manual | See load testing section |
| Security tests | Manual + OWASP ZAP | Manual | See security section |

---

## Setup

```bash
cd capvia_platform
source venv/bin/activate

# Install test dependencies (already in requirements.txt)
pip install pytest pytest-asyncio httpx

# Set test environment
export DATABASE_URL="postgresql+asyncpg://neondb_owner:<pw>@<host>/neondb_test?ssl=require"
export REDIS_URL="rediss://default:<token>@<host>:6379"
export SECRET_KEY="test_secret_key_minimum_32_chars_ok"
export ATS_ENGINE_URL="http://localhost:8001"
export SIMULATION_ENGINE_URL="http://localhost:8002"
export INTERVIEW_ENGINE_URL="http://localhost:8765"
```

---

## 1. Unit Tests

Unit tests test individual services and functions in isolation.

### Run All Unit Tests

```bash
cd capvia_platform
pytest tests/ -v --tb=short
```

### Run Specific Test File

```bash
pytest tests/test_auth.py -v
pytest tests/test_integrity_engine.py -v
pytest tests/test_dna_engine.py -v
pytest tests/test_ranking_engine.py -v
```

### Run Tests with Coverage

```bash
pip install pytest-cov
pytest tests/ --cov=capvia_platform --cov-report=html --cov-report=term-missing
# Open: htmlcov/index.html
```

### Test Files and What They Test

| File | Tests |
|------|-------|
| `test_auth.py` | Registration, login, logout, refresh token, RTR replay attack, email verify, password reset |
| `test_companies.py` | Company CRUD, member management, role checks |
| `test_internships.py` | Internship creation, publication, closing, applications count |
| `test_applications.py` | Apply, withdraw, shortlist, reject, hire, notification lifecycle |
| `test_ats_integration.py` | ATS webhook handling, ATSResult saving, score propagation |
| `test_simulation_integration.py` | Simulation webhook, SimulationResult upsert |
| `test_interview_integration.py` | Interview webhook, IntegrityResult creation |
| `test_integrity_engine.py` | Integrity score calculation, penalty computation, trust index |
| `test_dna_engine.py` | All 9 DNA dimension computations, radar chart, capability vectors |
| `test_ranking_engine.py` | Final score, tier classification, internship rank, percentile |
| `test_report_engine.py` | Report generation, strengths/weaknesses extraction |
| `test_e2e_pipeline.py` | Full pipeline from application → ranking → report |

---

## 2. Integration Tests

Integration tests require all services to be running.

### Setup

```bash
# Start all services in background
uvicorn capvia_platform.main:app --port 8000 &
# (ATS, Simulation, Interview engines also running)
```

### Run Integration Tests

```bash
pytest tests/test_ats_integration.py \
       tests/test_simulation_integration.py \
       tests/test_interview_integration.py \
       -v --tb=long
```

### Sample Integration Test: ATS Webhook

```python
# tests/test_ats_integration.py — excerpt
import pytest
import httpx

@pytest.mark.asyncio
async def test_ats_webhook_creates_result(client, db_session, test_application):
    """ATS_PROCESSED webhook creates ATSResult and advances application status."""
    response = await client.post(
        f"/api/v1/test/trigger-webhook"
        f"?application_id={test_application.id}&event=ATS_PROCESSED"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    
    # Verify ATSResult created in DB
    from capvia_platform.models.models import ATSResult
    from sqlalchemy import select
    result = await db_session.execute(
        select(ATSResult).where(ATSResult.application_id == test_application.id)
    )
    ats = result.scalar_one_or_none()
    assert ats is not None
    assert ats.overall_score == 82.5
```

---

## 3. E2E Pipeline Test

The E2E test validates the complete evaluation pipeline end-to-end.

```bash
pytest tests/test_e2e_pipeline.py -v -s
```

Expected output:
```
PASSED tests/test_e2e_pipeline.py::test_full_pipeline_creates_ranking
  - Application created: <uuid>
  - ATS webhook processed: score=82.5
  - Simulation webhook processed: score=85.5
  - Interview webhook processed: score=78
  - Integrity computed: trust_index=84
  - DNA generated: 9 dimensions computed
  - Ranking computed: final_score=82.6, tier=GOLD, rank=1
  - Report generated: summary contains strengths
```

---

## 4. API Tests

### Test Register → Login → Authenticated Request

```bash
#!/bin/bash
BASE="http://localhost:8000/api/v1"

# Register
REGISTER_RESP=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"ApiTest123!","full_name":"API Test"}')
echo "Register: $REGISTER_RESP"
VERIFY_TOKEN=$(echo $REGISTER_RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['simulated_token'])")

# Verify
curl -s -X POST "$BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$VERIFY_TOKEN\"}" | python3 -m json.tool

# Login
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"ApiTest123!"}')
ACCESS_TOKEN=$(echo $LOGIN_RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Access token obtained"

# List internships
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/internships" | python3 -m json.tool
```

### Test Integrity Engine

```bash
# Manually trigger integrity calculation for an application
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8000/api/v1/integrity/$APP_ID/calculate" \
  | python3 -m json.tool
```

Expected:
```json
{
  "success": true,
  "integrity_score": 87,
  "trust_index": 84,
  "risk_level": "LOW",
  "confidence_level": 0.67,
  "explainability": {
    "summary": "Integrity Score: 87/100. Trust Index: 84/100...",
    "signals": []
  }
}
```

### Test DNA Engine

```bash
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8000/api/v1/dna/$APP_ID/generate" \
  | python3 -m json.tool
```

Expected:
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
  }
}
```

### Test Ranking Engine

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8000/api/v1/rankings/$INTERNSHIP_ID/leaderboard" \
  | python3 -m json.tool
```

---

## 5. Security Tests

### OWASP Top 10 Manual Checks

#### A01: Broken Access Control

```bash
# Test: Candidate cannot access another candidate's application
CANDIDATE1_TOKEN="<token>"
OTHER_APP_ID="<another_candidates_app_uuid>"

curl -s -H "Authorization: Bearer $CANDIDATE1_TOKEN" \
  "http://localhost:8000/api/v1/applications/$OTHER_APP_ID"
# Expected: 403 Forbidden
```

#### A02: Cryptographic Failures

```bash
# Verify password is hashed (not plaintext in DB)
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from capvia_platform.models.models import User
from capvia_platform.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        r = await s.execute(select(User).limit(1))
        user = r.scalar_one_or_none()
        if user:
            print('Hash starts with \$2b:', user.password_hash[:4] == '\$2b\$')
asyncio.run(check())
"
# Expected: Hash starts with $2b: True (bcrypt)
```

#### A07: Identification & Authentication Failures

```bash
# Test: Replay attack detection
REFRESH_TOKEN="<valid_refresh_token>"

# Use refresh token once
curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"

# Try to use the SAME token again — should trigger replay detection
curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"
# Expected: 401 "Replay attack detected. All active sessions have been terminated."
```

### OWASP ZAP Automated Scan

```bash
# Install OWASP ZAP
brew install owasp-zap

# Run passive scan
zap-cli quick-scan --self-contained \
  --start-options "-config api.disablekey=true" \
  http://localhost:8000/api/v1
```

---

## 6. Performance Tests

### wrk HTTP Benchmark

```bash
brew install wrk

# Health endpoint — baseline
wrk -t4 -c100 -d30s http://localhost:8000/api/health

# Expected:
# Requests/sec: >500
# Latency avg: <50ms
# Errors: 0

# Auth endpoint — realistic load
wrk -t2 -c20 -d30s \
  -H "Content-Type: application/json" \
  --script=scripts/auth_benchmark.lua \
  http://localhost:8000/api/v1/internships
```

### Locust Load Test

```python
# locustfile.py
from locust import HttpUser, task, between

class CAPVIAUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        resp = self.client.post("/api/v1/auth/login", json={
            "email": "loadtest@capvia.io",
            "password": "LoadTest2024!"
        })
        self.token = resp.json().get("access_token")
    
    @task(3)
    def list_internships(self):
        self.client.get(
            "/api/v1/internships",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def view_application(self):
        self.client.get(
            "/api/v1/applications/me",
            headers={"Authorization": f"Bearer {self.token}"}
        )
```

```bash
pip install locust
locust -f locustfile.py --host=http://localhost:8000
# Open http://localhost:8089 to start load test
```

---

## 7. Frontend Tests

```bash
cd capvia_platform/frontend

# Run Jest unit tests
npm test

# Run in watch mode
npm test -- --watch

# Type checking
npm run build  # catches TypeScript errors

# Lint
npm run lint
```

---

## Success Criteria

| Test Type | Pass Criteria |
|-----------|---------------|
| Unit tests | 100% pass, 0 failures |
| Integration tests | All webhook handlers create correct DB records |
| E2E pipeline | Application reaches `EVALUATED` status with `final_score` > 0 |
| API auth | JWT returned on login, rejected after expiry |
| Security — access control | 403 on unauthorized access attempts |
| Security — replay attack | 401 on second refresh token use |
| Performance — health | >500 req/sec, <50ms avg latency |
| Performance — protected | >100 req/sec with token auth, <200ms avg |
| Lighthouse | Performance >80, Accessibility >90 |

---

## Continuous Integration

Tests run automatically on every push via GitHub Actions (see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)).

To run CI locally:

```bash
# Simulate CI environment
cd capvia_platform
pytest tests/ -v --tb=short --maxfail=3 \
  -x  # Stop on first failure
```
