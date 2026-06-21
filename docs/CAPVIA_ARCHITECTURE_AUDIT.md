# CAPVIA Integration Architecture Audit
## Resume Screening, Coding Simulation, and AI Video Interview Subsystems

This document presents a comprehensive architectural audit of the integration contract and technical API specifications for the **CAPVIA Platform** and its three subsystems:
1. **CAPVIA ATS (Applicant Tracking System)**
2. **AssessAI (Coding Simulation Platform)**
3. **IntelliRecruit (AI Video Interview Engine)**

---

## Executive Summary

The unified sequential screening pipeline is conceptually sound, but the current technical specifications contain **several critical integration blockers, security vulnerabilities, and database schema conflicts** that will prevent a successful end-to-end implementation. 

### Key Findings:
* **Critical Security Risk**: The client-side local kiosk UI is designed to use a master static API key (`X-CAPVIA-API-Key: capvia_live_xxxxxxxx`), exposing full admin access to candidates.
* **Identity Sync Blocker**: The Simulation Engine utilizes integer IDs for users/candidates, while CAPVIA Core and the ATS use UUIDs. No mapping exists to tie candidate UUIDs to Simulation integer IDs.
* **State Synchronization Blocker**: The Simulation Engine has no mechanism to store or map CAPVIA's `application_id` (UUID), making webhook callbacks anonymous to CAPVIA Core.
* **API Schema Mismatch**: The request schema for registering a candidate in the Simulation Engine mismatch entirely (expecting cover letter/resume URL vs candidate details and technical skills).
* **Database Syntax Errors**: The proposed PostgreSQL mappings table contains invalid syntax (`ON UPDATE CURRENT_TIMESTAMP`) and redundant/inconsistent columns.

---

## 1. API Compatibility & Request/Response Mappings

### 1.1. Simulation Registration Payload Mismatch (`POST /api/v1/internships/{internship_id}/apply`)
* **Conflict**: In the **Integration Contract (Section 4.1)**, CAPVIA Core is expected to register candidates qualifying from ATS to Simulation using:
  ```json
  {
    "candidate_id": 2510,
    "email": "candidate@example.com",
    "full_name": "Arjun Kumar",
    "skills_from_resume": ["Python", "SQL"]
  }
  ```
  However, in **`SIMULATION_API_SPEC.md` (Section 6.1)**, this endpoint is a *candidate-facing application submission* requiring the **Candidate Bearer JWT** and expecting:
  ```json
  {
    "cover_letter": "string (optional)",
    "resume_url": "string (optional)"
  }
  ```
* **Impact**: **Severe Blocker.** CAPVIA Core cannot register the candidate under the current spec because the schema does not accept candidate profile data, and it expects Candidate JWT authentication rather than System JWT.

### 1.2. Simulation Submit Response Schema Mismatch (`POST /api/v1/attempts/{attempt_id}/submit`)
* **Conflict**: The **Integration Contract (Section 4.2)** assumes the output of this submission includes `role_name` and `skills_assessed` to initialize the video interview:
  ```json
  {
    "attempt_id": 42,
    "status": "submitted",
    "total_score": 85.5,
    "role_name": "Backend Developer",
    "skills_assessed": ["Python", "FastAPI", "Database Indexing"]
  }
  ```
  However, **`SIMULATION_API_SPEC.md` (Section 6.8)** returns only a subset:
  ```json
  {
    "status": "submitted",
    "total_score": 88.4,
    "recommendation": "hire",
    "cheating_risk_level": "LOW"
  }
  ```
* **Impact**: **Integration Gap.** CAPVIA Core will lack the taxonomic details (`role_name` and `skills_assessed`) needed to start the video interview session.

### 1.3. Path Parameter Naming Mismatch
* **Conflict**: In **Integration Contract (Section 3, Sequence 2.2)**, the start endpoint is listed as `POST /api/v1/applications/{app_id}/start-simulation`.
* **In Spec**: In **`SIMULATION_API_SPEC.md` (Section 6.4)**, it is defined as `POST /api/v1/applications/{application_id}/start-simulation`.
* **Impact**: Code generation or route mapping inconsistencies.

---

## 2. Data Ownership & Database Design

### 2.1. Candidate Identity Sync (UUID vs. Integer)
* **Conflict**: 
  * CAPVIA Core and ATS use **UUIDs** for candidates.
  * The Simulation Engine (AssessAI) uses **Integers** (e.g., `"user": {"id": 1, ...}`).
* **Impact**: **Severe Blocker.** The central database mappings table does not include a `candidate_id` mapping. CAPVIA Core cannot resolve which Simulation candidate ID corresponds to its central Candidate UUID.

### 2.2. Vacancy to Internship ID Mapping
* **Conflict**: CAPVIA Core uses `vacancy_id` (UUID) to identify job postings, while AssessAI uses `internship_id` (Integer).
* **Impact**: **Design Gap.** The database schema lacks a `vacancy_mappings` table. CAPVIA Core cannot programmatically translate `vacancy_id` (UUID) to the Simulation Engine's `internship_id` (Integer) to call `/api/v1/internships/{internship_id}/apply`.

### 2.3. Redundant and Inconsistent Reference Fields
* **Conflict**: The Central DB mapping schema contains duplicate foreign keys across tables:
  * `applications` table references: `ats_resume_id`, `simulation_attempt_id`, `interview_session_id`.
  * `application_mappings` table references: `ats_resume_uuid`, `simulation_attempt_id`, `interview_session_uuid`.
* **Impact**: Design duplication, potential data drifts, and naming inconsistency (`_id` vs `_uuid`).

---

## 3. Authentication & Security Strategy

### 3.1. Master API Key Leakage in Client Kiosk UI
* **Conflict**: The system topology (Section 1) and Interview spec (Section 6) show that the **React Frontend (Client Kiosk)** makes requests directly to the API Gateway using the master API key:
  `X-CAPVIA-API-Key: capvia_live_xxxxxxxx`
* **Impact**: **Critical Security Risk.** Since the Kiosk React UI runs client-side on the candidate's browser, the master API key is easily accessible via DevTools or application decompilation, allowing candidates to spoof scores, retrieve other candidates' files, or compromise system data.
* **Resolution**: The client kiosk must use a short-lived Candidate JWT issued by CAPVIA Core, not a static admin API key.

### 3.2. Outbound JWT Role Mismatches
* **Conflict**: **Integration Contract (Section 7.1)** states CAPVIA Gateway signs requests using a JWT containing `roles: ["system_admin"]`.
* **In Specs**: ATS and Simulation specs strictly authorize roles like `STUDENT`, `HR`, `ADMIN` (ATS) or `candidate`, `hr` (Simulation). There is no provision for a system-level role.
* **Impact**: Calls made by CAPVIA Core to these backends will be rejected with `401 Unauthorized` or `403 Forbidden`.

---

## 4. Webhook Flows & Event Flow

### 4.1. Missing Webhook Configurations in Specifications
* **Conflict**: **Integration Contract (Section 5)** relies on three webhooks (`ATS_PROCESSED`, `SIMULATION_SUBMITTED`, `INTERVIEW_EVALUATED`). However, **none** of the individual specs (`ATS_API_SPEC.md`, `SIMULATION_API_SPEC.md`, `INTERVIEW_API_SPEC.md`) define webhook registration endpoints or environment parameters.
* **Impact**: No programmatic method to configure where the subsystems send webhooks.

### 4.2. Webhook State Synchronization Gap
* **Conflict**: The `SIMULATION_SUBMITTED` webhook includes `application_id` (UUID). However, the Simulation Engine:
  1. Does not receive `application_id` during candidate registration (`/apply`).
  2. Does not capture `application_id` when candidates start attempts.
  3. Lacks any database column to store this UUID.
* **Impact**: **State Corruption.** The Simulation Engine cannot send back the correct `application_id` in its webhook payload. Furthermore, because `start-simulation` is a client-to-subsystem direct call, CAPVIA Core does not know the `attempt_id` and cannot pre-map it.

---

## 5. Database Design & PostgreSQL Syntax Conflicts

### 5.1. PostgreSQL Trigger Syntax Error
* **Conflict**: **Integration Contract (Section 6.2)** proposes this schema for PostgreSQL:
  ```sql
  CREATE TABLE application_mappings (
      ...
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  ```
* **Impact**: **Syntax Error.** PostgreSQL does not natively support `ON UPDATE CURRENT_TIMESTAMP`. This will fail to run and crash database migration scripts.
* **Resolution**: Use a PostgreSQL trigger function to handle automated updates:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_application_mappings_modtime
      BEFORE UPDATE ON application_mappings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  ```

---

## 6. Failure Modes, Retries & Fallbacks

### 6.1. Missing Fallback Fields in Video Completion API
* **Conflict**: In **Integration Contract (Section 8.2)**, if the Evaluation Server (Port 8765) is down during interview submission, the Kiosk React client calculates scores locally and flags the result as `baselined_locally`.
* **In Spec**: In **`INTERVIEW_API_SPEC.md` (Section 6.3)**, the completion API (`POST /api/v1/interview/complete`) expects only `session_id`, `video_file`, and `local_violations_json` inside the multipart payload. It **does not** accept any local evaluation scores or a `baselined_locally` flag.
* **Impact**: **Data Loss.** Local baseline evaluation results generated during outages cannot be persisted on the server.

---

## 7. Webhook vs. Result Schema Naming Inconsistencies

### 7.1. Video Interview Metric Discrepancies
* **Conflict**: The metrics returned by the `INTERVIEW_EVALUATED` webhook mismatch the naming conventions of the `/interview/result/{application_id}` GET endpoint:
  
  | Webhook Field (Section 5.3) | GET Result Field (Section 6.5) | Type Mismatch |
  | :--- | :--- | :--- |
  | `overall_answer_score` | `overall_answer_score_pct` | Float vs. Integer |
  | `cheating_probability` | `cheating_probability_pct` | Float vs. Integer |

* **Impact**: Duplicated deserialization logic and parsing errors.

---

## Summary of Action Items

| Priority | Issue / Area | Recommendation |
| :--- | :--- | :--- |
| **CRITICAL** | Security (Master API Key) | Replace `X-CAPVIA-API-Key` in Client Kiosk with short-lived Candidate JWTs. |
| **CRITICAL** | Auth Integration | Add System JWT configuration to ATS and Simulation Engine auth configurations. |
| **CRITICAL** | Candidate ID Mismatches | Create a `candidate_mappings` table to map UUIDs to Simulation Integer IDs. |
| **CRITICAL** | Webhook Sync | Update Simulation `/apply` endpoint to accept and store CAPVIA `application_id` (UUID). |
| **HIGH** | Database SQL | Rewrite `ON UPDATE` SQL trigger for PostgreSQL compatibility. |
| **HIGH** | Simulation Submit Schema | Add `role_name` and `skills_assessed` to `/attempts/{attempt_id}/submit` response. |
| **MEDIUM** | Parameter Naming | Align `{app_id}` in Contract with `{application_id}` in Simulation Spec. |
| **MEDIUM** | Fallback Payload | Add local evaluation fields and `baselined_locally` flag to `/interview/complete`. |
| **LOW** | Metric Names | Align `overall_answer_score` and `cheating_probability` naming across endpoints. |
