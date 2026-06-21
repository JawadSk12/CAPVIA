# CAPVIA — Local Development Guide

> **Audience:** Developer with the platform already set up (see FULL_SETUP_GUIDE.md). This is your daily reference.

---

## Quick Service Start Reference

| Service | Directory | Command | Port |
|---------|-----------|---------|------|
| CAPVIA Gateway | `/path/to/CAPVIA` | `PYTHONPATH="." uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload` | 8000 |
| ATS Engine | `ats_resume/backend/` | `PYTHONPATH=".:../ai_engine" uvicorn main:app --host 127.0.0.1 --port 8001 --reload` | 8001 |
| Simulation | `ai_simulation/backend/` | `uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload` | 8002 |
| Interview Eval | `ai_interview/` | `python evaluation_server.py` | 8765 |
| Frontend | `capvia_platform/frontend/` | `npm run dev` | 3000 |

---

> [!IMPORTANT]
> **exFAT Filesystem Warning:** If your project resides on an exFAT formatted drive, standard virtual environments (`venv`) inside the project will fail due to exFAT filesystem limitations. Instead, create your Python virtual environments on the internal Mac SSD drive (e.g. `~/capvia_gateway_venv`, `~/capvia_ats_venv`, `~/capvia_simulation_venv`, `~/capvia_interview_venv`) and activate them from there.

---

## 1. Running the CAPVIA Gateway

```bash
# Navigate to CAPVIA root
cd /path/to/CAPVIA

# Activate virtual environment
source venv/bin/activate  # Standard
# source ~/capvia_gateway_venv/bin/activate  # If on exFAT volume

# Development (with hot-reload and PYTHONPATH set)
PYTHONPATH="." uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload

# Production-like (no reload, multiple workers)
PYTHONPATH="." uvicorn capvia_platform.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**API Explorer:** http://localhost:8000/docs  
**ReDoc:** http://localhost:8000/redoc

---

## 2. Running the ATS Engine

```bash
cd /path/to/CAPVIA/ats_resume/backend

source venv/bin/activate  # Standard
# source ~/capvia_ats_venv/bin/activate  # If on exFAT volume

# Run with ai_engine in PYTHONPATH
PYTHONPATH=".:../ai_engine" uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

The ATS engine requires:
- MongoDB running (or MongoDB Atlas connection string in `.env`)
- Redis connection (for job queuing)
- SBERT model files downloaded (first run downloads automatically)

---

## 3. Running the Simulation Engine

```bash
cd /path/to/CAPVIA/ai_simulation/backend

source venv/bin/activate  # Standard
# source ~/capvia_simulation_venv/bin/activate  # If on exFAT volume

# Apply any pending migrations using Alembic
alembic upgrade head

# Start FastAPI dev server
uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

---

## 4. Running the Interview Engine

### Evaluation Server (required)

```bash
cd /path/to/CAPVIA/ai_interview

source venv/bin/activate  # Standard
# source ~/capvia_interview_venv/bin/activate  # If on exFAT volume

python evaluation_server.py
# Output: "Starting AI Interview Evaluation Server on http://localhost:8765"
```

### Electron Desktop App (candidate interface)

```bash
cd /path/to/CAPVIA/ai_interview

# First time only
npm install --no-bin-links

# Start Electron + React dev mode
npm run electron-dev
```

---

## 5. Running Redis Locally

For local development without Upstash, run Redis via Docker:

```bash
docker run -d --name capvia-redis -p 6379:6379 redis:7-alpine

# Verify
redis-cli ping
# Expected: PONG
```

Update `.env`:
```
REDIS_URL=redis://localhost:6379/0
```

---

## 6. Running Celery Workers

CAPVIA Gateway uses Celery for background task processing:

```bash
cd /path/to/CAPVIA/capvia_platform
source venv/bin/activate

# Start Celery worker
celery -A capvia_platform.tasks worker --loglevel=info

# Start Celery Beat scheduler (for periodic tasks)
celery -A capvia_platform.tasks beat --loglevel=info

# Monitor tasks with Flower (optional)
pip install flower
celery -A capvia_platform.tasks flower --port=5555
# Dashboard: http://localhost:5555
```

---

## 7. Database Migrations

### Apply All Pending Migrations

```bash
cd capvia_platform
source venv/bin/activate
python -m alembic upgrade head
```

### Check Current Migration State

```bash
python -m alembic current
```

### Create a New Migration

After modifying `models/models.py`:

```bash
python -m alembic revision --autogenerate -m "Add new_field to users"
# Creates: alembic/versions/<revision_id>_add_new_field_to_users.py
```

Review the generated file before applying:

```bash
cat alembic/versions/<revision_id>_*.py
python -m alembic upgrade head
```

### Roll Back One Migration

```bash
python -m alembic downgrade -1
```

### Roll Back to a Specific Revision

```bash
python -m alembic downgrade <revision_id>
```

### Show Migration History

```bash
python -m alembic history --verbose
```

---

## 8. Reset Database (Development Only)

> ⚠️ **WARNING:** This destroys all data. Only for development.

```bash
cd capvia_platform
source venv/bin/activate

# Option A: Use the drop script
python drop_tables.py

# Option B: Direct Alembic downgrade to base
python -m alembic downgrade base

# Recreate
python -m alembic upgrade head
```

---

## 9. Seed Database

### Create Admin/HR User

```bash
cd capvia_platform
source venv/bin/activate

python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from capvia_platform.models.models import User, UserRole
from capvia_platform.utils.auth import hash_password
from capvia_platform.core.config import settings

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        # HR User
        hr = User(
            email='hr@capvia.io',
            password_hash=hash_password('HrCapvia2024!'),
            full_name='HR Manager',
            role=UserRole.HR,
            is_active=True
        )
        # Admin User
        admin = User(
            email='admin@capvia.io',
            password_hash=hash_password('AdminCapvia2024!'),
            full_name='Platform Admin',
            role=UserRole.ADMIN,
            is_active=True
        )
        s.add_all([hr, admin])
        await s.commit()
        print('Seeded: hr@capvia.io, admin@capvia.io')

asyncio.run(seed())
"
```

### Seed Sample Company and Internship

```bash
python -c "
import asyncio, uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from capvia_platform.models.models import Company, Internship, InternshipStatus, WorkMode
from capvia_platform.core.config import settings

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        company = Company(
            name='TechStartup India',
            industry='Technology',
            headquarters='Mumbai, India',
            founded_year=2022,
            employee_count='11-50',
            is_verified=True,
        )
        s.add(company)
        await s.flush()
        
        internship = Internship(
            company_id=company.id,
            title='Backend Developer Intern',
            description='Build scalable APIs using FastAPI and PostgreSQL.',
            responsibilities=['Write REST APIs', 'Optimize DB queries', 'Write tests'],
            required_skills=['Python', 'FastAPI', 'PostgreSQL', 'Redis'],
            technologies=['Python', 'FastAPI', 'SQLAlchemy', 'Docker'],
            experience_level='ENTRY',
            status=InternshipStatus.PUBLISHED,
            is_active=True,
            work_mode=WorkMode.REMOTE,
            duration_weeks=12,
            stipend_min=15000,
            stipend_max=25000,
            stipend_currency='INR',
            openings=5,
        )
        s.add(internship)
        await s.commit()
        print(f'Seeded: Company={company.id}, Internship={internship.id}')

asyncio.run(seed())
"
```

---

## 10. Inspecting Logs

### Gateway Logs (Real-time)

```bash
# Uvicorn prints structured logs by default
# To increase verbosity:
uvicorn capvia_platform.main:app --port 8000 --log-level debug --reload
```

### View Application Request Logs

The `RequestLoggingMiddleware` logs every request:
```
2024-06-21 10:23:45 INFO [request_log] POST /api/v1/auth/login | 200 | 45ms
```

### Filter Specific Log Levels

```bash
# Run and filter for errors only
uvicorn capvia_platform.main:app --port 8000 2>&1 | grep -E "ERROR|WARNING"
```

---

## 11. Debugging APIs

### Using Swagger UI

http://localhost:8000/docs — Interactive API explorer with authentication support.

1. Click **Authorize** (top right)
2. Enter: `Bearer <your_access_token>`
3. Execute any endpoint directly from the browser

### Using curl

```bash
# Get an access token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@capvia.io","password":"HrCapvia2024!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# List companies (authenticated)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/companies

# List internships
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/internships
```

### Using httpie (more readable)

```bash
pip install httpie
http POST :8000/api/v1/auth/login email=hr@capvia.io password=HrCapvia2024!
http -A bearer -a "$TOKEN" GET :8000/api/v1/companies
```

---

## 12. Debugging JWT

### Decode a JWT Token (without verification)

```bash
python3 -c "
import base64, json, sys
token = '<paste_token_here>'
parts = token.split('.')
payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
decoded = json.loads(base64.urlsafe_b64decode(payload))
import datetime
decoded['exp_readable'] = str(datetime.datetime.utcfromtimestamp(decoded.get('exp', 0)))
print(json.dumps(decoded, indent=2))
"
```

### Test JWT in Python

```bash
python3 -c "
from capvia_platform.utils.auth import decode_token
token = '<paste_access_token>'
claims = decode_token(token, expected_type='access')
print(claims)
"
```

### Common JWT Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` | Token expired | Re-login or use `/auth/refresh` |
| `401 Not authenticated` | Missing `Bearer ` prefix | Ensure header: `Authorization: Bearer <token>` |
| `403 Forbidden` | Wrong role | Verify your user's `role` field in DB |
| `Token reuse detected` | RTR replay attack triggered | All sessions revoked — re-login |

---

## 13. Debugging Webhooks

### Trigger a Test Webhook Manually

```bash
# First get application_id from your DB
APPLICATION_ID="<uuid>"

# Simulate ATS_PROCESSED
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=${APPLICATION_ID}&event=ATS_PROCESSED"

# Simulate SIMULATION_SUBMITTED
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=${APPLICATION_ID}&event=SIMULATION_SUBMITTED"

# Simulate INTERVIEW_EVALUATED
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=${APPLICATION_ID}&event=INTERVIEW_EVALUATED"
```

### Verify HMAC Signature Manually

```bash
python3 -c "
import hmac, hashlib, time, json

secret = 'whsec_prod_default_secret_key_change_me'
timestamp = str(int(time.time()))
payload = json.dumps({'event': 'TEST', 'data': {'application_id': 'test-uuid'}}).encode()

signed_payload = f'{timestamp}.'.encode() + payload
signature = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
print(f'X-CAPVIA-Signature: t={timestamp},v1={signature}')
"
```

### Check Webhook Configuration

```bash
curl http://localhost:8000/api/v1/webhooks/configure  # GET not available — use POST to update
```

View current config in code: `capvia_platform/routers/webhooks.py` → `WEBHOOK_CONFIG` dict.

---

## 14. Debugging Integrations

### Check ATS Engine Connectivity

```bash
python3 -c "
import httpx, asyncio
async def test():
    async with httpx.AsyncClient() as c:
        r = await c.get('http://localhost:8001/health', timeout=5)
        print('ATS status:', r.status_code, r.json())
asyncio.run(test())
"
```

### Check Simulation Engine Connectivity

```bash
curl http://localhost:8002/api/health/
```

### Check Interview Engine Connectivity

```bash
curl http://localhost:8765/health
# Expected: {"status": "ok", "service": "AI Interview Evaluator", "version": "1.0.0"}
```

### Check Redis Connectivity

```bash
python3 -c "
import asyncio, redis.asyncio as aioredis, os
async def test():
    r = aioredis.from_url(os.environ['REDIS_URL'])
    await r.set('debug', '1', ex=10)
    v = await r.get('debug')
    print('Redis OK:', v)
asyncio.run(test())
"
```

### Check Database Connectivity

```bash
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from capvia_platform.core.config import settings

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as c:
        r = await c.execute(text('SELECT count(*) FROM users'))
        print('Users in DB:', r.scalar())
asyncio.run(test())
"
```

---

## 15. Environment Variables Reference

### CAPVIA Gateway (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon asyncpg connection string |
| `REDIS_URL` | ✅ | Upstash Redis URL (`rediss://...`) |
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars) |
| `ALGORITHM` | ✅ | JWT algorithm (`HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Access token TTL (default: 30) |
| `ENVIRONMENT` | ✅ | `development` or `production` |
| `ATS_ENGINE_URL` | ✅ | ATS service base URL |
| `SIMULATION_ENGINE_URL` | ✅ | Simulation service base URL |
| `INTERVIEW_ENGINE_URL` | ✅ | Interview eval server URL |

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon key |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash REST URL (server-side only) |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash REST token (server-side only) |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry client DSN |
| `SENTRY_DSN` | Optional | Sentry server DSN |
| `NEXT_PUBLIC_API_URL` | ✅ | Gateway base URL (`http://localhost:8000`) |
