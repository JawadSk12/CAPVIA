# CAPVIA — Deployment Guide

> **Audience:** DevOps engineer deploying CAPVIA to production.  
> Follow these steps in the exact order listed.

---

## Deployment Order

```
1. Neon PostgreSQL (database)
2. Upstash Redis (cache)
3. Supabase (storage)
4. Resend (email)
5. ATS Backend → Railway
6. Simulation Backend → Railway
7. Interview Eval Server → Railway
8. CAPVIA Gateway → Railway
9. CAPVIA Frontend → Vercel
10. Domain + SSL
11. Monitoring (Sentry)
12. Health validation
```

---

## Step 1: Database — Neon PostgreSQL

✅ Complete cloud setup per [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md#1-neon-postgresql)

Run migrations before deploying any backend:

```bash
cd capvia_platform
source venv/bin/activate
DATABASE_URL="postgresql+asyncpg://..." python -m alembic upgrade head
```

Verify:
```bash
python -m alembic current
# Expected: <head_revision> (head)
```

---

## Step 2: Cache — Upstash Redis

✅ Complete cloud setup per [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md#2-upstash-redis)

Note your `REDIS_URL` for all backend services.

---

## Step 3: Storage — Supabase

✅ Complete cloud setup per [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md#3-supabase-storage)

Create buckets: `resumes` and `interview-videos`.

---

## Step 4: Email — Resend

✅ Complete cloud setup per [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md#4-resend-email)

Verify domain DNS before deploying.

---

## Step 5: Deploy ATS Backend

### Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link
```

Create a new Railway service for ATS:

```bash
# From ats_resume/backend/
railway service create --name capvia-ats

# Deploy
railway up --service capvia-ats
```

Set environment variables:

```bash
railway variables set --service capvia-ats \
  DATABASE_URL="mongodb+srv://..." \
  REDIS_URL="rediss://..." \
  ENVIRONMENT="production" \
  SECRET_KEY="<key>" \
  SUPABASE_URL="https://..." \
  SUPABASE_SERVICE_KEY="..."
```

Start command in Railway settings:
```
uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers
```

Verify:
```bash
curl https://ats.capvia.io/health
# Expected: {"status": "ok"}
```

---

## Step 6: Deploy Simulation Backend

```bash
# From ai_simulation/backend/
railway service create --name capvia-simulation
railway up --service capvia-simulation

railway variables set --service capvia-simulation \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="rediss://..." \
  SECRET_KEY="<key>" \
  ENVIRONMENT="production"
```

Start command:
```
gunicorn app.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

Verify:
```bash
curl https://simulation.capvia.io/api/health/
```

---

## Step 7: Deploy Interview Evaluation Server

```bash
# From ai_interview/
railway service create --name capvia-interview-eval
railway up --service capvia-interview-eval

railway variables set --service capvia-interview-eval \
  ENVIRONMENT="production"
```

Start command:
```
python evaluation_server.py
```

> **Note:** The Interview Electron app runs locally on the candidate's machine. The evaluation server is the only cloud-deployed component.

Verify:
```bash
curl https://interview-eval.capvia.io/health
# Expected: {"status": "ok", "service": "AI Interview Evaluator", "version": "1.0.0"}
```

---

## Step 8: Deploy CAPVIA Gateway

### Dockerfile Deployment

The gateway has a production-ready Dockerfile at `capvia_platform/Dockerfile.backend`:

```dockerfile
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 PYTHONPATH=/app
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . ./capvia_platform
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "capvia_platform.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
```

### Railway Deployment

```bash
# From capvia_platform/
railway service create --name capvia-gateway
railway up --service capvia-gateway
```

Set all environment variables:

```bash
railway variables set --service capvia-gateway \
  DATABASE_URL="postgresql+asyncpg://neondb_owner:<pw>@<host>/neondb?ssl=require" \
  REDIS_URL="rediss://default:<token>@<host>:6379" \
  SECRET_KEY="<your_64_char_secret>" \
  ALGORITHM="HS256" \
  ACCESS_TOKEN_EXPIRE_MINUTES="30" \
  ENVIRONMENT="production" \
  ATS_ENGINE_URL="https://ats.capvia.io" \
  SIMULATION_ENGINE_URL="https://simulation.capvia.io" \
  INTERVIEW_ENGINE_URL="https://interview-eval.capvia.io"
```

### CORS Configuration for Production

Update `capvia_platform/main.py` for production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://capvia.io",
        "https://www.capvia.io",
        "https://app.capvia.io",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-CAPVIA-Signature"],
)
```

Verify:

```bash
curl https://api.capvia.io/api/health
# Expected: {"status": "healthy", "version": "1.0.0", "environment": "production"}
```

---

## Step 9: Deploy Frontend — Vercel

### Manual Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# From capvia_platform/frontend/
vercel login
vercel --prod
```

### GitHub Actions Auto-Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy Gateway
        working-directory: capvia_platform
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service capvia-gateway

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: capvia_platform/frontend
        run: npm ci

      - name: Deploy to Vercel
        working-directory: capvia_platform/frontend
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm install -g vercel
          vercel --prod --token $VERCEL_TOKEN

  test:
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        working-directory: capvia_platform
        run: pip install -r requirements.txt
      - name: Run tests
        working-directory: capvia_platform
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
          SECRET_KEY: test_secret_key_32_chars_minimum__
        run: pytest tests/ -v --tb=short
```

### GitHub Secrets Required

Add in GitHub repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `RAILWAY_TOKEN` | From Railway dashboard → Account → Tokens |
| `VERCEL_TOKEN` | From Vercel → Account → Tokens |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after first deploy |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` after first deploy |
| `TEST_DATABASE_URL` | Neon test database connection string |
| `TEST_REDIS_URL` | Upstash test Redis URL |

---

## Step 10: Domain + SSL

### DNS Configuration

Add these records to your domain registrar (example: Cloudflare):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `api` | Railway gateway URL | Auto |
| CNAME | `ats` | Railway ATS URL | Auto |
| CNAME | `simulation` | Railway simulation URL | Auto |
| CNAME | `www` | `cname.vercel-dns.com` | Auto |
| A | `@` | `76.76.21.21` (Vercel) | Auto |

SSL is automatically provisioned by Railway (Let's Encrypt) and Vercel. No manual action needed.

### Custom Domain on Railway

```bash
railway domain --service capvia-gateway
# Enter: api.capvia.io
# Railway shows CNAME record to add
```

### Verify SSL

```bash
curl -I https://api.capvia.io
# Expected: HTTP/2 200, server: Railway

curl -I https://capvia.io
# Expected: HTTP/2 200, server: Vercel
```

---

## Step 11: Sentry Monitoring

✅ Complete per [CLOUD_SETUP_GUIDE.md](CLOUD_SETUP_GUIDE.md#7-sentry-error-monitoring)

After deploying, trigger a test error:

```bash
curl -X POST https://api.capvia.io/api/v1/test/nonexistent
# 404 error should appear in Sentry within 30 seconds
```

---

## Step 12: Health Validation

Run the full health check suite:

```bash
# Gateway
curl -s https://api.capvia.io/api/health | python3 -m json.tool

# ATS Engine  
curl -s https://ats.capvia.io/health | python3 -m json.tool

# Interview Eval
curl -s https://interview-eval.capvia.io/health | python3 -m json.tool

# Frontend
curl -I https://capvia.io

# Database migrations current
DATABASE_URL="..." python -m alembic current

# Redis connectivity
redis-cli --tls -u rediss://default:<token>@<host>:6379 PING
```

Expected: All return `200 OK` or `{"status": "ok"}`.

---

## Rollback Procedure

### Railway Rollback

```bash
# List deployments
railway deployments --service capvia-gateway

# Rollback to previous deployment
railway rollback --service capvia-gateway --deployment <deployment_id>
```

### Database Rollback

```bash
# Roll back one migration
python -m alembic downgrade -1

# Roll back to specific revision
python -m alembic downgrade <revision_id>
```

### Vercel Rollback

```bash
# In Vercel dashboard: Deployments → Find previous deployment → Promote to Production
vercel rollback --token $VERCEL_TOKEN
```

---

## Environment Checklist

Before going live, verify every service has these set:

| Variable | Gateway | ATS | Simulation | Interview |
|----------|---------|-----|------------|-----------|
| `DATABASE_URL` | ✅ | ✅ | ✅ | ❌ |
| `REDIS_URL` | ✅ | ✅ | ✅ | ❌ |
| `SECRET_KEY` | ✅ | ✅ | ✅ | ❌ |
| `ENVIRONMENT=production` | ✅ | ✅ | ✅ | ✅ |
| `ATS_ENGINE_URL` | ✅ | ❌ | ❌ | ❌ |
| `SIMULATION_ENGINE_URL` | ✅ | ❌ | ❌ | ❌ |
| `INTERVIEW_ENGINE_URL` | ✅ | ❌ | ❌ | ❌ |
| `SUPABASE_URL` | Optional | ✅ | ❌ | ❌ |
| `RESEND_API_KEY` | ✅ | ❌ | ❌ | ❌ |
