# CAPVIA Feature Integration Plan

This document explains how the three core business modules (ATS, Simulation, and Interview) are integrated into the unified Next.js App Router codebase.

---

## 1. ATS Subsystem Integration
*   **Location**: `/src/features/ats/`
*   **Visual Elements**:
    *   `ResumeUploadZone`: Drag-and-drop file uploader (PDF/DOCX) using the design system's `FileUpload` component.
    *   `ScoreProgress`: Match score percentage circular visualizer.
    *   `SemanticGapsHeatmap`: Matched/Missing keywords list (using badge components).
    *   `JDSelector`: Job Description selection dropdown.
*   **API Connectivity**: Passes file data to the ATS backend (Port 8001) via `POST /api/v1/resume/parse` and retrieves parsed text and matched keywords.

---

## 2. Simulation Subsystem Integration
*   **Location**: `/src/features/simulation/`
*   **Visual Elements**:
    *   `MonacoWorkspace`: Dynamic editor widget wrapped inside a Next.js `dynamic(..., { ssr: false })` wrapper.
    *   `ConsoleOutput`: Terminal logger displaying code compilation outputs and assertion results.
    *   `TimerWidget`: Top-right remaining time indicator.
    *   `QuestionPrompt`: Interactive left panel detailing task instructions and function inputs.
*   **API Connectivity**: Connects to the Simulation API (Port 8002) for code execution and utilizes `socket.io-client` for real-time terminal synchronization.

---

## 3. Interview Subsystem Integration
*   **Location**: `/src/features/interview/`
*   **Visual Elements**:
    *   `ProctorFeed`: Fullscreen view containing the candidate's webcam feed and the MediaPipe face mesh canvas overlays.
    *   `QuestionCarousel`: Dynamic cards prompting speech questions.
    *   `AudioRecorder`: MediaRecorder wrapper that captures audio/video tracks.
    *   `KioskOverlay`: Modal blockades that lock the page if the candidate leaves fullscreen or connects a secondary monitor.
*   **API Connectivity**:
    *   Fetches dynamic questions from `ai_interview/run_monitor.py` or central evaluators.
    *   Sends recorded video blobs as Base64 to `POST /evaluate` on the Evaluation Server (Port 8765).
    *   Syncs proctoring violations and interview results back to the Gateway Core Backend (Port 8000).
