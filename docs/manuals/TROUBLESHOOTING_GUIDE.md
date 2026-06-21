# CAPVIA — Troubleshooting Guide

> **Audience:** Developer or DevOps engineer encountering errors. Organized by symptom.

---

## Table of Contents

1. [Gateway Startup Failures](#1-gateway-startup-failures)
2. [Database Issues](#2-database-issues)
3. [Redis Issues](#3-redis-issues)
4. [Authentication Issues](#4-authentication-issues)
5. [Webhook Issues](#5-webhook-issues)
6. [ATS Engine Issues](#6-ats-engine-issues)
7. [Interview Engine Issues](#7-interview-engine-issues)
8. [Frontend Issues](#8-frontend-issues)
9. [Evaluation Pipeline Issues](#9-evaluation-pipeline-issues)
10. [Deployment Issues](#10-deployment-issues)

---

## 1. Gateway Startup Failures

### Error: `ModuleNotFoundError: No module named 'capvia_platform'`

**Cause:** Python can't find the package because you're running from the wrong directory or wrong Python environment.

**Fix:**
```bash
# Ensure you are in capvia_platform/ and venv is active
cd /path/to/CAPVIA/capvia_platform
source venv/bin/activate

# Run with explicit module path
uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload
```

**DO NOT** use `PYTHONPATH` hacks. The correct working directory is sufficient.

---

### Error: `uvicorn not found` / Using system uvicorn

**Cause:** `uvicorn` is installed globally (Python 3.14 or system Python), not in the venv.

**Fix:**
```bash
# Check which uvicorn is being used
which uvicorn

# If it points to /opt/homebrew/bin/uvicorn (not venv), use:
python -m uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### Error: `pydantic_core._pydantic_core.ValidationError: ... missing required fields`

**Cause:** `.env` file missing required environment variables.

**Fix:**
```bash
# Check which variables are missing
python -c "from capvia_platform.core.config import settings; print(settings.DATABASE_URL[:20])"

# Ensure .env exists and has all required fields
cat .env | grep DATABASE_URL
cat .env | grep REDIS_URL
cat .env | grep SECRET_KEY
```

Required minimum `.env`:
```
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=rediss://...
SECRET_KEY=at_least_32_chars_here_anything_ok
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
```

---

### Error: `ImportError: cannot import name 'async_sessionmaker' from 'sqlalchemy'`

**Cause:** SQLAlchemy version < 2.0 installed.

**Fix:**
```bash
pip install "sqlalchemy>=2.0.0"
# or
pip install -r requirements.txt --upgrade
```

---

## 2. Database Issues

### Error: `asyncpg.exceptions.ConnectionFailureError: Connection refused`

**Cause:** Wrong `DATABASE_URL` host or Neon database is suspended.

**Fix:**
1. Go to Neon dashboard → check if database is suspended
2. Click **Resume** if suspended
3. Verify connection string uses the **pooled** endpoint (contains `-pooler` in hostname)
4. Test manually:
```bash
python3 -c "
import asyncio, asyncpg
async def t():
    c = await asyncpg.connect('postgresql://neondb_owner:<pw>@<host>/neondb', ssl='require')
    print(await c.fetchval('SELECT 1'))
asyncio.run(t())
"
```

---

### Error: `asyncpg.exceptions.TooManyConnectionsError`

**Cause:** Neon free tier connection limit exceeded, or using direct (non-pooled) endpoint with too many workers.

**Fix:**
1. Switch to the **pooled** connection string (hostname contains `-pooler`)
2. Reduce number of uvicorn workers
3. Ensure `engine` is shared (not created per-request)

---

### Error: `alembic.util.exc.CommandError: Target database is not up to date`

**Cause:** Database has migrations that haven't been applied, or alembic version table is out of sync.

**Fix:**
```bash
# Check current state
python -m alembic current

# If empty output (no revision tracked):
python -m alembic stamp head  # mark as current without running

# If outdated:
python -m alembic upgrade head
```

---

### Error: `ProgrammingError: relation "users" does not exist`

**Cause:** Migrations haven't been run yet.

**Fix:**
```bash
python -m alembic upgrade head
```

---

### Error: `asyncpg.exceptions.UndefinedColumnError: column ... does not exist`

**Cause:** Model code references a column that doesn't exist in the DB (migration not applied).

**Fix:**
```bash
# Create migration for new column
python -m alembic revision --autogenerate -m "Add missing column"

# Review the migration
cat alembic/versions/<new_revision>.py

# Apply
python -m alembic upgrade head
```

---

## 3. Redis Issues

### Error: `redis.exceptions.ConnectionError: Error connecting to Redis`

**Cause:** Wrong `REDIS_URL` or missing TLS prefix.

**Fix:**
- Ensure URL starts with `rediss://` (double-s for TLS), not `redis://`
- Upstash Redis requires TLS — plain `redis://` will fail

```bash
# Correct
REDIS_URL=rediss://default:<token>@<host>:6379

# Wrong (will fail)
REDIS_URL=redis://default:<token>@<host>:6379
```

---

### Error: `SSL: WRONG_VERSION_NUMBER`

**Cause:** Server expects TLS but client is connecting without TLS (or vice versa).

**Fix:**
- Upstash always uses TLS — use `rediss://`
- Local Docker Redis does not use TLS — use `redis://`

---

### Redis keys not expiring properly

**Check:**
```bash
redis-cli --tls -u "$REDIS_URL" TTL "email_verify:<token>"
# Should return seconds remaining, not -1 (no expiry)
```

**Fix:** If TTL returns -1, keys were set without expiry. Check the `ex=86400` parameter in Redis set calls.

---

## 4. Authentication Issues

### Error: `401 INVALID_CREDENTIALS`

**Cause:** Wrong password or wrong email.

**Debug:**
```python
from capvia_platform.utils.auth import verify_password, hash_password

# Check if stored hash matches input
stored_hash = "$2b$12$..."  # from users table
result = verify_password("user_entered_password", stored_hash)
print("Match:", result)
```

---

### Error: `401 ACCOUNT_INACTIVE`

**Cause:** User registered but email not verified.

**Fix (development):**
```bash
# Get verification token from registration response
# Then:
curl -X POST http://localhost:8000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<simulated_token_from_register_response>"}'

# Alternative: Manually activate in DB
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import update
from capvia_platform.models.models import User
from capvia_platform.core.config import settings

async def activate(email):
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        await s.execute(update(User).where(User.email==email).values(is_active=True))
        await s.commit()
        print(f'Activated: {email}')

asyncio.run(activate('your@email.com'))
"
```

---

### Error: `401 TOKEN_EXPIRED`

**Cause:** Access token has expired (default 30 minutes).

**Fix:** Use the `/auth/refresh` endpoint with your refresh token.

---

### Error: `401 REPLAY_ATTACK_DETECTED`

**Cause:** Refresh token was used twice. This triggers RTR security — all sessions terminated.

**Fix:** Login again to get new token pair.

---

### Error: `403 Forbidden`

**Cause:** Your JWT role doesn't match the required role for the endpoint.

**Debug:**
```bash
# Decode your JWT
python3 -c "
import base64, json
token = '<your_token>'
payload = token.split('.')[1]
payload += '=' * (4 - len(payload) % 4)
decoded = json.loads(base64.urlsafe_b64decode(payload))
print(decoded)
"
# Check: decoded['role'] should be 'hr' or 'admin' for HR endpoints
```

---

## 5. Webhook Issues

### Error: `401 INVALID_SIGNATURE`

**Cause:** HMAC signature doesn't match.

**Debug:**
```python
import hmac, hashlib, time, json

# Reproduce the signature
secret = "whsec_prod_default_secret_key_change_me"  # Must match WEBHOOK_CONFIG
timestamp = "1719003600"  # From X-CAPVIA-Signature header
payload_bytes = b'{"event":"ATS_PROCESSED",...}'  # Exact request body

signed = f"{timestamp}.".encode() + payload_bytes
expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
print(f"Expected: t={timestamp},v1={expected}")
```

---

### Webhook received but application not updating

**Debug:**
1. Check Gateway logs for the webhook handler:
```bash
uvicorn capvia_platform.main:app --port 8000 --log-level debug 2>&1 | grep "webhook"
```

2. Check if application exists:
```bash
python3 -c "
import asyncio, uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from capvia_platform.models.models import Application
from capvia_platform.core.config import settings

async def check(app_id):
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        r = await s.execute(select(Application).where(Application.id==uuid.UUID(app_id)))
        app = r.scalar_one_or_none()
        print('Application:', app.status if app else 'NOT FOUND')
asyncio.run(check('<app_uuid>'))
"
```

3. Re-trigger the webhook:
```bash
curl -X POST "http://localhost:8000/api/v1/test/trigger-webhook?application_id=<uuid>&event=ATS_PROCESSED"
```

---

## 6. ATS Engine Issues

### ATS Engine returns 502 Bad Gateway

**Cause:** ATS engine not running or unreachable.

**Fix:**
```bash
# Verify ATS is running
curl http://localhost:8001/health

# Start ATS if not running
cd ats_resume/backend
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

---

### SBERT model download fails

**Cause:** No internet access or model cache corrupted.

**Fix:**
```bash
# Clear Hugging Face model cache
rm -rf ~/.cache/huggingface/

# Re-download manually
python3 -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
print('Model loaded successfully')
"
```

---

## 7. Interview Engine Issues

### Error: `OSError: [Errno 48] Address already in use`

**Cause:** Port 8765 already occupied.

**Fix:**
```bash
# Find and kill the process using port 8765
lsof -ti:8765 | xargs kill -9

# Restart
python evaluation_server.py
```

---

### SentenceTransformers import error

**Cause:** Wrong Python environment.

**Fix:**
```bash
cd ai_interview
source venv/bin/activate  # Must be the AI interview venv
python -c "from sentence_transformers import SentenceTransformer; print('OK')"
```

---

## 8. Frontend Issues

### `npm install` fails with symlink error on exFAT disk

**Cause:** exFAT filesystem doesn't support symlinks (required by npm for bin links).

**Fix:** Always use `--no-bin-links`:
```bash
npm install --no-bin-links
```

---

### `Next.js error: NEXT_PUBLIC_API_URL is not defined`

**Cause:** `.env.local` missing or not loaded.

**Fix:**
```bash
cd capvia_platform/frontend
ls .env.local  # File must exist

# If missing:
cp .env.example .env.local
# Then edit .env.local with real values
```

---

### Frontend shows "Network Error" on API calls

**Cause:** Gateway not running or CORS not configured.

**Fix:**
1. Verify Gateway is running: `curl http://localhost:8000/api/health`
2. Check `NEXT_PUBLIC_API_URL` in `.env.local` matches Gateway address
3. Verify CORS in `main.py` includes `http://localhost:3000`

---

### Sentry not capturing errors in development

**Cause:** Sentry is disabled in development by default.

**Fix:** In `sentry.client.config.ts`:
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: true,  // Force enable for testing
})
```

---

## 9. Evaluation Pipeline Issues

### Ranking not computed after webhooks

**Cause:** Integrity, DNA, or Ranking Engine threw an exception.

**Debug:**
```bash
# Check gateway logs for errors after webhook
uvicorn capvia_platform.main:app --port 8000 --log-level debug 2>&1 | grep -E "ERROR|IntegrityService|DNAService|RankingService"
```

Common causes:
1. `IntegrityService: Application X not found` — Wrong `application_id` in webhook
2. `DNAService: No Internship linked` — Application's `vacancy_id` is NULL
3. `RankingService: No Internship linked` — Same issue

**Fix:** Verify the application has a valid `vacancy_id` in the database.

---

### Integrity score not updating

**Trigger manually:**
```bash
curl -X POST \
  -H "Authorization: Bearer $HR_TOKEN" \
  "http://localhost:8000/api/v1/integrity/<app_id>/calculate"
```

---

### DNA profile missing dimensions

**Cause:** Some evaluation stages missing — dimensions default to 0.

**Check which stages are present:**
```bash
python3 -c "
import asyncio, uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from capvia_platform.models.models import Application
from sqlalchemy.orm import selectinload
from capvia_platform.core.config import settings

async def check(app_id):
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        r = await s.execute(
            select(Application)
            .where(Application.id==uuid.UUID(app_id))
            .options(
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.integrity_result),
            )
        )
        app = r.scalar_one_or_none()
        print('ATS:', app.ats_result is not None)
        print('Sim:', app.simulation_result is not None)
        print('Interview:', app.interview_result is not None)
        print('Integrity:', app.integrity_result is not None)
asyncio.run(check('<app_uuid>'))
"
```

---

## 10. Deployment Issues

### Railway: `ERROR: No module named 'capvia_platform'`

**Cause:** `ROOT_DIRECTORY` not set correctly in Railway service, or `PYTHONPATH` not including `/app`.

**Fix:**
1. In Railway service settings → **Root Directory**: `/capvia_platform`
2. Start command: `uvicorn capvia_platform.main:app --host 0.0.0.0 --port $PORT --proxy-headers`
3. The Dockerfile sets `PYTHONPATH=/app` and copies files to `/app/capvia_platform/`

---

### Vercel: `Build failed: Cannot find module '@/components/...'`

**Cause:** TypeScript path aliases not configured for Vercel build.

**Fix:** Verify `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### All services return 503 after deployment

**Cause:** Migrations not run before service starts.

**Fix:** Add migration to build command in Railway:
```
pip install -r requirements.txt && python -m alembic upgrade head
```

Or run migrations separately before each deployment.
