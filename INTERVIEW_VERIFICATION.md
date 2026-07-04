# CAPVIA AI Interview Integration Verification Plan

This document outlines the test execution suites, terminal operations, and manual check verification steps to validate the modernized browser-native proctoring interface.

---

## 1. Development & Launch Operations

To launch the local web server and database dependencies:

```bash
# Start backend Docker microservices (Ollama, PostgreSQL, DNA engine)
docker-compose up -d

# Navigate to the frontend Next.js application workspace
cd capvia_platform/frontend

# Install node dependencies
npm install

# Start local Next.js development server
npm run dev
```

Navigate to `http://localhost:3000/candidate/interview` in Chrome or Safari.

---

## 2. Test Execution Protocols

### A. Pre-Interview System Diagnostics

1. **Welcome Landing**:
   - Access the landing route. Confirm the left brand graphic (SVG illustration) renders without broken elements.
   - Click **Start System Diagnostics**. Confirm routing/view transitions seamlessly.
2. **Device Checks**:
   - **Webcam**: Confirm a video feed initializes. Verify that corner brackets and the face guide overlay render correctly.
   - **Microphone**: Speak into your mic. Verify that the 24-channel audio decibel indicators animate.
   - **Speaker**: Click "Play Again". Verify audio tone notes are heard, then click "Yes, heard".
   - **System Latency**: Confirm connection delay latency parses and shows a pass state.
   - Click **Save & Proceed**. Verify routing to the rules page.

### B. Proctoring Telemetry & Kiosk Lockouts

1. **Tab Focus Blur**:
   - During the active interview, open a new browser tab or click outside the window.
   - Shift focus back to the interview tab. Verify a `Tab Switch` warning alert toast pops up in the top right.
2. **Kiosk Lockout Event**:
   - Attempt a tab switch two more times. Verify the viewport locks down with an absolute Slate security overlay displaying "Security Violations Blocked".
   - Confirm screen elements are completely inaccessible behind the overlay.

### C. Supervisor Bypass Override

1. **Trigger Unlock Modal**:
   - On the blocked screen overlay, click the **Supervisor Bypass** button (or press `Shift + Ctrl + Alt + X`).
   - Confirm the custom light-themed PIN Pad modal opens.
2. **Numerical PIN Validation**:
   - Click digits `9`, `9`, `9`, `9` on the PIN pad (or type `9999` on your keyboard).
   - Verify the overlay locks dismiss immediately, telemetry metrics reset, and the candidate can resume the assessment.
   - Verify typing an incorrect PIN logs an "Invalid Supervisor PIN" alert.
