"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

export default function AtsSection() {
  const matchedSkills = ["TypeScript", "Next.js", "SQL", "TailwindCSS", "Node.js", "Docker"];
  const missingSkills = ["Kubernetes", "GraphQL", "Redis"];

  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2); // -1 to 1
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2); // -1 to 1
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          {/* Central vertical line */}
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-ats-thread" />
          
          {/* Branch to the parser card */}
          <path d="M 600,240 L 480,240 L 400,240" fill="none" stroke="#1976D2" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="400" cy="240" r="3" fill="#1976D2" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Column: Visual Showcase (ATS Interface Console Panel - Dark Glass UI) */}
        <div className="lg:col-span-6 flex justify-center w-full">
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${-tilt.y * 6}deg) rotateY(${tilt.x * 6}deg) translateY(${-tilt.y * 5}px)`,
              transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
            }}
            className="w-full max-w-lg bg-slate-950 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-900/40 border border-slate-850 hover:shadow-[0_0_40px_rgba(13,71,161,0.15)] group relative text-slate-350 font-mono"
          >
            
            {/* Window Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[10px] text-slate-500 pl-4">ats_screener.py</span>
              </div>
              <span className="text-[9px] text-[#42A5F5] font-black uppercase tracking-wider bg-[#42A5F5]/10 px-2 py-0.5 rounded border border-[#42A5F5]/20">
                SYSTEM_ACTIVE
              </span>
            </div>

            {/* Console Details */}
            <div className="mb-6 text-[10px] text-slate-500 flex items-center justify-between select-none">
              <span>[PROCESS_ID: ATS_RE-0941]</span>
              <span>COMPILER: V3.1.2</span>
            </div>

            {/* Score Bar with Live interface layout */}
            <div className="mb-8 p-4 bg-slate-900/60 border border-slate-900 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0D47A1]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-450 uppercase font-black">Semantic Match Score</span>
                <span className="text-xs font-black text-[#42A5F5] group-hover:scale-105 transition-transform duration-300">
                  85.4% (EXCELLENT)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#0D47A1] to-[#42A5F5] rounded-full transition-all duration-1000" 
                  style={{ width: "85.4%" }} 
                />
              </div>
            </div>

            {/* Overlapping, Asymmetrical Skills Cards */}
            <div className="relative h-[230px] mb-6">
              
              {/* Matched Skills Card (Front Layer) */}
              <div className="absolute top-0 left-0 w-[65%] z-20 bg-slate-900/90 border border-emerald-500/20 hover:border-emerald-500/40 p-4 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl shadow-lg hover:-translate-y-1 transition-all duration-300">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-3">
                  Matched Skills ({matchedSkills.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-hidden">
                  {matchedSkills.map((skill) => (
                    <span key={skill} className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold font-sans">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills Card (Back Layer, Overlapped & Offset) */}
              <div className="absolute top-10 right-0 w-[60%] z-10 bg-slate-900/70 border border-amber-500/20 hover:border-amber-500/40 p-4 rounded-tl-[36px] rounded-br-[36px] rounded-tr-xl rounded-bl-xl shadow-md hover:z-30 hover:-translate-y-1 transition-all duration-300">
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block mb-3">
                  Key Gaps ({missingSkills.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-hidden">
                  {missingSkills.map((skill) => (
                    <span key={skill} className="text-[9px] bg-amber-950/60 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold font-sans">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Fraud Warning styled like system warn log */}
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/15 flex items-start space-x-3 text-[10px]">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-black text-red-400 uppercase tracking-wider block">
                  WARN: EXAGGERATION_DETECTOR_TRIGGERED
                </span>
                <p className="text-slate-450 leading-relaxed font-medium">
                  Unverified Kubernetes skill listed with zero supporting project records in timeline.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Copy Info */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 shadow-sm text-slate-600 text-[10px] font-black tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D47A1]" />
            Phase 1: ATS Screening
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            Deep Semantic Resume Intelligence
          </h2>
          
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Traditional ATS screens miss key concepts; CAPVIA parses and measures real semantic alignment to active jobs.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Semantic Match", "Gap Analysis", "Fraud Shield"].map((tag) => (
              <span key={tag} className="text-[9px] font-black uppercase tracking-wider text-[#0D47A1] bg-[#0D47A1]/5 border border-[#0D47A1]/10 px-3 py-1.5 rounded-lg shadow-sm">
                {tag}
              </span>
            ))}
          </div>

          <div className="pt-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[10px] tracking-widest bg-[#0D47A1] text-white hover:bg-[#0A3B85] transition-all duration-300 hover:shadow-xl hover:shadow-[#0D47A1]/10 hover:-translate-y-0.5 uppercase"
            >
              <span>Try Resume Parser</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes ats-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-ats-thread {
          animation: ats-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
