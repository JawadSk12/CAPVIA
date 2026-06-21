# CAPVIA — System Architecture

> **Audience:** Technical evaluator, architect, or senior developer reviewing the system design.

---

## Overview

CAPVIA is a **microservices-based** recruitment intelligence platform composed of:

- **1 Central Gateway** (CAPVIA Platform) — FastAPI, PostgreSQL, Redis
- **3 Specialized AI Engines** — ATS, Simulation, Interview (independently deployed)
- **4 Automated Intelligence Engines** — Integrity, DNA, Ranking, Report (embedded in gateway)
- **1 React/Next.js Frontend** — HR and Candidate dashboards
- **3 Cloud Services** — Neon (DB), Upstash (Cache), Supabase (Storage)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└──────────────┬──────────────────────────────────────────────────────────────┘
               │
    ┌──────────▼────────────────────────────┐
    │           Vercel CDN/Edge              │
    │       capvia.io  (Next.js 14)          │
    │  HR Dashboard | Candidate Dashboard    │
    └──────────┬────────────────────────────┘
               │ HTTPS API calls
               │ Authorization: Bearer <JWT>
    ┌──────────▼────────────────────────────┐
    │        CAPVIA Gateway                  │
    │    api.capvia.io  (FastAPI)            │
    │    Railway — port 8000                 │
    │                                        │
    │  ┌─────────────────────────────────┐  │
    │  │          Routers (13)           │  │
    │  │ auth | companies | internships  │  │
    │  │ applications | ats | simulation │  │
    │  │ interview | integrity | dna     │  │
    │  │ rankings | reports | webhooks   │  │
    │  └─────────────────────────────────┘  │
    │  ┌──────────────┐ ┌────────────────┐  │
    │  │ IntegrityEng │ │   DNA Engine   │  │
    │  │  (Phase 13)  │ │  (Phase 14)    │  │
    │  └──────┬───────┘ └───────┬────────┘  │
    │         │ auto-triggers   │ auto-trig. │
    │  ┌──────▼───────────────────────────┐ │
    │  │          Ranking Engine           │ │
    │  │           (Phase 15)              │ │
    │  └───────────────────────────────────┘ │
    └──────────┬────────────────────────────┘
               │ asyncpg                     │ redis.asyncio
    ┌──────────▼──────────┐      ┌───────────▼─────────┐
    │   Neon PostgreSQL    │      │   Upstash Redis      │
    │  (17 tables)         │      │  email tokens        │
    │  connection pooled   │      │  integrity weights   │
    └─────────────────────┘      └─────────────────────┘
               │
    WEBHOOKS (X-CAPVIA-Signature HMAC-SHA256)
               │
    ┌──────────┼───────────────────────────────────────┐
    │          │                                        │
    ▼          ▼                                        ▼
┌─────────────────┐  ┌─────────────────┐   ┌─────────────────────┐
│   ATS Engine    │  │Simulation Engine│   │  Interview Engine    │
│  ats.capvia.io  │  │ sim.capvia.io   │   │ eval.capvia.io       │
│  FastAPI :8001  │  │  Django :8002   │   │  FastAPI :8765       │
│  MongoDB        │  │  PostgreSQL     │   │  (+ Electron client) │
│  SBERT + KW     │  │  Proctored IDE  │   │  SentenceTransformers│
└─────────────────┘  └─────────────────┘   └─────────────────────┘
```

---

## Complete Request Flow

### Candidate Registration → Login

```
Candidate                  Frontend              CAPVIA Gateway          Redis         PostgreSQL
    │                          │                        │                   │               │
    │──POST /auth/register────►│                        │                   │               │
    │                          │──POST /auth/register──►│                   │               │
    │                          │                        │──check email──────┼──────────────►│
    │                          │                        │◄──user exists?────┼───────────────│
    │                          │                        │──hash password     │               │
    │                          │                        │──INSERT User──────┼──────────────►│
    │                          │                        │──SET email_verify token (24h)─────►
    │                          │                        │──log activity─────┼──────────────►│
    │                          │◄──200 + simulated_token│                   │               │
    │◄──200 (token in resp)────│                        │                   │               │
    │                          │                        │                   │               │
    │──POST /auth/verify-email►│                        │                   │               │
    │                          │──POST /auth/verify────►│                   │               │
    │                          │                        │──GET email_verify:token───────────►
    │                          │                        │◄──email string────────────────────│
    │                          │                        │──UPDATE users SET is_active=true──►│
    │                          │                        │──DEL email_verify:token───────────►
    │                          │◄──200 Account active───│                   │               │
    │──POST /auth/login────────►│                       │                   │               │
    │                          │──POST /auth/login─────►│                   │               │
    │                          │                        │──SELECT User──────┼──────────────►│
    │                          │                        │──verify_password() │               │
    │                          │                        │──create JWT pair  │               │
    │                          │                        │──INSERT UserSession────────────────►│
    │                          │                        │──INSERT ActivityLog────────────────►│
    │                          │◄──{access_token, refresh_token, role}──────│               │
    │◄──tokens stored───────── │                        │                   │               │
```

### Application → Full Evaluation Pipeline

```
Candidate        Frontend           Gateway           ATS Engine        Simulation        Interview
    │               │                  │                  │                  │               │
    │──apply()─────►│──POST /applications►               │                  │               │
    │               │                  │──INSERT Application                 │               │
    │               │                  │──INSERT AppEvent (APPLIED)          │               │
    │               │                  │──notify candidate                   │               │
    │               │◄──{application_id}│                 │                  │               │
    │               │                  │                  │                  │               │
    │               │                  │◄─POST /gateway/webhooks──────────── │               │
    │               │                  │  event=ATS_PROCESSED                │               │
    │               │                  │  (HMAC verified)                    │               │
    │               │                  │──INSERT ATSResult                   │               │
    │               │                  │──UPDATE application status=ATS_COMPLETED            │
    │               │                  │──INSERT AppEvent (ATS_PENDING→ATS_COMPLETED)        │
    │               │                  │──notify candidate                   │               │
    │               │                  │                  │                  │               │
    │               │                  │◄─POST /gateway/webhooks─────────────────────────── │
    │               │                  │  event=SIMULATION_SUBMITTED                        │
    │               │                  │──INSERT SimulationResult                           │
    │               │                  │──UPDATE status=SIMULATION_COMPLETED                │
    │               │                  │                  │                  │               │
    │               │                  │◄─POST /gateway/webhooks─────────────────────────────►│
    │               │                  │  event=INTERVIEW_EVALUATED                          │
    │               │                  │──INSERT InterviewResult                             │
    │               │                  │──INSERT IntegrityResult (raw proctoring metrics)    │
    │               │                  │──UPDATE status=INTERVIEW_COMPLETED                  │
    │               │                  │                  │                  │               │
    │               │                  │──[AUTO] IntegrityService.calculate()                │
    │               │                  │  penalty = ATS + Sim + Interview violations         │
    │               │                  │  trust_index = weighted formula                     │
    │               │                  │──[AUTO] DNAService.generate_dna_profile()           │
    │               │                  │  9 capability dimensions computed                   │
    │               │                  │  radar_chart_data built                            │
    │               │                  │──[AUTO] RankingService.compute_ranking()            │
    │               │                  │  final_score = ATS×0.25+Sim×0.30+IV×0.25+Int×0.20 │
    │               │                  │  internship_rank, company_rank, percentile          │
    │               │                  │──UPDATE status=EVALUATED                            │
```

---

## Application Lifecycle State Machine

```
                APPLIED
                   │
                   ▼
              ATS_PENDING
                   │  (ATS_PROCESSED webhook)
                   ▼
             ATS_COMPLETED
                   │
                   ▼
          SIMULATION_INVITED
                   │
                   ▼
       SIMULATION_IN_PROGRESS
                   │  (SIMULATION_SUBMITTED webhook)
                   ▼
        SIMULATION_COMPLETED
                   │
                   ▼
          INTERVIEW_INVITED
                   │
                   ▼
       INTERVIEW_IN_PROGRESS
                   │  (INTERVIEW_EVALUATED webhook)
                   ▼
        INTERVIEW_COMPLETED
                   │  (Integrity + DNA + Ranking auto-triggered)
                   ▼
              EVALUATED ─────────────────────┐
                   │                          │
              (HR action)              EVALUATED_LOCAL_BASELINE
                   │
          ┌────────┴────────┐
          ▼                 ▼
      SHORTLISTED        REJECTED
          │
          ▼
        HIRED

At any stage:
    WITHDRAWN  ←── candidate initiates
    REJECTED   ←── HR initiates
```

---

## Integrity Engine Data Flow

```
Input Sources:
  ATS:         overall_score, is_suspicious, fraud_probability
  Simulation:  cheating_risk_level, ai_dependency_score
  Interview:   cheating_probability_pct
  Proctoring:  phone_detections_count, multi_face_events, tab_switches,
               copy_pastes, look_away_count, face_absences_count,
               suspicious_keys

Penalty Calculation:
  ┌──────────────────────────────────────────────────────┐
  │  ATS Penalty                                          │
  │    is_suspicious → +15                               │
  │    fraud_prob > 70% → +20                            │
  │    fraud_prob > 40% → +10                            │
  ├──────────────────────────────────────────────────────┤
  │  Simulation Penalty                                   │
  │    cheating_risk=CRITICAL → +30                      │
  │    cheating_risk=HIGH → +20                          │
  │    ai_dependency ≥ 75% → +20                         │
  │    ai_dependency ≥ 50% → +10                         │
  ├──────────────────────────────────────────────────────┤
  │  Interview Penalty                                    │
  │    phone_detected(n) → +(25 + (n-1)×10) [CRITICAL]  │
  │    multi_face(n) → +n×10 [CRITICAL]                  │
  │    face_absent(n>1) → +(n-1)×7                       │
  │    look_away(n>3) → +(n-3)×4                         │
  │    tab_switches(n) → +n×5                            │
  │    copy_paste(n) → +n×10                             │
  │    suspicious_keys(n) → +n×5                         │
  │    cheat_prob>70% → +15                              │
  └──────────────────────────────────────────────────────┘

  integrity_score = max(0, 100 - total_penalty)

  trust_index = (integrity_score × 0.45)
              + ((1 - ai_dependency) × 100 × 0.30)
              + (ats_score_normalized × 100 × 0.25)

Output:
  integrity_score, ai_dependency_score, trust_index,
  compiled_risk_level, confidence_level,
  explainability, scoring_formula, calibration_logic,
  audit_trail[], historical_tracking[]
```

---

## DNA Engine Data Flow

```
Input Sources: ATS, Simulation, Interview, Integrity results

9 Capability Dimensions (all 0–100):

  ┌─────────────────┬────────────────────────────────────────────────────────┐
  │ Dimension       │ Formula                                                 │
  ├─────────────────┼────────────────────────────────────────────────────────┤
  │ Problem Solving │ sim.total_score×0.60 + iv.answer_score_pct×0.40        │
  │ Execution       │ sim.total_score×0.50 + practical_exp×0.30 + ready×0.20 │
  │ Communication   │ iv.answer_score_pct×0.50 + readability×0.25+clarity×0.25│
  │ Learning Ability│ (matched/total)×100×0.60 + technical_depth×0.40        │
  │ Adaptability    │ improvements×0.40 + round_variance×0.40 + strengths×0.20│
  │ Consistency     │ trust_index×0.70 + (100-violations×15)×0.30            │
  │ Confidence      │ risk_inverse×0.50 + (100-cheat_prob)×0.30 + face_vis×0.20│
  │ Role Fit        │ ats_overall×0.40 + domain_align×0.30 + tech_align×0.30  │
  │ Leadership Pot. │ exp_align×0.35 + iv_recommendation×0.35 + readiness×0.30│
  └─────────────────┴────────────────────────────────────────────────────────┘

Output:
  - 9 integer dimensions (0–100)
  - radar_chart_data (Chart.js compatible JSON)
  - capability_vectors (unit-normalized + category labels)
  - comparative_analysis (cohort percentile ranks)
  - historical_trends (time-series snapshots)
```

---

## Ranking Engine Data Flow

```
Input:
  ats_raw      = ATSResult.overall_score          (0–100)
  sim_raw      = SimulationResult.total_score     (0–100)
  iv_raw       = answer_score×0.80 + integrity×0.20 (0–100)
  integ_raw    = IntegrityResult.trust_index      (0–100)

Formula:
  If all 4 phases present:
    final_score = ats×0.25 + sim×0.30 + iv×0.25 + integ×0.20

  If phases missing:
    Weights are renormalised for present phases:
    total_weight = sum of weights for present phases
    each_contribution = raw_score × weight / total_weight
    final_score = sum(contributions)

Tier Classification:
  ≥85 → PLATINUM
  ≥70 → GOLD
  ≥55 → SILVER
  ≥40 → BRONZE
  <40  → UNRANKED

Rankings:
  internship_rank  = ordinal rank within internship cohort (1 = best)
  company_rank     = ordinal rank across all company internships
  global_percentile = fraction of cohort scoring below × 100
  is_top_candidate = global_percentile ≥ 90 AND cohort_size ≥ 3

Output:
  final_score, ats/sim/iv/integ_component, ats/sim/iv/integ_raw_score,
  internship_rank, company_rank, global_percentile, is_top_candidate,
  recommendation_tier, data_completeness, explainability,
  score_breakdown, ranking_analytics, audit_trail
```

---

## Database Schema Overview

```
users (1) ─────────────────────────────────────────────────────────┐
  │                                                                  │
  ├──► companies (via created_by FK)                                │
  │      └──► company_members (user_id, company_id)                 │
  │      └──► internships (company_id)                              │
  │             └──► applications (vacancy_id)                      │
  │                    ├──► application_events                      │
  │                    ├──► application_mappings                    │
  │                    ├──► ats_results                             │
  │                    ├──► simulation_results                      │
  │                    ├──► interview_results                       │
  │                    ├──► integrity_results                       │
  │                    ├──► dna_profiles                            │
  │                    ├──► rankings ──────────► internships        │
  │                    └──► reports                                 │
  │                                                                  │
  ├──► candidate_mappings (ats/simulation/interview external IDs)   │
  ├──► activity_logs                                                 │
  ├──► notifications                                                 │
  └──► user_sessions (refresh token tracking)                        │
                                                                     │
  vacancy_mappings (maps internship_id → ats_jd/simulation IDs)  ◄──┘
```

---

## Security Architecture

```
                   ┌─────────────────────────────────────────┐
                   │           Authentication Layer           │
                   │                                          │
                   │  Registration → bcrypt hash (cost=12)    │
                   │  Login → verify_password (passlib)       │
                   │                                          │
                   │  Access Token: JWT HS256, 30min TTL      │
                   │  Payload: {sub, email, role, type, exp}  │
                   │                                          │
                   │  Refresh Token: JWT HS256, 7-day TTL     │
                   │  Stored as: bcrypt hash in user_sessions │
                   │                                          │
                   │  Refresh Token Rotation (RTR):           │
                   │  - Old token invalidated on use          │
                   │  - Reuse detected → ALL sessions revoked │
                   └─────────────────────────────────────────┘
                                       │
                   ┌─────────────────────────────────────────┐
                   │           Authorization Layer            │
                   │                                          │
                   │  get_current_user: validates JWT         │
                   │  RoleChecker(["hr", "admin"]): RBAC     │
                   │  Soft-delete filter: deleted_at IS NULL  │
                   │  Owner check: candidate sees own records │
                   └─────────────────────────────────────────┘
                                       │
                   ┌─────────────────────────────────────────┐
                   │           Webhook Security               │
                   │                                          │
                   │  HMAC-SHA256 signature verification      │
                   │  Format: t={timestamp},v1={hash}         │
                   │  signed_payload = f"{ts}.{body_bytes}"   │
                   │  hash = hmac(secret, signed_payload)     │
                   │  Constant-time comparison (hmac.compare) │
                   └─────────────────────────────────────────┘
```

---

## Deployment Architecture

```
GitHub (JawadSk12/CAPVIA)
    │
    ├── Push to main ─────────────────────────────────────────────┐
    │                                                              │
    │   GitHub Actions                                             │
    │   ├── Run pytest (capvia_platform/tests/)                   │
    │   ├── Deploy gateway → Railway                               │
    │   └── Deploy frontend → Vercel                               │
    │                                                              │
Vercel                                     Railway                │
    │                                          │                  │
capvia.io → Edge network               api.capvia.io              │
    Next.js SSR                        CAPVIA Gateway             │
    TanStack Query                     Python 3.12                │
    Zustand state                      FastAPI                    │
    @sentry/nextjs                     asyncpg                    │
    Tailwind CSS                       Redis client               │
                                           │                      │
                                       ┌───┴──────┐               │
                                       │  Neon    │               │
                                       │ Postgres │               │
                                       └──────────┘               │
                                       ┌───┴──────┐               │
                                       │ Upstash  │               │
                                       │  Redis   │               │
                                       └──────────┘               │
                                       ┌───┴──────┐               │
                                       │ Supabase │               │
                                       │ Storage  │               │
                                       └──────────┘               │
```
