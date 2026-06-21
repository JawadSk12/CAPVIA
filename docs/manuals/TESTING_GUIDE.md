# Testing Guide

This guide describes how to run and write unit, integration, end-to-end (E2E), and security tests for the CAPVIA platform.

---

## 1. Backend Testing Framework (`pytest`)

Backend tests are powered by Pytest, utilizing the `anyio` engine for asynchronous test assertions.

### Execution Command Reference

Run all backend tests:
```bash
cd capvia_platform
source venv/bin/activate
python3 -m pytest
```

Run tests from a specific module:
```bash
python3 -m pytest tests/test_ranking_engine.py
```

Run a specific test case:
```bash
python3 -m pytest tests/test_ranking_engine.py::test_calculate_weighted_score
```

Run with standard output logs and detailed print lines:
```bash
python3 -m pytest -s -v
```

---

## 2. Test Coverage Metrics

Use the `coverage` utility to compile and analyze backend test coverage:

```bash
# 1. Run tests with coverage profiling active
coverage run -m pytest

# 2. View coverage metrics in terminal
coverage report -m

# 3. Generate a HTML report
coverage html
# Open capvia_platform/htmlcov/index.html in your browser
```

---

## 3. Core Test Scenarios Covered

The backend test suite consists of **280 distinct test assertions**:

### 1. Database & CRUD Tests (`tests/test_companies.py`, `tests/test_internships.py`)
Verifies transactional inserts, unique email indexes, soft deletions (`deleted_at` fields populated), and foreign key constraints on cascade delete.

### 2. Authentication Verification (`tests/test_auth.py`)
Validates user signups, credentials hashing verification, JWT generation, and refresh token rotation (with session replay attack blocks).

### 3. Downstream Calculations Tests (`tests/test_integrity_engine.py`, `tests/test_dna_engine.py`, `tests/test_ranking_engine.py`)
- **Integrity**: Verifies proctoring penalty deduction weights and Trust Index outputs.
- **DNA Profile**: Tests SBERT alignment vector scores and radar mapping algorithms.
- **Ranking**: Confirms weighted components ($0.25/0.30/0.25/0.20$), percentile calculations, and recommendation tier assignments (Platinum, Gold, Silver, Bronze).

### 4. End-to-End Pipeline Test (`tests/test_e2e_pipeline.py`)
Mocks external microservices using context managers to verify the complete programmatic applicant flow:
`APPLIED` $\rightarrow$ `ATS_PENDING` $\rightarrow$ `ATS_COMPLETED` $\rightarrow$ `SIMULATION_INVITED` $\rightarrow$ `SIMULATION_COMPLETED` $\rightarrow$ `INTERVIEW_INVITED` $\rightarrow$ `EVALUATED` $\rightarrow$ Downstream calculations triggered $\rightarrow$ Leaderboard ranking generated $\rightarrow$ Recruiter PDF generated.

---

## 4. Frontend Testing

Next.js page routing and TypeScript components validation:

```bash
cd capvia_platform/frontend
# Run TypeScript compilation validation check
npm run build
```
This tests client-side routing, API connection variables, state management actions, and component compatibility.
