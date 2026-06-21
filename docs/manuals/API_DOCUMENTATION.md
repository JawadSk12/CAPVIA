# API Reference Manual

This document provides a comprehensive reference of all REST API endpoints configured on the CAPVIA API gateway.

---

## 1. Global Headers & Responses

### Authentication Header
Most endpoints require a bearer JWT token:
```http
Authorization: Bearer <access_jwt_token_here>
```

### Standard Error Response Format (400, 401, 403, 422)
```json
{
  "detail": "Detailed explanation of the validation failure or permission denial."
}
```

---

## 2. Authentication APIs

### 1. Register Account
- **URL**: `/api/v1/auth/register`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "candidate@domain.com",
    "password": "SecurePassword123!",
    "full_name": "Applicant Name",
    "role": "STUDENT"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": "e30be906-8d6f-4d94-a159-450f38b0561e",
      "email": "candidate@domain.com",
      "full_name": "Applicant Name",
      "role": "STUDENT",
      "is_active": true
    }
    ```

### 2. Login (JWT Generation)
- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "candidate@domain.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns access token (expired in 30m) and sets secure, HTTP-only refresh token in cookie:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "token_type": "bearer",
      "user": {
        "id": "e30be906-8d6f-4d94-a159-450f38b0561e",
        "email": "candidate@domain.com",
        "role": "STUDENT"
      }
    }
    ```

### 3. Refresh Access Token
- **URL**: `/api/v1/auth/refresh`
- **Method**: `POST`
- **Authentication**: Cookie containing `refresh_token`
- **Responses**:
  - `200 OK`: Returns new access token and rotated refresh cookie.

---

## 3. Company & Team Management APIs

### 1. Create Company Profile
- **URL**: `/api/v1/companies`
- **Method**: `POST`
- **Authentication**: User role must be `HR` or `ADMIN`
- **Request Body**:
  ```json
  {
    "name": "Acme Software Corp",
    "industry": "Technology",
    "website_url": "https://acme.org"
  }
  ```

---

## 4. Internship Listings APIs

### 1. Publish Internship
- **URL**: `/api/v1/internships`
- **Method**: `POST`
- **Authentication**: HR role belonging to company
- **Request Body**:
  ```json
  {
    "title": "Backend Engineering Intern",
    "description": "FastAPI database developer challenge...",
    "required_skills": ["Python", "PostgreSQL", "Git"],
    "work_mode": "REMOTE",
    "openings": 2,
    "stipend_min": 15000,
    "stipend_max": 25000
  }
  ```

---

## 5. Candidate Applications APIs

### 1. Submit Application
- **URL**: `/api/v1/applications`
- **Method**: `POST`
- **Authentication**: Student Role
- **Request Body**:
  ```json
  {
    "vacancy_id": "025db931-1b9a-4c28-98bc-a8863f6a2fe0",
    "cover_letter": "I would love to apply for this backend internship...",
    "resume_url": "https://storage.googleapis.com/resumes/my_resume.pdf"
  }
  ```
- **Responses**:
  - `201 Created`: Returns Application object in `ATS_PENDING` status.

---

## 6. Microservice Webhooks Gateway Router

Endpoints for callback processing from external evaluation subsystems.

### 1. ATS Screening Completed Webhook
- **URL**: `/api/v1/gateway/webhooks/ats`
- **Method**: `POST`
- **Headers Required**: `X-CAPVIA-Signature` (HMAC header verification using ATS webhook secret)
- **Request Body**:
  ```json
  {
    "ats_resume_uuid": "e30be906-8d6f-4d94-a159-450f38b0561e",
    "ats_job_uuid": "025db931-1b9a-4c28-98bc-a8863f6a2fe0",
    "candidate_email": "john.doe@candidate.com",
    "overall_score": 85.00,
    "score_band": "Strong Match",
    "detected_role": "Python Backend Developer",
    "matched_skills": ["Python", "FastAPI"],
    "missing_skills": ["Docker"],
    "fraud_flags": []
  }
  ```

### 2. Simulation Completed Webhook
- **URL**: `/api/v1/gateway/webhooks/simulation`
- **Method**: `POST`
- **Headers Required**: `X-CAPVIA-Signature` (HMAC verification)
- **Request Body**:
  ```json
  {
    "attempt_id": 88029,
    "simulation_application_id": 1024,
    "total_score": 78.50,
    "recommendation": "HIRE",
    "cheating_risk_level": "LOW",
    "ai_dependency_score": 0.15,
    "round_scores": {
      "task1": 80.0,
      "task2": 77.0
    },
    "submitted_at": "2026-06-21T18:42:15Z"
  }
  ```

### 3. IntelliRecruit Video Interview Completed Webhook
- **URL**: `/api/v1/gateway/webhooks/interview`
- **Method**: `POST`
- **Headers Required**: `X-CAPVIA-Signature`
- **Request Body**:
  ```json
  {
    "session_id": "f83be906-8d6f-4d94-a159-450f38b0561e",
    "overall_answer_score_pct": 82,
    "overall_integrity_score": 95,
    "cheating_probability_pct": 5,
    "risk_level": "LOW",
    "recommendation": "Strong Hire",
    "video_url": "https://storage.capvia.com/interviews/v_f83.mp4",
    "strengths": ["Clear communication", "Algorithmic thinking"],
    "improvements": ["Needs structured summaries"],
    "proctoring_metrics": {
      "focus_percentage": 98,
      "look_away_count": 2,
      "head_stability_pct": 95,
      "head_movements_count": 10,
      "face_visibility_pct": 100,
      "face_absences_count": 0,
      "multi_face_events": 0,
      "phone_detections_count": 0,
      "tab_switches": 1,
      "copy_pastes": 0,
      "suspicious_keys": 0
    }
  }
  ```

---

## 7. Recruiter Intelligence Reports

### 1. Compile Recruiter Dossier
- **URL**: `/api/v1/reports/{application_id}/generate`
- **Method**: `POST`
- **Authentication**: HR role belonging to the internship company
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": "770be906-8d6f-4d94-a159-450f38b0561e",
      "application_id": "a90be906-8d6f-4d94-a159-450f38b0561e",
      "summary": "AI-generated profile summary details...",
      "strengths": ["FastAPI", "High trust index"],
      "weaknesses": ["Docker skills"],
      "recommendations": ["Strong Hire"],
      "pdf_url": "/api/v1/reports/a90be906-8d6f-4d94-a159-450f38b0561e/download"
    }
    ```

### 2. Download Compiled PDF Dossier
- **URL**: `/api/v1/reports/{application_id}/download`
- **Method**: `GET`
- **Authentication**: HR role belonging to company
- **Responses**:
  - `200 OK`: Returns the PDF file stream (`application/pdf`) with `Content-Disposition: attachment; filename="CandidateName_Dossier_v1.pdf"`.
