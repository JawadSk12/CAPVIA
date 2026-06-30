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
import { Monitor, Camera, AlertOctagon, ShieldAlert, Key } from 'lucide-react';

interface KioskOverlayProps {
  isDisplayBlocked: boolean;
  displayCount:     number;
  isCameraLost:     boolean;
  onOpenUnlock?:    () => void;
}

export const KioskOverlay: React.FC<KioskOverlayProps> = ({
  isDisplayBlocked,
  displayCount,
  isCameraLost,
  onOpenUnlock,
}) => {
  const show = isDisplayBlocked || isCameraLost;
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex:          9999,
        background:      'rgba(248, 250, 252, 0.96)',
        backdropFilter:  'blur(6px)',
        userSelect:      'none',
        WebkitUserSelect:'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* threat rings */}
      <div className="absolute w-96 h-96 rounded-full border-2 border-[#EF4444]/10 animate-pulse" />
      <div className="absolute w-80 h-80 rounded-full border border-[#EF4444]/5 animate-ping" style={{ animationDuration: '3s' }} />

      {/* Card */}
      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white border-2 border-[#EF4444] rounded-[24px] p-8 text-center shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 border-2 border-[#EF4444]/20 flex items-center justify-center">
                {isDisplayBlocked
                  ? <Monitor className="w-8 h-8 text-[#EF4444]" />
                  : <Camera  className="w-8 h-8 text-[#EF4444]" />
                }
              </div>
              <div className="absolute -top-1 -right-1">
                <AlertOctagon className="w-5 h-5 text-[#EF4444] animate-bounce" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {isDisplayBlocked ? 'Multiple Displays Detected' : 'Webcam Stream Offline'}
            </h2>
          </div>

          {/* Subtitle */}
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {isDisplayBlocked
              ? `There are currently ${displayCount} monitors active. Please disconnect any external screens to proceed.`
              : 'Your camera is disconnected or blocked. Please restore the camera connection to resume your session.'}
          </p>

          {/* Instruction list */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-5 mb-6 text-left">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Required Actions:</h4>
            {isDisplayBlocked ? (
              <ul className="text-xs text-slate-650 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-[#EF4444] font-bold">•</span>
                  <span>Unplug all external display cables (HDMI, DP, USB-C)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#EF4444] font-bold">•</span>
                  <span>The proctoring system will resume automatically once one monitor remains</span>
                </li>
              </ul>
            ) : (
              <ul className="text-xs text-slate-650 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-[#EF4444] font-bold">•</span>
                  <span>Check your device connections or reload browser permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#EF4444] font-bold">•</span>
                  <span>The session is paused; no evaluation or video is being recorded</span>
                </li>
              </ul>
            )}
          </div>

          {/* Supervisor bypass CTA */}
          {onOpenUnlock && (
            <button
              onClick={onOpenUnlock}
              className="w-full py-3 px-4 mb-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all font-bold text-xs flex items-center justify-center gap-2 hover:border-slate-350 shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              Supervisor Override Unlock
            </button>
          )}

          {/* Telemetry log notice */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
            Security telemetry log active
          </div>
        </div>
      </div>
    </div>
  );
};
