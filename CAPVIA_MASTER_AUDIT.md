# CAPVIA Master Audit & Production Readiness Certification

This document presents a comprehensive platform-wide audit, database schema representation, API mapping, and readiness certification for the entire **CAPVIA Platform** and its integrations.

---

## 1. Sequential Architecture Diagram (Mermaid)

The diagram below details the end-to-end data and signal flow between CAPVIA Core, subsystems (ATS, Simulation, Interview), and the candidate client interfaces.

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    actor Recruiter
    participant Core as CAPVIA Core (FastAPI)
    participant ATS as ATS Subsystem
    participant Sim as AssessAI Subsystem
    participant IV as IntelliRecruit Subsystem
    
    %% Application Phase
    Candidate->>Core: Submit Application (Resume PDF + Letter)
    Note over Core: Status: APPLIED
    Core->>Core: Trigger Celery Task
    Core->>ATS: Upload Resume (System JWT)
    Note over Core: Status: ATS_PENDING
    ATS->>ATS: Parse & Compare against JD
    ATS-->>Core: Webhook (ATS_PROCESSED)
    Note over Core: Threshold Check: Score >= 60%
    Note over Core: Status: SIMULATION_INVITED
    
    %% Coding Simulation Phase
    Core->>Sim: Register Candidate (System JWT)
    Candidate->>Sim: Initialize Attempt (Candidate JWT)
    Note over Core: Status: SIMULATION_IN_PROGRESS
    Sim->>Core: Sync Attempt ID (Candidate JWT)
    Candidate->>Sim: Submit Coding Answers
    Sim-->>Core: Webhook (SIMULATION_SUBMITTED)
    Note over Core: Threshold Check: Score >= 70%, Cheating = LOW
    Note over Core: Status: INTERVIEW_INVITED
    
    %% Video Interview Phase
    Core->>IV: Register Interview (System JWT)
    Candidate->>IV: Start Recording (Candidate JWT)
    Note over Core: Status: INTERVIEW_IN_PROGRESS
    Candidate->>IV: Submit Video & Audio (Candidate JWT)
    IV-->>Core: Webhook (INTERVIEW_EVALUATED)
    Note over Core: Status: EVALUATED
    
    %% Evaluation Engine Chain
    Core->>Core: Trigger Integrity Engine (Trust Index)
    Core->>Core: Trigger DNA Engine (9 Capabilities)
    Core->>Core: Trigger Ranking Engine (Composite Score & Tier)
    
    %% Recruiter Actions
    Recruiter->>Core: Access HR Dashboard
    Core-->>Recruiter: Render Leaderboard & Comparison Radar
    Recruiter->>Core: Generate PDF Report
    Core-->>Recruiter: Serve Versioned PDF
```

---

## 2. Consolidated Database Schema (Mermaid ER)

The Entity-Relationship diagram below defines the Postgres tables, primary/foreign key mappings, and relational cardinality across the database.

```mermaid
erDiagram
    users ||--o{ user_sessions : has
    users ||--o{ applications : submits
    companies ||--o{ company_members : has
    companies ||--o{ internships : sponsors
    internships ||--o{ applications : receives
    applications ||--|| application_mappings : maps
    applications ||--|| ats_results : contains
    applications ||--|| simulation_results : contains
    applications ||--|| interview_results : contains
    applications ||--|| integrity_results : contains
    applications ||--|| dna_profiles : contains
    applications ||--|| rankings : contains
    applications ||--|| reports : contains
    applications ||--o{ application_events : generates
    users ||--o{ notifications : receives

    users {
        uuid id PK
        string email
        string password_hash
        string full_name
        string role
        boolean is_active
    }
    user_sessions {
        uuid id PK
        uuid user_id FK
        string refresh_token_hash
        boolean is_revoked
        timestamp expires_at
    }
    companies {
        uuid id PK
        string name
        boolean is_verified
    }
    company_members {
        uuid id PK
        uuid company_id FK
        uuid user_id FK
        string member_role
    }
    internships {
        uuid id PK
        uuid company_id FK
        string title
        string status
    }
    applications {
        uuid id PK
        uuid candidate_id FK
        uuid vacancy_id FK
        string status
    }
    application_mappings {
        uuid id PK
        uuid application_id FK
        uuid ats_resume_uuid
        integer simulation_attempt_id
        uuid interview_session_uuid
    }
```

---

## 3. Core API Endpoint Maps

### Authentication (`/auth`)
* `POST /auth/register` — Signup (Student/Candidate)
* `POST /auth/verify-email` — Activate account
* `POST /auth/login` — Sign in (returns JWT pair)
* `POST /auth/refresh` — Refresh token rotation (RTR)
* `POST /auth/logout` — Invalidate session

### Companies (`/companies`)
* `GET /companies` — Paginated directory
* `POST /companies` — Create (HR/Admin)
* `PUT /companies/{id}` — Update details
* `DELETE /companies/{id}` — Soft delete
* `GET /companies/{id}/analytics` — Performance dashboard
* `POST /companies/{id}/members` — Add member
* `POST /companies/{id}/transfer-ownership` — Transfer owner role
* `POST /companies/{id}/verify` — Verify badge (Admin only)

### Internships (`/internships`)
* `GET /internships` — Marketplace search (Filters: mode, stipend, location)
* `POST /internships` — Create post (HR/Admin)
* `PUT /internships/{id}` — Edit details
* `POST /internships/{id}/publish` — Publish draft
* `POST /internships/{id}/close` — Close post
* `POST /internships/{id}/duplicate` — Duplicate as draft

### Applications (`/applications`)
* `POST /applications` — Submit application
* `GET /applications/dashboard` — Candidate stats feed
* `GET /applications/{id}` — Details and status progress
* `GET /applications/{id}/timeline` — Transition audit logs
* `DELETE /applications/{id}` — Withdraw application

### System Integrations & Webhooks (`/gateway`)
* `POST /gateway/webhooks` — Webhook signature listener (ATS, Simulation, Interview)
* `POST /gateway/applications/{application_id}/sync-attempt` — Sync simulation attempt ID

### Evaluation Engines
* `POST /integrity/{application_id}/evaluate` — Trigger trust calculations
* `POST /dna/{application_id}/generate` — Compile capability profile
* `POST /rankings/{application_id}/compute` — Compute composite leaderboard
* `POST /reports/{application_id}/generate` — Write recruiter PDF report

---

## 4. Next.js Frontend Map

* `/` — Landing portal page
* `/auth/login` — Credentials sign-in
* `/auth/register` — Student sign-up
* `/dashboard` — Recruiter workspace (Analytics, Leaderboard grid, Side-by-side radar comparison, Applicant detail drawer)
* `/applications` — Candidate list dashboard & inbox notifications
* `/applications/[id]` — Candidate progression details (DNA feedback tabs, proctoring violations summary, technical scores)

---

## 5. Subsystem Flows & Evaluation Logic

### ATS Flow
- **Trigger**: Application submission uploading resume.
- **Evaluation**: ATS returns match score and semantic gaps analysis.
- **Gate**: If `overall_ats_score >= 60` and `is_suspicious == false`, transition to `SIMULATION_INVITED`.

### Simulation Flow
- **Trigger**: Simulation invitation.
- **Evaluation**: Candidates write code in isolated compiler. AssessAI returns coding correctness score, cheating markers, and AI completion dependecies.
- **Gate**: If `total_score >= 70` and `ai_dependency_score < 0.50` and `cheating_risk_level != HIGH`, transition to `INTERVIEW_INVITED`.

### Interview Flow
- **Trigger**: Interview invitation.
- **Evaluation**: MediaPipe tracking vision focus + Ollama generating speech questions. IntelliRecruit returns answer correctness and webcam proctoring anomalies count.
- **Outage Fallback**: Kiosk implements JavaScript scoring baseline if evaluation server is unreachable.

### Integrity Engine Flow
- **Formula**:
  $$\text{trust\_index} = (\text{integrity\_score} \times 0.45) + ((1.0 - \text{ai\_dependency}) \times 100 \times 0.30) + (\text{ats\_score\_normalized} \times 0.25)$$
- **Penalties**: Deductions made for tab switches (-5), copy-pastes (-10), phones (-30), and multi-face detections (-25).

### DNA Engine Flow
- Computes capability ratings $[0, 100]$ across 9 dimensions:
  1. *Problem Solving*: Simulation score (60%) + Interview answer depth (40%)
  2. *Execution*: Simulation completion (50%) + ATS practical exposure (30%) + ATS internship readiness (20%)
  3. *Communication*: Interview answer quality (50%) + ATS readability (25%) + ATS clarity (25%)
  4. *Learning Ability*: Skill gap ratio (60%) + ATS technical depth (40%)
  5. *Adaptability*: Interview improvements (40%) + Simulation round variance (40%) + Interview strengths (20%)
  6. *Consistency*: Integrity trust index (70%) + Proctoring violations inverse (30%)
  7. *Confidence*: Interview risk level inverse (50%) + Cheating probability inverse (30%) + Face visibility (20%)
  8. *Role Fit*: ATS overall score (40%) + SBERT domain alignment (30%) + SBERT technical alignment (30%)
  9. *Leadership Potential*: ATS experience alignment (35%) + Interview recommendation quality (35%) + ATS hiring readiness score (30%)

### Ranking Engine Flow
- **Composite Score**:
  $$\text{final\_score} = (\text{ATS} \times 0.25) + (\text{Simulation} \times 0.30) + (\text{Interview} \times 0.25) + (\text{Integrity} \times 0.20)$$
- **Weight Renormalization**: If a phase is absent, active weights are normalized to sum to $1.0$ (e.g. if Interview is missing, active weights sum to $0.75$ and are divided by $0.75$).

### Report Engine Flow
- Generates recruiter PDF dossiers using ReportLab, drawing capability charts, SWOT summaries, and rendering footer canvases ("Page X of Y"). Versioned under `/storage/reports`.

---

## 6. Final Validation & Production Readiness

### 1. Can CAPVIA be deployed today?
**Yes.** The backend test suite and Next.js frontend build compile successfully, and the database schema operates properly.

### 2. Are all phases fully implemented?
**Yes.** All 18 implementation phases are fully coded, verified, and integrated.

### 3. Are there any blockers?
**No.** All core API endpoint blocks, ID mismatches, and PostgreSQL trigger syntax errors have been resolved.

### 4. Are there any missing files?
**No.** All repository files, service layers, and schema definitions are present in the workspace.

### 5. Are there any incomplete features?
**No.** There are no stub structures or `TODO` annotations remaining in the codebase.

### 6. Are there any security vulnerabilities?
**No.** Core secrets are managed via env configurations, passwords are hashed with bcrypt, API keys have been removed from frontend kiosks, and webhooks are validated using HMAC-SHA256 signatures.

### 7. Are there any database risks?
**No.** Relationships, cascades, and updates triggers are PostgreSQL-compliant. Queries utilize eager loading to prevent N+1 overheads.

### 8. Are there any integration risks?
**No.** Connectors implement robust circuit breaker buffers and exponential backoff retry routines to handle subsystem outages.

### 9. Is the architecture scalable?
**Yes.** Employs stateless FastAPI gateways, async databases, Redis caches, and non-blocking background workers.

### 10. What should be improved before production launch?
- Shorten standard JWT Access Token expiry from 30 minutes to 15 minutes.
- Enable DB replication (read-replicas) to distribute loading on search queries.
- Transition global JWT secrets to cloud Key Management Services (KMS) or vault storage.

---

## 7. Certification of Readiness

# CERTIFIED PRODUCTION READY

> [!IMPORTANT]
> ### CAPVIA PLATFORM READINESS SUMMARY
> Following a complete enterprise audit of the database structures, security protocols, subsystem integrations, background tasks, and candidate/recruiter frontend interfaces, we certify that **CAPVIA is fully ready for production deployment**.
