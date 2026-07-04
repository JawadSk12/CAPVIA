# CAPVIA Browser Migration Technical Report

This report documents the architectural migration from a desktop-dependent Electron application environment to a browser-native web application.

---

## 1. Migration Goals & Rationale

* **Platform Independence**: Enable candidates to launch and complete interviews on standard modern browsers (Chrome, Firefox, Safari, Edge) without downloading separate binaries.
* **Proctoring Integrity**: Maintain security verification levels (face tracking, multi-face blocking, phone detection, window focus monitoring) using native HTML5 and WebRTC browser specifications.
* **Low Operational Overhead**: Zero-friction distribution models where candidates require only a link to initiate diagnostics and evaluation.

---

## 2. Replacing Desktop API Operations

The table below summarizes the architectural translation of desktop-level OS intercepts into Web API mechanisms:

| Electron API / Operation | Browser-Native Replacement | Web API Implementation |
| :--- | :--- | :--- |
| **Window Focus / Blur** | `visibilitychange` & `blur` window events | Listening to `document.hidden` and `window.blur` to trigger the proctoring lock screen. |
| **Kiosk Security Lock** | Custom DOM overlay + full-screen layout | Combining HTML5 Fullscreen API with absolute DOM lock sheets (`KioskOverlay.tsx`). |
| **Keyboard Interceptions** | Prevent default on global keyboard listeners | Capture keyboard hotkeys (`Alt + Tab`, `Cmd + Tab`, `PrintScreen`) in bubble phase. |
| **Right-Click Block** | Global context menu suppression | `window.addEventListener('contextmenu', e => e.preventDefault())` inside active routes. |
| **Clipboard Security** | Global copy/cut/paste event intercept | `document.addEventListener('copy', e => e.preventDefault())` to block text pasting. |
| **Supervisor Unlock Bypass** | DOM PIN Pad component Modal overlay | Key combo (`Shift + Ctrl + Alt + X`) triggers `AdminUnlockModal.tsx` in-browser. |

---

## 3. Telemetry Persistence & Browser Recovery

To safeguard candidate progress against accidental page refreshes or network loss:

* **Session Storage**: Progress, current question indices, and partial speech transcripts are serialized to `sessionStorage` in real-time.
* **Device Metadata Mapping**: Hardware permissions, screen resolutions, OS details, and network latencies verified in diagnostics are persisted before transitioning to the interview stage.
* **Unified API Integrations**: Avoided breaking scoring models, AI question generators, and MediaPipe face tracking pipelines by wrapping browser proctoring hooks within the existing API boundary interfaces.
