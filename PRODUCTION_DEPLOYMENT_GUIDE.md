# CAPVIA Production Deployment Guide (Domain: capvia.in)

Follow this step-by-step guide to provision database services, set up hosting in Railway and Vercel, and configure DNS records in GoDaddy for a fully working production deployment.

---

## Step 1: Provision Cloud Databases & Storage

### 1. Neon PostgreSQL (Primary Relational Store)
1. Go to [https://neon.tech](https://neon.tech) and log in.
2. Create a project named `capvia-prod`.
3. In your dashboard under **Connection Details**, set the database to `neondb` and copy the **Pooled connection** string. It should look like this:
   ```text
   postgresql+asyncpg://neondb_owner:YOUR_PASSWORD@ep-your-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require
   ```
4. Run migrations from your terminal to initialize database tables:
   ```bash
   cd capvia_platform
   source ~/capvia_gateway_venv/bin/activate
   DATABASE_URL="postgresql://neondb_owner:npg_FgvYjAZM6e5f@ep-restless-thunder-ath4pmng-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" alembic upgrade head
   ```

### 2. Upstash Redis (Session Store, Telemetry Cache, & Celery Broker)
1. Go to [https://console.upstash.com](https://console.upstash.com) and log in.
2. Click **Create Database** → Name: `capvia-redis` → Region: Choose the same region as Neon (e.g., AWS Asia Pacific).
3. Ensure **TLS** is enabled.
4. Copy:
   - **REST URL** and **REST Token** (for Next.js frontend).
   - **Redis Connect string** starting with `rediss://` (for FastAPI backends).
     - Format: `rediss://default:YOUR_PASSWORD@your-host.upstash.io:6379`

### 3. MongoDB Atlas (ATS Vector Store)
1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster named `capvia-ats`.
3. Create a database user and save the password.
4. Go to **Network Access** → Click **Add IP Address** → Choose `0.0.0.0/0` (allows Railway container access).
5. Copy your database connection string:
   ```text
   mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster.mongodb.net/capvia_ats?retryWrites=true&w=majority
   ```

### 4. Supabase Storage (File Storage)
1. Go to [https://supabase.com](https://supabase.com).
2. Create a project named `capvia-prod` and select a region closest to Neon/Upstash.
3. Navigate to **Storage** in the sidebar → Create two **Private** buckets:
   - `resumes` (Limit: 10MB; Allowed MIME: `.pdf, .doc, .docx`)
   - `interview-videos` (Limit: 500MB; Allowed MIME: `.webm, .mp4`)
4. Copy the API keys from **Project Settings → API**:
   - **Project URL**
   - **anon public key** (safe for frontend)
   - **service_role key** (secret bypass key for admin storage writes)

---

## Step 2: Configure Resend Transactional Email
1. Go to [https://resend.com](https://resend.com) and log in.
2. Go to **Domains** → Click **Add Domain** → Enter `capvia.in`.
3. Copy the DKIM, SPF, and DMARC verification DNS TXT records. Add them to GoDaddy (see Step 5).
4. Go to **API Keys** → **Create API Key** → Set permissions to "Sending Access". Copy the API Key (`re_...`).

---

## Step 3: Deploy Backend Services (Render / Koyeb — Free Alternatives)

Log in to [Render](https://render.com/) or [Koyeb](https://www.koyeb.com/) using your GitHub account. Link your repository `JawadSk12/CAPVIA` and create 4 free Web Services.

### 1. CAPVIA Gateway (api.capvia.in)
- **Root Directory**: `capvia_platform`
- **Runtime**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `DATABASE_URL` (Neon Postgres pooled URL)
  - `REDIS_URL` (Upstash connection string starting with `rediss://`)
  - `SECRET_KEY` (Generate a secure 64-char key)
  - `ENVIRONMENT` = `production`
  - `NEXT_PUBLIC_API_URL` = `https://api.capvia.in/api/v1`
  - `ATS_ENGINE_URL` = `https://ats-api.capvia.in`
  - `SIMULATION_ENGINE_URL` = `https://simulation-api.capvia.in`
  - `INTERVIEW_ENGINE_URL` = `https://interview-api.capvia.in`
  - `SUPABASE_URL` & `SUPABASE_SECRET_KEY`
  - `RESEND_API_KEY`
  - `FROM_EMAIL` = `noreply@capvia.in`

### 2. ATS Resume Backend (ats-api.capvia.in)
- **Root Directory**: `ats_resume/backend`
- **Runtime**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `DATABASE_URL` (Neon Postgres pooled URL)
  - `MONGO_URL` & `MONGO_DB_NAME` (MongoDB connection details)
  - `REDIS_URL` (Upstash Redis)
  - `CELERY_BROKER_URL` = `rediss://default:TOKEN@HOST:6379/1` (Index 1)
  - `CELERY_RESULT_BACKEND` = `rediss://default:TOKEN@HOST:6379/2` (Index 2)
  - `SECRET_KEY` (Secure random key)
  - `ENVIRONMENT` = `production`

### 3. Simulation Backend (simulation-api.capvia.in)
- **Root Directory**: `ai_simulation/backend`
- **Runtime**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `POSTGRES_SERVER`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` (Neon connection details)
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` = `0` (Upstash details)
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` = `gpt-4`
  - `ENVIRONMENT` = `production`

### 4. Interview Evaluation API (interview-api.capvia.in)
- **Root Directory**: `ai_interview`
- **Runtime**: `Python`
- **Build Command**: `pip install -r requirements_ai.txt`
- **Start Command**: `python evaluation_server.py`
- **Environment Variables**:
  - `ENVIRONMENT` = `production`

*For each service, add your custom domain (e.g., `api.capvia.in`) inside the Render Dashboard Settings → Custom Domains panel.*

---

## Step 4: Deploy Frontend Applications (Vercel)

Log in to [Vercel](https://vercel.com/), create a project, and link it to your GitHub repository `JawadSk12/CAPVIA` for the three frontends.

### 1. Recruiter Dashboard UI (capvia.in)
- **Root Directory**: `capvia_platform/frontend`
- **Framework Preset**: Next.js
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `NEXT_PUBLIC_API_URL` = `https://api.capvia.in/api/v1`
  - `NODE_ENV` = `production`

### 2. ATS Candidate UI (ats.capvia.in)
- **Root Directory**: `ats_resume/frontend`
- **Framework Preset**: Next.js
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL` = `https://ats-api.capvia.in`
  - `NEXT_PUBLIC_APP_NAME` = `"CAPVIA ATS"`

### 3. Simulation UI (simulation.capvia.in)
- **Root Directory**: `ai_simulation/frontend`
- **Framework Preset**: Vite
- **Environment Variables**:
  - `VITE_API_URL` = `https://simulation-api.capvia.in/api/v1`

---

## Step 5: Configure DNS in GoDaddy Zone File

Log in to GoDaddy → Go to **My Products** → Select **capvia.in** → **Manage DNS**. Add or update the following records:

| Type | Name / Host | Value / Destination | TTL |
|---|---|---|---|
| **A** | `@` | `76.76.21.21` | 600s |
| **CNAME** | `www` | `cname.vercel-dns.com.` | 600s |
| **CNAME** | `ats` | `cname.vercel-dns.com.` | 600s |
| **CNAME** | `simulation` | `cname.vercel-dns.com.` | 600s |
| **CNAME** | `api` | `YOUR_GATEWAY_SERVICE_NAME.onrender.com.` | 600s |
| **CNAME** | `ats-api` | `YOUR_ATS_SERVICE_NAME.onrender.com.` | 600s |
| **CNAME** | `simulation-api`| `YOUR_SIMULATION_SERVICE_NAME.onrender.com.` | 600s |
| **CNAME** | `interview-api` | `YOUR_INTERVIEW_SERVICE_NAME.onrender.com.` | 600s |

*(Add the SPF, DKIM, and DMARC TXT records generated by Resend in Step 2 to authorize domain email delivery).*

---

## Step 6: Verify and Run Live Health Check
Wait 5 to 15 minutes for DNS settings to propagate. Run these checks to verify everything works:

1. Confirm the main platform router returns health details:
   ```bash
   curl https://api.capvia.in/api/health
   # Expected output: {"status": "ok", "service": "capvia_api"}
   ```
2. Confirm the ATS API endpoint is reachable:
   ```bash
   curl https://ats-api.capvia.in/api/v1/health/ping
   # Expected output: {"status":"ok","message":"pong"}
   ```
3. Open your browser and navigate to `https://capvia.in` to access the live dashboard.
