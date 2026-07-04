# CAPVIA Setup & Execution Guide

This document provides a comprehensive, step-by-step guide to setting up and running the **CAPVIA Capability-Based Hiring Platform** on macOS. It is designed to get all microservices, frontends, and databases up and running correctly and precisely.

---

## 🗺️ System Port & Database Matrix

Before starting, familiarize yourself with the default ports and database names used across the ecosystem:

| Service Name | Port | Framework | Database Name |
| :--- | :--- | :--- | :--- |
| **CAPVIA API Gateway (Core)** | `8000` | FastAPI (Python 3.12) | `capvia` (PostgreSQL) |
| **Recruiter Dashboard (Core)** | `3000` | Next.js 14 | None (Accesses Gateway) |
| **ATS Resume Analyzer** | `8001` | FastAPI (Python 3.12) | `ats_db` (PostgreSQL) + `capvia_ats` (MongoDB) |
| **Coding Simulation Backend** | `8002` | FastAPI (Python 3.12) | `ai_simulation` (PostgreSQL) |
| **Coding Simulation Frontend** | `5173` | React + Vite | None (Accesses Simulation Backend) |
| **AI Interview Eval Server** | `8765` | FastAPI (Python 3.12) | None (In-process SentenceTransformers) |
| **AI Interview Kiosk UI** | `3002` | Electron + React | None (Accesses Eval Server + Gateway) |

---

## ⚠️ exFAT & macOS Volume Constraints

> [!WARNING]
> **exFAT Symlink & Permission Limitations**: If this repository is mounted on an external exFAT partition (such as `/Volumes/KINGSTON/`):
> 1. **Virtual Environments (`venv`)**: Creating virtual environments inside exFAT folders will cause dependency installation and runtime failures (e.g. `ModuleNotFoundError`). You **must** initialize all virtual environments on your internal APFS Mac SSD (e.g. in your home directory `~/`).
> 2. **NPM Modules**: Standard symlinking in `node_modules` is unsupported on exFAT. Always run package installations with the `--no-bin-links` flag:
>    ```bash
>    npm install --no-bin-links
>    ```
> 3. **Vite / Local Binaries**: Run Vite dev servers directly using `node node_modules/vite/bin/vite.js` instead of the global `vite` executable.

---

## 🛠️ Step 1: Install Core Toolchain

Open the macOS Terminal and install the required platform tools:

```bash
# 1. Install Homebrew (macOS Package Manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Add Homebrew to your shell environment (Apple Silicon Macs)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc

# 3. Install Git, Node.js v20, and Python 3.12
# (Avoid installing Python 3.14 to prevent dependency compilation issues)
brew install git node@20 python@3.12

# 4. Install PostgreSQL and Redis
brew install postgresql@15 redis

# 5. Install MongoDB Community Edition (For ATS Analyzer)
brew tap mongodb/brew
brew install mongodb-community
```

Start the local background services:

```bash
# Start local databases and caching engines
brew services start postgresql@15
brew services start redis
brew services start mongodb-community
```

---

## 🗄️ Step 2: Database Initialization

Connect to your local PostgreSQL server (running on default port `5432`) and provision the required databases.

```bash
# Connect to default Postgres using your administrative account (password: Almas@6060)
PGPASSWORD="Almas@6060" psql -h localhost -U postgres -d template1

# Run the SQL queries to create databases:
CREATE DATABASE capvia;
CREATE DATABASE ats_db;
CREATE DATABASE ai_simulation;
\q
```

---

## 🚀 Step 3: Service-by-Service Setup

Follow these commands to configure, build, and launch each microservice. Open a **new terminal tab** for each subsystem.

---

### Tab 1: CAPVIA API Gateway (Port 8000)

The central orchestration gateway coordinates all statuses, runs the composite ranking algorithms, and aggregates evaluation logs.

```bash
# 1. Navigate to the core platform directory
cd /Volumes/KINGSTON/CAPVIA/capvia_platform

# 2. Initialize virtualenv in your home directory (exFAT workaround)
python3.12 -m venv ~/capvia_gateway_venv
source ~/capvia_gateway_venv/bin/activate

# 3. Upgrade pip and install gateway dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install greenlet

# 4. Set up environment variables
cp .env.development .env
# Edit .env and ensure the following values are defined (Note: percent-encode '@' in password to '%40'):
# DATABASE_URL=postgresql+asyncpg://postgres:Almas%406060@localhost:5432/capvia
# REDIS_URL=redis://127.0.0.1:6379/0

# 5. Execute database migrations
alembic upgrade head

# 6. Seed the base admin/HR users and internships
PYTHONPATH="/Volumes/KINGSTON/CAPVIA" python database/seed.py

# 7. Start the FastAPI API Server
PYTHONPATH="/Volumes/KINGSTON/CAPVIA" uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

### Tab 2: Recruiter Dashboard Portal (Port 3000)

The recruiter dashboard acts as the primary user interface to view leaderboard vectors and candidate DNA radar profiles.

```bash
# 1. Navigate to the frontend directory
cd /Volumes/KINGSTON/CAPVIA/capvia_platform/frontend

# 2. Install packages bypassing exFAT symlink constraints
npm install --no-bin-links

# 3. Start the Next.js dev server
npm run dev
```

---

### Tab 3: ATS Resume Analyzer Subsystem (Port 8001)

The ATS subsystem evaluates candidates' skill vectors against job description documents, running semantic SBERT matches.

```bash
# 1. Navigate to the ATS backend directory
cd /Volumes/KINGSTON/CAPVIA/ats_resume/backend

# 2. Initialize virtualenv in your home directory
python3.12 -m venv ~/capvia_ats_venv
source ~/capvia_ats_venv/bin/activate

# 3. Install packages
pip install --upgrade pip
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Ensure connection details in .env point to port 5432 and database ats_db (Note: percent-encode '@' in password to '%40'):
# DATABASE_URL="postgresql+asyncpg://postgres:Almas%406060@localhost:5432/ats_db"
# MONGO_URL="mongodb://localhost:27017"

# 5. Seed the ATS models database
PYTHONPATH=".:../ai_engine" python reset_db.py

# 6. Start the ATS FastAPI Server
PYTHONPATH=".:../ai_engine" uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

---

### Tab 4: Coding Simulation Subsystem (Port 8002 & 5173)

The simulation engine assesses candidates' coding correctness and tracks copy-paste behaviors or IDE switching.

**A. Start Backend (Port 8002)**
```bash
# 1. Navigate to the simulation backend directory
cd /Volumes/KINGSTON/CAPVIA/ai_simulation/backend

# 2. Initialize virtualenv in your home directory
python3.12 -m venv ~/capvia_simulation_venv
source ~/capvia_simulation_venv/bin/activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Run database migrations
alembic upgrade head

# 5. Start the FastAPI API Server
uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

**B. Start Frontend Client (Port 5173 - New Tab)**
```bash
# 1. Navigate to simulation frontend
cd /Volumes/KINGSTON/CAPVIA/ai_simulation/frontend

# 2. Install dependencies bypassing exFAT symlink constraints
npm install --no-bin-links

# 3. Start Vite dev server directly via Node
node node_modules/vite/bin/vite.js
```

---

### Tab 5: AI Interview Subsystem (Port 8765 & 3002)

IntelliRecruit conducts dynamic speech interviews using webcam gaze proctoring, falling back to local weights if needed.

**A. Start AI Evaluation Server (Port 8765)**
```bash
# 1. Navigate to interview directory
cd /Volumes/KINGSTON/CAPVIA/ai_interview

# 2. Initialize virtualenv in your home directory
python3.12 -m venv ~/capvia_interview_venv
source ~/capvia_interview_venv/bin/activate

# 3. Install AI evaluation libraries
pip install --upgrade pip
pip install -r requirements_ai.txt

# 4. Start evaluation FastAPI server
python evaluation_server.py
```

**B. Start Kiosk Frontend Client (Port 3002 - New Tab)**
```bash
# 1. Navigate to interview directory
cd /Volumes/KINGSTON/CAPVIA/ai_interview

# 2. Install node dependencies bypassing exFAT symlink constraints
npm install --no-bin-links

# 3. Launch React & Electron development launcher (Starts on Port 3002 to avoid Next.js collision)
PORT=3002 npm run electron:dev
```

---

## 🧪 Step 4: Verification & Automated Tests

To ensure that all integrations, database connectors, and security tokens are configured correctly:

```bash
# 1. Navigate to the gateway directory
cd /Volumes/KINGSTON/CAPVIA/capvia_platform

# 2. Activate the gateway virtual environment
source ~/capvia_gateway_venv/bin/activate

# 3. Run all test suites
PYTHONPATH="/Volumes/KINGSTON/CAPVIA" pytest tests/ -v
```

All 280 tests should return a `PASSED` status.

---

## 🔍 Step 5: Service Health Check Verification

You can verify that individual services are responsive using basic curl commands:

* **Central Gateway Health Check**:
  ```bash
  curl http://localhost:8000/api/health
  # Expected: {"status": "healthy", "version": "1.0.0"}
  ```
* **ATS Subsystem Health Check**:
  ```bash
  curl http://localhost:8001/api/v1/health
  ```
* **Interview Evaluator Health Check**:
  ```bash
  curl http://localhost:8765/health
  # Expected: {"status": "ok", "service": "AI Interview Evaluator"}
  ```

---

## 🛠️ Setup Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `ModuleNotFoundError: No module named 'capvia_platform'` | Missing Python module paths. | Prepend `PYTHONPATH="/Volumes/KINGSTON/CAPVIA"` to your command line. |
| `ValueError: greenlet library is required` | SQLAlchemy missing async helper. | Run `pip install greenlet` inside the active virtualenv. |
| `npm install` symlink failures | exFAT partition file table limitations. | Use the `npm install --no-bin-links` command parameters. |
| `npm run dev` Vite errors | Cannot execute Vite binary directly on exFAT. | Run Vite via `node node_modules/vite/bin/vite.js` instead. |
