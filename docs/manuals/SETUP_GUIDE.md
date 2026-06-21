# CAPVIA Setup Guide

This guide describes how to configure a developer workstation (macOS) to run, test, and develop the CAPVIA recruitment platform and all external subsystems without errors.

---

## 1. Core Toolchain Installation

Open the macOS Terminal and execute the following commands:

### Install Homebrew
Homebrew is the package manager for macOS:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Configure your shell path to resolve Homebrew:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

### Install Git, Python, and Node.js
CAPVIA requires Git for version control, Python 3.12 for microservices (avoiding pre-release Python 3.14 to prevent compilation errors), and Node.js for Next.js:
```bash
brew install git
brew install python@3.12
brew install node
```

### Install PostgreSQL and Redis
PostgreSQL is the primary database, and Redis handles caching:
```bash
brew install postgresql@15
brew install redis
```
Start the local services:
```bash
# Start PostgreSQL service
brew services start postgresql@15

# Start Redis service
brew services start redis
```

---

## 2. Configuring the Core Gateway (`capvia_platform`)

### Set Up Python Virtual Environment & Dependencies
```bash
# Navigate to the core gateway directory
cd /Volumes/KINGSTON/CAPVIA/capvia_platform

# Initialize python3.12 virtual environment
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Initialize database schema & seed data
```bash
# Create local development database
createdb capvia_dev_db

# Apply migrations to generate the 17 tables
./venv/bin/alembic upgrade head

# Seed database with test candidates and recruiters
./venv/bin/python3 scripts/seed_db.py
```

### Start FastAPI Core Server
```bash
# Start server on port 8000 using explicit venv binary
./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Start Next.js HR Dashboard Portal
In a new terminal window:
```bash
cd /Volumes/KINGSTON/CAPVIA/capvia_platform/frontend
npm install --legacy-peer-deps
npm run dev
```

---

## 3. Configuring External Subsystems

For complete E2E integration testing, run the mock subsystems.

### 1. ATS Resume Analyzer Subsystem (Port 8001)
Requires local PostgreSQL running on port `5433` and MongoDB on port `27017`.

**A. Prerequisites Setup**
```bash
# Start MongoDB pointing to Kingston drive to bypass exFAT space restrictions
mkdir -p /Volumes/KINGSTON/mongodb_data
mongod --dbpath /Volumes/KINGSTON/mongodb_data --port 27017 &

# Create database on PostgreSQL port 5433
createdb -p 5433 -h localhost -U postgres ats_resume_db
```

**B. Setup & Start Backend**
```bash
cd /Volumes/KINGSTON/CAPVIA/ats_resume
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Reset and seed database using explicit venv python
cd backend
PYTHONPATH=".:../ai_engine" ../venv/bin/python3 reset_db.py

# Start FastAPI server on port 8001 using explicit venv uvicorn
PYTHONPATH=".:../ai_engine" ../venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

---

### 2. AssessAI Coding Simulation Subsystem (Port 8002)

**A. Setup & Start Backend**
```bash
cd /Volumes/KINGSTON/CAPVIA/ai_simulation/backend
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations and start server on port 8002 using explicit venv binaries
./venv/bin/alembic upgrade head
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

**B. Setup & Start Frontend React App**
On external exFAT volumes, bypass binary symlinks with `--no-bin-links`:
```bash
cd /Volumes/KINGSTON/CAPVIA/ai_simulation/frontend
npm install --legacy-peer-deps --no-bin-links
npm run dev
```

---

### 3. IntelliRecruit Video Interview Subsystem (Port 8003)

**A. Setup & Start Backend ML Server**
```bash
cd /Volumes/KINGSTON/CAPVIA/ai_interview
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements_ai.txt

# Start evaluation server on port 8003 using explicit venv python
./venv/bin/python3 evaluation_server.py --port=8003
```

**B. Setup & Start Frontend React App**
```bash
cd /Volumes/KINGSTON/CAPVIA/ai_interview
npm install --legacy-peer-deps --no-bin-links
npm start
```

---

## 4. Verification Check

Verify systems are fully integrated:
1. **Health Check API**: Query `curl http://localhost:8000/api/v1/health`. It should return `{"status": "healthy"}`.
2. **Swagger Documentation UI**: Open [http://localhost:8000/docs](http://localhost:8000/docs).
3. **Core HR Portal**: Navigate to [http://localhost:3000](http://localhost:3000).
