# CAPVIA Unified Routing Structure

This document details the route layout and access controls for the unified CAPVIA platform frontend.

---

## 1. Candidate Routes
These routes render components from `/src/features/ats/`, `/src/features/simulation/`, and `/src/features/interview/` wrapped in the **Candidate Layout**.

| Route Path | Description | Access Level | Target Component File |
| :--- | :--- | :--- | :--- |
| `/dashboard` | Main candidate hub: lists active vacancy applications and status. | Candidate | `dashboard/page.tsx` |
| `/internships` | Vacancy search directory with stipend & location filters. | Guest/Candidate | `internships/page.tsx` |
| `/internships/[id]` | Vacancy detail overview. | Guest/Candidate | `internships/[id]/page.tsx` |
| `/application/[id]` | Progression stepper (ATS -> Sim -> Interview) and score feed. | Candidate | `application/[id]/page.tsx` |
| `/candidate/ats` | Resume upload and match scorecard viewer. | Candidate | `candidate/ats/page.tsx` |
| `/candidate/simulation`| Coding workspace compiler and editor. | Candidate | `candidate/simulation/page.tsx` |
| `/candidate/interview` | Secure speech questions proctor and camera recorder. | Candidate | `candidate/interview/page.tsx` |
| `/candidate/results` | Post-interview feedback radar and dimensions profile. | Candidate | `candidate/results/page.tsx` |
| `/profile` | General settings for candidate personal details. | Candidate | `profile/page.tsx` |

---

## 2. HR (Recruiter) Routes
These routes render components from `/src/features/hr/` wrapped in the **HR Sidebar Layout**.

| Route Path | Description | Access Level | Target Component File |
| :--- | :--- | :--- | :--- |
| `/hr/dashboard` | Main recruiter overview: radar charts, applicant metrics. | HR / Recruiter | `hr/dashboard/page.tsx` |
| `/hr/company` | Company verification and recruiter team settings. | HR Manager | `hr/company/page.tsx` |
| `/hr/internships` | Job description creator and active vacancy listings. | HR / Recruiter | `hr/internships/page.tsx` |
| `/hr/internships/[id]` | View applicants list and matching leaderboard. | HR / Recruiter | `hr/internships/[id]/page.tsx` |
| `/hr/candidates` | Centralized database of all submitted applications. | HR / Recruiter | `hr/candidates/page.tsx` |
| `/hr/rankings` | Dynamic leaderboards with composite metrics. | HR / Recruiter | `hr/rankings/page.tsx` |
| `/hr/reports` | ReportLab PDF report downloader. | HR / Recruiter | `hr/reports/page.tsx` |
| `/hr/analytics` | Tab-switch violation counters, cheating logs. | HR / Recruiter | `hr/analytics/page.tsx` |

---

## 3. System Administrator Routes
These routes enable global platform configuration.

| Route Path | Description | Access Level | Target Component File |
| :--- | :--- | :--- | :--- |
| `/admin/dashboard` | System diagnostics: MongoDB, Redis, API counts. | Administrator | `admin/dashboard/page.tsx` |
| `/admin/users` | Recruiter account provisioning and roles. | Administrator | `admin/users/page.tsx` |
| `/admin/companies` | Verification badge approvals for company requests. | Administrator | `admin/companies/page.tsx` |
| `/admin/system` | Cache clears, webhook audit log overrides. | Administrator | `admin/system/page.tsx` |
| `/admin/settings` | Global scoring algorithm weights config. | Administrator | `admin/settings/page.tsx` |
