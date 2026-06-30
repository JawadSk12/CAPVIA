"use client";

import React from "react";
import { ShieldCheck, HelpCircle } from "lucide-react";

export default function IntegritySection() {
  const violations = [
    { name: "Tab / Window Switches", penalty: "-15 pts", type: "Page Visibility API", desc: "Flagged if candidate exits the test interface." },
    { name: "Global Keyboard Hijacks", penalty: "-10 pts", type: "DOM Keydown Listener", desc: "Blocks Copy/Paste, DevTools (F12, Ctrl+Shift+I)." },
    { name: "Gaze/Face Visibility Loss", penalty: "-20 pts", type: "Webcam Landmark Guard", desc: "Flagged if eye direction drifts or faces disappear." },
    { name: "Multi-Display extended", penalty: "Critical Block", type: "Window Management API", desc: "Auto-terminates session if secondary monitors are active." },
  ];

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-integrity-thread" />
          
          {/* Branch to the formula card */}
          <path d="M 600,280 L 480,280 L 400,280" fill="none" stroke="#1976D2" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="400" cy="280" r="3" fill="#1976D2" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Column: Copy Info & Formula */}
        <div className="lg:col-span-5 space-y-6 lg:order-first order-last text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 shadow-sm text-slate-650 text-[10px] font-black tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D47A1]" />
            Phase 4: Trust Audits
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            Automated Integrity Trust Index
          </h2>
          
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Secure, low-friction browser proctoring fuses risk parameters from all evaluation phases into a single composite Trust Index.
          </p>

          {/* Formula Block - Developer Console style */}
          <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(13,71,161,0.1)] transition-all duration-300">
            <div className="flex items-center space-x-2 text-slate-500 mb-3.5">
              <HelpCircle className="w-4 h-4 text-[#42A5F5]" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Calibration Weights Formula</span>
            </div>
            <code className="text-[11px] text-[#42A5F5] font-mono block leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-900 overflow-x-auto whitespace-pre">
              Trust_Index = (Integrity * 0.45) 
              + ((1 - AI_Dep) * 100 * 0.30) 
              + (ATS_Norm * 0.25)
            </code>
            <p className="mt-3 text-[10px] text-slate-550 font-mono">
              &gt; Weights configurable dynamically. <span className="animate-pulse">_</span>
            </p>
          </div>
        </div>

        {/* Right Column: Violations Matrix Grid with Asymmetric geometry */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {violations.map((v) => (
            <div
              key={v.name}
              className="bg-white border border-slate-200/50 p-6 rounded-tr-[32px] rounded-bl-[32px] rounded-tl-xl rounded-br-xl shadow-md hover:shadow-2xl hover:border-[#1976D2]/30 hover:-translate-y-1 hover:rotate-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 font-outfit">{v.name}</span>
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    v.penalty === "Critical Block"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : "bg-amber-50 text-amber-700 border border-amber-100"
                  }`}
                >
                  {v.penalty}
                </span>
              </div>
              <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono block w-max mb-3">
                {v.type}
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                {v.desc}
              </p>
            </div>
          ))}
        </div>

      </div>

      <style jsx global>{`
        @keyframes integrity-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-integrity-thread {
          animation: integrity-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
