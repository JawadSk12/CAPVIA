# CAPVIA AI Interview UI/UX Design System Specification

This document details the visual design system, layout hierarchy, and user interaction flows for the modernized, browser-native AI Interview Platform.

---

## 1. Core Visual Tokens

In compliance with the **CAPVIA Design System**, the interface operates strictly under a premium light-themed color palette. Neon styling and dark mode are explicitly excluded to maintain corporate assessment standards.

### Color Palette

| Token | Hex Code | Utility / Context |
| :--- | :--- | :--- |
| **Primary** | `#0D47A1` | Brand identity, primary interactive buttons, active timeline indicator. |
| **Secondary** | `#42A5F5` | Secondary UI actions, progress metrics, sub-charts. |
| **Accent** | `#FFC107` | Highlight elements, focus states, specialized parameters. |
| **Success** | `#10B981` | Passed diagnostics checkmarks, correct answer feedback, Low-Risk tags. |
| **Warning** | `#F59E0B` | Medium-Risk tags, moderate proctor warnings, retry states. |
| **Danger** | `#EF4444` | High/Critical-Risk tags, telemetry failure warnings, mute microphone states. |
| **Background** | `#FFFFFF` | Core workspace canvas background. |
| **Surface** | `#F8FAFC` | Secondary cards, telemetry indicators, timeline controls, inner grids. |

---

## 2. Layout Hierarchy

### A. Candidate Landing Flow

1. **Welcome Landing Component (`Welcome.tsx`)**:
   - Renders a clean split layout.
   - **Left Panel**: Professional graphic utilizing standard SVG brand shapes representing cognitive capabilities.
   - **Right Panel**: Interview campaign details, estimated duration, browser sanity checklist, and the primary "Start System Diagnostics" call to action.
2. **Device Diagnostics Component (`DeviceValidation.tsx`)**:
   - Renders a progress-stepper timeline spanning five sequential checkmarks: Webcam Check, Microphone Check, Speaker Check, System latency check, and Verification Complete.
   - Renders a live 16:9 webcam preview with corner alignment brackets and a dashed face guide overlay.
   - Animated visual level meters representing real-time microphone gain input.
3. **Instructions Confirmation (`ValidationComplete.tsx`)**:
   - Standard card showing the verified diagnostics checks, definitive proctoring guidelines, a clear recording notice, and the primary trigger to launch the interview terminal.

### B. Interactive Interview Terminal (`Interview.tsx`)

The main interface utilizes a **split columns layout**:

* **Left Column (5-span Grid)**:
  - **Camera Feed Panel**: Large 16:9 webcam canvas, rounded corners, overlaid with active telemetry badges (e.g. "FACE DETECTED" or "MIC ACTIVE") and a ticking duration timer.
  - **Proctoring Analytics Panel**: Live gauges displaying current gaze status (Left, Right, Up, Down, Center), head stability percentage, count of tab switches, and a red warning log showing any flagged violations.
* **Right Column (7-span Grid)**:
  - **Circular Timers Widget**: Modern SVG radial rings showing question-specific elapsed seconds and overall session duration.
  - **Progress Timeline**: Interlinked timeline buttons (Questions 1 to 5) showing Answered (Success color), Current (Primary color), or Pending (Slate color) states.
  - **Question Details Card**: Renders the current question text, difficulty difficulty-label, and matching round numbers.
  - **Speech-to-Text Transcript Feed**: Renders previous answers and live captured speech. Includes a search input field that dynamically filters transcript history.
* **Bottom Controls Bar**:
  - Toggles for Microphone Mute, Fullscreen mode, Help overlays, and a prominent "Quit Session" button.

---

## 3. Micro-Animations & Transitions

* **Webcam guide**: Pulsing dashed circle inside the webcam view to help candidates center their faces.
* **Active Steps**: Outer ring glow on active diagnostics steps with pulsing animations.
* **Progress Transition**: Smooth horizontal slides when switching diagnostic checks.
* **Live Recording**: Pulsing red record badge inside the header and camera preview.
