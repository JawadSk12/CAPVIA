# CAPVIA AI Interview Component Library Catalog

This catalog documents the reusable React interface components designed and deployed to support browser-native proctoring and system diagnostics.

---

## 1. Landing & Diagnostic Components

### A. `Welcome` landing card (`Welcome.tsx`)
* **Purpose**: Greet candidates, provide metadata context on the campaign, and perform a quick browser capability pre-check.
* **Key Props**:
  - `onStart: () => void` (Invoked when the candidate clicks "Start System Diagnostics").
* **Design Standards**:
  - Split column container (brand SVG illustration on the left, campaign overview on the right).
  - Browser engine validation check status list.

### B. `DeviceValidation` diagnostics card (`DeviceValidation.tsx`)
* **Purpose**: Guide candidates step-by-step to test webcam video streams, voice decibels capture, speaker playback, and network latency.
* **Key Props**:
  - `onComplete?: () => void` (Fired when all checks pass and the user proceeds).
  - `onBack?: () => void` (Fired when canceling the setup).
* **Interface Assets**:
  - `MicBars`: Renders an interactive 24-channel audio decibel gauge.
  - `SoundWaves`: Multi-ring concentric pinging animation signifying chime playback.
  - `CameraOverlay`: Live tracking feed guides and live face position frames.

### C. `ValidationComplete` card (`ValidationComplete.tsx`)
* **Purpose**: Confirm hardware diagnostics approval and lay down ground rules for the proctoring environment.
* **Key Props**:
  - `onProceedToInterview: () => void` (Triggers the main interview screen).

---

## 2. Proctoring & Security Overlays

### A. `KioskOverlay` block screen (`KioskOverlay.tsx`)
* **Purpose**: Absolute viewport overlay that locks down the browser window if the candidate violates security conditions.
* **Key Props**:
  - `isDisplayBlocked: boolean` (Triggers lock screen for tab switches / multi-screens).
  - `displayCount: number` (Monitors active monitor connections count).
  - `isCameraLost: boolean` (Triggers lock screen if webcam track shuts down).
  - `onOpenUnlock?: () => void` (Triggers numerical supervisor bypass modal).

### B. `AdminUnlockModal` verification overlay (`AdminUnlockModal.tsx`)
* **Purpose**: Custom numerical PIN Pad DOM overlay. Allows supervisors to override locking events using PIN code `9999`.
* **Key Props**:
  - `isOpen: boolean` (Toggles modal visibility).
  - `onClose: () => void` (Dismisses modal).
  - `onUnlockSuccess: () => void` (Fires override logic, bypassing all proctoring checks).

---

## 3. Session Dashboard Components

### A. `RadialTimers` widget (Part of `Interview.tsx`)
* **Purpose**: Render modern circular SVG progress rings showing countdown states.
* **SVG Specification**:
  - Radius: `23px`
  - Stroke Width: `2.5px`
  - Circumference: `144px`
  - Stroke Dash Array: dynamically set relative to active seconds.

### B. `SpeechTranscriptFeed` panel (Part of `Interview.tsx`)
* **Purpose**: Live scrollable transcript feed displaying question cards and candidate speech answers.
* **Features**:
  - Interactive Search Bar dynamically filtering captured speech keywords.
  - Interactive speech listening/speaking status badges.
