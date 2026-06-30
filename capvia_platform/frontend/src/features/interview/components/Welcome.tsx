import React, { useEffect, useState } from 'react';
import { Shield, Video, Clock, FileCheck, CheckCircle, AlertTriangle, Monitor } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { StorageService } from '../services/storageService';

interface WelcomeProps {
  onStart: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  const [browserSupport, setBrowserSupport] = useState({
    mediaDevices: false,
    getUserMedia: false,
    webSpeech: false,
    fullscreen: false,
  });

  useEffect(() => {
    StorageService.clearValidationData();
    
    // Check browser compatibility
    setBrowserSupport({
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webSpeech: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
      fullscreen: !!document.documentElement.requestFullscreen,
    });
  }, []);

  const allSystemChecksOk = browserSupport.mediaDevices && browserSupport.getUserMedia;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 font-sans text-slate-800 bg-white">
      
      {/* Step Badge */}
      <div className="inline-flex items-center gap-2 bg-[#0D47A1]/10 border border-[#0D47A1]/20 rounded-full px-4 py-1.5 mb-6">
        <span className="w-2 h-2 rounded-full bg-[#0D47A1] animate-pulse" />
        <span className="text-[#0D47A1] text-xs font-bold tracking-widest uppercase">System Initialization</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl w-full">
        
        {/* LEFT COLUMN: Illustration & Brand details (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">
              Secure AI Verbal<br />
              <span className="bg-gradient-to-r from-[#0D47A1] to-[#42A5F5] bg-clip-text text-transparent">
                Capability Assessment
              </span>
            </h1>
            <p className="text-slate-500 text-sm max-w-lg leading-relaxed">
              Welcome to the CAPVIA voice evaluation terminal. This AI-guided workspace measures domain-specific depth, verbal reasoning, and execution capability in a secure proctored environment.
            </p>
          </div>

          {/* Premium Illustration (SVG) */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-[24px] p-8 flex items-center justify-center relative overflow-hidden h-64 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#42A5F5]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0D47A1]/5 rounded-full blur-3xl" />
            
            <svg viewBox="0 0 200 200" className="w-48 h-48 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" fill="url(#circleGrad)" fillOpacity="0.08" stroke="url(#strokeGrad)" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="100" cy="100" r="55" fill="none" stroke="#0D47A1" strokeWidth="1.5" strokeOpacity="0.2" />
              {/* Shield representing security */}
              <path d="M100 65 L125 75 V105 C125 125 110 138 100 142 C90 138 75 125 75 105 V75 L100 65 Z" fill="white" stroke="#0D47A1" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M100 80 V115" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
              <path d="M90 98 L100 108 L112 90" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {/* Orbiting particles */}
              <circle cx="150" cy="65" r="4" fill="#FFC107" />
              <circle cx="50" cy="135" r="5" fill="#42A5F5" />
              <circle cx="140" cy="140" r="3" fill="#10B981" />
              
              <defs>
                <linearGradient id="circleGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0D47A1" />
                  <stop offset="1" stopColor="#42A5F5" />
                </linearGradient>
                <linearGradient id="strokeGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0D47A1" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#42A5F5" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Privacy Box */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-[11px] text-amber-850 leading-relaxed font-semibold">
              ⚠️ <strong>Privacy Statement:</strong> In proceeding, you authorize CAPVIA to record video and sound from your webcam. Data is encrypted and strictly utilized for qualification evaluations.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Info Cards & CTA (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Interview Details Card */}
          <Card className="p-5 border border-slate-100 shadow-sm bg-white rounded-[24px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Interview Profile</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#0D47A1]/5 rounded-xl text-[#0D47A1]">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Assessment Type</div>
                  <div className="text-xs font-bold text-slate-800">AI Speech Proctoring</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#0D47A1]/5 rounded-xl text-[#0D47A1]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Duration</div>
                  <div className="text-xs font-bold text-slate-800">20-30 minutes (5 progressive rounds)</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#0D47A1]/5 rounded-xl text-[#0D47A1]">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Requirements</div>
                  <div className="text-xs font-bold text-slate-800">Camera, Mic, Headset, Single Display</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Browser System Check Card */}
          <Card className="p-5 border border-slate-100 shadow-sm bg-[#F8FAFC] rounded-[24px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Browser Compatibility</h3>
            <div className="space-y-3">
              {[
                { label: 'Web Media Devices API', ok: browserSupport.mediaDevices },
                { label: 'Camera & Microphone Access', ok: browserSupport.getUserMedia },
                { label: 'HTML5 Fullscreen API', ok: browserSupport.fullscreen },
                { label: 'Web Speech Synthesis / Recognition', ok: browserSupport.webSpeech },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100/50 last:border-0">
                  <span className="text-xs text-slate-600 font-medium">{item.label}</span>
                  {item.ok ? (
                    <span className="text-[#10B981] font-bold text-xs flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Supported
                    </span>
                  ) : (
                    <span className="text-[#EF4444] font-bold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Incompatible
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* CTA Action */}
          <div className="space-y-3">
            <Button
              onClick={onStart}
              disabled={!allSystemChecksOk}
              className={`w-full py-4 rounded-xl font-bold text-sm shadow-md transition-all duration-205 flex items-center justify-center gap-2 ${
                allSystemChecksOk
                  ? 'bg-[#0D47A1] text-white hover:bg-[#0b3c8a] hover:scale-[1.01]'
                  : 'bg-slate-100 text-slate-450 cursor-not-allowed border border-slate-200'
              }`}
            >
              Start System Diagnostics →
            </Button>
            {!allSystemChecksOk && (
              <p className="text-[10px] text-center text-[#EF4444] font-bold animate-pulse">
                🚫 Missing camera/microphone permissions or unsupported browser.
              </p>
            )}
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Secure Browser-Native Proctoring Sandbox
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
export default Welcome;