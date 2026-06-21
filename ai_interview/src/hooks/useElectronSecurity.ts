/**
 * src/hooks/useElectronSecurity.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that bridges the Electron security IPC to the component tree.
 *
 * Gracefully degrades: if window.electronSecurity is absent (plain browser),
 * the hook is a no-op — the app still runs, just without OS-level lockdown.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { SecurityLogger } from '../services/securityLogger';
import { IntegrityService } from '../services/integrityService';

// ── Type declarations for the preload bridge ──────────────────────────────────

interface ElectronViolation {
  type:      string;
  reason:    string;
  severity:  'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

interface DisplayChangePayload {
  count:   number;
  blocked: boolean;
}

// Extend Window to declare the electronSecurity API
declare global {
  interface Window {
    electronSecurity?: {
      isElectron:              boolean;
      onViolation:             (cb: (v: ElectronViolation) => void) => () => void;
      onDisplayChange:         (cb: (d: DisplayChangePayload) => void) => () => void;
      onCameraLost:            (cb: (p: { paused: boolean }) => void) => () => void;
      onCameraRestored:        (cb: (p: { paused: boolean }) => void) => () => void;
      onUnlockGranted:         (cb: () => void) => () => void;
      notifyInterviewStarted:  () => void;
      notifyInterviewEnded:    () => void;
      requestAdminUnlock:      () => void;
      getDisplayCount:         () => Promise<number>;
      isLocked:                () => Promise<boolean>;
    };
  }
}

// ── State shape ───────────────────────────────────────────────────────────────

export interface ElectronSecurityState {
  /** True when running inside Electron (not a plain browser) */
  isElectron:       boolean;
  /** True when a secondary display is detected — blocks interview UI */
  isDisplayBlocked: boolean;
  /** Number of connected displays */
  displayCount:     number;
  /** True when camera stream is lost — interview should pause */
  isCameraLost:     boolean;
  /** Most recent violation from the main process */
  lastViolation:    ElectronViolation | null;
  /** All violations recorded in this session */
  allViolations:    ElectronViolation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useElectronSecurity() {
  const api = window.electronSecurity;
  const isElectron = !!api?.isElectron;

  const [state, setState] = useState<ElectronSecurityState>({
    isElectron,
    isDisplayBlocked: false,
    displayCount:     1,
    isCameraLost:     false,
    lastViolation:    null,
    allViolations:    [],
  });

  // ── Check initial display count ──────────────────────────────────────────
  useEffect(() => {
    if (!isElectron || !api) return;
    api.getDisplayCount().then((count) => {
      setState((s) => ({
        ...s,
        displayCount:     count,
        isDisplayBlocked: count > 1,
      }));
    });
  }, [isElectron, api]);

  // ── Set up IPC listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron || !api) return;

    const cleanups: (() => void)[] = [];

    // Violation from main process
    cleanups.push(
      api.onViolation((violation) => {
        console.warn(`[ElectronSecurity] Violation: ${violation.type} — ${violation.reason}`);
        SecurityLogger.logEvent(violation.type, violation.severity, violation.reason);
        IntegrityService.reportViolation(violation.type, violation.reason);
        setState((s) => ({
          ...s,
          lastViolation: violation,
          allViolations: [...s.allViolations, violation],
        }));
      })
    );

    // Display change
    cleanups.push(
      api.onDisplayChange(({ count, blocked }) => {
        console.log(`[ElectronSecurity] Display count: ${count}, blocked: ${blocked}`);
        setState((s) => ({
          ...s,
          displayCount:     count,
          isDisplayBlocked: blocked,
        }));
      })
    );

    // Camera lost
    cleanups.push(
      api.onCameraLost(() => {
        console.warn('[ElectronSecurity] Camera lost.');
        setState((s) => ({ ...s, isCameraLost: true }));
      })
    );

    // Camera restored
    cleanups.push(
      api.onCameraRestored(() => {
        console.log('[ElectronSecurity] Camera restored.');
        setState((s) => ({ ...s, isCameraLost: false }));
      })
    );

    // Admin unlock granted — navigate after React cleanup
    cleanups.push(
      api.onUnlockGranted(() => {
        console.log('[ElectronSecurity] Admin unlock granted.');
      })
    );

    return () => cleanups.forEach((fn) => fn());
  }, [isElectron, api]);

  // ── Camera state reporter (renderer → main) ──────────────────────────────
  // The cameraWatchdog in main polls `camera:requestState` — we need to
  // respond from the renderer. Wire this up separately in Interview.tsx.
  // This hook exposes a helper to send the current camera state.

  // ── Actions ──────────────────────────────────────────────────────────────

  const notifyInterviewStarted = useCallback(() => {
    if (!isElectron || !api) return;
    api.notifyInterviewStarted();
    console.log('[ElectronSecurity] Interview started signal sent.');
  }, [isElectron, api]);

  const notifyInterviewEnded = useCallback(() => {
    if (!isElectron || !api) return;
    api.notifyInterviewEnded();
    console.log('[ElectronSecurity] Interview ended signal sent.');
  }, [isElectron, api]);

  const requestAdminUnlock = useCallback(() => {
    if (!isElectron || !api) return;
    api.requestAdminUnlock();
  }, [isElectron, api]);

  return {
    ...state,
    notifyInterviewStarted,
    notifyInterviewEnded,
    requestAdminUnlock,
  };
}
