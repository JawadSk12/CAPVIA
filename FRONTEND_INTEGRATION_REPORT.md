# CAPVIA Unified Frontend Integration Report

This report summarizes the architectural consolidation and UI/UX modernization of the CAPVIA assessment platform. The individual subsystems (ATS resume parsing, coding simulations, and webcam/audio interviews) have been unified into a single Next.js App Router gateway codebase (`capvia_platform/frontend`).

---

## 1. Unified Architecture & Routing

All separate frontend projects have been decommissioned. Instead, routes have been structured under the unified App Router gateway to allow candidates and recruiters to navigate seamlessly within the same origin and session:

### Candidate Feature Routes
*   **Resume Screening (ATS)**:
    *   Upload Page: `/candidate/ats` (Renders `FileUpload` and poller progress)
    *   Detail Analytics: `/candidate/ats/analysis/[id]` (Renders `ATSMeter`, `SkillGapChart`, `ResumeHeatmap`, `ExplainabilityPanel`, `ResumeRewriteAI`, `FakeSkillAlert`)
*   **Coding Assessments (Simulation)**:
    *   Workspace Workspace: `/candidate/simulation/[attemptId]` (Renders Monaco editor, real-time code runner, and anti-cheat tracking)
    *   Report Complete: `/candidate/simulation/[attemptId]/complete` (Renders AI evaluation results & total scores)
*   **Video Interviews (Conduct & Proctoring)**:
    *   Welcome Setup: `/candidate/interview` (Renders `RoleSetup` or welcome guidelines)
    *   Validation: `/candidate/interview/validation` (Renders device checks)
    *   Validation Complete: `/candidate/interview/validation-complete` (Prompts consent warning)
    *   Conduct: `/candidate/interview/conduct` (WebRTC webcam stream, facial landmark overlays, speech-to-text recorders)
    *   Results Feedback: `/candidate/interview/results` & `/candidate/results` (AI verbal analysis summary and integrity metrics)

### Recruiter Feature Routes
*   **HR Dashboard Hub**:
    *   WORKSPACE: `/hr/dashboard` (Leaderboards, radar comparison charts, and applicant telemetry logs)

---

## 2. Electron Decommissioning & Web Proctoring

The native Electron client wrapper (`ai_interview/electron/`) has been fully decommissioned. High-fidelity proctoring is now handled by browser-native Web APIs encapsulated in the `useBrowserSecurity.ts` hook.

| Proctoring Dimension | Old Electron Implementation | New Web API Implementation |
| :--- | :--- | :--- |
| **Tab/App Switching** | Win32 native hook (stole focus, blocked Cmd+Tab) | HTML5 Page Visibility API (`visibilitychange` hidden detection) |
| **Window Blurs** | System-level focus tracking | DOM Window `blur` focus tracking |
| **Kiosk Security** | OS Window Management parameters | Fullscreen Kiosk API (`requestFullscreen` on start, exits on complete) |
| **Key/Mouse Hijack** | Lower-level keyboard hooks | `keydown` blockers for F12 (DevTools), Ctrl+Shift+I, Copy/Paste, and PrintScreen; `contextmenu` right-click blocker |
| **Peripheral Loss** | Native watchdog event | `MediaDevices.ondevicechange` event checks active videoinput/audioinput streams |

---

## 3. Design System Alignment

All modules now read from the tailwind design configurations to output uniform premium styling:
*   **Typography**: `Outfit` Google Font for headlines and titles; `Inter` for body copy; `JetBrains Mono` for Monaco editor/code blocks.
*   **Theme Palette**: Sleek dark mode elements accented with `#0D47A1` primary blue, `#42A5F5` sky blue secondary, and `#FFC107` amber warnings.
*   **Border Radii**: Strict compliance to `20px` card container rounded corners, `16px` interactive inputs/buttons, and `24px` modal dialog bounds.

---

## 4. Operational Scripts & Startup Orchestration

*   **`start.sh`**: Updated to run only the 3 FastAPI backend servers (Port 8000 gateway, Port 8001 ATS, Port 8002 Simulation), Celery worker tasks, the Python Interview Evaluation server (Port 8765), and the single Next.js gateway web server (Port 3000). The old standalone React and Vite development servers are bypassed.
*   **`stop.sh`**: Cleans up uvicorn, celery, and node development servers.
*   **`healthcheck` / `healthcheck.sh`**: Scans only the core API health status endpoints and checks the unified port 3000 frontend web portal.

---
*Report compiled on: 2026-06-26*
