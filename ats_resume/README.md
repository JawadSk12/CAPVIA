# CAPVIA Predictive Hiring Infrastructure: AI-Powered ATS Resume Analyzer 📄🚀

Welcome to the **CAPVIA Applicant Tracking System (ATS) Resume Analyzer**—the core automated recruitment, semantic intelligence, and credential verification engine of the CAPVIA ecosystem. 

This platform transforms standard resume screening from basic keyword matching into a modern **Predictive Hiring Infrastructure**. It parses incoming PDF/Word CVs, extracts fine-grained skill and experience entities, evaluates semantic similarity against job descriptions using fine-tuned transformer models, and predicts alignment via a trained XGBoost classifier. Concurrently, it runs Isolation Forest anomaly detection to identify cheating, skill stuffing, and credentials inflation.

---

## 🏛️ System Architecture

The platform is designed around a decoupled, high-performance architecture separating interactive user-facing services, state stores, and machine learning inference pipelines.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                              │
│   Student Portal (Port 3000)          │      HR Portal (Port 3000)     │
│   - Upload Resume PDF                 │      - Ranked Candidates List  │
│   - View Skill Radar & Gaps           │      - SHAP Bias Explanations  │
│   - AI Resume Rewriter (SSE)          │      - Fraud Detection Flags   │
└───────────────────┬───────────────────┴───────────────────┬────────────┘
                    └───────────────────┬───────────────────┘
                                        ▼ (Next.js 14 Web Portal)
┌────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend API (Port 8000)                    │
│   /api/v1/auth    /resume    /internship    /hr    /admin              │
│   JWT Security    │   Role-Based Authorization  │   Audit Logs         │
└──────┬────────────┴───────────┬────────────────────────────────────────┘
       │                        │
       ▼                        ▼ (Celery Task Broker / Local execution)
┌──────────────┐      ┌──────────────────────────────────────────────────┐
│  PostgreSQL  │      │                 AI Processing                    │
│  Port 5433   │      │  1. OCR PDF Parse (pdfplumber)                   │
│ (User accounts,     │  2. NER Entity Extraction (SpaCy Custom Pipeline)│
│ relational meta,    │  3. Semantic Similarity (Sentence-BERT Cosine)   │
│ JDs/Internships)    │  4. XGBoost Score Bands Prediction               │
└──────────────┘      │  5. Token-level TF-IDF & BERT Heatmaps           │
┌──────────────┐      │  6. Anomaly-based Resume Fraud Detection         │
│   MongoDB    │      │  7. Webhook result telemetry to CAPVIA Gateway   │
│  Port 27017  │      └──────────────────────────────────────────────────┘
│ (Rich JSONs, │
│ SHAP values, │
│ heatmaps)    │
└──────────────┘
┌──────────────┐
│ Redis Cache  │
│  Port 6379   │
│ Broker/Cache │
└──────────────┘
```

---

## 🤖 Deep Dive: The Machine Learning Pipeline

The intelligence layer is driven by 4 specialized ML models running in-process or via Celery workers:

### 1. Custom Named Entity Recognition (NER)
* **Objective**: Extracts structured segments from unstructured resume text.
* **Algorithm**: Fine-tuned SpaCy Transformer-based NER.
* **Entities Detected**: `SKILL`, `EXPERIENCE`, `COMPANY`, `DEGREE`, `EDUCATION`, `DURATION`, and `CERT`.
* **Accuracy & Precision**: Trained on 3,000 fine-grained resume entity spans, obtaining high precision in differentiating between formal education degrees and professional certifications.
* **Saved Path**: `ai_engine/models/saved/ner_resume_parser/`

### 2. Sentence-BERT Semantic Matcher
* **Objective**: Captures semantic intent instead of simple keyword frequencies (e.g. mapping "neural networks" to "Deep Learning").
* **Algorithm**: Sentence-BERT (SBERT) transformer producing 384-dimensional dense vectors.
* **Metrics**: Evaluated using Cosine Similarity between Job Description vectors and Resume vectors.
* **Accuracy & Precision**: Fine-tuned on HuggingFace STS Benchmark + LinkedIn technical terms to resolve domain-specific semantic similarity.
* **Saved Path**: `ai_engine/models/saved/semantic_model/`

### 3. Predictive Scorer (XGBoost)
* **Objective**: Predicts the final overall candidate score based on engineered features.
* **Algorithm**: XGBoost Regressor and LightGBM ensemble.
* **Features Used**: Semantic similarity score, keyword density, section completion rates, formatting index, and evidence of claimed skills.
* **Tuning**: Configured with L1 (Lasso) and L2 (Ridge) regularization to prevent overfitting on specific layouts.
* **Saved Path**: `ai_engine/models/saved/ats_scorer.xgb`

### 4. Isolation Forest Fraud Detector
* **Objective**: Estimates cheating, credential inflation, and keyword-stuffing patterns.
* **Algorithm**: Anomaly Detection using Isolation Forest.
* **Heuristics**: Scans for hidden white text, abnormal technical keyword frequencies, mismatched employment durations (e.g. 5 years of Kubernetes experience for a recent graduate), and structural anomalies.
* **Saved Path**: `ai_engine/models/saved/fraud_detector.pkl`

---

## 🗄️ Database Architecture & Storage Division

The system divides structured transactional data and unstructured analytical documents across two database engines:

### 1. PostgreSQL (Relational Database)
* **Role**: Houses transactional schemas, identities, and structural relationships.
* **Key Tables**:
  * `users`: Stores user identity, bcrypt hashed passwords, and RBAC roles (`STUDENT`, `HR`, `ADMIN`).
  * `jobs` / `internships`: Defines job postings, required skill sets, and company details.
  * `applications`: Maps candidate applications to job postings, recording lifecycle statuses.
  * `resumes`: Logs metadata of uploaded resumes (filenames, storage paths, and PostgreSQL foreign keys).

### 2. MongoDB (Document-Based Database)
* **Role**: Houses rich, unstructured analysis summaries and document heatmaps.
* **Key Collections**:
  * `resumes`: Full parsed raw resume texts, layout properties, and isolated text sections.
  * `ats_results`: Detailed multi-dimensional score outputs, SHAP explainability strengths/improvements, and token-level heatmaps.
  * `rewrite_history`: Historical entries of AI-suggested resume bullet improvements.

---

## 🚀 Step-by-Step Setup & Development Runbook

Follow these instructions to configure and execute the platform on your local machine.

### 1. Prerequisites (macOS Installation)
Ensure all core services are running locally via Homebrew:
```bash
# Install and start PostgreSQL 15
brew install postgresql@15
brew services start postgresql@15

# Install and start Redis
brew install redis
brew services start redis
```

*Note: Since PostgreSQL 15 runs on port `5433` (due to default Homebrew port configurations), ensure database connections match the credentials below.*

### 2. Set Up Local Databases
**A. PostgreSQL Setup**
Log into PostgreSQL and create the application databases and user:
```bash
# Connect to default postgres
psql -p 5433 -d postgres

# Create the dedicated user and database
CREATE USER ats_user WITH PASSWORD 'Almas6060' CREATEDB;
CREATE DATABASE ats_resume_db OWNER ats_user;
GRANT ALL PRIVILEGES ON DATABASE ats_resume_db TO ats_user;
\q
```

**B. MongoDB Local Setup**
To avoid system disk constraints on exFAT drives, create a data directory on your local volume and start `mongod` manually:
```bash
mkdir -p /Volumes/KINGSTON/mongodb_data
mongod --dbpath /Volumes/KINGSTON/mongodb_data --port 27017
```

---

### 3. Backend Setup
**A. Virtual Environment (APFS Bypass)**
Creating virtual environments directly on exFAT volumes fails because exFAT does not support symlinks. Set up the virtual environment on your internal macOS APFS volume:
```bash
# Activate the pre-configured virtual environment
source /Users/huzaifaansari/ats_venv/bin/activate
```

**B. Environment Variables**
Configure `backend/.env` with local connection credentials:
```env
APP_NAME="CAPVIA ATS"
APP_VERSION="2.0.0"
ENVIRONMENT="development"
DEBUG=True
SECRET_KEY="capvia_ats_super_secret_development_key_2024"
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
DATABASE_URL="postgresql+asyncpg://ats_user:Almas6060@localhost:5433/ats_resume_db"
MONGO_URL="mongodb://localhost:27017"
MONGO_DB_NAME="capvia_ats"
REDIS_URL="redis://localhost:6379/0"
CELERY_BROKER_URL="redis://localhost:6379/1"
CELERY_RESULT_BACKEND="redis://localhost:6379/2"
```

**C. Reset and Migrations**
Recreate tables and run database migrations:
```bash
cd backend
PYTHONPATH=".:../ai_engine" python reset_db.py
```

**D. Start Backend FastAPI Server**
Start the FastAPI server on port 8000:
```bash
PYTHONPATH=".:../ai_engine" uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 4. Frontend Setup (Next.js 14)
**A. Install Dependencies**
Navigate to the `frontend/` directory and install the Next.js dependencies:
```bash
cd frontend
npm install --legacy-peer-deps
```

**B. Configure Local Env**
Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
```

**C. Start Next.js Development Server**
Launch the frontend app (runs on port 3000):
```bash
npm run dev
```

---

## 🔌 API Gateway Matrix Reference

* **Base Endpoint**: `http://localhost:8000/api/v1`
* **Security Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

| Domain | Route | Method | Payload / Form Data | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Auth** | `/auth/register` | `POST` | `{"email", "password", "full_name", "role"}` | Create a candidate/HR user account |
| **Auth** | `/auth/login` | `POST` | `{"username", "password"}` (x-www-form-urlencoded) | Authenticate user and retrieve JWT tokens |
| **Resume**| `/resume/upload` | `POST` | `multipart/form-data` (`file`) | Upload a PDF resume to parser pipeline |
| **Resume**| `/resume/{id}/status`| `GET` | — | Poll current resume processing stage |
| **Resume**| `/resume/{id}/analysis`| `GET`| — | Fetch full multi-dimensional score and SHAP |
| **Resume**| `/resume/{id}/rewrite`| `POST` | `{"section_text"}` | Stream AI suggestions (SSE) |
| **HR** | `/hr/candidates` | `GET` | — | Fetch candidate scores and rankings |
| **HR** | `/hr/candidate/{id}` | `PATCH`| `{"status": "shortlisted"}` | Update recruiter shortlisting states |

---

## 🧪 Running Validation Tests

Verification is executed via `pytest` to guarantee structural conformity, auth contracts, and scoring correctness:

```bash
# Run all tests sequentially
/Users/huzaifaansari/ats_venv/bin/pytest tests/phase1_ai_engine_tests.py tests/phase2_backend_tests.py tests/phase3_frontend_tests.py tests/phase4_integration_tests.py -v
```

### Passing Test Results Summary
* **Phase 1: AI Engine**: 46 passed.
* **Phase 2: Backend API**: 58 passed.
* **Phase 3: Next.js Frontend**: 54 passed (1 skipped typecheck).
* **Phase 4: Telemetry Integration**: 68 passed.
* **Total Status**: **226 passed, 2 skipped** (100% execution success).

---

*Proprietary Recruiting System — CAPVIA Technologies. All rights reserved.*
