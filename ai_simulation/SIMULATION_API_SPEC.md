# AssessAI (AI Simulation Platform) — API Specification

This document contains the complete API specification for the AssessAI platform backend. All REST endpoints are prefixed with the base path specified by `API_V1_STR` (default is `/api/v1`).

---

## Table of Contents
1. [General Information](#general-information)
2. [Global / Root Endpoints](#global--root-endpoints)
3. [System Health Check Router](#system-health-check-router)
4. [Authentication Router](#authentication-router)
5. [Internships Router](#internships-router)
6. [Applications & Simulations Router](#applications--simulations-router)
7. [Direct Assessment Sessions Router](#direct-assessment-sessions-router)
8. [Questions Router](#questions-router)
9. [Submissions Router](#submissions-router)
10. [Evaluations Router](#evaluations-router)
11. [Admin Analytics Router](#admin-analytics-router)
12. [Simulations Router](#simulations-router)
13. [WebSocket Proctoring & Telemetry Router](#websocket-proctoring--telemetry-router)

---

## General Information

*   **API Base Path**: `/api/v1`
*   **Authentication Type**: JSON Web Token (JWT) Bearer Token (`Authorization: Bearer <token>`)
*   **Response Content Type**: `application/json`

---

## Global / Root Endpoints

### 1. Root Status
*   **URL**: `/`
*   **Method**: `GET`
*   **Authentication**: None
*   **Description**: Returns basic application and version details to verify that the server is running.
*   **Request Schema**: None
*   **Response Schema**:
    *   `name`: (string) Project name
    *   `version`: (string) Current version
    *   `status`: (string) Running status
    *   `docs`: (string) Endpoint path to the OpenAPI/Swagger docs
*   **Example Request**:
    ```http
    GET / HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "name": "AI Simulation Engine",
      "version": "1.0.0",
      "status": "running",
      "docs": "/api/v1/docs"
    }
    ```

---

## System Health Check Router
**Prefix**: `/api/v1/health`

### 1. Basic Health Check
*   **URL**: `/api/v1/health/`
*   **Method**: `GET`
*   **Authentication**: None
*   **Description**: Simple status check used for load balancers or uptime monitoring.
*   **Request Schema**: None
*   **Response Schema**:
    *   `status`: (string) "healthy"
    *   `timestamp`: (string) ISO UTC timestamp
    *   `version`: (string) Project version
    *   `environment`: (string) Environment name (e.g. development, production)
*   **Example Request**:
    ```http
    GET /api/v1/health/ HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-06-16T11:42:04.123456",
      "version": "1.0.0",
      "environment": "development"
    }
    ```

### 2. Detailed Health Check
*   **URL**: `/api/v1/health/detailed`
*   **Method**: `GET`
*   **Authentication**: None
*   **Description**: Comprehensive system metrics diagnostic, showing CPU, Memory, Disk space, database state, and background services connectivity.
*   **Request Schema**: None
*   **Response Schema**:
    *   `status`: (string) "healthy" | "degraded"
    *   `timestamp`: (string) ISO UTC timestamp
    *   `version`: (string) Project version
    *   `environment`: (string) Environment name
    *   `services`: (object) Database, Redis, and Celery status
    *   `system`: (object) CPU percent, memory usage (MB/percent), and disk usage (GB/percent)
    *   `process`: (object) Process ID and thread count
*   **Example Request**:
    ```http
    GET /api/v1/health/detailed HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-06-16T11:42:04.123456",
      "version": "1.0.0",
      "environment": "development",
      "services": {
        "database": "healthy",
        "redis": "healthy",
        "celery": "healthy"
      },
      "system": {
        "cpu_percent": 12.5,
        "memory_percent": 64.2,
        "memory_available_mb": 2845.5,
        "disk_percent": 45.1,
        "disk_free_gb": 118.2
      },
      "process": {
        "pid": 90747,
        "threads": 4
      }
    }
    ```

---

## Authentication Router
**Prefix**: `/api/v1/auth`

### 1. Register HR
*   **URL**: `/api/v1/auth/register/hr`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Registers a new HR/recruiting user, auto-verifies them (in dev mode), and automatically creates a workspace Company entity.
*   **Request Schema** (`HRRegister`):
    *   `email`: (string/email, required) User email address
    *   `password`: (string, required, min_length=8) Account password
    *   `full_name`: (string, required) HR user's name
    *   `company_name`: (string, required) Name of the company/employer
    *   `position`: (string, optional) Job position (e.g. Talent Acquisition lead)
    *   `phone`: (string, optional) Contact number
*   **Response Schema** (`TokenResponse`):
    *   `access_token`: (string) JWT access token
    *   `refresh_token`: (string) JWT refresh token
    *   `token_type`: (string) "bearer"
    *   `user`: (object) Full user record details
*   **Example Request**:
    ```http
    POST /api/v1/auth/register/hr HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "email": "hr@capvia.ai",
      "password": "SecurePassword123!",
      "full_name": "Jane Doe",
      "company_name": "Capvia AI",
      "position": "Lead Recruiter",
      "phone": "+1234567890"
    }
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "user": {
        "id": 1,
        "email": "hr@capvia.ai",
        "username": "hr_hr",
        "full_name": "Jane Doe",
        "role": "hr",
        "status": "active",
        "is_active": true,
        "is_verified": true,
        "organization": "Capvia AI",
        "position": "Lead Recruiter",
        "phone": "+1234567890",
        "skills": [],
        "created_at": "2026-06-16T11:42:04"
      }
    }
    ```

### 2. Register Candidate
*   **URL**: `/api/v1/auth/register/candidate`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Registers a new candidate looking to apply for internships or take assessments.
*   **Request Schema** (`CandidateRegister`):
    *   `email`: (string/email, required) Candidate email
    *   `password`: (string, required, min_length=8) Account password
    *   `full_name`: (string, required) Candidate's full name
    *   `skills`: (array of strings, optional) List of technical skills
    *   `linkedin_url`: (string, optional) LinkedIn URL
    *   `years_of_experience`: (string, optional) e.g., "2 years"
*   **Response Schema** (`TokenResponse`): Same as Register HR, with user role set to `candidate`.
*   **Example Request**:
    ```http
    POST /api/v1/auth/register/candidate HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "email": "candidate@gmail.com",
      "password": "Password123!",
      "full_name": "John Smith",
      "skills": ["Python", "FastAPI", "React"],
      "linkedin_url": "https://linkedin.com/in/johnsmith",
      "years_of_experience": "1.5"
    }
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "user": {
        "id": 2,
        "email": "candidate@gmail.com",
        "username": "candidate",
        "full_name": "John Smith",
        "role": "candidate",
        "status": "active",
        "is_active": true,
        "is_verified": true,
        "skills": ["Python", "FastAPI", "React"],
        "linkedin_url": "https://linkedin.com/in/johnsmith",
        "years_of_experience": "1.5",
        "created_at": "2026-06-16T11:42:04"
      }
    }
    ```

### 3. Verify Email
*   **URL**: `/api/v1/auth/verify-email`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Validates candidate/HR email verification token.
*   **Request Schema** (`VerifyEmailRequest`):
    *   `token`: (string, required) Verification token sent by email.
*   **Response Schema**:
    *   `message`: (string) Success validation message.
*   **Example Request**:
    ```http
    POST /api/v1/auth/verify-email HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "token": "U0BfM1k2bHRfM2RmNGdfdGVzdF90b2tlbg=="
    }
    ```
*   **Example Response**:
    ```json
    {
      "message": "Email verified successfully"
    }
    ```

### 4. Forgot Password
*   **URL**: `/api/v1/auth/forgot-password`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Requests password reset link. Emits reset token via logging system (in development). Always returns success to prevent email enumeration.
*   **Request Schema** (`ForgotPasswordRequest`):
    *   `email`: (string/email, required) Candidate or HR registered email.
*   **Response Schema**:
    *   `message`: (string) Action receipt message.
*   **Example Request**:
    ```http
    POST /api/v1/auth/forgot-password HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "email": "hr@capvia.ai"
    }
    ```
*   **Example Response**:
    ```json
    {
      "message": "If that email exists, a reset link has been sent."
    }
    ```

### 5. Reset Password
*   **URL**: `/api/v1/auth/reset-password`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Resets password using token received from `forgot-password`.
*   **Request Schema** (`ResetPasswordRequest`):
    *   `token`: (string, required) Reset token.
    *   `new_password`: (string, required, min_length=8) New password.
*   **Response Schema**:
    *   `message`: (string) Confirmation message.
*   **Example Request**:
    ```http
    POST /api/v1/auth/reset-password HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "token": "reset-token-example",
      "new_password": "NewSecretPassword123!"
    }
    ```
*   **Example Response**:
    ```json
    {
      "message": "Password reset successfully"
    }
    ```

### 6. User Login
*   **URL**: `/api/v1/auth/login`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Authenticates credential payload and returns active JWT Bearer tokens.
*   **Request Schema** (`UserLogin`):
    *   `email`: (string/email, required) Account email.
    *   `password`: (string, required) Password.
*   **Response Schema** (`TokenResponse`): Same as Register HR response schema.
*   **Example Request**:
    ```http
    POST /api/v1/auth/login HTTP/1.1
    Host: localhost:8000
    Content-Type: application/json

    {
      "email": "hr@capvia.ai",
      "password": "SecurePassword123!"
    }
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "user": {
        "id": 1,
        "email": "hr@capvia.ai",
        "username": "hr_hr",
        "full_name": "Jane Doe",
        "role": "hr",
        "status": "active",
        "is_active": true,
        "is_verified": true,
        "organization": "Capvia AI",
        "position": "Lead Recruiter",
        "phone": "+1234567890",
        "created_at": "2026-06-16T11:42:04"
      }
    }
    ```

### 7. Token Refresh
*   **URL**: `/api/v1/auth/refresh`
*   **Method**: `POST`
*   **Authentication**: None (Requires the `refresh_token` string sent as query parameter)
*   **Description**: Grants a fresh access token using a valid, non-expired refresh token.
*   **Request Schema**: Query Parameter:
    *   `refresh_token`: (string, required) JWT Refresh token.
*   **Response Schema** (`TokenResponse`): Fresh tokens and user object details.
*   **Example Request**:
    ```http
    POST /api/v1/auth/refresh?refresh_token=eyJhbGciOiJIUzI1... HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    {
      "access_token": "new-access-token-string",
      "refresh_token": "new-refresh-token-string",
      "token_type": "bearer",
      "user": {
        "id": 1,
        "email": "hr@capvia.ai",
        "role": "hr",
        "is_active": true,
        "is_verified": true,
        "created_at": "2026-06-16T11:42:04"
      }
    }
    ```

### 8. Fetch Self Profile ("Me")
*   **URL**: `/api/v1/auth/me`
*   **Method**: `GET`
*   **Authentication**: Active User (Bearer token)
*   **Description**: Fetches the currently authenticated profile information.
*   **Request Schema**: None
*   **Response Schema** (`UserResponse`): Same as Register HR user details object.
*   **Example Request**:
    ```http
    GET /api/v1/auth/me HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```
*   **Example Response**:
    ```json
    {
      "id": 1,
      "email": "hr@capvia.ai",
      "username": "hr_hr",
      "full_name": "Jane Doe",
      "role": "hr",
      "status": "active",
      "is_active": true,
      "is_verified": true,
      "organization": "Capvia AI",
      "position": "Lead Recruiter",
      "phone": "+1234567890",
      "created_at": "2026-06-16T11:42:04"
    }
    ```

### 9. Create User (Legacy Register)
*   **URL**: `/api/v1/auth/register`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Legacy signup endpoint to create a generic user record.
*   **Request Schema** (`UserCreate`):
    *   `email`: (string/email, required) User email.
    *   `password`: (string, required, min_length=8) Password.
    *   `role`: (string/UserRole, optional, default="candidate") candidate | hr | admin
    *   `full_name`: (string, optional) User full name.
    *   `username`: (string, optional) Username.
*   **Response Schema** (`UserResponse`): Same as user response.

---

## Internships Router
**Prefix**: `/api/v1/internships`

### 1. Create Internship
*   **URL**: `/api/v1/internships/`
*   **Method**: `POST`
*   **Authentication**: HR Role required (Bearer token)
*   **Description**: Registers an internship listing. The platform runs a role understanding NLP engine to classify taxonomic capabilities and auto-generates assessment simulation blueprints if enabled.
*   **Request Schema** (`InternshipCreate`):
    *   `title`: (string, required, min_length=3) Internship title.
    *   `description`: (string, optional) Role overview.
    *   `responsibilities`: (string, optional) Daily tasks list.
    *   `requirements`: (string, optional) Candidate requirements.
    *   `required_skills`: (array of strings, optional) e.g., ["Python", "Pandas"].
    *   `technologies`: (array of strings, optional) e.g., ["FastAPI", "Postgres"].
    *   `preferred_qualifications`: (string, optional) Preferred criteria.
    *   `stipend_min`: (integer, optional) Minimum stipend.
    *   `stipend_max`: (integer, optional) Maximum stipend.
    *   `stipend_currency`: (string, default="INR") Currency code.
    *   `duration_months`: (integer, optional) Duration length.
    *   `location`: (string, optional) Location name.
    *   `work_mode`: (string/enum, default="remote") remote | onsite | hybrid
    *   `openings`: (integer, default=1) Number of positions.
    *   `deadline`: (string, optional) Submission deadline date.
    *   `simulation_enabled`: (boolean, default=false) Auto-synthesize an AI coding evaluation attempt.
    *   `tags`: (array of strings, optional) Topic classification tags.
    *   `perks`: (array of strings, optional) Benefits (e.g. Certificate, Remote).
*   **Response Schema** (`InternshipResponse`):
    *   `id`: (integer) Created internship ID.
    *   `title`: (string) Internship title.
    *   `company_id`: (integer) Assigned company ID.
    *   `created_by`: (integer) Author user ID.
    *   `applications_count`: (integer) Total candidate applications count.
    *   `status`: (string) "active" | "closed"
    *   `detected_role`: (string) NLP parsed taxonomic role name.
    *   `detected_specialization`: (string) Core specialization keywords.
    *   `role_confidence`: (float) AI model classifier score.
    *   `company`: (object) Basic company info representation.
    *   *Includes all creation parameters properties.*
*   **Example Request**:
    ```http
    POST /api/v1/internships/ HTTP/1.1
    Host: localhost:8000
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    Content-Type: application/json

    {
      "title": "Backend Engineering Intern",
      "description": "Looking for FastAPI enthusiast.",
      "responsibilities": "Develop backend endpoints, write SQL models.",
      "requirements": "Strong python knowledge, sql basis.",
      "required_skills": ["Python", "FastAPI"],
      "technologies": ["PostgreSQL", "Docker"],
      "stipend_min": 15000,
      "stipend_max": 25000,
      "duration_months": 6,
      "location": "Bengaluru",
      "work_mode": "remote",
      "openings": 2,
      "simulation_enabled": true
    }
    ```
*   **Example Response**:
    ```json
    {
      "id": 1,
      "title": "Backend Engineering Intern",
      "company_id": 1,
      "created_by": 1,
      "description": "Looking for FastAPI enthusiast.",
      "responsibilities": "Develop backend endpoints, write SQL models.",
      "requirements": "Strong python knowledge, sql basis.",
      "required_skills": ["Python", "FastAPI"],
      "technologies": ["PostgreSQL", "Docker"],
      "stipend_min": 15000,
      "stipend_max": 25000,
      "stipend_currency": "INR",
      "duration_months": 6,
      "location": "Bengaluru",
      "work_mode": "remote",
      "openings": 2,
      "applications_count": 0,
      "status": "active",
      "simulation_enabled": true,
      "detected_role": "Backend Developer",
      "detected_specialization": "FastAPI, PostgreSQL",
      "role_confidence": 0.95,
      "tags": [],
      "perks": [],
      "is_featured": false,
      "created_at": "2026-06-16T11:42:04.123456",
      "company": {
        "id": 1,
        "name": "Capvia AI",
        "logo_url": null,
        "industry": null,
        "headquarters": null
      }
    }
    ```

### 2. List Internships
*   **URL**: `/api/v1/internships/`
*   **Method**: `GET`
*   **Authentication**: Optional User (Bearer token)
*   **Description**: Returns internships. If called by HR, returns their created vacancies. If called by candidate/guest, returns all active internships.
*   **Request Schema**: Query Parameters:
    *   `skip`: (integer, default=0) Pagination skip.
    *   `limit`: (integer, default=20) Pagination limit.
    *   `status`: (string, optional) Filter by state (e.g. active).
    *   `search`: (string, optional) Text search filter matching titles.
*   **Response Schema**: `List[InternshipResponse]`
*   **Example Request**:
    ```http
    GET /api/v1/internships/?search=Backend HTTP/1.1
    Host: localhost:8000
    ```
*   **Example Response**:
    ```json
    [
      {
        "id": 1,
        "title": "Backend Engineering Intern",
        "company_id": 1,
        "status": "active"
      }
    ]
    ```

### 3. Fetch Single Internship
*   **URL**: `/api/v1/internships/{internship_id}`
*   **Method**: `GET`
*   **Authentication**: Optional User
*   **Description**: Retrieves detail structure of a specific internship.
*   **Request Schema**: Path Parameter:
    *   `internship_id`: (integer, required) Internship identifier.
*   **Response Schema**: `InternshipResponse`

### 4. Update Internship
*   **URL**: `/api/v1/internships/{internship_id}`
*   **Method**: `PUT`
*   **Authentication**: HR Role required (must own the internship)
*   **Description**: Modifies internship fields. Re-triggers taxonomy classification engines if core text description variables change.
*   **Request Schema** (`InternshipUpdate`): Same fields as `InternshipCreate` but all marked optional, plus:
    *   `status`: (string) "active" | "closed"
*   **Response Schema**: `InternshipResponse`

### 5. Fetch Internship Blueprint
*   **URL**: `/api/v1/internships/{internship_id}/blueprint`
*   **Method**: `GET`
*   **Authentication**: Active User (HR manager or candidate assigned to attempt it)
*   **Description**: Retrieves the generated test structure blueprint for candidates.
*   **Response Schema**:
    *   `blueprint_id`: (integer) ID of the blueprint.
    *   `role_name`: (string) Classified target role.
    *   `specialization`: (string) Target framework focus.
    *   `difficulty`: (string) "junior" | "mid" | "senior"
    *   `total_duration_minutes`: (integer) Time constraint.
    *   `total_tasks`: (integer) Number of questions.
    *   `rounds`: (array of objects) Multi-round structure configuration details.
    *   `round_weights`: (array of floats) Weight scoring factors.
    *   `keywords_detected`: (array of strings) Required capability keywords.

### 6. Force Simulation Generation
*   **URL**: `/api/v1/internships/{internship_id}/generate-simulation`
*   **Method**: `POST`
*   **Authentication**: HR Role required (must own the internship)
*   **Description**: Force-synthesizes a new blueprint metadata structure by wiping any old generated task structures.
*   **Response Schema**:
    *   `message`: (string) Status check.
    *   `blueprint_id`: (integer) New blueprint identifier.
    *   `role_detected`: (string) Classified candidate position.

### 7. Fetch Candidate Rankings
*   **URL**: `/api/v1/internships/{internship_id}/rankings`
*   **Method**: `GET`
*   **Authentication**: HR Role required (must own the internship)
*   **Description**: Returns a sorted leaderboard of candidates who completed the simulation, sorted by score.
*   **Response Schema**:
    *   `internship_id`: (integer) Internship ID.
    *   `total_candidates`: (integer) Candidates count.
    *   `rankings`: (array of objects) Rankings listing.
        *   `rank`: (integer) Position index (1-based).
        *   `candidate_id`: (integer) Candidate user ID.
        *   `candidate_name`: (string) Candidate full name.
        *   `total_score`: (float) Assessment score.
        *   `cheating_risk_level`: (string) "LOW" | "SUSPICIOUS" | "HIGH"
        *   `ai_dependency_score`: (float) Estimated AI code generation percent.
        *   `recommendation`: (string) Hiring recommendation decision.
*   **Example Response**:
    ```json
    {
      "internship_id": 1,
      "total_candidates": 1,
      "rankings": [
        {
          "rank": 1,
          "candidate_id": 2,
          "candidate_name": "John Smith",
          "candidate_email": "candidate@gmail.com",
          "total_score": 85.5,
          "round_scores": {"round_1": 90, "round_2": 80},
          "cheating_risk_level": "LOW",
          "ai_dependency_score": 0.12,
          "recommendation": "hire",
          "attempt_id": 42,
          "submitted_at": "2026-06-16T15:30:00"
        }
      ]
    }
    ```

---

## Applications & Simulations Router
**Prefix**: `/api/v1` (Inherited endpoints mapped on base URL)

### 1. Apply to Internship
*   **URL**: `/api/v1/internships/{internship_id}/apply`
*   **Method**: `POST`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Creates an application for a vacant internship.
*   **Request Schema** (`ApplicationCreate`):
    *   `cover_letter`: (string, optional) Application introduction.
    *   `resume_url`: (string, optional) Hosted resume file link.
*   **Response Schema** (`ApplicationResponse`):
    *   `id`: (integer) Application ID.
    *   `internship_id`: (integer) Internship ID.
    *   `candidate_id`: (integer) User identifier.
    *   `status`: (string) "applied" | "simulation_started" | "simulation_completed"
    *   `cover_letter`: (string) Stored cover letter.
    *   `resume_url`: (string) Resume reference path.
    *   `created_at`: (string) Timestamp.

### 2. List Self Applications
*   **URL**: `/api/v1/my-applications`
*   **Method**: `GET`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Lists all internship positions applied to by the caller candidate.
*   **Response Schema**: `List[ApplicationResponse]`

### 3. Fetch Applicants (HR view)
*   **URL**: `/api/v1/internships/{internship_id}/applications`
*   **Method**: `GET`
*   **Authentication**: Active User (HR Role)
*   **Description**: Retrieves applications and simulation status metrics for a specific vacancy.
*   **Response Schema**:
    *   `internship_id`: (integer) Target vacancy ID.
    *   `count`: (integer) Count.
    *   `applications`: (array) Applicants summary metadata entries.

### 4. Start Simulation Attempt
*   **URL**: `/api/v1/applications/{application_id}/start-simulation`
*   **Method**: `POST`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Starts a simulation attempt for an application, establishing expires timers. Resumes if already in progress.
*   **Response Schema** (`AttemptStartResponse`):
    *   `attempt_id`: (integer) Created attempt identifier.
    *   `access_token`: (string) Attempt-specific token for validation.
    *   `blueprint`: (object) Struct configuration parameters.
    *   `expires_at`: (string) Time limit deadline timestamp.
*   **Example Response**:
    ```json
    {
      "attempt_id": 42,
      "access_token": "secret_attempt_hash_value",
      "blueprint": {
        "rounds": [
          { "round_number": 1, "scoring_weight": 0.2, "tasks": [] }
        ],
        "total_duration_minutes": 60,
        "role_name": "Backend Developer"
      },
      "expires_at": "2026-06-16T18:08:29"
    }
    ```

### 5. Fetch Attempt Metadata
*   **URL**: `/api/v1/attempts/{attempt_id}`
*   **Method**: `GET`
*   **Authentication**: Active User (assigned candidate or company HR)
*   **Response Schema** (`AttemptResponse`): Full simulation attempt object.

### 6. Auto-Save Task Answer
*   **URL**: `/api/v1/attempts/{attempt_id}/answer`
*   **Method**: `POST`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Auto-saves a candidate's task progress (answers, code, or MCQs).
*   **Request Schema** (`AnswerSubmit`):
    *   `round_number`: (integer, required) Round number.
    *   `task_id`: (string, required) Task UUID or ID.
    *   `answer`: (string, optional) Open text answers.
    *   `code`: (string, optional) IDE editor code.
    *   `selected_option`: (string, optional) Selected option ID for MCQs.
*   **Response Schema**:
    *   `status`: (string) "saved"
    *   `round`: (integer) Current round.
    *   `task`: (string) Task ID.

### 7. Complete Simulation Round
*   **URL**: `/api/v1/attempts/{attempt_id}/complete-round`
*   **Method**: `POST`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Marks a specific round as completed and advances the candidate.
*   **Request Schema**: Query Parameters:
    *   `round_number`: (integer, required) The round index to finish.
*   **Response Schema**:
    *   `status`: (string) "round_completed"
    *   `next_round`: (integer) Incremented index.

### 8. Final Submit Attempt
*   **URL**: `/api/v1/attempts/{attempt_id}/submit`
*   **Method**: `POST`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Locks the simulation attempt, gathers behavioral proctoring logs, and triggers the AI Evaluation Engine.
*   **Response Schema**:
    *   `status`: (string) "submitted"
    *   `total_score`: (float) AI graded overall score.
    *   `recommendation`: (string) "strong_hire" | "hire" | "maybe" | "reject"
    *   `cheating_risk_level`: (string) "LOW" | "SUSPICIOUS" | "HIGH"
*   **Example Response**:
    ```json
    {
      "status": "submitted",
      "total_score": 88.4,
      "recommendation": "hire",
      "cheating_risk_level": "LOW"
    }
    ```

### 9. Log Behavior Proctoring Events
*   **URL**: `/api/v1/attempts/{attempt_id}/events`
*   **Method**: `POST`
*   **Authentication**: Candidate Role required (Bearer token)
*   **Description**: Sends client-side anti-cheat event logs (e.g. tab switching, copying, copy-pasting, window resizing).
*   **Request Schema**: Array of `BehaviorEvent` objects:
    *   `event_type`: (string, required) e.g., "tab_switch", "copy_paste".
    *   `timestamp`: (string, required) ISO time.
    *   `round_number`: (integer, optional) Active round.
    *   `task_index`: (integer, optional) Active task.
    *   `event_data`: (object, optional) Detailed coordinates/actions context.
    *   `severity`: (string, default="info") info | warning | high
*   **Response Schema**:
    *   `status`: (string) "logged"
    *   `count`: (integer) Number of events logged.

### 10. Fetch Candidate Evaluation Report
*   **URL**: `/api/v1/attempts/{attempt_id}/report`
*   **Method**: `GET`
*   **Authentication**: Active User (Candidate or HR)
*   **Description**: Returns AI evaluation feedback report, scoring dimensions, and suspicious events indicators.
*   **Response Schema**: Same as direct evaluations response metadata.

---

## Direct Assessment Sessions Router
**Prefix**: `/api/v1/sessions`

These endpoints are used for direct, code-based candidate testing outside the internship flow.

### 1. Create Session
*   **URL**: `/api/v1/sessions/`
*   **Method**: `POST`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema** (`SessionCreate`):
    *   `test_name`: (string, required) Title.
    *   `test_description`: (string, optional) Description.
    *   `role_being_tested`: (string, optional) Role.
    *   `duration_minutes`: (integer, default=60) Duration limit.
    *   `candidate_email`: (string/email, required) Candidate email.
    *   `candidate_name`: (string, optional) Candidate name.
    *   `question_ids`: (array of integers, required) Questions to include.
    *   `scheduled_start`: (string/datetime, optional) Time.
    *   `is_proctored`: (string, default="true") Proctoring active.
    *   `allow_code_execution`: (string, default="true") Enable execution.
*   **Response Schema** (`SessionResponse`): Full session metadata object.

### 2. Start Session (via Access Code)
*   **URL**: `/api/v1/sessions/start`
*   **Method**: `POST`
*   **Authentication**: None
*   **Description**: Accesses and opens a session using a 6-digit invitation access code.
*   **Request Schema** (`SessionStartRequest`):
    *   `access_code`: (string, required) 6-character access code.
*   **Response Schema** (`SessionDetailResponse`): Session object including loaded question details and remaining time.
*   **Example Response**:
    ```json
    {
      "id": 1,
      "session_token": "random_token_str",
      "access_code": "ACS123",
      "candidate_email": "candidate@gmail.com",
      "status": "in_progress",
      "questions": [
        { "id": 101, "title": "Reverse Array", "description": "Write code..." }
      ],
      "time_remaining_seconds": 3600
    }
    ```

### 3. Fetch Session Details
*   **URL**: `/api/v1/sessions/{session_id}`
*   **Method**: `GET`
*   **Authentication**: Active User (Admin or assigned Candidate)
*   **Response Schema** (`SessionDetailResponse`)

### 4. List Sessions
*   **URL**: `/api/v1/sessions/`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema** (`SessionListResponse`): Paginated sessions list.

### 5. Mark Session Completed
*   **URL**: `/api/v1/sessions/{session_id}/complete`
*   **Method**: `POST`
*   **Authentication**: Active User (Admin or candidate)
*   **Response Schema**: `SessionResponse`

### 6. List Candidate Sessions
*   **URL**: `/api/v1/sessions/candidate/my-sessions`
*   **Method**: `GET`
*   **Authentication**: Active User (Candidate)
*   **Response Schema**: `SessionListResponse`

### 7. Auto-Generate AI Session
*   **URL**: `/api/v1/sessions/generate`
*   **Method**: `POST`
*   **Authentication**: Optional Admin User (If omitted, runs as self-assignment)
*   **Request Schema**: Query Parameters:
    *   `candidate_email`: (string, required) Candidate email.
    *   `candidate_name`: (string, required) Candidate name.
    *   `role`: (string, required) Testing job role.
    *   `domain`: (string, default="general") Domain tag.
    *   `language`: (string, default="python") Coding language.
*   **Response Schema**: `SessionResponse`

---

## Questions Router
**Prefix**: `/api/v1/questions`

### 1. Create Question
*   **URL**: `/api/v1/questions/`
*   **Method**: `POST`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema** (`QuestionCreate`):
    *   `title`: (string, required) Title.
    *   `description`: (string, required) Description overview.
    *   `question_type`: (string/enum) coding | multiple_choice | subjective | debugging | scenario
    *   `difficulty`: (string/enum) easy | medium | hard
    *   `module_number`: (integer, range 1-5) Target simulation module.
    *   `category`: (string, optional) Category label.
    *   `starter_code`: (string, optional) Starting template code.
    *   `test_cases`: (array of objects, optional) Input/output test parameters.
    *   `correct_option`: (string, optional) Correct MCQ answer option.
*   **Response Schema** (`QuestionResponse`): Created question details.

### 2. List Questions
*   **URL**: `/api/v1/questions/`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema**: Query Parameters:
    *   `skip`: (integer, default=0) Skip.
    *   `limit`: (integer, default=100) Limit.
    *   `question_type`: (string, optional) Filter by type.
    *   `difficulty`: (string, optional) Filter by difficulty.
    *   `module_number`: (integer, optional) Filter by module.
*   **Response Schema**: `QuestionListResponse`

### 3. Fetch Question details (No solution)
*   **URL**: `/api/v1/questions/{question_id}`
*   **Method**: `GET`
*   **Authentication**: Active User
*   **Description**: Fetches question details. Safe for candidates (does not contain the solution).
*   **Response Schema**: `QuestionResponse`

### 4. Fetch Question with Solution
*   **URL**: `/api/v1/questions/{question_id}/solution`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Retrieves question details including solutions, correct choices, and evaluation criteria.
*   **Response Schema**: `QuestionWithSolution`

### 5. Update Question
*   **URL**: `/api/v1/questions/{question_id}`
*   **Method**: `PUT`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema** (`QuestionUpdate`): Fields to update.
*   **Response Schema**: `QuestionResponse`

### 6. Delete Question
*   **URL**: `/api/v1/questions/{question_id}`
*   **Method**: `DELETE`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response**: Status 204 (No Content)

### 7. AI Generate Custom Question
*   **URL**: `/api/v1/questions/generate`
*   **Method**: `POST`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema**: Query Parameters:
    *   `question_type`: (string/enum) coding | multiple_choice | subjective
    *   `role`: (string, required) Target role.
    *   `domain`: (string, default="general") Domain sector.
    *   `language`: (string, optional) Coding language.
    *   `difficulty`: (string, default="medium") easy | medium | hard
*   **Response Schema**: `QuestionResponse`

### 8. Activate / Deactivate Question
*   **URL**: `/api/v1/questions/{question_id}/activate` (or `/deactivate`)
*   **Method**: `POST`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema**: `QuestionResponse`

---

## Submissions Router
**Prefix**: `/api/v1/submissions`

Used for submitting answers to direct assessment sessions.

### 1. Submit Answer
*   **URL**: `/api/v1/submissions/`
*   **Method**: `POST`
*   **Authentication**: Active User (Bearer token)
*   **Description**: Submits an answer to a question. Automatically triggers evaluation in a Celery background task.
*   **Request Schema** (`SubmissionCreate`):
    *   `session_id`: (integer, required) Active session ID.
    *   `question_id`: (integer, required) Target question ID.
    *   `answer_text`: (string, optional) Subjective answer text.
    *   `code_answer`: (string, optional) Executable code script.
    *   `selected_option`: (string, optional) MCQ choice key.
    *   `explanation`: (string, optional) Candidate explanation.
    *   `time_spent_seconds`: (integer, optional) Time spent.
*   **Response Schema** (`SubmissionResponse`): Stored submission details.
*   **Example Response**:
    ```json
    {
      "id": 1,
      "session_id": 10,
      "question_id": 101,
      "submitted_at": "2026-06-16T11:42:04",
      "paste_count": 0,
      "copy_count": 0,
      "tab_switches": 0,
      "is_flagged": "false",
      "requires_manual_review": "false"
    }
    ```

### 2. Execute Code Sandbox
*   **URL**: `/api/v1/submissions/execute-code`
*   **Method**: `POST`
*   **Authentication**: Active User (Bearer token)
*   **Description**: Compiles and executes code against test cases in an isolated Docker container.
*   **Request Schema** (`CodeExecutionRequest`):
    *   `code`: (string, required) Script source.
    *   `language`: (string, required) python | javascript | java
    *   `test_cases`: (array, optional) Test inputs/outputs.
    *   `input_data`: (string, optional) Standard input.
*   **Response Schema** (`CodeExecutionResponse`):
    *   `status`: (string) "success" | "error" | "timeout"
    *   `output`: (string) Standard output logs.
    *   `error_message`: (string) Compilation / runtime error stack trace.
    *   `execution_time_ms`: (float) Time taken.
    *   `test_cases_passed`: (integer) Count.
    *   `test_cases_total`: (integer) Count.
*   **Example Request**:
    ```json
    {
      "code": "def solve(arr):\n    return arr[::-1]",
      "language": "python",
      "test_cases": [
        { "input": "[1, 2, 3]", "expected": "[3, 2, 1]" }
      ]
    }
    ```
*   **Example Response**:
    ```json
    {
      "status": "success",
      "output": "[3, 2, 1]",
      "execution_time_ms": 42.5,
      "test_cases_passed": 1,
      "test_cases_total": 1,
      "test_cases_results": [
        { "passed": true, "output": "[3, 2, 1]" }
      ]
    }
    ```

### 3. Log Session Behavioral Event
*   **URL**: `/api/v1/submissions/behavior-event`
*   **Method**: `POST`
*   **Authentication**: Active User (Bearer token)
*   **Request Schema** (`BehaviorEventCreate`):
    *   `session_id`: (integer, required) Session ID.
    *   `question_id`: (integer, optional) Question ID.
    *   `event_type`: (string, required) event name.
    *   `event_data`: (object, optional) Context logs.
    *   `severity`: (string) low | medium | high
    *   `description`: (string, optional) Description.
*   **Response Schema**: `{"status": "logged"}`

### 4. Fetch Submission Details
*   **URL**: `/api/v1/submissions/{submission_id}`
*   **Method**: `GET`
*   **Authentication**: Active User (assigned Candidate or Admin)
*   **Response Schema**: `SubmissionResponse`

### 5. Fetch Session Submissions
*   **URL**: `/api/v1/submissions/session/{session_id}`
*   **Method**: `GET`
*   **Authentication**: Active User (assigned Candidate or Admin)
*   **Response Schema**: `List[SubmissionResponse]`

---

## Evaluations Router
**Prefix**: `/api/v1/evaluations`

### 1. Trigger Session Evaluation
*   **URL**: `/api/v1/evaluations/session/{session_id}`
*   **Method**: `POST`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Evaluates all submissions in a session, compiles final scores, and grades accuracy, speed, and behavior.
*   **Response Schema**: `EvaluationResponse`

### 2. Fetch Session Evaluation
*   **URL**: `/api/v1/evaluations/session/{session_id}`
*   **Method**: `GET`
*   **Authentication**: Active User (assigned Candidate or Admin)
*   **Response Schema**: `EvaluationResponse`

### 3. Fetch Detailed Session Report
*   **URL**: `/api/v1/evaluations/session/{session_id}/report`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Generates and compiles a full candidate report with strengths, weaknesses, and hiring recommendations.
*   **Response Schema** (`FinalReportResponse`):
    *   `session_id`: (integer) Session ID.
    *   `candidate_name`: (string) Candidate name.
    *   `grade`: (string) Graded score band (e.g. A, B).
    *   `accuracy_score`: (float) Code accuracy.
    *   `cheating_risk_level`: (string) risk level.
    *   `strengths`: (array of strings) Strengths.
    *   `weaknesses`: (array of strings) Weaknesses.
    *   `recommendation`: (string) Hiring recommendation decision.
    *   `detailed_feedback`: (string) Detailed AI comments.

### 4. Fetch High-Risk Flagged Evaluations
*   **URL**: `/api/v1/evaluations/high-risk`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Retrieves evaluations with a high cheating risk level.
*   **Response Schema**: `List[EvaluationResponse]`

### 5. Fetch Evaluations by Recommendation
*   **URL**: `/api/v1/evaluations/recommendation/{recommendation}`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Retrieves candidate profiles matching a specific recommendation type.
*   **Request Schema**: Path Parameter:
    *   `recommendation`: (string, required) strong_hire | hire | maybe | reject
*   **Response Schema**: `List[EvaluationResponse]`

---

## Admin Analytics Router
**Prefix**: `/api/v1/admin`

Administrative metrics for system administrators.

### 1. Fetch Dashboard Stats
*   **URL**: `/api/v1/admin/dashboard`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Returns overall statistics (sessions, users, questions, evaluations).
*   **Response Schema**:
    *   `sessions`: (total, active, completed, recent_7_days)
    *   `users`: (total_candidates, total_admins)
    *   `questions`: (total, active)
    *   `evaluations`: (total, high_risk, high_risk_percentage)

### 2. Fetch Sessions Analytics
*   **URL**: `/api/v1/admin/analytics/sessions`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema**: Query Parameters:
    *   `days`: (integer, default=30) Period length.
*   **Response Schema**:
    *   `period_days`: (integer) Days analyzed.
    *   `total_sessions`: (integer) Total.
    *   `completion_rate`: (float) Completion rate percentage.
    *   `average_score`: (float) Average test score.
    *   `sessions_by_day`: (object) Map of date -> session count.

### 3. Fetch Performance Analytics
*   **URL**: `/api/v1/admin/analytics/performance`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema**:
    *   `total_evaluated`: (integer) Count.
    *   `average_scores`: (accuracy, logic, speed, explanation, behavior)
    *   `grade_distribution`: (object mapping grades to counts)
    *   `recommendation_distribution`: (object mapping recommendations to counts)

### 4. Fetch Flagged Sessions
*   **URL**: `/api/v1/admin/sessions/flagged`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema**: `List[object]` containing session information and cheating risk level metrics.

### 5. Fetch Questions Analytics
*   **URL**: `/api/v1/admin/questions/stats`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema**: Dict containing question counts by type, difficulty, module, and top 10 most used questions with average scores.

---

## Simulations Router
**Prefix**: `/api/v1/simulations`

Used by HR for role simulation assignments.

### 1. Fetch Available Roles
*   **URL**: `/api/v1/simulations/roles`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema**:
    *   `roles`: (array of objects) Available roles list.
    *   `total`: (integer) Count.

### 2. Fetch Role Round Info
*   **URL**: `/api/v1/simulations/roles/{role_key}/rounds`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Response Schema**:
    *   `role_key`: (string) Role identifier.
    *   `rounds`: (array of objects) Configuration parameters for each of the 5 simulation rounds.

### 3. Assign Role Simulation to Candidate
*   **URL**: `/api/v1/simulations/assign`
*   **Method**: `POST`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema** (`CreateSimulationRequest`):
    *   `role_key`: (string, required) Targeted role key (e.g. backend_developer).
    *   `candidate_email`: (string/email, required) Candidate email.
    *   `candidate_name`: (string, optional) Candidate name.
    *   `difficulty`: (string, default="mid") junior | mid | senior
*   **Response Schema** (`CreateSimulationResponse`):
    *   `session_id`: (integer) Created session ID.
    *   `access_code`: (string) Invitation code.
    *   `session_token`: (string) Session JWT.
    *   `instructions_url`: (string) Formatted URL path for candidate invitation email.
    *   *Includes session properties (difficulty, duration_minutes, rounds, questions).*
*   **Example Request**:
    ```json
    {
      "role_key": "backend_developer",
      "candidate_email": "candidate@gmail.com",
      "candidate_name": "John Smith",
      "difficulty": "mid"
    }
    ```
*   **Example Response**:
    ```json
    {
      "session_id": 12,
      "access_code": "XYZ987",
      "session_token": "secret_token_value",
      "candidate_email": "candidate@gmail.com",
      "role": "Backend Developer",
      "difficulty": "mid",
      "duration_minutes": 60,
      "total_rounds": 5,
      "total_questions": 5,
      "instructions_url": "/test/access?code=XYZ987"
    }
    ```

### 4. Fetch Session Questions (Admin View)
*   **URL**: `/api/v1/simulations/sessions/{session_id}/questions`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Description**: Retrieves session questions with solutions.
*   **Request Schema**: Query Parameters:
    *   `round_number`: (integer, optional) Filter by round.
*   **Response Schema**:
    *   `session_id`: (integer) Session ID.
    *   `questions`: (array of objects) Full question items with solutions.

### 5. Fetch Simulation Leaderboard
*   **URL**: `/api/v1/simulations/leaderboard`
*   **Method**: `GET`
*   **Authentication**: Admin Role required (Bearer token)
*   **Request Schema**: Query Parameters:
    *   `role_key`: (string, optional) Filter by role.
    *   `limit`: (integer, default=20) Top limit.
*   **Response Schema**:
    *   `leaderboard`: (array of objects) Ranked candidates.
    *   `total`: (integer) Count.

---

## WebSocket Proctoring & Telemetry Router
**Prefix**: `/api/v1/ws`

Uses WebSockets for real-time telemetry and proctoring.

### 1. Candidate Telemetry Stream
*   **URL**: `/api/v1/ws/candidate/{session_id}`
*   **Protocol**: `WebSocket`
*   **Authentication**: Query Parameter `token: str` (Valid Candidate access token)
*   **Description**: Receives behavioral telemetry logs and sends heartbeat confirmations from the candidate's browser.
*   **Data Messages**:
    *   `ping`: Client ping request.
        *   Format: `{"type": "ping"}`
        *   Server response: `{"type": "pong", "ts": "..."}`
    *   `telemetry`: Mouse coordinates/clicks snapshot payload.
        *   Format: `{"type": "telemetry", "payload": { ... }}`
    *   `behavioral_event`: Immediate suspicious event warning (e.g. copying text).
        *   Format: `{"type": "behavioral_event", "payload": { "event_type": "copy_paste", "severity": "warning" }}`
    *   `heartbeat`: Heartbeat.
        *   Format: `{"type": "heartbeat"}`

### 2. Admin Live Dashboard Stream
*   **URL**: `/api/v1/ws/admin`
*   **Protocol**: `WebSocket`
*   **Authentication**: Admin JWT session verification.
*   **Description**: Streams live candidate telemetry updates to HR dashboard clients.
*   **Data Messages**:
    *   On Connection: Sends full state snapshot.
        *   Format: `{"type": "snapshot", "active_sessions": [...], "telemetry": { ... }}`
    *   Telemetry Update: Broadcasted live candidate browser event updates.
        *   Format: `{"type": "telemetry_update", "session_id": ..., "data": { ... }}`
    *   Behavioral Alert: Broadcasted candidate anti-cheat alerts.
        *   Format: `{"type": "behavioral_alert", "session_id": ..., "event": { ... }}`
    *   Terminate Command: Sent by admin to force close a candidate session.
        *   Format: `{"type": "terminate_session", "session_id": ..., "reason": "..."}`
