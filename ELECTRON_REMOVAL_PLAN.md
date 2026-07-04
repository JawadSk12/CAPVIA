# CAPVIA Electron Removal & Browser Proctoring Plan

This document outlines the strategy to completely remove the desktop Electron container and migrate the candidate interview interface to a pure, browser-first proctoring system.

---

## 1. List of Electron Files to Remove
Decommission and delete the following files and directories from [ai_interview](file:///Volumes/KINGSTON/CAPVIA/ai_interview):
*   `ai_interview/electron/` (entire folder including `main.js`, `preload.js`, and `lockdown/` helper scripts)
*   Remove the following dependencies from [ai_interview/package.json](file:///Volumes/KINGSTON/CAPVIA/ai_interview/package.json):
    *   `electron`
    *   `electron-builder`
    *   `electron-store`
    *   `uiohook-napi` (native keyboard listener)
    *   `wait-on` & `concurrently` (scripts used to run electron dev server in parallel)
*   Delete Electron build targets and script commands from `package.json` (`electron:dev`, `electron:build`, etc.).

---

## 2. Browser-First Web API Proctoring Mappings

The table below defines how each Electron OS-level lockdown feature translates to standard HTML5 Web APIs:

| Proctoring Requirement | Electron OS-level Implementation | Browser-First Web API Replacement |
| :--- | :--- | :--- |
| **Focus Loss Detection** | `focusEnforcer.js` checks if the BrowserWindow is active; steals focus back via `app.focus({ steal: true })`. | Listen to **Page Visibility API** (`visibilitychange`) and **Window Focus** (`window.onblur`). Log violation immediately if tab changes. |
| **Multi-Display Check** | `multiDisplayGuard.js` queries `screen.getAllDisplays().length`. | Query the modern **Window Management API** using `window.screen.isExtended`. |
| **Fullscreen Lock** | BrowserWindow is launched with `fullscreen: true` and `kiosk: true`. | Call the HTML5 **Fullscreen API** (`element.requestFullscreen()`) on page start. Listen to `fullscreenchange` and raise violation if exited. |
| **Keyboard Blocks** | `keyboardBlocker.js` intercepts global keys (Alt+Tab, Cmd+Tab, PrintScreen) using `uiohook-napi`. | Intercept page keys via `window.addEventListener('keydown')` to prevent `F12`, `Ctrl+Shift+I` (DevTools), and block copy-pastes. |
| **Exit Guard** | `adminUnlock.js` intercepts quit signals and displays native Electron verification dialog boxes. | Trap navigation via `window.onbeforeunload`. Handle supervisor unlock via a custom React Modal overlay in the DOM. |
| **Camera Watchdog** | `cameraWatchdog.js` polls the camera track state via IPC messages. | Attach `onended` listeners to the `MediaStreamTrack` and handle `navigator.mediaDevices.ondevicechange`. |

---

## 3. Implementing the Browser Security Hook (`useBrowserSecurity.ts`)
Create a new custom hook [useBrowserSecurity.ts](file:///Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/src/hooks/useBrowserSecurity.ts) to manage Web-native proctoring events:
1.  **Fullscreen Request**:
    ```typescript
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen permission denied:", err);
      }
    };
    ```
2.  **Tab Switch & Blur Tracking**:
    ```typescript
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          logProctoringViolation('TAB_SWITCH', 'Candidate switched to another browser tab.');
        }
      };
      const handleBlur = () => {
        logProctoringViolation('WINDOW_BLUR', 'Candidate clicked out of the interview window.');
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
      };
    }, []);
    ```
3.  **Multi-Monitor Scan**:
    ```typescript
    const checkMultipleMonitors = () => {
      if (window.screen && window.screen.isExtended) {
        logProctoringViolation('MULTI_DISPLAY', 'Secondary display screen detected.');
      }
    };
    ```
