# CAPVIA ATS — Complete API Specification

This document provides a comprehensive technical overview and API reference for the **CAPVIA ATS (Applicant Tracking System) Resume Analyzer** backend.

---

## 1. Project Overview & Architecture

CAPVIA ATS is an AI-powered resume screening, analysis, and HR intelligence platform. It processes resumes, runs semantic capability analyses, detects potential skill inflation or fraud, and matches candidates to Internship Job Descriptions (JDs).

### Backend Technology Stack
*   **Web Framework**: FastAPI (Python)
*   **Relational Database**: PostgreSQL (using SQLAlchemy Asyncio and `pgvector` for candidate indexing)
*   **Document Store**: MongoDB (stores detailed NLP/ATS analysis results and full JD content)
*   **In-Memory Store / Cache**: Redis (handles session tokens, rate limiting, and temporary status caching)
*   **Task Queue**: Celery (handles heavier background processing such as LLM-based rewrite generation, while initial parsing utilizes FastAPI's native `BackgroundTasks`)

### Authentication Strategy
Authentication relies on a **dual-token JSON Web Token (JWT)** strategy:
1.  **Access Token**: Passed in the `Authorization: Bearer <token>` HTTP header. Contains the user ID and role (`STUDENT`, `HR`, or `ADMIN`). Valid for 15 minutes.
2.  **Refresh Token**: Set by the server as a secure, `httpOnly` cookie named `capvia_refresh_token` with path `/api/v1/auth`. Valid for 7 days.
*Token rotation is active*: when refreshing an access token, the old refresh token is blacklisted in Redis and a new refresh token is issued.

---

## 2. Identified FastAPI Routers

The application registers routers with the `/api/v1` prefix under `backend/main.py`. The active routers are:

1.  **Authentication Router (`auth.py`)**: Root prefix `/api/v1/auth`. Handles register, login, refresh, logout, and token management.
2.  **Resume Router (`resume.py`)**: Root prefix `/api/v1/resume`. Handles resume uploading, status polling, full analysis retrieval, section heatmap extraction, AI rewrite suggestions, history, and GDPR deletes.
3.  **Internship Router (`internship.py`)**: Root prefix `/api/v1/internship`. Handles Job Description (JD) management, applicant ranking, and candidate-to-JD comparisons.
4.  **HR Operations Router (`hr.py`)**: Root prefix `/api/v1/hr`. Handles global candidate pipelines, funnel analytics, candidate actioning (shortlist/reject), and candidate exports.
5.  **Global / Health Router**: Registered directly in `main.py`.

---

## 3. Global & Health Endpoints

### 3.1. API Root Information
*   **URL**: `/`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: None (Public)
*   **Request Schema**: None
*   **Response Schema**:
    ```json
    {
      "name": "string",
      "version": "string",
      "docs": "string"
    }
    ```
*   **Example Request**:
    ```http
    GET / HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "name": "CAPVIA ATS",
      "version": "2.0.0",
      "docs": "/docs"
    }
    ```

---

### 3.2. Kubernetes Liveness & Readiness Health Check
*   **URL**: `/health`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: None (Public)
*   **Request Schema**: None
*   **Response Schema**:
    ```json
    {
      "status": "healthy | degraded",
      "version": "string",
      "environment": "string",
      "dependencies": {
        "postgresql": "ok | error",
        "mongodb": "ok | error",
        "redis": "ok | error"
      }
    }
    ```
    *Note: Returns HTTP status `503 Service Unavailable` if any dependency is Degraded.*
*   **Example Request**:
    ```http
    GET /health HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "status": "healthy",
      "version": "2.0.0",
      "environment": "development",
      "dependencies": {
        "postgresql": "ok",
        "mongodb": "ok",
        "redis": "ok"
      }
    }
    ```

---

### 3.3. API V1 Health Ping
*   **URL**: `/api/v1/health/ping`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: None (Public)
*   **Request Schema**: None
*   **Response Schema**:
    ```json
    {
      "status": "string",
      "message": "string"
    }
    ```
*   **Example Request**:
    ```http
    GET /api/v1/health/ping HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "status": "ok",
      "message": "pong"
    }
    ```

---

## 4. Authentication Router (`/api/v1/auth`)

Handles authentication state, user registration, and security logs.

### 4.1. Register Account
*   **URL**: `/api/v1/auth/register`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: None (Public / Guest)
*   **Request Schema (`RegisterRequest`)**:
    *   `full_name` (string, required): Min 2, max 100 characters. Only letters, spaces, hyphens, apostrophes.
    *   `email` (string, required): Valid email format. Unique in the database.
    *   `password` (string, required): Min 8, max 128 characters. Must contain at least one uppercase letter, one digit, and one special character.
    *   `role` (string, optional): Role of the registering user. Must be `STUDENT` or `HR` (defaults to `STUDENT`).
*   **Response Schema (`TokenResponse`)**:
    *   `access_token` (string): Bearer JWT access token.
    *   `token_type` (string): Defaults to `"bearer"`.
    *   `expires_in` (integer): Lifetime of the access token in seconds (defaults to `900`).
    *   `user` (object): Profile details.
        *   `id` (string): UUID of user.
        *   `email` (string): Email address.
        *   `full_name` (string | null): Full name.
        *   `role` (string): `STUDENT` or `HR`.
        *   `is_active` (boolean): `true` if active.
        *   `is_email_verified` (boolean): Verification status.
        *   `created_at` (string): ISO datetime of registration.
        *   `last_login_at` (string | null): Last login timestamp.
        *   `avatar_url` (string | null): Avatar URL.
    *   *Sets Cookie*: `capvia_refresh_token` in HTTP response header (`HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`).
*   **Example Request**:
    ```http
    POST /api/v1/auth/register HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "full_name": "Arjun Kumar",
      "email": "arjun@example.com",
      "password": "Password123!",
      "role": "STUDENT"
    }
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmExMjM0NTYtNzhjOS0wMTJkLTM0NTYtNzhjOTAxMmQzNDU2Iiwicm9sZSI6IlNUVURFTlQiLCJqdGkiOiJqdGkxMjM0NSIsImV4cCI6MTgwMDAwMDAwMH0.signature",
      "token_type": "bearer",
      "expires_in": 900,
      "user": {
        "id": "fa123456-78c9-012d-3456-78c9012d3456",
        "email": "arjun@example.com",
        "full_name": "Arjun Kumar",
        "role": "STUDENT",
        "is_active": true,
        "is_email_verified": false,
        "created_at": "2026-06-16T12:00:00Z",
        "last_login_at": null,
        "avatar_url": null
      }
    }
    ```

---

### 4.2. Login
*   **URL**: `/api/v1/auth/login`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: None (Public)
*   **Request Schema (`LoginRequest`)**:
    *   `email` (string, required): User email address.
    *   `password` (string, required): Min 1 character.
*   **Response Schema (`TokenResponse`)**: Same schema as **4.1. Register Account**.
*   **Example Request**:
    ```http
    POST /api/v1/auth/login HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "email": "arjun@example.com",
      "password": "Password123!"
    }
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmExMjM0NTYtNzhjOS0wMTJkLTM0NTYtNzhjOTAxMmQzNDU2Iiwicm9sZSI6IlNUVURFTlQiLCJqdGkiOiJqdGkxMjM0NSIsImV4cCI6MTgwMDAwMDAwMH0.signature",
      "token_type": "bearer",
      "expires_in": 900,
      "user": {
        "id": "fa123456-78c9-012d-3456-78c9012d3456",
        "email": "arjun@example.com",
        "full_name": "Arjun Kumar",
        "role": "STUDENT",
        "is_active": true,
        "is_email_verified": false,
        "created_at": "2026-06-16T12:00:00Z",
        "last_login_at": "2026-06-16T17:20:00Z",
        "avatar_url": null
      }
    }
    ```

---

### 4.3. Refresh Token
*   **URL**: `/api/v1/auth/refresh`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Requires valid `capvia_refresh_token` in request cookies.
*   **Request Schema**: None. (Reads cookie `capvia_refresh_token`).
*   **Response Schema (`RefreshResponse`)**:
    *   `access_token` (string): New access token.
    *   `token_type` (string): Defaults to `"bearer"`.
    *   `expires_in` (integer): Lifetime of the access token in seconds.
    *   *Sets Cookie*: Rotates the refresh token (clears old cookie, writes new `capvia_refresh_token`).
*   **Example Request**:
    ```http
    POST /api/v1/auth/refresh HTTP/1.1
    Host: localhost:8000
    Cookie: capvia_refresh_token=refresh_token_string_here
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token_payload.signature",
      "token_type": "bearer",
      "expires_in": 900
    }
    ```

---

### 4.4. Logout
*   **URL**: `/api/v1/auth/logout`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Valid JWT Access Token in HTTP Authorization Header (Bearer scheme).
*   **Request Schema**: None.
*   **Response Schema (`MessageResponse`)**:
    *   `message` (string): Logout message description.
    *   `success` (boolean): Defaults to `true`.
    *   *Removes Cookie*: Deletes the `capvia_refresh_token` cookie.
*   **Example Request**:
    ```http
    POST /api/v1/auth/logout HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Cookie: capvia_refresh_token=refresh_token_string_here
    ```
*   **Example Response**:
    ```json
    {
      "message": "Logged out successfully",
      "success": true
    }
    ```

---

### 4.5. Get Current User Profile (`/me`)
*   **URL**: `/api/v1/auth/me`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer).
*   **Request Schema**: None.
*   **Response Schema (`UserResponse`)**:
    *   `id` (string): UUID.
    *   `email` (string): Email address.
    *   `full_name` (string | null): Full name.
    *   `role` (string): `STUDENT`, `HR` or `ADMIN`.
    *   `is_active` (boolean): Status.
    *   `is_email_verified` (boolean): Email status.
    *   `created_at` (string): ISO datetime.
    *   `last_login_at` (string | null): ISO datetime.
    *   `avatar_url` (string | null): Avatar image URL.
*   **Example Request**:
    ```http
    GET /api/v1/auth/me HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "id": "fa123456-78c9-012d-3456-78c9012d3456",
      "email": "arjun@example.com",
      "full_name": "Arjun Kumar",
      "role": "STUDENT",
      "is_active": true,
      "is_email_verified": false,
      "created_at": "2026-06-16T12:00:00Z",
      "last_login_at": "2026-06-16T17:20:00Z",
      "avatar_url": null
    }
    ```

---

## 5. Resume Router (`/api/v1/resume`)

Manages resume processing, scores, heatmaps, and rewrite generation.

### 5.1. Upload Resume
*   **URL**: `/api/v1/resume/upload`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer).
*   **Request Schema**: Multipart Form-Data.
    *   `file` (Binary stream, required): PDF or DOCX file up to 5MB.
    *   `mode` (string, optional): Defaults to `"GLOBAL"`. Options: `"GLOBAL"`, `"INTERNSHIP"`.
    *   `jd_id` (string, optional): Required if `mode` is set to `"INTERNSHIP"`.
*   **Response Schema (`ResumeUploadResponse`)**:
    *   `resume_id` (string): UUID assigned to the new resume document.
    *   `status` (string): Initial stage. Typically `"PENDING"`.
    *   `message` (string): Status description message.
    *   `estimated_seconds` (integer): Estimated processing duration.
*   **Example Request**:
    ```http
    POST /api/v1/resume/upload HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

    ------WebKitFormBoundary7MA4YWxkTrZu0gW
    Content-Disposition: form-data; name="file"; filename="my_resume.pdf"
    Content-Type: application/pdf

    [PDF BINARY DATA]
    ------WebKitFormBoundary7MA4YWxkTrZu0gW
    Content-Disposition: form-data; name="mode"

    GLOBAL
    ------WebKitFormBoundary7MA4YWxkTrZu0gW--
    ```
*   **Example Response**:
    ```json
    {
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "status": "PENDING",
      "message": "Resume uploaded successfully. Processing started.",
      "estimated_seconds": 30
    }
    ```

---

### 5.2. Poll Processing Status
*   **URL**: `/api/v1/resume/{resume_id}/status`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token. User must own the resume OR hold `HR`/`ADMIN` role.
*   **Request Schema**: None. Path parameter: `resume_id` (string).
*   **Response Schema (`ResumeStatusResponse`)**:
    *   `resume_id` (string): UUID.
    *   `status` (string): Current pipeline stage. One of: `PENDING`, `OCR`, `PARSING`, `EMBEDDING`, `SCORING`, `DONE`, `ERROR`.
    *   `progress_percent` (integer): Progress completeness indicator (0 to 100).
    *   `stage_label` (string): Descriptive current status tag.
    *   `error_message` (string | null): populates if processing failed.
    *   `estimated_seconds_remaining` (integer | null): Estimated remaining time.
*   **Example Request**:
    ```http
    GET /api/v1/resume/b78b663b-64ee-48ba-b7e5-1a2eb75b0726/status HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "status": "PARSING",
      "progress_percent": 30,
      "stage_label": "Analyzing resume structure...",
      "error_message": null,
      "estimated_seconds_remaining": 35
    }
    ```

---

### 5.3. Get Full ATS Analysis Result
*   **URL**: `/api/v1/resume/{resume_id}/analysis`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token. Must be resource owner, `HR` or `ADMIN`.
*   **Request Schema**: None. Path parameter: `resume_id` (string).
*   **Response Schema (`ATSAnalysisResponse`)**:
    *   `resume_id` (string): UUID.
    *   `user_id` (string): ID of candidate who uploaded the resume.
    *   `mode` (string): `GLOBAL` or `INTERNSHIP`.
    *   `created_at` (string): Upload datetime ISO string.
    *   `overall_score` (number): Unified matching score (0.0 to 100.0).
    *   `score_band` (string): Category rating: `STRONG`, `GOOD`, `FAIR`, `WEAK`.
    *   `percentile` (number | null): Grade benchmark comparison factor.
    *   `detected_role` (string): Model predicted primary skill cluster path.
    *   `role_confidence` (number): Confidence score (0.0 to 1.0).
    *   `role_alternatives` (array): Alternative options matched.
    *   `dimensions` (object): Score dimension rating.
        *   `semantic_skill_match` (number): Score out of 100.
        *   `project_relevance` (number): Score out of 100.
        *   `experience_depth` (number): Score out of 100.
        *   `education_alignment` (number): Score out of 100.
        *   `ats_format` (number): Structural alignment rating.
        *   `keyword_intelligence` (number): Relevant keywords count score.
        *   `certification_bonus` (number | null): Certification points.
        *   `skill_proof_score` (number | null): Evidential project backup score.
    *   `skill_analysis` (object): Detailed skill matching engine outcome.
        *   `matches` (array of objects):
            *   `target_skill` (string): Skill searched.
            *   `matched_by` (string): Corresponding resume skill tag.
            *   `similarity_score` (number): Extraction proximity.
            *   `match_type` (string): `DIRECT`, `SEMANTIC`, or `PARTIAL`.
        *   `gaps` (array of objects): Missing requirements.
            *   `skill` (string): Skill missing.
            *   `closest_match` (string | null): Nearest substitute text.
            *   `similarity` (number): Proximity factor.
            *   `priority` (string): `HIGH`, `MEDIUM`, or `LOW`.
            *   `learning_resource` (string | null): Direct reference course URL.
        *   `coverage` (number): Match ratio.
        *   `semantic_score` (number): Integrated match factor.
        *   `matched_count` (integer): Total matches count.
        *   `gap_count` (integer): Total missing count.
    *   `heatmap` (array of objects): Structural relevance map.
        *   `section_name` (string): Header tag.
        *   `content_preview` (string): Start excerpt.
        *   `relevance_score` (number): Target density indicator.
        *   `issues` (array of strings): Problems found.
        *   `missing_keywords` (array of strings): Target terms.
        *   `feedback` (string): Actionable advice line.
        *   `word_count` (integer): Length metric.
    *   `explainability` (object): Explanation layer.
        *   `factors` (array of objects): SHAP values explanation breakdown.
            *   `feature_name` (string): Database metric.
            *   `display_name` (string): UI friendly name.
            *   `impact` (number): Influence margin.
            *   `direction` (string): `positive` or `negative`.
            *   `raw_value` (number): Feature score.
            *   `explanation` (string): Detail card.
            *   `fix_suggestion` (string | null): Correction plan text.
        *   `summary` (string): Overall resume diagnostic report text.
        *   `confidence` (number): Evaluation confidence.
        *   `confidence_label` (string): `HIGH`, `MEDIUM`, or `LOW`.
    *   `fraud_analysis` (object): Proof evaluation metrics.
        *   `is_suspicious` (boolean): Suspicious indicators warning flag.
        *   `fraud_probability` (number): Assessment probability.
        *   `flags` (array of objects): Warnings list.
            *   `flag_type` (string): `SKILL_INFLATION`, `KEYWORD_STUFFING`, or `UNSUBSTANTIATED_SKILL`.
            *   `severity` (string): `HIGH`, `MEDIUM`, or `LOW`.
            *   `detail` (string): Details of warning.
            *   `affected_skill` (string | null): Targeted skill text.
        *   `proof_score` (number): Project-substantiated skill proof ratio.
        *   `verdict` (string): `CLEAN`, `SUSPICIOUS`, or `LIKELY_FRAUD`.
    *   `ai_confidence` (number): Engine evaluation confidence.
    *   `confidence_label` (string): Rating level label.
*   **Example Request**:
    ```http
    GET /api/v1/resume/b78b663b-64ee-48ba-b7e5-1a2eb75b0726/analysis HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "user_id": "fa123456-78c9-012d-3456-78c9012d3456",
      "mode": "GLOBAL",
      "created_at": "2026-06-16T12:00:00Z",
      "overall_score": 78.5,
      "score_band": "GOOD",
      "percentile": 85.0,
      "detected_role": "Backend Engineer",
      "role_confidence": 0.92,
      "role_alternatives": [
        { "role": "DevOps Engineer", "confidence": 0.45 },
        { "role": "Data Engineer", "confidence": 0.38 }
      ],
      "dimensions": {
        "semantic_skill_match": 82.0,
        "project_relevance": 75.0,
        "experience_depth": 80.0,
        "education_alignment": 90.0,
        "ats_format": 85.0,
        "keyword_intelligence": 70.0,
        "certification_bonus": 5.0,
        "skill_proof_score": 0.88
      },
      "skill_analysis": {
        "matches": [
          {
            "target_skill": "Python",
            "matched_by": "Python",
            "similarity_score": 1.0,
            "match_type": "DIRECT"
          },
          {
            "target_skill": "PostgreSQL",
            "matched_by": "SQL Databases",
            "similarity_score": 0.85,
            "match_type": "SEMANTIC"
          }
        ],
        "gaps": [
          {
            "skill": "Docker",
            "closest_match": "Kubernetes",
            "similarity": 0.60,
            "priority": "MEDIUM",
            "learning_resource": "https://www.coursera.org/learn/docker-basics"
          }
        ],
        "coverage": 0.80,
        "semantic_score": 0.83,
        "matched_count": 8,
        "gap_count": 2
      },
      "heatmap": [
        {
          "section_name": "Work Experience",
          "content_preview": "Developed microservices using FastAPI and PostgreSQL...",
          "relevance_score": 0.85,
          "issues": [],
          "missing_keywords": ["CI/CD"],
          "feedback": "Strong experience details, but missing CI/CD keywords.",
          "word_count": 350
        }
      ],
      "explainability": {
        "factors": [
          {
            "feature_name": "semantic_skill_match",
            "display_name": "Semantic Skill Matching",
            "impact": 5.2,
            "direction": "positive",
            "raw_value": 82.0,
            "explanation": "Your technical skills align well with standard backend expectations.",
            "fix_suggestion": "Add more details about Docker to close gaps."
          }
        ],
        "summary": "Overall good alignment with Backend Engineer expectations.",
        "confidence": 0.90,
        "confidence_label": "HIGH"
      },
      "fraud_analysis": {
        "is_suspicious": false,
        "fraud_probability": 0.05,
        "flags": [],
        "proof_score": 0.90,
        "verdict": "CLEAN"
      },
      "ai_confidence": 0.90,
      "confidence_label": "HIGH"
    }
    ```

---

### 5.4. Get Standardized CAPVIA Capability DNA Graph
*   **URL**: `/api/v1/resume/{resume_id}/dna`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer).
*   **Request Schema**: None. Path parameter: `resume_id` (string).
*   **Response Schema (`DNACapabilityGraph`)**:
    *   `candidate_id` (string): ID of candidate.
    *   `job_id` (string): ID of job.
    *   `ats_analysis_id` (string): Resume ATS analysis UUID ID.
    *   `role_match` (object):
        *   `technical_alignment` (number): 0 to 100 score.
        *   `project_alignment` (number): 0 to 100 score.
        *   `experience_alignment` (number): 0 to 100 score.
        *   `domain_alignment` (number): 0 to 100 score.
        *   `semantic_match_strength` (number): 0 to 100 score.
    *   `resume_quality` (object):
        *   `readability` (number): Score 0-100.
        *   `clarity` (number): Score 0-100.
        *   `structure_quality` (number): Score 0-100.
        *   `ats_compatibility` (number): Score 0-100.
        *   `achievement_quality` (number): Score 0-100.
    *   `skill_intelligence` (object):
        *   `technical_depth` (number): Depth rating (0 to 100).
        *   `practical_exposure` (number): Exposure rating (0 to 100).
        *   `tool_relevance` (number): Tool matching rating (0 to 100).
        *   `framework_alignment` (number): Framework compatibility rating (0 to 100).
        *   `proof_of_skill_strength` (number): Strength of proof rating (0 to 100).
    *   `gap_analysis` (object):
        *   `missing_skill_severity` (number): Gaps severity score (0 to 100).
        *   `project_gap_severity` (number): Project gaps severity score (0 to 100).
        *   `learning_gap_score` (number): Learning gaps severity score (0 to 100).
        *   `readiness_gap_score` (number): Readiness gaps severity score (0 to 100).
        *   `missing_skills` (array of strings): Skills required but not matched.
        *   `weak_areas` (array of strings): Low score domains list.
        *   `recommended_skills` (array of strings): Suggestions to improve.
    *   `readiness_intelligence` (object):
        *   `internship_readiness` (number): Readiness assessment score (0 to 100).
        *   `role_fit_score` (number): Fit indicator (0 to 100).
        *   `recruiter_interest_probability` (number): Hiring probability index (0 to 100).
        *   `hiring_readiness_score` (number): Aggregate readiness rating (0 to 100).
    *   `fraud_analysis` (object):
        *   `risk_level` (string): Danger factor category.
        *   `is_flagged` (boolean): Flag indicator warning flag.
        *   `flags` (array of objects): Warning indicators list.
            *   `type` (string): Type category.
            *   `detail` (string): Description of trigger.
            *   `severity` (string): `HIGH` | `MEDIUM` | `LOW`.
    *   `explainability` (object):
        *   `top_strengths` (array of strings): Best sections details.
        *   `top_weaknesses` (array of strings): Critical sections gaps.
        *   `matching_reasons` (array of strings): Logical alignment comments.
        *   `risk_reasons` (array of strings): Flag reasons remarks.
        *   `reason_for_scores` (array of strings): Score details remarks.
    *   `heatmap` (array of objects):
        *   `section_name` (string): Header tag.
        *   `relevance_score` (number): Score 0-100.
        *   `issues` (array of strings): Issues text cards.
        *   `word_count` (integer): Length count.
    *   `overall` (object):
        *   `capability_score` (number): Consolidated grade.
        *   `candidate_level` (string): Level description rating tag.
        *   `recommendation` (string): Overall advice recommendation card.
*   **Example Request**:
    ```http
    GET /api/v1/resume/b78b663b-64ee-48ba-b7e5-1a2eb75b0726/dna HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "candidate_id": "fa123456-78c9-012d-3456-78c9012d3456",
      "job_id": "global-eval",
      "ats_analysis_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "role_match": {
        "technical_alignment": 82.5,
        "project_alignment": 78.0,
        "experience_alignment": 80.0,
        "domain_alignment": 85.0,
        "semantic_match_strength": 82.0
      },
      "resume_quality": {
        "readability": 90.0,
        "clarity": 85.0,
        "structure_quality": 88.0,
        "ats_compatibility": 85.0,
        "achievement_quality": 80.0
      },
      "skill_intelligence": {
        "technical_depth": 84.0,
        "practical_exposure": 76.0,
        "tool_relevance": 80.0,
        "framework_alignment": 82.0,
        "proof_of_skill_strength": 88.0
      },
      "gap_analysis": {
        "missing_skill_severity": 20.0,
        "project_gap_severity": 25.0,
        "learning_gap_score": 15.0,
        "readiness_gap_score": 18.0,
        "missing_skills": ["Docker"],
        "weak_areas": ["Containerization"],
        "recommended_skills": ["Docker", "Kubernetes"]
      },
      "readiness_intelligence": {
        "internship_readiness": 85.0,
        "role_fit_score": 82.0,
        "recruiter_interest_probability": 78.0,
        "hiring_readiness_score": 81.0
      },
      "fraud_analysis": {
        "risk_level": "LOW",
        "is_flagged": false,
        "flags": []
      },
      "explainability": {
        "top_strengths": ["Strong FastAPI knowledge", "Good database optimization skills"],
        "top_weaknesses": ["Missing containerization experience"],
        "matching_reasons": ["Has relevant project experience with FastAPI and PostgreSQL"],
        "risk_reasons": [],
        "reason_for_scores": ["Technical depth is high due to substantial PostgreSQL query work"]
      },
      "heatmap": [
        {
          "section_name": "Work Experience",
          "relevance_score": 85.0,
          "issues": [],
          "word_count": 350
        }
      ],
      "overall": {
        "capability_score": 81.5,
        "candidate_level": "JUNIOR_DEVELOPER",
        "recommendation": "Strong candidate for junior/entry backend roles."
      }
    }
    ```

---

### 5.5. Get Resume Section Heatmap
*   **URL**: `/api/v1/resume/{resume_id}/heatmap`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer). Owner or HR access.
*   **Request Schema**: None. Path parameter: `resume_id` (string).
*   **Response Schema**:
    *   `resume_id` (string): UUID.
    *   `overall_score` (number): Overall ATS score.
    *   `heatmap` (array of `HeatmapSection` objects): See **5.3. Get Full ATS Analysis Result** for schema detail.
*   **Example Request**:
    ```http
    GET /api/v1/resume/b78b663b-64ee-48ba-b7e5-1a2eb75b0726/heatmap HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "overall_score": 78.5,
      "heatmap": [
        {
          "section_name": "Work Experience",
          "content_preview": "Developed microservices using FastAPI and PostgreSQL...",
          "relevance_score": 0.85,
          "issues": [],
          "missing_keywords": ["CI/CD"],
          "feedback": "Strong experience details, but missing CI/CD keywords.",
          "word_count": 350
        }
      ]
    }
    ```

---

### 5.6. Request AI Rewrite Suggestions (Server-Sent Events)
*   **URL**: `/api/v1/resume/{resume_id}/rewrite`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer). Owner or HR access.
*   **Request Schema (`RewriteRequest`)**:
    *   `section` (string, required): One of: `skills`, `experience`, `summary`, `projects`.
    *   `target_role` (string, optional): Role designation override. Defaults to detected role.
    *   `jd_id` (string, optional): Specific Job Description ID to optimize against.
*   **Response Schema**: Streams `text/event-stream` chunks back to client.
    *   **Streaming Chunk Messages Format**:
        *   *Status Update Event*:
            ```json
            {"type": "status", "message": "Generating AI suggestions..."}
            ```
        *   *Text Token Stream Event*:
            ```json
            {"type": "token", "text": "stream_text_fragment"}
            ```
        *   *Final Complete Outcome Event*:
            ```json
            {"type": "complete", "result": RewriteSuggestion}
            ```
            *`RewriteSuggestion` Properties:*
            *   `section` (string): Updated section name.
            *   `original_content` (string): Original source content.
            *   `suggested_content` (string): Upgraded suggested text.
            *   `improvement_rationale` (string): AI explanation reasons cards.
            *   `keywords_added` (array of strings): Added high-impact keywords.
            *   `expected_score_impact` (number): Estimated ATS score change (0.0 to 20.0).
        *   *Error Event*:
            ```json
            {"type": "error", "message": "description of issue"}
            ```
*   **Example Request**:
    ```http
    POST /api/v1/resume/b78b663b-64ee-48ba-b7e5-1a2eb75b0726/rewrite HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: application/json

    {
      "section": "summary",
      "target_role": "Backend Developer",
      "jd_id": null
    }
    ```
*   **Example Response**:
    ```http
    HTTP/1.1 200 OK
    Content-Type: text/event-stream
    Cache-Control: no-cache
    X-Accel-Buffering: no

    data: {"type": "status", "message": "Generating AI suggestions..."}

    data: {"type": "token", "text": "Detail-oriented"}

    data: {"type": "token", "text": " backend"}

    data: {"type": "complete", "result": {"section": "summary", "original_content": "A junior developer looking for a job.", "suggested_content": "Detail-oriented Backend Developer with hands-on experience building REST APIs using FastAPI and optimizing PostgreSQL database queries.", "improvement_rationale": "Stronger active voice and technical keywords.", "keywords_added": ["FastAPI", "PostgreSQL", "REST APIs"], "expected_score_impact": 8.5}}
    ```

---

### 5.7. Get Resume History List
*   **URL**: `/api/v1/resume/history`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer).
*   **Request Schema**: None.
    *   *Query Parameters*:
        *   `limit` (integer, optional): Defaults to `20`, max `50`.
        *   `offset` (integer, optional): Defaults to `0`.
*   **Response Schema (`list[ResumeSummary]`)**:
    *   `id` (string): Resume UUID.
    *   `original_filename` (string): Uploaded file name.
    *   `status` (string): Current processing status.
    *   `mode` (string): Processing mode (`GLOBAL` | `INTERNSHIP`).
    *   `overall_score` (number | null): Overall ATS score (populated if DONE).
    *   `detected_role` (string | null): Primary detected role (populated if DONE).
    *   `created_at` (string): Upload datetime ISO string.
    *   `completed_at` (string | null): Process completion ISO datetime.
*   **Example Request**:
    ```http
    GET /api/v1/resume/history?limit=5 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    [
      {
        "id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
        "original_filename": "Arjun_Kumar_Resume.pdf",
        "status": "DONE",
        "mode": "GLOBAL",
        "overall_score": 78.5,
        "detected_role": "Backend Engineer",
        "created_at": "2026-06-16T12:00:00Z",
        "completed_at": "2026-06-16T12:00:25Z"
      }
    ]
    ```

---

### 5.8. Delete Resume (GDPR Erasure)
*   **URL**: `/api/v1/resume/{resume_id}`
*   **HTTP Method**: `DELETE`
*   **Authentication Requirements**: Valid JWT Access Token. Must be owner OR `HR`/`ADMIN`.
*   **Request Schema**: None. Path parameter: `resume_id` (string).
*   **Response Schema**:
    ```json
    {
      "message": "Resume deleted successfully",
      "resume_id": "string"
    }
    ```
*   **Example Request**:
    ```http
    DELETE /api/v1/resume/b78b663b-64ee-48ba-b7e5-1a2eb75b0726 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "message": "Resume deleted successfully",
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726"
    }
    ```

---

## 6. Internship Router (`/api/v1/internship`)

Handles Job Descriptions (JDs), ranking candidates, and comparisons.

### 6.1. Create Internship Posting
*   **URL**: `/api/v1/internship`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema (`InternshipCreateRequest`)**:
    *   `title` (string, required): Title of the internship position (min 5, max 500 characters).
    *   `company` (string, optional): Company name.
    *   `department` (string, optional): Department.
    *   `location` (string, optional): Geographic location.
    *   `is_remote` (boolean, optional): Defaults to `false`.
    *   `experience_level` (string, optional): One of: `ENTRY`, `JUNIOR`, `MID`, `SENIOR` (defaults to `"ENTRY"`).
    *   `short_description` (string, optional): Brief description.
    *   `application_deadline` (string, optional): ISO datetime string.
    *   `responsibilities` (array of strings, required): Core job duties list (min 1).
    *   `required_skills` (array of strings, required): Skills critical to match rating (min 1).
    *   `preferred_skills` (array of strings, optional): Nice to have skills checklist.
    *   `tools_and_technologies` (array of strings, optional): Specific developer tools list.
    *   `expected_projects` (array of strings, optional): Target projects scope list.
    *   `full_jd_text` (string, optional): Copy of the complete raw JD string.
*   **Response Schema (`InternshipSummaryResponse`)**:
    *   `id` (string): Assigned UUID.
    *   `title` (string): Internship title.
    *   `company` (string | null): Company name.
    *   `location` (string | null): Location details.
    *   `is_remote` (boolean): Remote flag status.
    *   `experience_level` (string): Level description rating tag.
    *   `is_active` (boolean): Active posting flag.
    *   `is_expired` (boolean): Deadline check.
    *   `total_applicants` (integer): Applicants count.
    *   `shortlisted_count` (integer): Shortlist count.
    *   `short_description` (string | null): Description overview.
    *   `application_deadline` (string | null): ISO datetime.
    *   `created_at` (string): Creation datetime ISO string.
*   **Example Request**:
    ```http
    POST /api/v1/internship HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: application/json

    {
      "title": "Machine Learning Engineer Intern",
      "company": "Capvia AI",
      "location": "Bangalore",
      "is_remote": true,
      "experience_level": "ENTRY",
      "short_description": "Join our AI research team as an ML Engineer Intern.",
      "application_deadline": "2026-07-31T23:59:59Z",
      "responsibilities": [
        "Develop and train neural networks",
        "Prepare datasets and perform EDA",
        "Collaborate on software deployment"
      ],
      "required_skills": [
        "Python",
        "PyTorch",
        "SQL"
      ],
      "preferred_skills": [
        "Docker",
        "Git",
        "FastAPI"
      ],
      "tools_and_technologies": [
        "Jupyter Notebook",
        "Weights & Biases"
      ],
      "expected_projects": [
        "Build an image classification model and deploy it"
      ],
      "full_jd_text": "We are seeking a highly motivated ML Intern..."
    }
    ```
*   **Example Response**:
    ```json
    {
      "id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "title": "Machine Learning Engineer Intern",
      "company": "Capvia AI",
      "location": "Bangalore",
      "is_remote": true,
      "experience_level": "ENTRY",
      "is_active": true,
      "is_expired": false,
      "total_applicants": 0,
      "shortlisted_count": 0,
      "short_description": "Join our AI research team as an ML Engineer Intern.",
      "application_deadline": "2026-07-31T23:59:59Z",
      "created_at": "2026-06-16T17:25:00Z"
    }
    ```

---

### 6.2. List Active Internships
*   **URL**: `/api/v1/internship`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer).
    *   *Role differences*: `STUDENT` receives only active listings. `HR` filters to listings created by their organization.
*   **Request Schema**: None.
    *   *Query Parameters*:
        *   `limit` (integer, optional): Defaults to `20`, max `50`.
        *   `offset` (integer, optional): Defaults to `0`.
        *   `active_only` (boolean, optional): Defaults to `true`.
*   **Response Schema (`list[InternshipSummaryResponse]`)**: Array of items matching **6.1. Create Internship Posting** response schema.
*   **Example Request**:
    ```http
    GET /api/v1/internship?limit=5 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    [
      {
        "id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
        "title": "Machine Learning Engineer Intern",
        "company": "Capvia AI",
        "location": "Bangalore",
        "is_remote": true,
        "experience_level": "ENTRY",
        "is_active": true,
        "is_expired": false,
        "total_applicants": 0,
        "shortlisted_count": 0,
        "short_description": "Join our AI research team as an ML Engineer Intern.",
        "application_deadline": "2026-07-31T23:59:59Z",
        "created_at": "2026-06-16T17:25:00Z"
      }
    ]
    ```

---

### 6.3. Get Internship Posting Details
*   **URL**: `/api/v1/internship/{jd_id}`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer).
*   **Request Schema**: None. Path parameter: `jd_id` (string).
*   **Response Schema (`InternshipDetailResponse`)**:
    *   Inherits all fields from `InternshipSummaryResponse` (see **6.1. Create Internship Posting**).
    *   `responsibilities` (array of strings): Core duties checklist.
    *   `required_skills` (array of strings): Critical technical skills required.
    *   `preferred_skills` (array of strings): Preferred skills checklist.
    *   `tools_and_technologies` (array of strings): Specific tools list.
    *   `expected_projects` (array of strings): Project deliverables expected.
    *   `full_jd_text` (string | null): Paste of raw JD text.
    *   `created_by_name` (string | null): HR creator name.
*   **Example Request**:
    ```http
    GET /api/v1/internship/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "title": "Machine Learning Engineer Intern",
      "company": "Capvia AI",
      "location": "Bangalore",
      "is_remote": true,
      "experience_level": "ENTRY",
      "is_active": true,
      "is_expired": false,
      "total_applicants": 0,
      "shortlisted_count": 0,
      "short_description": "Join our AI research team as an ML Engineer Intern.",
      "application_deadline": "2026-07-31T23:59:59Z",
      "created_at": "2026-06-16T17:25:00Z",
      "responsibilities": [
        "Develop and train neural networks",
        "Prepare datasets and perform EDA",
        "Collaborate on software deployment"
      ],
      "required_skills": [
        "Python",
        "PyTorch",
        "SQL"
      ],
      "preferred_skills": [
        "Docker",
        "Git",
        "FastAPI"
      ],
      "tools_and_technologies": [
        "Jupyter Notebook",
        "Weights & Biases"
      ],
      "expected_projects": [
        "Build an image classification model and deploy it"
      ],
      "full_jd_text": "We are seeking a highly motivated ML Intern...",
      "created_by_name": "Jane Smith"
    }
    ```

---

### 6.4. Update Internship Posting
*   **URL**: `/api/v1/internship/{jd_id}`
*   **HTTP Method**: `PUT`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`. Must be creator of the posting OR `ADMIN`.
*   **Request Schema (`InternshipUpdateRequest`)**: Same fields as `InternshipCreateRequest` (see **6.1. Create Internship Posting**), but all fields are optional.
*   **Response Schema (`InternshipSummaryResponse`)**: See **6.1. Create Internship Posting** response schema.
*   **Example Request**:
    ```http
    PUT /api/v1/internship/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: application/json

    {
      "title": "Senior ML Engineer Intern",
      "is_remote": false
    }
    ```
*   **Example Response**:
    ```json
    {
      "id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "title": "Senior ML Engineer Intern",
      "company": "Capvia AI",
      "location": "Bangalore",
      "is_remote": false,
      "experience_level": "ENTRY",
      "is_active": true,
      "is_expired": false,
      "total_applicants": 0,
      "shortlisted_count": 0,
      "short_description": "Join our AI research team as an ML Engineer Intern.",
      "application_deadline": "2026-07-31T23:59:59Z",
      "created_at": "2026-06-16T17:25:00Z"
    }
    ```

---

### 6.5. Archive Internship Posting (Soft Delete)
*   **URL**: `/api/v1/internship/{jd_id}`
*   **HTTP Method**: `DELETE`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None. Path parameter: `jd_id` (string).
*   **Response Schema**:
    ```json
    {
      "message": "Internship archived",
      "jd_id": "string"
    }
    ```
*   **Example Request**:
    ```http
    DELETE /api/v1/internship/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "message": "Internship archived",
      "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b"
    }
    ```

---

### 6.6. Trigger Resume vs JD Comparison
*   **URL**: `/api/v1/internship/{jd_id}/compare/{resume_id}`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer). Can be `STUDENT` (applying) or `HR`/`ADMIN` evaluating candidates.
*   **Request Schema (`CompareRequest`)**:
    *   `force_rerun` (boolean, optional): Set to `true` to force a new analysis, even if matching scores exist. Defaults to `false`.
*   **Response Schema**:
    ```json
    {
      "message": "string",
      "resume_id": "string",
      "jd_id": "string",
      "status": "PROCESSING | DONE",
      "task_id": "string | null",
      "estimated_seconds": "integer | null",
      "existing": "boolean | null"
    }
    ```
*   **Example Request**:
    ```http
    POST /api/v1/internship/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b/compare/b78b663b-64ee-48ba-b7e5-1a2eb75b0726 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: application/json

    {
      "force_rerun": false
    }
    ```
*   **Example Response**:
    ```json
    {
      "message": "Comparison started",
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "task_id": "893cfa2b-d352-47d0-8f96-df305d21bfa6",
      "status": "PROCESSING",
      "estimated_seconds": 30
    }
    ```

---

### 6.7. Get Internship ATS Comparison Result
*   **URL**: `/api/v1/internship/{jd_id}/result/{resume_id}`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer). Must be owner of the resume, `HR` or `ADMIN`.
*   **Request Schema**: None. Path parameters: `jd_id` (string), `resume_id` (string).
*   **Response Schema (`InternshipATSResponse`)**:
    *   `resume_id` (string): Resume UUID.
    *   `jd_id` (string): Position JD UUID.
    *   `overall_score` (number): Unified matching score.
    *   `score_band` (string): Rating band tag (`STRONG`, `GOOD`, `FAIR`, `WEAK`).
    *   `dimensions` (array of objects): Dimension scoring breakdown.
        *   `dimension` (string): Scoring dimension name.
        *   `score` (number): Rating (0 to 100).
        *   `weight` (number): Dimension weight (0.0 to 1.0).
        *   `weighted_contribution` (number): Weight multiplied score.
        *   `explanation` (string): Descriptive comments details.
    *   `required_skills_analysis` (object): Required skills evaluation reports.
    *   `preferred_skills_analysis` (object): Preferred skills evaluation reports.
    *   `tool_match_analysis` (object): Tool match report results.
    *   `critical_gaps` (array of strings): High-priority missing skills checklist.
    *   `nice_to_have_gaps` (array of strings): Low-priority missing skills checklist.
    *   `action_items` (array of strings): Dynamic actionable correction plans checklist.
    *   `is_suspicious` (boolean): Fraud analysis warnings flag.
    *   `fraud_flags` (array of objects): Triggered security warnings checklist.
    *   `ai_confidence` (number): Score trust coefficient rating.
    *   `created_at` (string): Match datetime ISO string.
*   **Example Request**:
    ```http
    GET /api/v1/internship/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b/result/b78b663b-64ee-48ba-b7e5-1a2eb75b0726 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "overall_score": 82.5,
      "score_band": "GOOD",
      "dimensions": [
        {
          "dimension": "Required Skills Match",
          "score": 85.0,
          "weight": 0.4,
          "weighted_contribution": 34.0,
          "explanation": "Candidate matched 2 of 3 required skills."
        }
      ],
      "required_skills_analysis": {
        "matches": [
          { "target": "Python", "match": "Python", "score": 1.0 },
          { "target": "SQL", "match": "SQL", "score": 1.0 }
        ],
        "gaps": ["PyTorch"],
        "coverage": 0.66
      },
      "preferred_skills_analysis": {
        "matches": [
          { "target": "Git", "match": "Git", "score": 1.0 }
        ],
        "gaps": ["Docker", "FastAPI"],
        "coverage": 0.33
      },
      "tool_match_analysis": {
        "matches": [],
        "gaps": ["Jupyter Notebook", "Weights & Biases"]
      },
      "critical_gaps": ["PyTorch"],
      "nice_to_have_gaps": ["Docker", "FastAPI"],
      "action_items": [
        "Complete PyTorch basic course to bridge critical gaps.",
        "Deploy a FastAPI microservice on Docker."
      ],
      "is_suspicious": false,
      "fraud_flags": [],
      "ai_confidence": 0.88,
      "created_at": "2026-06-16T17:30:00Z"
    }
    ```

---

### 6.8. Get Ranked Candidates list for Internship
*   **URL**: `/api/v1/internship/{jd_id}/candidates`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None.
    *   *Path Parameter*: `jd_id` (string).
    *   *Query Parameters*:
        *   `min_score` (number, optional): Minimum ATS score. Defaults to `0.0`.
        *   `max_score` (number, optional): Maximum ATS score. Defaults to `100.0`.
        *   `hr_status` (string, optional): Funnel filter (e.g. `SHORTLISTED`, `REJECTED`, `PENDING`).
        *   `flagged_only` (boolean, optional): Defaults to `false`. Filter suspicious only.
        *   `limit` (integer, optional): Defaults to `50`.
        *   `offset` (integer, optional): Defaults to `0`.
*   **Response Schema (`CandidateRankingResponse`)**:
    *   `jd_id` (string): Position UUID.
    *   `jd_title` (string): Title of position.
    *   `total_applicants` (integer): Total applicants count.
    *   `ranked_candidates` (array of objects): Candidates sorted by matching score descending.
        *   `rank` (integer): Match list sequence rank position.
        *   `resume_id` (string): Resume UUID.
        *   `user_id` (string): User UUID.
        *   `user_name` (string | null): Candidate full name.
        *   `user_email` (string): Candidate email.
        *   `overall_score` (number): Unified matching score.
        *   `score_band` (string): Category rating band tag.
        *   `required_skill_match` (number): Core skills match ratio.
        *   "project_relevance" (number): Work project score.
        *   `is_suspicious` (boolean): Security warning indicator.
        *   `fraud_flag_count` (integer): Total warnings count.
        *   `ai_confidence` (number): Engine trust rating.
        *   `confidence_label` (string): Rating level label.
        *   `hr_status` (string): Candidate workflow stage.
        *   `applied_at` (string): Apply datetime ISO.
    *   `score_distribution` (object): Graph distribution analytics categorizations count.
        *   `STRONG` (integer), `GOOD` (integer), `FAIR` (integer), `WEAK` (integer).
*   **Example Request**:
    ```http
    GET /api/v1/internship/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b/candidates?min_score=60.0 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "jd_title": "Machine Learning Engineer Intern",
      "total_applicants": 1,
      "ranked_candidates": [
        {
          "rank": 1,
          "resume_id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
          "user_id": "fa123456-78c9-012d-3456-78c9012d3456",
          "user_name": "Arjun Kumar",
          "user_email": "arjun@example.com",
          "overall_score": 82.5,
          "score_band": "GOOD",
          "required_skill_match": 85.0,
          "project_relevance": 78.0,
          "is_suspicious": false,
          "fraud_flag_count": 0,
          "ai_confidence": 0.88,
          "confidence_label": "HIGH",
          "hr_status": "PENDING",
          "applied_at": "2026-06-16T12:00:00Z"
        }
      ],
      "score_distribution": {
        "STRONG": 0,
        "GOOD": 1,
        "FAIR": 0,
        "WEAK": 0
      }
    }
    ```

---

## 7. HR Operations Router (`/api/v1/hr`)

Global dashboard candidate pipelines management.

### 7.1. Get Recruitment Analytics
*   **URL**: `/api/v1/hr/analytics`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None.
*   **Response Schema (`HRAnalytics`)**:
    *   `total_active_jds` (integer): Total active jobs count.
    *   `total_candidates` (integer): Total resumes processed.
    *   `total_shortlisted` (integer): Total shortlisted applicants.
    *   `avg_ats_score` (number): Combined matching average.
    *   `applicants_by_day` (array of objects): Timeline analytical chart.
    *   `score_distribution` (object): Score band categorizations count.
    *   `top_skills_requested` (array of objects): Trending required skills count.
*   **Example Request**:
    ```http
    GET /api/v1/hr/analytics HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "total_active_jds": 3,
      "total_candidates": 15,
      "total_shortlisted": 4,
      "avg_ats_score": 71.2,
      "applicants_by_day": [],
      "score_distribution": {
        "STRONG": 2,
        "GOOD": 6,
        "FAIR": 5,
        "WEAK": 2
      },
      "top_skills_requested": []
    }
    ```

---

### 7.2. Get Global Candidate List
*   **URL**: `/api/v1/hr/candidates`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None.
    *   *Query Parameters*:
        *   `jd_id` (string, optional): Specific JD filter.
        *   `hr_status` (string, optional): Funnel stage filter.
        *   `min_score` (number, optional): Minimum ATS score. Defaults to `0.0`.
        *   `limit` (integer, optional): Defaults to `50`.
        *   `offset` (integer, optional): Defaults to `0`.
*   **Response Schema (`list[object]`)**:
    *   `id` (string): Resume UUID.
    *   `full_name` (string | null): Candidate full name.
    *   `email` (string): Email address.
    *   `overall_score` (number): Overall matching score.
    *   `score_band` (string): Scoring band tag.
    *   `hr_status` (string): Funnel stage code.
    *   `applied_at` (string): ISO datetime applied.
    *   `is_suspicious` (boolean): Fraud warning flag.
*   **Example Request**:
    ```http
    GET /api/v1/hr/candidates?hr_status=SHORTLISTED HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    [
      {
        "id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
        "full_name": "Arjun Kumar",
        "email": "arjun@example.com",
        "overall_score": 82.5,
        "score_band": "GOOD",
        "hr_status": "SHORTLISTED",
        "applied_at": "2026-06-16T12:00:00Z",
        "is_suspicious": false
      }
    ]
    ```

---

### 7.3. Get Candidate Evaluation Details
*   **URL**: `/api/v1/hr/candidate/{resume_id}`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None. Path parameter: `resume_id` (string).
*   **Response Schema**:
    *   `id` (string): Resume UUID.
    *   `full_name` (string | null): Candidate name.
    *   `email` (string | null): Email.
    *   `phone` (string | null): Phone.
    *   `resume_url` (string): S3 file path link.
    *   `current_status` (string): Processing stage status.
    *   `applied_at` (string): Apply datetime ISO.
    *   `ats_results` (array of objects):
        *   `jd_id` (string): Job posting UUID.
        *   `overall_score` (number): Matching score rating.
        *   `score_band` (string): Scoring band tag rating.
        *   `hr_status` (string): Current pipeline status.
*   **Example Request**:
    ```http
    GET /api/v1/hr/candidate/b78b663b-64ee-48ba-b7e5-1a2eb75b0726 HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "id": "b78b663b-64ee-48ba-b7e5-1a2eb75b0726",
      "full_name": "Arjun Kumar",
      "email": "arjun@example.com",
      "phone": "+919876543210",
      "resume_url": "/api/v1/resume/download/resumes/fa123456-78c9-012d-3456-78c9012d3456/b78b663b-64ee-48ba-b7e5-1a2eb75b0726.pdf",
      "current_status": "DONE",
      "applied_at": "2026-06-16T12:00:00Z",
      "ats_results": [
        {
          "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
          "overall_score": 82.5,
          "score_band": "GOOD",
          "hr_status": "SHORTLISTED"
        }
      ]
    }
    ```

---

### 7.4. Update Candidate Pipeline Status (Shortlist/Reject)
*   **URL**: `/api/v1/hr/candidate/{resume_id}/action`
*   **HTTP Method**: `POST`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema (`CandidateActionRequest`)**:
    *   `action` (string, required): One of: `SHORTLIST`, `REJECT`, `UNDO`.
    *   `jd_id` (string, optional): Specific Job position UUID.
    *   `notes` (string, optional): Processing assessment remarks notes text.
*   **Response Schema**:
    ```json
    {
      "message": "string"
    }
    ```
*   **Example Request**:
    ```http
    POST /api/v1/hr/candidate/b78b663b-64ee-48ba-b7e5-1a2eb75b0726/action HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: application/json

    {
      "action": "SHORTLIST",
      "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "notes": "Excellent Python background and clean code practices."
    }
    ```
*   **Example Response**:
    ```json
    {
      "message": "Candidate marked as SHORTLISTED"
    }
    ```

---

### 7.5. Get JD Funnel Analytics
*   **URL**: `/api/v1/hr/funnel/{jd_id}`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None. Path parameter: `jd_id` (string).
*   **Response Schema**:
    *   `jd_id` (string): Position UUID.
    *   `stages` (array of objects):
        *   `name` (string): Stage name (`Applied`, `Shortlisted`, `Rejected`).
        *   `count` (integer): Total candidates.
        *   `color` (string): HEX layout color format.
*   **Example Request**:
    ```http
    GET /api/v1/hr/funnel/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "jd_id": "e9324d67-8bfd-46d5-a83f-8012e1ff9e2b",
      "stages": [
        { "name": "Applied", "count": 1, "color": "#6366f1" },
        { "name": "Shortlisted", "count": 1, "color": "#10b981" },
        { "name": "Rejected", "count": 0, "color": "#ef4444" }
      ]
    }
    ```

---

### 7.6. Export Candidate List to CSV
*   **URL**: `/api/v1/hr/export/{jd_id}`
*   **HTTP Method**: `GET`
*   **Authentication Requirements**: Valid JWT Access Token (Bearer) + role must be `HR` or `ADMIN`.
*   **Request Schema**: None. Path parameter: `jd_id` (string).
*   **Response Schema**: File stream download (CSV format data, `text/csv` media type).
*   **Example Request**:
    ```http
    GET /api/v1/hr/export/e9324d67-8bfd-46d5-a83f-8012e1ff9e2b HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response Headers**:
    ```http
    HTTP/1.1 200 OK
    Content-Type: text/csv
    Content-Disposition: attachment; filename=candidates_e9324d67-8bfd-46d5-a83f-8012e1ff9e2b.csv
    ```
    *Response Stream Data Chunk*:
    ```csv
    Rank,Name,Email,Score,Band,Status,Applied At
    1,Arjun Kumar,arjun@example.com,82.5,GOOD,SHORTLISTED,2026-06-16 12:00
    ```
