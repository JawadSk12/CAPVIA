# CAPVIA — Full Setup Guide

> **Audience:** A developer with a completely fresh laptop. Zero software installed. Follow every step in order.

---

## Prerequisites

This guide assumes macOS (Apple Silicon or Intel). Adjust package names for Linux/Windows as needed.

---

## Step 1: Install Homebrew

Homebrew is the macOS package manager.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen prompts. When complete:

```bash
brew --version
# Expected: Homebrew 4.x.x
```

If on Apple Silicon, add Homebrew to PATH:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile
```

---

## Step 2: Install Git

```bash
brew install git
git --version
# Expected: git version 2.x.x
```

Configure Git identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## Step 3: Install VS Code

```bash
brew install --cask visual-studio-code
```

Install recommended extensions:

```bash
code --install-extension ms-python.python
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```

---

## Step 4: Install Python 3.12

CAPVIA requires exactly Python 3.12 (3.14 has incompatible native modules).

```bash
brew install python@3.12
```

Verify:

```bash
python3.12 --version
# Expected: Python 3.12.x
```

---

## Step 5: Install Node.js 20+

```bash
brew install node@20
```

Add to PATH (Apple Silicon):

```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

node --version
# Expected: v20.x.x
npm --version
# Expected: 10.x.x
```

---

## Step 6: Install Docker (Optional — for containerized deployment)

```bash
brew install --cask docker
open /Applications/Docker.app
# Wait for Docker daemon to start (watch for whale icon in menu bar)

docker --version
# Expected: Docker version 24.x.x
```

---

## Step 7: Clone Repository

```bash
git clone https://github.com/JawadSk12/CAPVIA.git
cd CAPVIA
```

---

## Step 8: Setup CAPVIA Gateway Virtual Environment

The CAPVIA Gateway (`capvia_platform/`) is the central FastAPI service.

> [!IMPORTANT]
> **exFAT Filesystem Warning:** If this repository resides on an exFAT formatted partition (e.g. an external USB flash drive), creating virtual environments (`venv`) directly inside the project directories will cause package installation and runtime failures (such as `WARNING: Ignoring invalid distribution -fastapi` or `ModuleNotFoundError`). This is because exFAT does not support standard unix file permissions, symlinks, or atomic rename operations correctly.
>
> **Fix:** You must create your Python virtual environments on the internal Mac SSD (e.g. at `~/capvia_gateway_venv`) and activate them from there.

```bash
cd capvia_platform

# Create isolated Python 3.12 virtual environment
# Standard (if on internal HFS+/APFS drive):
python3.12 -m venv venv
# If on exFAT volume:
# python3.12 -m venv ~/capvia_gateway_venv

# Activate the environment
# Standard:
source venv/bin/activate
# If on exFAT volume:
# source ~/capvia_gateway_venv/bin/activate

# Verify you are in the correct environment
which python
# Expected: /path/to/your/venv/bin/python

python --version
# Expected: Python 3.12.x
```

---

## Step 9: Install Gateway Python Dependencies

```bash
# From inside capvia_platform/ with venv active
pip install -r requirements.txt
```

Expected output ends with:
```
Successfully installed fastapi-x.x uvicorn-x.x pydantic-x.x sqlalchemy-x.x asyncpg-x.x alembic-x.x redis-x.x python-jose-x.x passlib-x.x
```

Verify key packages:

```bash
python3 -c "import fastapi, sqlalchemy, asyncpg, alembic, redis; print('All OK')"
# Expected: All OK
```

---

## Step 10: Configure Gateway Environment Variables

```bash
# Copy the development template
cp .env.development .env
```

Open `.env` and fill in the required values:

```bash
# .env — CAPVIA Gateway
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<db>?ssl=require
REDIS_URL=rediss://default:<token>@<host>:6379
ENVIRONMENT=development
SECRET_KEY=<generate_with_python_-c_"import_secrets;print(secrets.token_hex(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ATS_ENGINE_URL=http://localhost:8001
SIMULATION_ENGINE_URL=http://localhost:8002
INTERVIEW_ENGINE_URL=http://localhost:8765
```

Generate a secure `SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 11: Connect Neon PostgreSQL

1. Go to [https://neon.tech](https://neon.tech) → Sign up / Log in
2. Create a new project: `CAPVIA`
3. Create a database: `neondb`
4. Go to **Connection Details** → copy the **pooled connection string**
5. It will look like:
   ```
   postgresql+asyncpg://neondb_owner:<password>@ep-xxxx.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require
   ```
6. Paste it as `DATABASE_URL` in your `.env`

Verify connection:

```bash
python3 -c "
import asyncio, asyncpg
async def test():
    conn = await asyncpg.connect('postgresql://neondb_owner:<pw>@<host>/neondb?ssl=require')
    print(await conn.fetchval('SELECT version()'))
    await conn.close()
asyncio.run(test())
"
```

---

## Step 12: Connect Upstash Redis

1. Go to [https://console.upstash.com](https://console.upstash.com) → Create Database
2. Select **Redis** → Region: closest to your users
3. Copy the **Redis URL** (format: `rediss://default:<token>@<host>:6379`)
4. Paste as `REDIS_URL` in your `.env`

Verify connection:

```bash
python3 -c "
import asyncio, redis.asyncio as aioredis
async def test():
    r = aioredis.from_url('rediss://default:<token>@<host>:6379')
    await r.set('capvia_test', 'ok')
    val = await r.get('capvia_test')
    print('Redis OK:', val)
asyncio.run(test())
"
```

---

## Step 13: Connect Supabase Storage

1. Go to [https://supabase.com](https://supabase.com) → Sign up / Log in
2. Create a new project: `CAPVIA`
3. Go to **Settings → API**
4. Copy `Project URL` and `anon public` key
5. Add to frontend `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<key>
   ```
6. Go to **Storage** → Create bucket: `resumes` (public: false), `interview-videos` (public: false)

---

## Step 14: Connect Resend Email (for production)

1. Go to [https://resend.com](https://resend.com) → Sign up
2. Create an API key
3. Verify your sending domain in DNS settings
4. Add to backend `.env`:
   ```
   RESEND_API_KEY=re_<key>
   FROM_EMAIL=noreply@yourdomain.com
   ```

> **Note:** In development, email is simulated — verification links are printed to the console. Resend integration is for production only.

---

## Step 15: Run Database Migrations

```bash
# From capvia_platform/ with venv active
python3 -m alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> <rev>, Initial migration
INFO  [alembic.runtime.migration] Running upgrade <rev> -> <rev>, Add sessions table
...
INFO  [alembic.runtime.migration] Running upgrade <rev> -> head, All migrations complete
```

Verify tables:

```bash
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

async def check():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT table_name FROM information_schema.tables WHERE table_schema='public'\"))
        tables = [r[0] for r in result]
        print('Tables:', sorted(tables))
asyncio.run(check())
"
```

Expected: 17+ tables listed.

---

## Step 16: Seed Database (Optional)

To create a test HR user and sample data:

```bash
python3 -c "
import asyncio
from capvia_platform.models.models import User, UserRole
from capvia_platform.utils.auth import hash_password
from capvia_platform.api.dependencies import get_db
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from capvia_platform.core.config import settings

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as session:
        hr_user = User(
            email='hr@capvia.io',
            password_hash=hash_password('HrCapvia2024!'),
            full_name='CAPVIA HR Admin',
            role=UserRole.HR,
            is_active=True
        )
        session.add(hr_user)
        await session.commit()
        print('Seeded HR user: hr@capvia.io / HrCapvia2024!')

asyncio.run(seed())
"
```

---

## Step 17: Start CAPVIA Gateway

```bash
# From the CAPVIA root directory with the gateway venv active:
PYTHONPATH="." python3 -m uvicorn capvia_platform.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir capvia_platform
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx]
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## Step 18: Start ATS Engine

```bash
# New terminal
cd CAPVIA/ats_resume/backend

# Create virtual environment (use internal drive if on exFAT)
# Standard:
python3.12 -m venv venv && source venv/bin/activate
# If on exFAT volume:
# python3.12 -m venv ~/capvia_ats_venv && source ~/capvia_ats_venv/bin/activate

pip install -r requirements.txt

# Set up ATS environment
cp .env.example .env
# Edit .env to match your database/redis/mongodb settings

# Run ATS backend with ai_engine in PYTHONPATH
PYTHONPATH=".:../ai_engine" python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

---

## Step 19: Start Simulation Engine

```bash
# New terminal
cd CAPVIA/ai_simulation/backend

# Create virtual environment (use internal drive if on exFAT)
# Standard:
python3.12 -m venv venv && source venv/bin/activate
# If on exFAT volume:
# python3.12 -m venv ~/capvia_simulation_venv && source ~/capvia_simulation_venv/bin/activate

pip install -r requirements.txt

# Set up Simulation environment
cp .env.example .env

# Run database migrations using Alembic
alembic upgrade head

# Start Simulation FastAPI server on port 8002
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

---

## Step 20: Start Interview Engine

```bash
# New terminal — Interview Evaluation Server
cd CAPVIA/ai_interview

# Create virtual environment (use internal drive if on exFAT)
# Standard:
python3.12 -m venv venv && source venv/bin/activate
# If on exFAT volume:
# python3.12 -m venv ~/capvia_interview_venv && source ~/capvia_interview_venv/bin/activate

pip install -r requirements_ai.txt

python3 evaluation_server.py
# Server starts on http://localhost:8765
```

For the Interview Electron app (candidate interface):

```bash
npm install --no-bin-links
npm run electron-dev
```

---

## Step 21: Start Frontend

```bash
# New terminal
cd CAPVIA/capvia_platform/frontend

npm install --no-bin-links

# Configure environment
cp .env.example .env.local
# Fill in Supabase URL, publishable key, Sentry DSN, API URL

npm run dev
# Starts on http://localhost:3000
```

---

## Step 22: Verify Everything Works

### Gateway Health Check

```bash
curl http://localhost:8000/api/health
```
Expected:
```json
{"status": "healthy", "version": "1.0.0", "environment": "development"}
```

### Register a Test User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234!", "full_name": "Test User"}'
```

Expected:
```json
{"success": true, "message": "User registered successfully. Please verify your email.", "simulated_token": "..."}
```

### Verify Email (from console output)

```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "<token_from_console>"}'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234!"}'
```

Expected:
```json
{"access_token": "eyJ...", "refresh_token": "eyJ...", "role": "candidate", "full_name": "Test User"}
```

### Open API Docs

- Gateway: http://localhost:8000/docs
- ATS: http://localhost:8001/docs
- Interview eval: http://localhost:8765/docs
- Frontend: http://localhost:3000

---

## Troubleshooting Setup

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: capvia_platform` | Missing PYTHONPATH | Set `PYTHONPATH="."` and run uvicorn from CAPVIA root directory |
| `ModuleNotFoundError` or `WARNING: Ignoring invalid distribution` | exFAT filesystem corruption | Create the virtual environment (`venv`) on your internal Mac SSD drive (e.g. `~/`) rather than on the external USB/exFAT drive |
| `asyncpg.exceptions.TooManyConnectionsError` | Neon free tier limit | Use pooled connection string |
| `redis.exceptions.ConnectionError` | Redis URL wrong | Verify `REDIS_URL` includes `rediss://` (TLS) |
| `alembic.util.exc.CommandError: Can't locate revision` | DB out of sync | Run `alembic stamp head` then `alembic upgrade head` |
| `npm install` symlink errors | exFAT volume | Always use `npm install --no-bin-links` |
| Python 3.14 compile errors | Wrong Python | Install `python@3.12` via Homebrew |
