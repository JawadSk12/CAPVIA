"use client";

import React, { useState } from "react";
import { X, Check, FileText, Activity } from "lucide-react";

export default function Comparison() {
  const [activeSide, setActiveSide] = useState<"left" | "right">("right");

  return (
    <section id="why-capvia" className="relative py-32 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 700" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="700" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="700" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-comp-thread" />
          
          {/* Branch Left (Traditional Resume Trap) */}
          <path d="M 600,320 L 480,320 L 420,320" fill="none" stroke="#E11D48" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="420" cy="320" r="3" fill="#E11D48" fillOpacity="0.5" />

          {/* Branch Right (Verified Capability) */}
          <path d="M 600,320 L 720,320 L 780,320" fill="none" stroke="#10B981" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="780" cy="320" r="3" fill="#10B981" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-24 space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 text-slate-650 text-[10px] font-black tracking-widest uppercase shadow-sm">
            Recruitment Paradigm Shift
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-outfit tracking-tighter leading-none">
            Resume Trap vs Verified DNA
          </h2>
          <p className="text-base text-slate-500 max-w-md mx-auto font-medium">
            Traditional hiring relies on keyword-stuffed claims. CAPVIA verifies actual capabilities under sandbox conditions.
          </p>
        </div>

        {/* Visual Comparison Split Screen with Asymmetric geometries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          
          {/* Left Panel: Traditional Resume (Light Warning Theme) */}
          <div 
            onClick={() => setActiveSide("left")}
            className={`border transition-all duration-500 cursor-pointer relative overflow-hidden p-8 md:p-12 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl ${
              activeSide === "left"
                ? "bg-white border-red-200 shadow-2xl scale-[1.01]"
                : "bg-white/40 border-slate-200/50 opacity-60 hover:opacity-90"
            }`}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-50/50 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-sm">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight font-outfit">The Resume Trap</h3>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Unverified Credentials</p>
              </div>
            </div>

            {/* Resume mockup showing static stats */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mb-8 relative font-mono text-[10px]">
              <div className="flex items-center gap-2.5 mb-4 select-none">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-650">Standard Resume.pdf</span>
              </div>
              <div className="space-y-2 opacity-50 select-none">
                <div className="h-1.5 bg-slate-200 rounded w-3/4" />
                <div className="h-1.5 bg-slate-200 rounded w-1/2" />
                <div className="h-1.5 bg-slate-200 rounded w-5/6" />
              </div>
              <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                {["Python Expert", "SQL Guru", "AI Specialist"].map((kw) => (
                  <span key={kw} className="text-[8px] font-bold text-red-650 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-sans">
                    {kw} (Self-Reported)
                  </span>
                ))}
              </div>
            </div>

            <ul className="space-y-3.5 text-slate-500 text-xs font-medium">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <span>Arbitrary matching based on keyword density.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <span>Blind trust leads to high copy-paste and AI abuse rates.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <span>Weeks of manual screening and interview bottlenecks.</span>
              </li>
            </ul>
          </div>

          {/* Right Panel: CAPVIA (Dark Glass Theme) */}
          <div 
            onClick={() => setActiveSide("right")}
            className={`border transition-all duration-500 cursor-pointer relative overflow-hidden p-8 md:p-12 rounded-tl-[36px] rounded-br-[36px] rounded-tr-xl rounded-bl-xl ${
              activeSide === "right"
                ? "bg-slate-950 border-[#42A5F5]/30 shadow-2xl text-slate-300 scale-[1.01]"
                : "bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-90 text-slate-400"
            }`}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#42A5F5]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-450 shadow-sm">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 tracking-tight font-outfit">Verified Capability</h3>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Multi-Signal DNA Passport</p>
              </div>
            </div>

            {/* Capability mockup showing verified telemetry */}
            <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-5 mb-8 relative font-mono text-[10px] text-slate-400">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-450 animate-pulse" />
                  <span className="font-bold text-slate-200">Verified DNA Fingerprint</span>
                </div>
                <span className="text-[8px] font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/20 tracking-wide uppercase font-sans">Score: 92/100</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Proctored IDE Score", pct: 90, color: "bg-[#0D47A1]" },
                  { label: "AI Interview Integrity", pct: 95, color: "bg-emerald-500" },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                      <span>{row.label}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ul className="space-y-3.5 text-slate-450 text-xs font-medium">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Verified technical execution and semantic alignment.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Anti-fraud telemetries for absolute response integrity.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Instant automated shortlists and verified rankings.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes comp-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-comp-thread {
          animation: comp-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
