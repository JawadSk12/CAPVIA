# CAPVIA — Cloud Setup Guide

> **Audience:** DevOps engineer or developer setting up all cloud services from scratch.

---

## Services Overview

| Service | Provider | URL | Purpose |
|---------|----------|-----|---------|
| Database | Neon PostgreSQL | neon.tech | Primary data store |
| Cache | Upstash Redis | upstash.com | Sessions, tokens, config |
| Storage | Supabase | supabase.com | Files, videos |
| Email | Resend | resend.com | Transactional email |
| Backend Hosting | Railway | railway.app | Python services |
| Frontend Hosting | Vercel | vercel.com | Next.js frontend |
| Error Monitoring | Sentry | sentry.io | Error tracking |

---

## 1. Neon PostgreSQL

### Account Setup

1. Navigate to [https://neon.tech](https://neon.tech)
2. Click **Sign Up** → Sign up with GitHub or email
3. Verify your email address

### Project Configuration

1. Click **New Project**
2. Project name: `capvia-prod`
3. Database name: `neondb`
4. Region: Choose closest to your Railway deployment (e.g., `ap-southeast-1` for Asia)
5. PostgreSQL version: **16** (latest stable)
6. Click **Create Project**

### Connection String

1. Go to your project dashboard → **Connection Details**
2. Select **Pooled connection** (recommended for serverless)
3. Copy the connection string format:
   ```
   postgresql+asyncpg://neondb_owner:<password>@ep-xxxx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require
   ```

> **Important:** Always use the **pooled** endpoint (contains `-pooler`). Direct connections exhaust the connection limit on free plans.

### Required Configuration

Set in your `.env` / Railway environment variables:
```
DATABASE_URL=postgresql+asyncpg://neondb_owner:<password>@ep-xxxx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require
```

Also update `alembic.ini` line 30 with the **non-asyncpg** version (Alembic uses sync):
```
sqlalchemy.url = postgresql+asyncpg://neondb_owner:<password>@ep-xxxx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require
```

### Integration Steps

```bash
# Run migrations from local machine (first time)
cd capvia_platform
source venv/bin/activate
python -m alembic upgrade head
```

### Verification

```bash
python3 -c "
import asyncio, asyncpg
async def verify():
    conn = await asyncpg.connect(
        'postgresql://neondb_owner:<pw>@<host>/neondb',
        ssl='require'
    )
    tables = await conn.fetch(\"SELECT table_name FROM information_schema.tables WHERE table_schema='public'\")
    print(f'Connected. Tables: {[t[0] for t in tables]}')
    await conn.close()
asyncio.run(verify())
"
```

### Troubleshooting

| Error | Fix |
|-------|-----|
| `SSL connection is required` | Add `?ssl=require` to connection string |
| `too many connections` | Switch from direct to pooled endpoint |
| `Connection timeout` | Check Neon project is not suspended (free tier auto-suspends) |
| `asyncpg.exceptions.InvalidCatalogNameError` | Database name in URL doesn't match Neon DB name |

### Neon Free Tier Limits

- 0.5 GiB storage
- 1 compute unit
- Auto-suspend after 5 minutes of inactivity
- First cold start: 1-3 seconds

---

## 2. Upstash Redis

### Account Setup

1. Navigate to [https://console.upstash.com](https://console.upstash.com)
2. Click **Sign Up** → Sign up with GitHub or Google
3. Verify your email

### Database Configuration

1. Click **Create Database**
2. Name: `capvia-redis`
3. Type: **Regional** (Global for production, Regional for free tier)
4. Region: Same as your Neon and Railway region
5. **TLS**: Enabled (mandatory)
6. Click **Create**

### Connection Details

After creation, go to database details and copy:

```
UPSTASH_REDIS_REST_URL=https://saving-sawfish-133622.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your_token>
```

For the backend (uses redis-py protocol):
```
REDIS_URL=rediss://default:<token>@saving-sawfish-133622.upstash.io:6379
```

Note the `rediss://` (with double `s`) for TLS.

### Required Configuration

Backend `.env`:
```
REDIS_URL=rediss://default:<token>@<host>:6379
```

Frontend `.env.local` (for server-side Next.js routes only):
```
UPSTASH_REDIS_REST_URL=https://<host>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

### Integration Steps

The gateway automatically connects to Redis on startup:

```python
# capvia_platform/main.py — lifespan context
app.state.redis_pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL)
```

Keys used by CAPVIA:

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `email_verify:<token>` | 86400s (24h) | Email verification tokens |
| `reset_pass:<token>` | 900s (15m) | Password reset tokens |
| `integrity_calibration_weights` | 86400s (24h) | Integrity engine weight config |

### Verification

```bash
# Using redis-cli with TLS
redis-cli --tls -u rediss://default:<token>@<host>:6379 PING
# Expected: PONG

# Python
python3 -c "
import asyncio, redis.asyncio as r
async def test():
    client = r.from_url('rediss://default:<token>@<host>:6379')
    await client.set('capvia_test', 'ok', ex=10)
    print(await client.get('capvia_test'))
asyncio.run(test())
"
```

### Troubleshooting

| Error | Fix |
|-------|-----|
| `SSL: WRONG_VERSION_NUMBER` | Use `rediss://` not `redis://` |
| `AuthenticationError` | Check token is correct — copy from Upstash console |
| `Connection timeout` | Check Upstash project region matches your server region |

---

## 3. Supabase Storage

### Account Setup

1. Navigate to [https://supabase.com](https://supabase.com)
2. Click **Start your project** → Sign up with GitHub
3. Create organization: `CAPVIA`

### Project Configuration

1. Click **New project**
2. Name: `capvia-prod`
3. Database password: Generate a strong password (save it securely)
4. Region: Same as Railway/Neon
5. Plan: **Free** (start), upgrade to **Pro** for production
6. Click **Create new project** — takes ~2 minutes

### Storage Bucket Setup

1. Go to **Storage** in left sidebar
2. Click **New bucket**
3. Create buckets:

**Bucket 1: `resumes`**
- Name: `resumes`
- Public: **No** (private — access via signed URLs)
- File size limit: 10MB
- Allowed MIME types: `application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Bucket 2: `interview-videos`**
- Name: `interview-videos`
- Public: **No** (private)
- File size limit: 500MB
- Allowed MIME types: `video/webm,video/mp4`

### API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **anon public key**: `eyJ...` (safe to expose to browser)
   - **service_role key**: Keep secret — for server-side admin operations

### Required Configuration

Frontend `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon_public_key>
```

Backend `.env` (for admin file operations):
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
```

### Integration Steps

Install Supabase client in frontend:

```bash
cd capvia_platform/frontend
npm install @supabase/supabase-js --no-bin-links
```

Create client utility `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
```

Upload a resume:

```typescript
const { data, error } = await supabase.storage
  .from('resumes')
  .upload(`${userId}/${filename}`, file, { upsert: true })
```

Generate signed URL for download:

```typescript
const { data } = await supabase.storage
  .from('resumes')
  .createSignedUrl(`${userId}/${filename}`, 3600) // 1 hour expiry
```

### Verification

```bash
curl -X GET \
  'https://<project-ref>.supabase.co/storage/v1/bucket' \
  -H "Authorization: Bearer <service_role_key>" \
  -H "apikey: <anon_key>"
# Expected: Array of bucket objects
```

### Troubleshooting

| Error | Fix |
|-------|-----|
| `new row violates row-level security policy` | Enable storage RLS policies for authenticated users |
| `Bucket not found` | Create bucket in Supabase dashboard |
| `File too large` | Increase bucket file size limit |

---

## 4. Resend Email

### Account Setup

1. Navigate to [https://resend.com](https://resend.com)
2. Click **Sign Up**
3. Verify your email

### Domain Verification

1. Go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `capvia.io`)
3. Add DNS records to your domain registrar:
   - SPF: `TXT` record at `@`
   - DKIM: `TXT` record at `resend._domainkey`
   - DMARC: `TXT` record at `_dmarc`
4. Click **Verify DNS Records** — takes 5-10 minutes

### API Key

1. Go to **API Keys** → **Create API Key**
2. Name: `CAPVIA Production`
3. Permission: **Sending access** (not full access for safety)
4. Copy the key: `re_<key>`

### Required Configuration

Backend `.env`:
```
RESEND_API_KEY=re_<key>
FROM_EMAIL=noreply@capvia.io
SUPPORT_EMAIL=support@capvia.io
```

### Integration Steps

```bash
pip install resend
```

Usage example:

```python
import resend
resend.api_key = settings.RESEND_API_KEY

resend.Emails.send({
    "from": "CAPVIA <noreply@capvia.io>",
    "to": user.email,
    "subject": "Verify your email — CAPVIA",
    "html": f"<p>Click to verify: <a href='{verify_link}'>Verify Email</a></p>"
})
```

### Verification

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_<key>" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@capvia.io","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

### Development Note

In development, email links are printed to the console — no Resend integration needed:
```
[SIMULATED EMAIL SENDER] Verification link for user@example.com:
http://localhost:3000/auth/verify?token=abc123
```

---

## 5. Railway (Backend Hosting)

### Account Setup

1. Navigate to [https://railway.app](https://railway.app)
2. Click **Login** → Sign in with GitHub
3. Authorize Railway to access your GitHub account

### Project Creation

1. Click **New Project**
2. Select **Deploy from GitHub repo** → select `JawadSk12/CAPVIA`
3. Railway will detect the project

### Service Configuration

Create a service for the CAPVIA Gateway:

1. In the project, click **+ Add a service**
2. Choose **GitHub repo** → `CAPVIA`
3. Click **Settings** on the service
4. Set **Root Directory**: `/capvia_platform`
5. Set **Start Command**:
   ```
   uvicorn capvia_platform.main:app --host 0.0.0.0 --port $PORT --proxy-headers
   ```
6. Set **Build Command**:
   ```
   pip install -r requirements.txt && python -m alembic upgrade head
   ```

### Environment Variables (Railway)

In Railway service settings → **Variables**, add:

```
DATABASE_URL=postgresql+asyncpg://neondb_owner:<pw>@<host>/neondb?ssl=require
REDIS_URL=rediss://default:<token>@<host>:6379
SECRET_KEY=<your_32_char_key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
ATS_ENGINE_URL=https://ats.railway.app
SIMULATION_ENGINE_URL=https://simulation.railway.app
INTERVIEW_ENGINE_URL=https://interview.railway.app
```

### Domain

1. In service settings → **Networking** → **Custom Domain**
2. Enter `api.capvia.io`
3. Add CNAME record pointing to Railway's provided hostname

### Verification

```bash
curl https://api.capvia.io/api/health
# Expected: {"status": "healthy", "version": "1.0.0", "environment": "production"}
```

---

## 6. Vercel (Frontend Hosting)

### Account Setup

1. Navigate to [https://vercel.com](https://vercel.com)
2. Click **Sign Up** → Sign up with GitHub

### Project Import

1. Click **Add New → Project**
2. Import `JawadSk12/CAPVIA`
3. **Root Directory**: `capvia_platform/frontend`
4. **Framework Preset**: Next.js (auto-detected)
5. **Build Command**: `npm run build`
6. **Output Directory**: `.next`

### Environment Variables (Vercel)

In project settings → **Environment Variables**, add for **Production**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon_key>
UPSTASH_REDIS_REST_URL=https://<host>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.us.sentry.io/<project>
SENTRY_DSN=https://<key>@<org>.ingest.us.sentry.io/<project>
NEXT_PUBLIC_API_URL=https://api.capvia.io
NODE_ENV=production
```

### Custom Domain

1. In project settings → **Domains**
2. Add `capvia.io` and `www.capvia.io`
3. Follow DNS configuration instructions

### Verification

```bash
curl https://capvia.io
# Expected: 200 OK with HTML content
```

---

## 7. Sentry Error Monitoring

### Account Setup

1. Navigate to [https://sentry.io](https://sentry.io)
2. Click **Sign Up** → Sign up with GitHub
3. Create organization: `capvia`

### Project Creation

1. Click **Create Project**
2. Platform: **React** (for the frontend)
3. Set alert frequency: **Alert me on every new issue**
4. Project name: `capvia-frontend`
5. Click **Create Project**

### DSN

Copy the DSN from the project setup screen:
```
https://da8b2ece41d999b24176fbc26a65ea72@o4511604858814464.ingest.us.sentry.io/4511604976189440
```

### Required Configuration

Frontend `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.us.sentry.io/<project>
SENTRY_DSN=https://<key>@<org>.ingest.us.sentry.io/<project>
SENTRY_ORG=capvia
SENTRY_PROJECT=capvia-frontend
```

### Files Already Configured

CAPVIA already has Sentry configured:
- `sentry.client.config.ts` — Browser errors + Session Replay
- `sentry.server.config.ts` — Server Component errors
- `sentry.edge.config.ts` — Middleware errors
- `next.config.mjs` — `withSentryConfig()` wrapping
- `src/app/global-error.tsx` — Global error boundary

### Verification

1. Deploy frontend
2. Go to your site and trigger a test error via browser console:
   ```js
   throw new Error("Test Sentry error")
   ```
3. Check Sentry dashboard for the captured event (appears within 30 seconds)

### Alert Configuration

In Sentry → **Alerts → Create Alert Rule**:
- Trigger: `New issue in capvia-frontend`
- Action: Email to `team@capvia.io` or Slack webhook
