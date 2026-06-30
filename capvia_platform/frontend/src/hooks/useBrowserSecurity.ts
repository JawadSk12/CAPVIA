import { useState, useEffect, useCallback, useRef } from 'react';
import { IntegrityService } from '../services/integrityService';

export interface BrowserViolation {
  type:      string;
  reason:    string;
  severity:  'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export function useBrowserSecurity() {
  const [isDisplayBlocked, setIsDisplayBlocked] = useState(false);
  const [displayCount, setDisplayCount] = useState(1);
  const [isCameraLost, setIsCameraLost] = useState(false);
  const [lastViolation, setLastViolation] = useState<BrowserViolation | null>(null);
  const [allViolations, setAllViolations] = useState<BrowserViolation[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  const recordViolation = useCallback((type: string, reason: string) => {
    IntegrityService.reportViolation(type, reason);
    const violationList = IntegrityService.getViolations();
    const last = violationList[violationList.length - 1];

    const browserViol: BrowserViolation = {
      type:      last?.type || type,
      reason:    last?.message || reason,
      severity:  last?.severity || 'medium',
      timestamp: last?.timestamp || new Date().toISOString(),
    };

    setLastViolation(browserViol);
    setAllViolations(
      violationList.map((v) => ({
        type:      v.type,
        reason:    v.message,
        severity:  v.severity,
        timestamp: v.timestamp,
      }))
    );
  }, []);

  // 1. Monitor Displays (Window Management API check)
  const checkDisplays = useCallback(async () => {
    if (isBypassed) return;
    try {
      const isExtended = (window.screen as any).isExtended || false;
      setDisplayCount(isExtended ? 2 : 1);
      setIsDisplayBlocked(isExtended);
      if (isExtended) {
        recordViolation('MULTI_DISPLAY', 'Secondary monitor detected.');
      }
    } catch (err) {
      console.warn('[BrowserSecurity] Display check error:', err);
    }
  }, [isBypassed, recordViolation]);

  // 2. Monitor Webcams
  const checkCamera = useCallback(async () => {
    if (isBypassed) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoinputs = devices.filter((d) => d.kind === 'videoinput');
      const lost = videoinputs.length === 0;
      if (lost !== isCameraLost) {
        setIsCameraLost(lost);
        if (lost) {
          recordViolation('CAMERA_LOST', 'Webcam stream lost or disconnected.');
        } else {
          recordViolation('CAMERA_LOST', 'Webcam stream reconnected.');
        }
      }
    } catch (err) {
      console.warn('[BrowserSecurity] Camera check error:', err);
    }
  }, [isBypassed, isCameraLost, recordViolation]);

  // 3. Document Visibility & Fullscreen handlers
  useEffect(() => {
    if (!isActive || isBypassed) return;

    // Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen kiosk mode.');
      }
    };

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('TAB_SWITCH', 'Candidate switched to another browser tab.');
      }
    };

    // Window focus loss detection
    const handleBlur = () => {
      recordViolation('FOCUS_LOST', 'Candidate focus shifted outside the interview window.');
    };

    // Block keyboard copy/paste, printscreen, right-clicks
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (DevTools), Ctrl+Shift+I, Cmd+Option+I
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.metaKey && e.altKey && e.key === 'i')
      ) {
        e.preventDefault();
        recordViolation('KEYBOARD_BLOCKED', 'Developer console access blocked.');
      }

      // Block copy/paste/cut
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        recordViolation('COPY_PASTE', `Blocked keyboard shortcut: ${e.key.toUpperCase()}`);
      }

      // Block printscreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        recordViolation('KEYBOARD_BLOCKED', 'Blocked PrintScreen key.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('RIGHT_CLICK', 'Blocked mouse right-click.');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Device change listener
    navigator.mediaDevices.addEventListener('devicechange', checkCamera);

    // Interval checks
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

  const notifyInterviewStarted = useCallback(async () => {
    setIsActive(true);
    IntegrityService.initialize();
    
    // Enter fullscreen kiosk
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('[BrowserSecurity] Cannot force fullscreen:', err);
    }
    
    checkDisplays();
    checkCamera();
    console.log('[BrowserSecurity] Proctoring session started.');
  }, [checkDisplays, checkCamera]);

  const notifyInterviewEnded = useCallback(async () => {
    setIsActive(false);
    
    // Exit fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[BrowserSecurity] Cannot exit fullscreen:', err);
    }
    
    console.log('[BrowserSecurity] Proctoring session completed.');
  }, []);

  const bypassSecurity = useCallback((pin: string): boolean => {
    if (pin === '9999') {
      setIsBypassed(true);
      setIsDisplayBlocked(false);
      setIsCameraLost(false);
      console.log('[BrowserSecurity] Supervisor bypass granted via PIN.');
      return true;
    }
    return false;
  }, []);

  return {
    isElectron: false,
    isDisplayBlocked: isBypassed ? false : isDisplayBlocked,
    displayCount,
    isCameraLost: isBypassed ? false : isCameraLost,
    lastViolation,
    allViolations,
    isBypassed,
    bypassSecurity,
    notifyInterviewStarted,
    notifyInterviewEnded,
  };
}
export default useBrowserSecurity;
