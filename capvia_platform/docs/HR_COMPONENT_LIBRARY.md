# HR Component Library

This document outlines the premium reusable UI component modules designed and implemented for the CAPVIA Recruiter Suite.

---

## 1. Analytics KPI Cards
Displays overall metrics such as vacancy counts, hiring rate, or candidate score averages.
*   **Structure:** White card (`bg-white`), thin slate border (`border-slate-100`), padding-6, shadow-sm.
*   **Content:** Small capitalized grey label, large text value (`text-3xl font-black font-outfit`), subtext summary, and a colored Lucide icon block wrapped in an HSL-matching soft background (e.g. `bg-[#0D47A1]/5`).

---

## 2. Recent Activity Timeline
Renders real-time candidate actions in a vertical timeline format.
*   **Structure:** Vertical left border line (`border-l border-slate-100`).
*   **Activity Row:** Relative position, dot badge containing HSL-tinted status icon, bold title text (`text-slate-800 font-bold`), relative timestamp (`text-slate-400 font-medium`), and detailed action text.

---

## 3. Kanban Stage Columns & Cards
Visual board mapping candidate progression.
*   **Column Container:** Fixed width (`w-72 shrink-0`), colored border matching status severity (e.g. `border-blue-200` for applied, `border-emerald-250` for evaluated).
*   **Applicant Card:** Pure white card (`bg-white`), draggable cursor grab, bold candidate name, email, vacancy badge, and proctoring risk indicators.

---

## 4. Candidate Detail Drawer
Sliding sheet containing applicant deep-dive details.
*   **Structure:** Absolute viewport height overlay (`h-screen`), max-width 2xl, sliding transition animation (`animate-slide-in`), scrollable content area, sticky header/footer.
*   **Tab System:** Horizontal tabs (Overview, Resume, ATS, Sim, Interview, Integrity, DNA, Reports) with active indicator bar.

---

## 5. Score Comparison Matrix Table
Side-by-side metric comparison matrix.
*   **Structure:** Sticky metric labels row, horizontal scrolls for candidate columns.
*   **Details:** Compares ranks, final weighted scores, recommendation tiers, ATS parser matches, coding metrics, interview ratings, and integrity risk levels.
