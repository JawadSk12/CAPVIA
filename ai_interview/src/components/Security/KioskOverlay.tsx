/**
 * KioskOverlay.tsx
 * Full-screen blocking overlay shown when a critical security condition
 * prevents the interview from continuing:
 *   1. Multiple monitors detected
 *   2. Camera stream lost
 *
 * This overlay sits above ALL other content (z-index: 9999) and
 * prevents any interaction with the interview UI beneath it.
 */

import React from 'react';
import { Monitor, Camera, AlertOctagon, ShieldAlert } from 'lucide-react';

interface KioskOverlayProps {
  /** Show the multi-display block */
  isDisplayBlocked: boolean;
  /** Number of currently connected displays */
  displayCount:     number;
  /** Show the camera-lost block */
  isCameraLost:     boolean;
}

export const KioskOverlay: React.FC<KioskOverlayProps> = ({
  isDisplayBlocked,
  displayCount,
  isCameraLost,
}) => {
  const show = isDisplayBlocked || isCameraLost;
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex:          9999,
        background:      'rgba(10, 10, 30, 0.97)',
        userSelect:      'none',
        WebkitUserSelect:'none',
      }}
      // Block all pointer events on the layer beneath
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(220,38,38,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Pulsing threat ring */}
      <div className="absolute w-96 h-96 rounded-full border-2 border-red-500/30 animate-ping" />
      <div className="absolute w-80 h-80 rounded-full border border-red-500/20 animate-pulse" />

      {/* Card */}
      <div className="relative z-10 max-w-lg w-full mx-4">
        <div
          className="rounded-2xl border-2 border-red-500/60 p-8 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(30,10,10,0.98) 0%, rgba(20,5,5,0.98) 100%)',
            boxShadow:  '0 0 60px rgba(220,38,38,0.3), 0 0 120px rgba(220,38,38,0.1)',
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                {isDisplayBlocked
                  ? <Monitor className="w-10 h-10 text-red-400" />
                  : <Camera  className="w-10 h-10 text-red-400" />
                }
              </div>
              <div className="absolute -top-1 -right-1">
                <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-2xl font-black text-white tracking-tight">
              {isDisplayBlocked ? 'Multiple Displays Detected' : 'Camera Disconnected'}
            </h2>
          </div>

          {/* Subtitle */}
          <p className="text-red-300 text-base mb-6 leading-relaxed">
            {isDisplayBlocked
              ? `${displayCount} displays are connected. Disconnect all secondary monitors to continue.`
              : 'Your camera stream has been interrupted. Please reconnect your webcam to resume.'}
          </p>

          {/* Instruction box */}
          <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 mb-6">
            {isDisplayBlocked ? (
              <ul className="text-sm text-red-200 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">●</span>
                  <span>Unplug or disconnect all external monitors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">●</span>
                  <span>The interview will resume automatically once one display remains</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">●</span>
                  <span>This violation has been recorded in your session log</span>
                </li>
              </ul>
            ) : (
              <ul className="text-sm text-red-200 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">●</span>
                  <span>Check that your webcam is properly connected</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">●</span>
                  <span>The interview is paused — no responses are being recorded</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">●</span>
                  <span>The interview will resume automatically when the camera is restored</span>
                </li>
              </ul>
            )}
          </div>

          {/* Session logged notice */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs text-red-400 font-semibold tracking-wider uppercase">
              Violation Recorded · Session Monitoring Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
