/**
 * AdminUnlockModal.tsx
 * Hidden admin unlock modal — triggered by a secret key combo
 * (Shift + Ctrl + Alt + X) inside the renderer as a fallback.
 *
 * The actual PIN validation happens in the Electron main process
 * via IPC — the renderer only triggers the prompt, it cannot
 * access or spoof the PIN.
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Lock } from 'lucide-react';

interface AdminUnlockModalProps {
  onRequestUnlock: () => void;
}

export const AdminUnlockModal: React.FC<AdminUnlockModalProps> = ({ onRequestUnlock }) => {
  const [triggered, setTriggered] = useState(false);

  // Listen for secret key combo: Shift + Ctrl + Alt + X
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.ctrlKey && e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        e.stopPropagation();
        setTriggered(true);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, []);

  if (!triggered) return null;

  const handleProceed = () => {
    setTriggered(false);
    onRequestUnlock(); // delegates to Electron main process via IPC
  };

  const handleCancel = () => setTriggered(false);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="max-w-sm w-full mx-4 rounded-2xl border border-slate-600 p-8 text-center"
        style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)' }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-slate-700/60 border border-slate-500 flex items-center justify-center">
            <Lock className="w-8 h-8 text-slate-300" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-slate-400" />
          <h2 className="text-xl font-black text-white">Admin Unlock</h2>
        </div>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          A PIN dialog will open. Enter the admin PIN to unlock and exit this session.
          All attempts are logged.
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500 font-mono">
            PIN validation happens in secure main process
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCancel}
            className="py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            className="py-2.5 px-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white transition-colors text-sm font-semibold"
          >
            Enter PIN
          </button>
        </div>
      </div>
    </div>
  );
};
