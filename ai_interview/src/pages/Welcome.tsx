import React, { useEffect } from 'react';
import { Shield, Video, Clock, FileCheck, CheckCircle, Wifi, Monitor, Mic, AlertCircle } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface WelcomeProps {
  onStart: () => void;
}

const RequirementItem: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <li className="flex items-center gap-3 text-sm text-slate-600">
    <span className="flex-shrink-0 w-5 h-5 text-[#10B981]">{icon}</span>
    {text}
  </li>
);

export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  useEffect(() => {
    StorageService.clearValidationData();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #EEF4FF 50%, #F0F9FF 100%)' }}
    >
      {/* Subtle ambient blobs */}
      <div
        className="fixed top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #42A5F5 0%, transparent 70%)', filter: 'blur(80px)' }}
      />
      <div
        className="fixed bottom-0 right-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFC107 0%, transparent 70%)', filter: 'blur(80px)' }}
      />

      <div className="relative z-10 w-full max-w-5xl">

        {/* ── Header ── */}
        <div className="text-center mb-10 slide-up">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)' }}>
            <Video className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'rgba(13,71,161,0.08)', color: '#0D47A1', border: '1px solid rgba(13,71,161,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            AI-Powered Interview
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-3">
            Welcome to{' '}
            <span style={{ color: '#0D47A1' }}>CAPVIA</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Intelligent video interview platform — powered by AI, designed for fairness.
          </p>
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden slide-up slide-up-delay-1">

          {/* Top strip */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0D47A1 0%, #42A5F5 60%, #FFC107 100%)' }} />

          <div className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-10">

              {/* LEFT: Interview Info */}
              <div className="space-y-7">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Interview Overview</h2>
                  <p className="text-sm text-slate-500">Please review the following information before beginning.</p>
                </div>

                {/* Info cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Clock, label: 'Duration', value: '20–30 min', color: '#0D47A1' },
                    { icon: FileCheck, label: 'Questions', value: '5 AI Questions', color: '#42A5F5' },
                    { icon: Video, label: 'Recording', value: 'Video + Audio', color: '#10B981' },
                    { icon: Shield, label: 'Proctored', value: 'AI Monitored', color: '#FFC107' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Requirements */}
                <div className="p-5 rounded-2xl border border-slate-100 bg-[#F8FAFC]">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Before you begin</h3>
                  <ul className="space-y-2.5">
                    <RequirementItem icon={<Monitor className="w-4 h-4" />} text="Use Google Chrome or Microsoft Edge" />
                    <RequirementItem icon={<Mic className="w-4 h-4" />} text="Working camera and microphone required" />
                    <RequirementItem icon={<Wifi className="w-4 h-4" />} text="Stable internet (min. 3 Mbps)" />
                    <RequirementItem icon={<CheckCircle className="w-4 h-4" />} text="Quiet, well-lit environment" />
                    <RequirementItem icon={<AlertCircle className="w-4 h-4" />} text="Do not switch tabs or close the window" />
                  </ul>
                </div>
              </div>

              {/* RIGHT: Illustration + CTA */}
              <div className="flex flex-col justify-between">
                {/* Illustration */}
                <div className="relative flex-1 flex items-center justify-center">
                  <div
                    className="w-full max-w-xs aspect-square rounded-3xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(145deg, #EEF4FF 0%, #F0F9FF 100%)', border: '1.5px solid rgba(13,71,161,0.1)' }}
                  >
                    <div className="text-center space-y-4 p-8">
                      {/* Animated camera icon */}
                      <div className="relative mx-auto w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #0D47A1, #1976D2)' }}>
                        <Video className="w-10 h-10 text-white" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] border-2 border-white flex items-center justify-center">
                          <div className="rec-dot" style={{ width: 6, height: 6 }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-800">AI Interview Session</div>
                        <div className="text-xs text-slate-500">5 Progressive Questions</div>
                      </div>

                      {/* Progress steps */}
                      <div className="flex items-center justify-center gap-1">
                        {['Device', 'Permissions', 'Interview', 'Results'].map((step, i) => (
                          <React.Fragment key={step}>
                            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#0D47A1]' : 'bg-slate-300'}`} />
                            {i < 3 && <div className="w-4 h-px bg-slate-200" />}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="text-xs text-slate-400">Step 1 of 4</div>
                    </div>
                  </div>
                </div>

                {/* CTA section */}
                <div className="mt-6 space-y-4">
                  {/* Privacy notice */}
                  <div className="p-3.5 rounded-xl text-xs text-slate-600 leading-relaxed"
                    style={{ background: 'rgba(13,71,161,0.04)', border: '1px solid rgba(13,71,161,0.1)' }}>
                    <span className="font-semibold text-[#0D47A1]">Privacy Notice:</span>{' '}
                    By proceeding, you consent to being recorded. Data is encrypted and used solely for hiring evaluation.
                  </div>

                  {/* Start button */}
                  <button
                    onClick={onStart}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
                      boxShadow: '0 4px 20px rgba(13,71,161,0.35)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(13,71,161,0.42)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(13,71,161,0.35)'; }}
                  >
                    <Video className="w-5 h-5" />
                    Begin System Validation
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    Your camera and microphone will be tested first
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by <span className="font-bold text-[#0D47A1]">CAPVIA</span> — AI Interview Intelligence Platform
        </p>
      </div>
    </div>
  );
};