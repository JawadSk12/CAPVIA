# CAPVIA — Database Guide

> **Audience:** Developer, DBA, or architect. Reference for all 17 tables, their relationships, indexes, and migration procedures.

---

## Overview

- **Database:** PostgreSQL 16 (hosted on Neon, serverless)
- **ORM:** SQLAlchemy 2.0 (async via asyncpg)
- **Migrations:** Alembic
- **Pattern:** Soft delete (`deleted_at` timestamp) on all primary entities
- **Timestamps:** `created_at`, `updated_at` on all models via `TimestampMixin`

---

## Tables Index

| # | Table | Rows | Purpose |
|---|-------|------|---------|
| 1 | `users` | Core | User accounts (candidates, HR, admins) |
| 2 | `companies` | Core | Company profiles |
| 3 | `company_members` | Core | Company-to-user membership |
| 4 | `internships` | Core | Internship/job postings |
| 5 | `applications` | Core | Candidate applications |
| 6 | `application_events` | Log | Status transition audit log |
| 7 | `candidate_mappings` | Map | Cross-service candidate ID mapping |
| 8 | `vacancy_mappings` | Map | Cross-service internship ID mapping |
| 9 | `application_mappings` | Map | Cross-service application ID mapping |
| 10 | `ats_results` | Result | ATS evaluation results |
| 11 | `simulation_results` | Result | Simulation evaluation results |
| 12 | `interview_results` | Result | Interview evaluation results |
| 13 | `integrity_results` | Result | Integrity Engine output |
| 14 | `dna_profiles` | Result | DNA Engine output (9 dimensions) |
| 15 | `rankings` | Result | Ranking Engine output |
| 16 | `reports` | Result | Final candidate report |
| 17 | `activity_logs` | Log | Platform-wide activity audit |
| 18 | `notifications` | Core | User notification queue |
| 19 | `user_sessions` | Auth | Refresh token tracking (RTR) |

---

## Table Definitions

### 1. `users`

Primary user table. Supports three roles: `CANDIDATE`, `HR`, `ADMIN`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default uuid4 | Primary key |
| `email` | VARCHAR | UNIQUE, NOT NULL | Login email |
| `password_hash` | VARCHAR | NOT NULL | bcrypt hash (cost=12) |
| `full_name` | VARCHAR | NOT NULL | Display name |
| `role` | ENUM(UserRole) | NOT NULL, default CANDIDATE | `CANDIDATE`, `HR`, `ADMIN` |
| `is_active` | BOOLEAN | default false | Activated after email verification |
| `phone` | VARCHAR | nullable | Phone number |
| `profile_picture_url` | VARCHAR | nullable | Profile image URL |
| `bio` | TEXT | nullable | Short bio |
| `linkedin_url` | VARCHAR | nullable | LinkedIn profile |
| `github_url` | VARCHAR | nullable | GitHub profile |
| `created_at` | TIMESTAMP | NOT NULL, auto | Record creation |
| `updated_at` | TIMESTAMP | NOT NULL, auto | Last update |
| `deleted_at` | TIMESTAMP | nullable | Soft delete timestamp |

**Indexes:**
- `UNIQUE(email)` — Login uniqueness
- `(role, deleted_at)` — Filter by role, exclude soft-deleted

**Notes:**
- Password never stored plaintext — always bcrypt hash
- `is_active=False` until email verified
- Soft delete preserves user data for audit

---

### 2. `companies`

Company profiles created by HR users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `name` | VARCHAR | NOT NULL | Company name |
| `description` | TEXT | nullable | Company description |
| `website` | VARCHAR | nullable | Company website |
| `industry` | VARCHAR | nullable | Industry sector |
| `headquarters` | VARCHAR | nullable | Location |
| `founded_year` | INTEGER | nullable | Year founded |
| `employee_count` | VARCHAR | nullable | "11-50", "51-200", etc. |
| `logo_url` | VARCHAR | nullable | Company logo URL |
| `is_verified` | BOOLEAN | default false | Admin-verified company |
| `created_by` | UUID | FK → users.id | Creator |
| `created_at` | TIMESTAMP | auto | |
| `updated_at` | TIMESTAMP | auto | |
| `deleted_at` | TIMESTAMP | nullable | Soft delete |

---

### 3. `company_members`

Many-to-many: maps HR users to companies they can manage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK → companies.id, NOT NULL | Company |
| `user_id` | UUID | FK → users.id, NOT NULL | HR member |
| `role` | VARCHAR | default "MEMBER" | "ADMIN", "MEMBER" |
| `created_at` | TIMESTAMP | auto | |

**Indexes:**
- `UNIQUE(company_id, user_id)` — One membership per user per company

---

### 4. `internships`

Job/internship postings created by companies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `company_id` | UUID | FK → companies.id, NOT NULL | Owning company |
| `title` | VARCHAR | NOT NULL | Internship title |
| `description` | TEXT | nullable | Role description |
| `responsibilities` | JSONB | nullable | List of responsibilities |
| `required_skills` | JSONB | nullable | Required skill list |
| `preferred_skills` | JSONB | nullable | Nice-to-have skills |
| `technologies` | JSONB | nullable | Tech stack list |
| `experience_level` | VARCHAR | nullable | "ENTRY", "JUNIOR", etc. |
| `status` | ENUM(InternshipStatus) | NOT NULL | `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED` |
| `is_active` | BOOLEAN | default true | Accepting applications |
| `work_mode` | ENUM(WorkMode) | nullable | `REMOTE`, `ONSITE`, `HYBRID` |
| `duration_weeks` | INTEGER | nullable | Internship duration |
| `stipend_min` | INTEGER | nullable | Min stipend |
| `stipend_max` | INTEGER | nullable | Max stipend |
| `stipend_currency` | VARCHAR | default "INR" | Currency |
| `openings` | INTEGER | nullable | Available positions |
| `application_deadline` | TIMESTAMP | nullable | Apply by date |
| `created_at` | TIMESTAMP | auto | |
| `updated_at` | TIMESTAMP | auto | |
| `deleted_at` | TIMESTAMP | nullable | Soft delete |

---

### 5. `applications`

Central table tracking each candidate's application lifecycle.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `candidate_id` | UUID | FK → users.id, NOT NULL | Applying candidate |
| `vacancy_id` | UUID | FK → internships.id, NOT NULL | Target internship |
| `status` | ENUM(ApplicationStatus) | NOT NULL | See state machine |
| `cover_letter` | TEXT | nullable | Candidate cover letter |
| `resume_url` | VARCHAR | nullable | Uploaded resume URL |
| `applied_at` | TIMESTAMP | auto | Application time |
| `created_at` | TIMESTAMP | auto | |
| `updated_at` | TIMESTAMP | auto | |
| `deleted_at` | TIMESTAMP | nullable | Soft delete / withdrawal |

**ApplicationStatus enum:**
`APPLIED`, `ATS_PENDING`, `ATS_COMPLETED`, `SIMULATION_INVITED`, `SIMULATION_IN_PROGRESS`, `SIMULATION_COMPLETED`, `INTERVIEW_INVITED`, `INTERVIEW_IN_PROGRESS`, `INTERVIEW_COMPLETED`, `EVALUATED`, `EVALUATED_LOCAL_BASELINE`, `SHORTLISTED`, `HIRED`, `REJECTED`, `WITHDRAWN`

**Indexes:**
- `UNIQUE(candidate_id, vacancy_id)` — One application per candidate per internship
- `(vacancy_id, status)` — Fast filtering by internship + status
- `(candidate_id, status)` — Candidate's applications by status

**Relationships:**
- → `application_events` (one-to-many)
- → `ats_results` (one-to-one)
- → `simulation_results` (one-to-one)
- → `interview_results` (one-to-one)
- → `integrity_results` (one-to-one)
- → `dna_profiles` (one-to-one)
- → `rankings` (one-to-one)
- → `reports` (one-to-many)

---

### 6. `application_events`

Immutable audit log of every application status transition.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `application_id` | UUID | FK → applications.id | Application |
| `from_status` | VARCHAR | nullable | Previous status |
| `to_status` | VARCHAR | NOT NULL | New status |
| `actor_id` | UUID | nullable | Who triggered the change |
| `actor_role` | VARCHAR | default "SYSTEM" | "SYSTEM", "HR", "CANDIDATE" |
| `reason` | TEXT | nullable | Human-readable reason |
| `metadata` | JSONB | nullable | Additional context |
| `created_at` | TIMESTAMP | auto | Event time |

**Notes:**
- Never soft-deleted — permanent record
- `actor_id=NULL, actor_role="SYSTEM"` for automated transitions

---

### 7. `candidate_mappings`

Maps CAPVIA internal candidate UUIDs to external IDs in ATS/Simulation/Interview services.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `capvia_candidate_id` | UUID | FK → users.id |
| `ats_candidate_id` | VARCHAR | ATS service user ID |
| `simulation_candidate_id` | VARCHAR | Simulation service user ID |
| `interview_candidate_id` | VARCHAR | Interview service user ID |

---

### 8. `vacancy_mappings`

Maps CAPVIA internship IDs to external service IDs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `capvia_internship_id` | UUID | FK → internships.id |
| `ats_jd_id` | VARCHAR | ATS job description ID |
| `simulation_exam_id` | VARCHAR | Simulation exam/room ID |
| `interview_job_id` | VARCHAR | Interview engine job ID |

---

### 9. `application_mappings`

Maps CAPVIA application IDs to external service application IDs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `capvia_application_id` | UUID | FK → applications.id |
| `ats_application_id` | VARCHAR | ATS service application ID |
| `simulation_attempt_id` | VARCHAR | Simulation attempt ID |
| `interview_session_id` | VARCHAR | Interview session ID |

---

### 10. `ats_results`

Stores output from ATS Engine evaluation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id, UNIQUE |
| `resume_id` | VARCHAR | ATS resume document ID |
| `jd_id` | VARCHAR | ATS job description ID |
| `status` | VARCHAR | ATS processing status |
| `overall_score` | FLOAT | Overall ATS score (0–100) |
| `score_band` | VARCHAR | "EXCELLENT", "GOOD", "FAIR", "WEAK" |
| `is_suspicious` | BOOLEAN | Fraud flag |
| `fraud_probability` | FLOAT | Fraud probability (0–1) |
| `matched_skills` | JSONB | List of matched skills |
| `missing_skills` | JSONB | List of missing skills |
| `technical_alignment` | FLOAT | SBERT technical match score |
| `domain_alignment` | FLOAT | Domain specialization match |
| `experience_alignment` | FLOAT | Experience level match |
| `project_alignment` | FLOAT | Project experience match |
| `semantic_match_strength` | FLOAT | Overall semantic similarity |
| `readability` | FLOAT | Resume readability score |
| `clarity` | FLOAT | Communication clarity score |
| `technical_depth` | FLOAT | Technical knowledge depth |
| `practical_exposure` | FLOAT | Practical experience score |
| `internship_readiness` | FLOAT | Readiness for internship level |
| `hiring_readiness_score` | FLOAT | Overall hiring readiness |
| `ats_compatibility` | FLOAT | ATS format compatibility |
| `raw_ats_response` | JSONB | Full ATS API response |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

### 11. `simulation_results`

Stores output from Simulation Engine.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id, UNIQUE |
| `attempt_id` | INTEGER | Simulation attempt ID |
| `total_score` | FLOAT | Overall simulation score (0–100) |
| `cheating_risk_level` | ENUM(RiskLevel) | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `ai_dependency_score` | FLOAT | AI tool usage fraction (0–1) |
| `recommendation` | VARCHAR | "hire", "review", "reject" |
| `round_scores` | JSONB | Per-round score breakdown |
| `performance_metrics` | JSONB | Detailed metrics |
| `raw_simulation_response` | JSONB | Full simulation API response |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

### 12. `interview_results`

Stores output from Interview Engine + proctoring data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id, UNIQUE |
| `session_id` | VARCHAR | Interview session UUID |
| `overall_answer_score_pct` | INTEGER | Q&A performance score (0–100) |
| `overall_integrity_score` | INTEGER | Proctoring integrity score (0–100) |
| `cheating_probability_pct` | INTEGER | Estimated cheating probability (0–100) |
| `risk_level` | ENUM(RiskLevel) | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `recommendation` | ENUM(RecommendationType) | `STRONG_HIRE`, `CONSIDER`, `REVIEW_REQUIRED`, `NOT_RECOMMENDED` |
| `video_url` | VARCHAR | Interview recording URL (Supabase) |
| `strengths` | JSONB | Identified strengths list |
| `weaknesses` | JSONB | Identified weaknesses list |
| `improvements` | JSONB | Improvement suggestions |
| `phone_detections_count` | INTEGER | Phone detected during interview |
| `multi_face_events` | INTEGER | Multiple face detections |
| `face_absences_count` | INTEGER | Face not visible count |
| `look_away_count` | INTEGER | Off-screen gaze events |
| `tab_switches` | INTEGER | Browser tab switch count |
| `copy_paste_count` | INTEGER | Clipboard paste events |
| `suspicious_key_count` | INTEGER | Suspicious keyboard events |
| `per_question_results` | JSONB | Per-question score breakdown |
| `raw_interview_response` | JSONB | Full interview API response |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

### 13. `integrity_results`

Stores Integrity Engine output.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id, UNIQUE |
| `integrity_score` | FLOAT | Raw penalty-based score (0–100) |
| `ai_dependency_score` | FLOAT | AI tool dependency (0–1) |
| `trust_index` | FLOAT | Compiled trust score (0–100) |
| `face_visibility_pct` | FLOAT | Face visible percentage |
| `compiled_risk_level` | VARCHAR | Final risk classification |
| `confidence_level` | FLOAT | Signal confidence (0–1) |
| `violations` | JSONB | List of violation events |
| `explainability` | JSONB | Human-readable explanation |
| `scoring_formula` | TEXT | Formula used for calculation |
| `calibration_logic` | JSONB | Weights applied |
| `audit_trail` | JSONB | Computation history |
| `historical_tracking` | JSONB | Time-series snapshots |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |
| `deleted_at` | TIMESTAMP | nullable |

---

### 14. `dna_profiles`

Stores DNA Engine output — 9 capability dimensions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id, UNIQUE |
| `problem_solving` | INTEGER | Phase 14 dimension (0–100) |
| `execution` | INTEGER | Phase 14 dimension (0–100) |
| `communication` | INTEGER | Phase 14 dimension (0–100) |
| `learning_ability` | INTEGER | Phase 14 dimension (0–100) |
| `adaptability` | INTEGER | Phase 14 dimension (0–100) |
| `consistency` | INTEGER | Phase 14 dimension (0–100) |
| `confidence` | INTEGER | Phase 14 dimension (0–100) |
| `role_fit` | INTEGER | Phase 14 dimension (0–100) |
| `leadership_potential` | INTEGER | Phase 14 dimension (0–100) |
| `capability_score` | FLOAT | Average of 9 dimensions |
| `candidate_level` | VARCHAR | "ELITE", "STRONG", "DEVELOPING", etc. |
| `radar_chart_data` | JSONB | Chart.js radar chart JSON |
| `capability_vectors` | JSONB | Unit-normalized dimension vectors |
| `comparative_analysis` | JSONB | Cohort percentile comparison |
| `historical_trends` | JSONB | Time-series of DNA snapshots |
| `technical_alignment` | FLOAT | Legacy: SBERT technical match |
| `project_alignment` | FLOAT | Legacy: project experience match |
| `experience_alignment` | FLOAT | Legacy: experience level match |
| `domain_alignment` | FLOAT | Legacy: domain specialization |
| `semantic_match_strength` | FLOAT | Legacy: overall semantic match |
| `readability` | FLOAT | Legacy: resume readability |
| `clarity` | FLOAT | Legacy: communication clarity |
| `ats_compatibility` | FLOAT | Legacy: ATS format score |
| `technical_depth` | FLOAT | Legacy: technical knowledge |
| `practical_exposure` | FLOAT | Legacy: practical experience |
| `internship_readiness` | FLOAT | Legacy: internship readiness |
| `hiring_readiness_score` | FLOAT | Legacy: overall readiness |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |
| `deleted_at` | TIMESTAMP | nullable |

---

### 15. `rankings`

Stores Ranking Engine output.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id, UNIQUE |
| `internship_id` | UUID | FK → internships.id |
| `final_score` | FLOAT | Weighted composite score (0–100) |
| `ats_component` | FLOAT | ATS weighted contribution |
| `simulation_component` | FLOAT | Simulation weighted contribution |
| `interview_component` | FLOAT | Interview weighted contribution |
| `integrity_component` | FLOAT | Integrity weighted contribution |
| `ats_raw_score` | FLOAT | Raw ATS score before weighting |
| `simulation_raw_score` | FLOAT | Raw simulation score |
| `interview_raw_score` | FLOAT | Raw interview score |
| `integrity_raw_score` | FLOAT | Raw integrity score |
| `data_completeness` | FLOAT | Fraction of phases with data (0–1) |
| `recommendation_tier` | VARCHAR | PLATINUM/GOLD/SILVER/BRONZE/UNRANKED |
| `is_top_candidate` | BOOLEAN | In top 10% of cohort |
| `internship_rank` | INTEGER | Rank within internship (1=best) |
| `company_rank` | INTEGER | Rank across company internships |
| `global_percentile` | FLOAT | Percentile within internship cohort |
| `score_breakdown` | JSONB | Detailed score decomposition |
| `explainability` | JSONB | Human-readable ranking rationale |
| `ranking_analytics` | JSONB | Cohort statistics |
| `audit_trail` | JSONB | Computation history |
| `score` | FLOAT | Legacy: same as final_score |
| `rank` | INTEGER | Legacy: same as internship_rank |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |
| `deleted_at` | TIMESTAMP | nullable |

---

### 16. `reports`

HR-facing candidate evaluation reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `application_id` | UUID | FK → applications.id |
| `report_type` | VARCHAR | "FULL", "SUMMARY", "ATS_ONLY" |
| `summary` | TEXT | Executive summary |
| `strengths` | JSONB | List of candidate strengths |
| `weaknesses` | JSONB | List of areas for improvement |
| `recommendations` | JSONB | HR recommendations |
| `pdf_url` | VARCHAR | Generated PDF URL |
| `generated_at` | TIMESTAMP | Generation time |
| `created_at` | TIMESTAMP | auto |
| `deleted_at` | TIMESTAMP | nullable |

---

### 17. `activity_logs`

Platform-wide audit trail for all significant actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `action` | VARCHAR | Action name ("USER_LOGIN", "APPLICATION_SUBMITTED", etc.) |
| `resource_type` | VARCHAR | "user", "application", "internship", etc. |
| `resource_id` | UUID | ID of the affected resource |
| `ip_address` | VARCHAR | Request IP |
| `user_agent` | VARCHAR | Browser/client user agent |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMP | auto |

---

### 18. `notifications`

User notification queue.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `title` | VARCHAR | Notification title |
| `message` | TEXT | Notification body |
| `notification_type` | VARCHAR | "STATUS_CHANGE", "RESULT_READY", etc. |
| `is_read` | BOOLEAN | default false |
| `related_application_id` | UUID | nullable, FK → applications.id |
| `created_at` | TIMESTAMP | auto |

---

### 19. `user_sessions`

Refresh token tracking for Refresh Token Rotation (RTR).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `token_hash` | VARCHAR | bcrypt hash of refresh token |
| `issued_at` | TIMESTAMP | Token issue time |
| `expires_at` | TIMESTAMP | Token expiry |
| `is_active` | BOOLEAN | False after use or revocation |
| `device_info` | VARCHAR | nullable, browser/device identifier |
| `ip_address` | VARCHAR | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

## Common Queries

### Application Pipeline Status

```sql
SELECT 
    a.id,
    u.email AS candidate,
    i.title AS internship,
    a.status,
    r.final_score,
    r.recommendation_tier,
    r.internship_rank
FROM applications a
JOIN users u ON a.candidate_id = u.id
JOIN internships i ON a.vacancy_id = i.id
LEFT JOIN rankings r ON r.application_id = a.id
WHERE a.deleted_at IS NULL
  AND i.id = '<internship_uuid>'
ORDER BY r.final_score DESC NULLS LAST;
```

### Internship Leaderboard

```sql
SELECT 
    u.full_name,
    u.email,
    r.final_score,
    r.recommendation_tier,
    r.internship_rank,
    r.global_percentile,
    r.is_top_candidate,
    r.ats_raw_score,
    r.simulation_raw_score,
    r.interview_raw_score,
    r.integrity_raw_score
FROM rankings r
JOIN applications a ON a.id = r.application_id
JOIN users u ON a.candidate_id = u.id
WHERE r.internship_id = '<internship_uuid>'
  AND r.deleted_at IS NULL
  AND r.final_score IS NOT NULL
ORDER BY r.internship_rank ASC;
```

### DNA Capability Comparison

```sql
SELECT 
    u.full_name,
    d.problem_solving,
    d.execution,
    d.communication,
    d.learning_ability,
    d.adaptability,
    d.consistency,
    d.confidence,
    d.role_fit,
    d.leadership_potential,
    d.candidate_level
FROM dna_profiles d
JOIN applications a ON a.id = d.application_id
JOIN users u ON a.candidate_id = u.id
WHERE a.vacancy_id = '<internship_uuid>'
  AND d.deleted_at IS NULL
ORDER BY d.capability_score DESC;
```

### Integrity Risk Distribution

```sql
SELECT 
    ir.compiled_risk_level,
    COUNT(*) as count,
    AVG(ir.trust_index) as avg_trust,
    AVG(ir.integrity_score) as avg_integrity
FROM integrity_results ir
JOIN applications a ON a.id = ir.application_id
WHERE a.vacancy_id = '<internship_uuid>'
  AND ir.deleted_at IS NULL
GROUP BY ir.compiled_risk_level
ORDER BY avg_trust DESC;
```

---

## Migration Commands

```bash
# Apply all pending migrations
python -m alembic upgrade head

# Check current state
python -m alembic current

# Show migration history
python -m alembic history

# Create new migration after model change
python -m alembic revision --autogenerate -m "Add column X to table Y"

# Roll back one step
python -m alembic downgrade -1

# Roll back to specific revision
python -m alembic downgrade <revision_id>

# Mark database as at specific revision (without running SQL)
python -m alembic stamp <revision_id>
```

---

## Backup and Restore

```bash
# Backup (custom format)
pg_dump \
  "postgresql://neondb_owner:<pw>@<host>/neondb" \
  --format=custom \
  --file="capvia_$(date +%Y%m%d).pgdump"

# Restore
pg_restore \
  --dbname="postgresql://neondb_owner:<pw>@<host>/neondb" \
  --clean \
  capvia_20240621.pgdump

# Quick SQL dump (human-readable)
pg_dump "postgresql://..." > capvia_$(date +%Y%m%d).sql
```
