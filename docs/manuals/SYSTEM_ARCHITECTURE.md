# System Architecture

This document outlines the core architecture, component interactions, sequence diagrams, and lifecycle transitions of the CAPVIA recruitment platform.

---

## 1. System Topology

CAPVIA is structured as an API Gateway and recruitment control center, coordinating asynchronous evaluations across three external specialized microservice subsystems (ATS, Simulation, and Interview).

```mermaid
graph TB
    subgraph Client Tier
        Candidate[Candidate Web App]
        Recruiter[Recruiter HR Dashboard]
    end

    subgraph Gateway & Application Tier [CAPVIA Core]
        API[FastAPI Gateway Router]
        Auth[Auth & JWT Session Manager]
        Tasks[Background Task Workers]
        PDF[Report Engine / ReportLab]
    end

    subgraph Data Store Tier
        DB[(PostgreSQL Database)]
        Cache[(Redis Cache / Session Store)]
        Storage[(Local PDF Dossier Storage)]
    end

    subgraph Subsystem Tier
        ATS[ATS Resume Screening Engine]
        Sim[AssessAI Coding Simulation]
        Int[IntelliRecruit Video Interview]
    end

    %% Client Interactions
    Candidate -->|Submit Application / Track Stepper| API
    Recruiter -->|Manage Listings / Download Dossier| API

    %% Core Internals
    API --> Auth
    API --> DB
    API --> Cache
    API --> Tasks
    Tasks --> PDF
    PDF --> Storage

    %% Webhook & API Integrations
    API -->|API Triggers| ATS
    API -->|API Triggers| Sim
    API -->|API Triggers| Int

    ATS -->|Webhook Callbacks| API
    Sim -->|Webhook Callbacks| API
    Int -->|Webhook Callbacks| API
```

---

## 2. Platform Sequence Diagram

The following diagram illustrates the candidate registration, application submission, screening webhooks, and downstream engines processing lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    actor Recruiter
    participant Gateway as CAPVIA Core API
    participant DB as PostgreSQL DB
    participant ATS as ATS Subsystem
    participant Sim as AssessAI Subsystem
    participant Int as IntelliRecruit Subsystem

    %% 1. Application Submission
    Candidate->>Gateway: POST /api/v1/applications (Resume & Cover Letter)
    Gateway->>DB: INSERT application (Status: APPLIED)
    Gateway->>Gateway: Trigger ATS Screening
    Gateway->>ATS: POST /api/v1/screening/ats (Submit Document)
    Gateway-->>Candidate: Return 201 Created (Status: ATS_PENDING)

    %% 2. ATS Webhook Callback
    ATS->>Gateway: POST /api/v1/gateway/webhooks/ats (Score & Analysis)
    Note over Gateway: Verify Webhook HMAC Signature
    Gateway->>DB: INSERT ats_results (Overall Score: 85.0)
    Gateway->>DB: UPDATE application status to ATS_COMPLETED
    Gateway->>Gateway: Evaluate Progression (ATS Score >= 60%)
    Gateway->>DB: UPDATE application status to SIMULATION_INVITED
    Gateway->>Sim: POST /api/v1/simulation/invite (Create Challenge Token)

    %% 3. Simulation Webhook Callback
    Sim->>Gateway: POST /api/v1/gateway/webhooks/simulation (Coding Attempt Completed)
    Note over Gateway: Verify Webhook HMAC Signature
    Gateway->>DB: INSERT simulation_results (Score: 88.5, Cheating: LOW)
    Gateway->>DB: UPDATE application status to SIMULATION_COMPLETED
    Gateway->>Gateway: Evaluate Progression (Simulation >= 70%)
    Gateway->>DB: UPDATE application status to INTERVIEW_INVITED
    Gateway->>Int: POST /api/v1/interview/invite (Register Video Session)

    %% 4. Interview Webhook Callback
    Int->>Gateway: POST /api/v1/gateway/webhooks/interview (Session Completed)
    Note over Gateway: Verify Webhook HMAC Signature
    Gateway->>DB: INSERT interview_results (Score: 82.0, Proctoring details)
    Gateway->>DB: UPDATE application status to EVALUATED

    %% 5. Downstream Evaluation Chain
    rect rgb(200, 220, 240)
        Note over Gateway, DB: Synchronous Downstream Engines Execution
        Gateway->>Gateway: Execute Integrity Engine (Trust Index Calculation)
        Gateway->>DB: INSERT integrity_results (Trust Index: 91)
        Gateway->>Gateway: Execute DNA Profile Engine (9 Dimensions Alignment)
        Gateway->>DB: INSERT dna_profiles (Radar dataset)
        Gateway->>Gateway: Execute Ranking Engine (Calculate Weighted final_score)
        Gateway->>DB: INSERT rankings (Composite: 85.95, Rank: 1)
    end

    %% 6. Report Generation
    Recruiter->>Gateway: POST /api/v1/reports/{app_id}/generate
    Gateway->>DB: Check HR RBAC Role
    Gateway->>Gateway: Generate PDF report dossier (ReportLab)
    Gateway->>DB: INSERT reports (Metadata & PDF URL)
    Gateway-->>Recruiter: Return 201 Created (Report ready)
```

---

## 3. Downstream Calculations Chain

When the `INTERVIEW_COMPLETED` webhook fires and results are committed, the **Downstream Engines Chain** executes to evaluate capabilities, compliance, and standings:

```mermaid
graph TD
    subgraph Input Datasets
        ATS_Data[ATS Resume Score & Skills]
        Sim_Data[AssessAI Correctness & Copy-Paste]
        Int_Data[IntelliRecruit Speech & Proctoring]
    end

    subgraph Downstream Engine Processes
        IE[Integrity Engine] -->|1. Calculate Trust Index| DE[DNA Engine]
        DE -->|2. Maps 9 Capability Vectors| RE[Ranking Engine]
        RE -->|3. Evaluate weighted final_score & percentile| FE[HR Leaderboard]
    end

    ATS_Data --> IE
    Sim_Data --> IE
    Int_Data --> IE

    ATS_Data --> DE
    Sim_Data --> DE
    Int_Data --> DE

    IE --> RE
```

### Downstream Calculations Formulae
1. **Integrity Engine**:
   - Calculates the **Trust Index** ($TI \in [0, 100]$):
     $$TI = 100 - (TabSwitches \times 5) - (LookAwayCount \times 2) - (CopyPasteEvents \times 10)$$
     *(Proctoring indicators are calibrated dynamically against baseline metrics).*
2. **DNA Profile Engine**:
   - Compiles a 9-dimensional capability score ($0-100$) based on semantic alignment, coding proficiency, speech parameters, and integrity metrics.
3. **Ranking Engine**:
   - Evaluates the **Final Score** ($FS \in [0, 100]$):
     $$FS = (ATS \times 0.25) + (Simulation \times 0.30) + (Interview \times 0.25) + (TrustIndex \times 0.20)$$
   - Computes dynamic percentiles and assigns recommendation tiers (Platinum, Gold, Silver, Bronze).
