# CAPVIA Central Platform — Architectural Design

This document contains Mermaid diagrams illustrating the integration patterns, webhook signature verifications, and state machines of the CAPVIA recruitment workflow.

---

## 1. Candidate Lifecycle & State Machine

The flow diagram below displays the state machine transitions an applicant moves through, indicating threshold checks.

```mermaid
stateDiagram-v2
    [*] --> APPLIED : Candidate Submits Resume
    APPLIED --> ATS_PENDING : Trigger parser upload
    ATS_PENDING --> ATS_COMPLETED : ATS processes resume
    
    state ATS_Decision <<choice>>
    ATS_COMPLETED --> ATS_Decision
    ATS_Decision --> SIMULATION_INVITED : ATS Score >= 60%
    ATS_Decision --> REJECTED : ATS Score < 60%
    
    SIMULATION_INVITED --> SIMULATION_IN_PROGRESS : Candidate starts challenge
    SIMULATION_IN_PROGRESS --> SIMULATION_COMPLETED : Candidate submits code
    
    state Sim_Decision <<choice>>
    SIMULATION_COMPLETED --> Sim_Decision
    Sim_Decision --> INTERVIEW_INVITED : Sim Score >= 70% and Risk = LOW
    Sim_Decision --> REJECTED : Sim Score < 70% or Risk = HIGH
    
    INTERVIEW_INVITED --> INTERVIEW_IN_PROGRESS : Candidate opens webcam
    INTERVIEW_IN_PROGRESS --> INTERVIEW_COMPLETED : Video uploaded & evaluated
    INTERVIEW_IN_PROGRESS --> EVALUATED_LOCAL_BASELINE : Video uploaded (server offline fallback)
    
    INTERVIEW_COMPLETED --> EVALUATED
    EVALUATED_LOCAL_BASELINE --> EVALUATED : Offline recovery eval
    
    state HR_Action <<choice>>
    EVALUATED --> HR_Action
    HR_Action --> SHORTLISTED : Recruiter approves
    HR_Action --> REJECTED : Recruiter declines
```

---

## 2. Webhook Signature Validation Sequence

The sequence diagram below displays the verification protocol between a subsystem sending a webhook event and CAPVIA Core validating its HMAC signature.

```mermaid
sequenceDiagram
    autonumber
    participant Subsystem as Subsystem Engine
    participant Gate as CAPVIA API Gateway
    participant DB as Postgres central DB

    Note over Subsystem: Webhook event occurs<br/>(e.g., ATS_PROCESSED)
    Subsystem->>Subsystem: Read signing_secret
    Subsystem->>Subsystem: Get current Unix epoch timestamp (t)
    Subsystem->>Subsystem: Compute signature = HMAC-SHA256(secret, t || PayloadBody)
    Subsystem->>Gate: POST /gateway/webhooks (Header: X-CAPVIA-Signature: t=..., v1=...)
    
    Note over Gate: Signature Middleware
    Gate->>Gate: Parse X-CAPVIA-Signature header values
    alt timestamp age |current_time - t| > 300s
        Gate-->>Subsystem: 401 Unauthorized (Expired webhook timestamp)
    else timestamp age valid
        Gate->>Gate: Compute expected_signature = HMAC-SHA256(secret, t || RawBodyBytes)
        alt expected_signature != v1
            Gate-->>Subsystem: 401 Unauthorized (Signature mismatch)
        else signatures match
            Gate->>Gate: Authorize request processing
            Gate->>DB: Save stage scores & update application_mappings caches
            Gate->>DB: Set application status = ATS_COMPLETED / SIMULATION_COMPLETED
            Gate-->>Subsystem: 200 OK (Event processed)
        end
    end
```

---

## 3. Data Mapping & Aggregation Schema

The entity mapping shows how the central `applications` entity aggregates identifiers from the ATS, Coding, and Interview subsystems via foreign key mapping tables.

```mermaid
erDiagram
    users ||--o| candidate_mappings : "capvia_candidate_uuid"
    internships ||--o| vacancy_mappings : "capvia_vacancy_uuid"
    applications ||--o| application_mappings : "application_id"
    
    users {
        uuid id PK
        string email
        string full_name
        string role
    }
    
    internships {
        uuid id PK
        uuid company_id FK
        string title
        string required_skills
    }
    
    applications {
        uuid id PK
        uuid candidate_id FK
        uuid vacancy_id FK
        string status
        string current_stage
    }
    
    candidate_mappings {
        uuid mapping_id PK
        uuid capvia_candidate_uuid FK
        uuid ats_user_uuid
        integer simulation_candidate_id
        uuid interview_candidate_uuid
    }
    
    vacancy_mappings {
        uuid mapping_id PK
        uuid capvia_vacancy_uuid FK
        uuid ats_jd_uuid
        integer simulation_internship_id
    }
    
    application_mappings {
        uuid mapping_id PK
        uuid application_id FK
        uuid ats_resume_uuid
        integer simulation_attempt_id
        integer simulation_application_id
        uuid interview_session_uuid
        numeric ats_score
        numeric simulation_score
        integer interview_answer_score_pct
        integer interview_integrity_score
        string combined_risk_level
    }
```
