/**
 * useBrowserSecurity.ts
 * ─────────────────────────────────────────────────────────────────────
 * Pure-browser replacement for the former Electron security hooks.
 * Uses:  Page Visibility API, Fullscreen API, MediaDevices API,
 *        Window Management API (screen.isExtended), keyboard events.
 *
 * Replaces useElectronSecurity — zero IPC, zero Electron APIs.
 * All detection logic is identical to what the Electron hook provided.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BrowserViolation {
  type:      string;
  reason:    string;
  severity:  'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface BrowserSecurityState {
  isElectron:        false;
  isDisplayBlocked:  boolean;
  displayCount:      number;
  isCameraLost:      boolean;
  lastViolation:     BrowserViolation | null;
  allViolations:     BrowserViolation[];
  isBypassed:        boolean;
  isActive:          boolean;
}

export function useBrowserSecurity() {
  const [isDisplayBlocked, setIsDisplayBlocked] = useState(false);
  const [displayCount, setDisplayCount]         = useState(1);
  const [isCameraLost, setIsCameraLost]         = useState(false);
  const [lastViolation, setLastViolation]       = useState<BrowserViolation | null>(null);
  const [allViolations, setAllViolations]       = useState<BrowserViolation[]>([]);
  const [isActive, setIsActive]                 = useState(false);
  const [isBypassed, setIsBypassed]             = useState(false);

  const violationsRef = useRef<BrowserViolation[]>([]);

  const recordViolation = useCallback((
    type:     string,
    reason:   string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ) => {
    const v: BrowserViolation = { type, reason, severity, timestamp: new Date().toISOString() };
    violationsRef.current = [...violationsRef.current, v];
    setLastViolation(v);
    setAllViolations([...violationsRef.current]);
  }, []);

  // ── Display check (Window Management API) ─────────────────────────────
  const checkDisplays = useCallback(() => {
    if (isBypassed) return;
    try {
      const isExtended = (window.screen as any).isExtended ?? false;
      setDisplayCount(isExtended ? 2 : 1);
      setIsDisplayBlocked(isExtended);
      if (isExtended) {
        recordViolation('MULTI_DISPLAY', 'Secondary monitor detected.', 'critical');
      }
    } catch {
      /* API not available — ignore */
    }
  }, [isBypassed, recordViolation]);

  // ── Camera presence check ──────────────────────────────────────────────
  const checkCamera = useCallback(async () => {
    if (isBypassed) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      const lost = videoInputs.length === 0;
      setIsCameraLost(prev => {
        if (lost !== prev) {
          recordViolation(
            'CAMERA_LOST',
            lost ? 'Webcam disconnected during interview.' : 'Webcam reconnected.',
            lost ? 'critical' : 'low',
          );
        }
        return lost;
      });
    } catch { /* DevicesAPI unavailable */ }
  }, [isBypassed, recordViolation]);

  // ── Active proctoring event listeners ─────────────────────────────────
  useEffect(() => {
    if (!isActive || isBypassed) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen.', 'high');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('TAB_SWITCH', 'Candidate switched browser tab.', 'high');
      }
    };

    const handleBlur = () => {
      recordViolation('FOCUS_LOST', 'Focus left the interview window.', 'medium');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.metaKey && e.altKey && e.key === 'i')
      ) {
        e.preventDefault();
        recordViolation('DEVTOOLS', 'DevTools access blocked.', 'high');
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        recordViolation('COPY_PASTE', `Blocked: ${e.key.toUpperCase()}`, 'medium');
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        recordViolation('SCREENSHOT', 'PrintScreen blocked.', 'high');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('RIGHT_CLICK', 'Right-click blocked.', 'low');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    navigator.mediaDevices.addEventListener('devicechange', checkCamera);

    const checkInterval = setInterval(() => {
      checkDisplays();
      checkCamera();
    }, 5000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      navigator.mediaDevices.removeEventListener('devicechange', checkCamera);
      clearInterval(checkInterval);
    };
  }, [isActive, isBypassed, checkCamera, checkDisplays, recordViolation]);

  // ── Start proctoring ───────────────────────────────────────────────────
  const notifyInterviewStarted = useCallback(async () => {
    setIsActive(true);
    violationsRef.current = [];
    setAllViolations([]);
    setLastViolation(null);

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch { /* User may have denied fullscreen */ }

    checkDisplays();
    checkCamera();
  }, [checkDisplays, checkCamera]);

  // ── End proctoring ─────────────────────────────────────────────────────
  const notifyInterviewEnded = useCallback(async () => {
    setIsActive(false);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  // ── Admin bypass (PIN 9999) ────────────────────────────────────────────
  const requestAdminUnlock = useCallback((_reason?: string): void => {
    // In browser mode, unlock modal handles bypass internally
  }, []);

  const bypassSecurity = useCallback((pin: string): boolean => {
    if (pin === '9999') {
      setIsBypassed(true);
      setIsDisplayBlocked(false);
      setIsCameraLost(false);
      return true;
    }
    return false;
  }, []);

  return {
    // Drop-in replacement for useElectronSecurity
    isElectron:           false as const,
    isDisplayBlocked:     isBypassed ? false : isDisplayBlocked,
    displayCount,
    isCameraLost:         isBypassed ? false : isCameraLost,
    lastViolation,
    allViolations,
    isBypassed,
    isActive,
    notifyInterviewStarted,
    notifyInterviewEnded,
    requestAdminUnlock,
    bypassSecurity,
  };
}

export default useBrowserSecurity;
