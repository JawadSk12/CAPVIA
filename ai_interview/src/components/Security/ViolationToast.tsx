/**
 * ViolationToast.tsx
 * Slide-in toast notification shown at the top-center of the screen
 * whenever a security violation is detected (from either the Electron
 * main process or the browser-level listeners).
 *
 * Features:
 *  - Queue-based: multiple violations don't stack messily
 *  - Auto-dismiss after 3.5 seconds
 *  - Color-coded by severity
 *  - Slide-in + fade-out animation
 */

import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastViolation {
  id:        string;
  type:      string;
  reason:    string;
  severity:  'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

interface ViolationToastProps {
  violation: ToastViolation | null;
}

const SEVERITY_STYLES = {
  critical: {
    bg:     'bg-red-950/95 border-red-500',
    title:  'text-red-300',
    text:   'text-red-100',
    icon:   <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />,
    label:  'CRITICAL',
    labelCls: 'bg-red-500 text-white',
  },
  high: {
    bg:     'bg-orange-950/95 border-orange-500',
    title:  'text-orange-300',
    text:   'text-orange-100',
    icon:   <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />,
    label:  'HIGH',
    labelCls: 'bg-orange-500 text-white',
  },
  medium: {
    bg:     'bg-yellow-950/95 border-yellow-500',
    title:  'text-yellow-300',
    text:   'text-yellow-100',
    icon:   <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />,
    label:  'MEDIUM',
    labelCls: 'bg-yellow-600 text-white',
  },
  low: {
    bg:     'bg-blue-950/95 border-blue-500',
    title:  'text-blue-300',
    text:   'text-blue-100',
    icon:   <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />,
    label:  'LOW',
    labelCls: 'bg-blue-500 text-white',
  },
};

const FRIENDLY_NAMES: Record<string, string> = {
  KEYBOARD_BLOCKED:  '⌨️ Shortcut Blocked',
  FOCUS_LOST:        '👁️ Focus Lost',
  MULTI_DISPLAY:     '🖥️ Multiple Displays',
  CAMERA_LOST:       '📷 Camera Offline',
  CLOSE_ATTEMPT:     '🚫 Close Blocked',
  MINIMIZE_ATTEMPT:  '🚫 Minimise Blocked',
  QUIT_ATTEMPT:      '🚫 Quit Blocked',
  TAB_SWITCH:        '🔀 Tab Switch',
  COPY_PASTE:        '📋 Copy/Paste Blocked',
  RIGHT_CLICK:       '🖱️ Right-Click Blocked',
};

export const ViolationToast: React.FC<ViolationToastProps> = ({ violation }) => {
  const [visible,  setVisible]  = useState(false);
  const [current,  setCurrent]  = useState<ToastViolation | null>(null);
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef                = useRef<ToastViolation[]>([]);

  // Enqueue each new violation
  useEffect(() => {
    if (!violation) return;
    queueRef.current.push(violation);
    if (!visible) showNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violation]);

  function showNext() {
    const next = queueRef.current.shift();
    if (!next) { setVisible(false); return; }
    setCurrent(next);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      // After fade-out, show next in queue
      setTimeout(() => showNext(), 400);
    }, 3500);
  }

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => showNext(), 400);
  };

  if (!current) return null;

  const s = SEVERITY_STYLES[current.severity] || SEVERITY_STYLES.medium;
  const title = FRIENDLY_NAMES[current.type] || `⚠️ ${current.type}`;

  return (
    <div
      className={[
        'fixed top-4 left-1/2 -translate-x-1/2 z-[9998]',
        'max-w-md w-full mx-4',
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4 pointer-events-none',
      ].join(' ')}
    >
      <div
        className={`rounded-xl border-2 px-4 py-3 shadow-2xl backdrop-blur-sm ${s.bg}`}
        style={{ boxShadow: '0 0 30px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-start gap-3">
          {s.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-black px-1.5 py-0.5 rounded ${s.labelCls}`}>
                {s.label}
              </span>
              <span className={`text-sm font-bold ${s.title}`}>{title}</span>
            </div>
            <p className={`text-xs leading-relaxed truncate ${s.text}`}>{current.reason}</p>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
