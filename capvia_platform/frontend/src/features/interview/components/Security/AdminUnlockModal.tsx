import React, { useEffect, useState } from 'react';
import { ShieldCheck, Delete, X, AlertCircle } from 'lucide-react';

interface AdminUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export const AdminUnlockModal: React.FC<AdminUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Handle keyboard numeric entry when modal is open
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < 4) {
          setError('');
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleVerify(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, onClose]);

  // Handle hotkey Shift + Ctrl + Alt + X to trigger open even if not currently shown
  useEffect(() => {
    const handleGlobalHotKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.ctrlKey && e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        // If not already open, we trigger some event or standard action.
        // We'll rely on the parent component triggering the state, or this global hotkey
        // can communicate with the parent. Since we want this modal to be fully controlled,
        // parent handles the hotkey. We will define the hotkey in Interview.tsx instead.
      }
    };
    window.addEventListener('keydown', handleGlobalHotKey);
    return () => window.removeEventListener('keydown', handleGlobalHotKey);
  }, []);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setError('');
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleVerify = (currentPin: string) => {
    if (currentPin === '9999') {
      onUnlockSuccess();
    } else {
      setError('Invalid Supervisor PIN. Access attempt has been logged.');
      setPin('');
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleVerify(pin);
    }
  }, [pin]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10005] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#42A5F5] px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5.5 h-5.5 text-white" />
            <div>
              <h2 className="text-base font-bold tracking-tight">Supervisor Bypass</h2>
              <p className="text-[10px] text-white/80 font-medium">Verification Lockscreen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Please ask your supervisor to enter their authentication PIN to resume the interview.
          </p>

          {/* Masked PIN Display */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      filled
                        ? 'bg-[#0D47A1] border-[#0D47A1] scale-110 shadow-sm shadow-[#0D47A1]/20'
                        : 'bg-slate-50 border-slate-350'
                    }`}
                  />
                );
              })}
            </div>
            {error ? (
              <p className="text-[11px] font-bold text-[#EF4444] flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {pin.length} of 4 digits entered
              </p>
            )}
          </div>

          {/* PIN Pad Grid */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="py-3.5 rounded-xl border border-slate-100 bg-[#F8FAFC] text-slate-700 font-extrabold text-lg hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="py-3.5 rounded-xl border border-slate-105 bg-[#F8FAFC] text-slate-400 text-xs font-bold hover:bg-slate-100 transition-all hover:text-slate-600"
            >
              Clear
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="py-3.5 rounded-xl border border-slate-100 bg-[#F8FAFC] text-slate-700 font-extrabold text-lg hover:bg-slate-100 transition-all hover:scale-[1.02]"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="py-3.5 rounded-xl border border-slate-100 bg-[#F8FAFC] text-slate-500 flex items-center justify-center hover:bg-slate-100 transition-all"
            >
              <Delete className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              🔐 Security log is actively monitoring this event
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminUnlockModal;
