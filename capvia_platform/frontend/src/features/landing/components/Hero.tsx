"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Shield, Activity } from "lucide-react";

export default function Hero() {
  const [telemetrySignal, setTelemetrySignal] = useState<number[]>([]);
  const [liveScore, setLiveScore] = useState(88);

  // Generate real-time waveform values for the verification signal
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetrySignal(
        Array.from({ length: 22 }, () => Math.floor(Math.random() * 55) + 15)
      );
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Soft oscillation of verification score to show "live calculation"
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore((prev) => {
        const offset = Math.random() > 0.5 ? 1 : -1;
        const next = prev + offset;
        return next > 98 ? 95 : next < 85 ? 88 : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[100vh] pt-40 pb-28 flex items-center bg-[#030914] overflow-hidden text-slate-100 z-10">
      
      {/* Background Circuit Grid & Organic Accent Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[65%] h-[75%] bg-gradient-to-br from-[#0D47A1]/20 via-[#42A5F5]/8 to-transparent rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[55%] h-[65%] bg-gradient-to-tr from-[#1976D2]/10 to-transparent rounded-full blur-[140px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:32px_32px] opacity-80" />
      </div>

      {/* SVG Verification Thread: Initializing Page-wide trace */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none" overflow="visible">
          <defs>
            <linearGradient id="hero-thread-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#42A5F5" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0D47A1" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Main vertical thread running down from header, branching to telemetry panel */}
          <path
            d="M 600,0 L 600,280 Q 600,380 750,380 L 800,380 Q 900,380 900,480 L 900,500 L 600,650 L 600,800"
            fill="none"
            stroke="#162A45"
            strokeWidth="2.5"
          />
          
          <path
            d="M 600,0 L 600,280 Q 600,380 750,380 L 800,380 Q 900,380 900,480 L 900,500 L 600,650 L 600,800"
            fill="none"
            stroke="url(#hero-thread-grad)"
            strokeWidth="3.5"
            strokeDasharray="80 320"
            className="animate-hero-flow"
          />
          
          {/* Node origin point */}
          <circle cx="600" cy="10" r="5" fill="#42A5F5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center z-10">
        
        {/* Left Column: Bold Typography */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm text-slate-350 text-[10px] font-black tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Verification Engine Live
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.95] font-outfit">
            The Future of <br />
            <span className="bg-gradient-to-r from-[#42A5F5] via-[#1976D2] to-[#FFC107] bg-clip-text text-transparent">
              Hiring is Verified.
            </span>
          </h1>

          <p className="text-base text-slate-400 leading-relaxed max-w-lg font-medium font-sans">
            CAPVIA replaces biased resumes with evidence-based, verified developer DNA through real-time code sandboxes and proctored AI interviews.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Link
              href="/internships"
              className="group flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white text-slate-900 font-bold text-[10px] hover:bg-slate-100 transition-all duration-300 hover:shadow-xl hover:shadow-white/10 hover:-translate-y-0.5 tracking-widest uppercase"
            >
              Find Internship
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900/60 border border-slate-800 text-white font-bold text-[10px] hover:bg-slate-900 hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5 tracking-widest uppercase shadow-sm"
            >
              Hire Talent
            </Link>
          </div>
        </div>

        {/* Right Column: Immersive Live Telemetry Glass Panel */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-xl bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(3,9,20,0.8)] backdrop-blur-md relative overflow-hidden group hover:border-slate-700/80 transition-all duration-500">
            
            {/* Ambient reflective glow inside the card */}
            <div className="absolute top-0 right-0 w-52 h-52 bg-[#42A5F5]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Sweep Laser Scanner Animation */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#42A5F5]/80 to-transparent shadow-[0_0_12px_#42A5F5] z-30 pointer-events-none animate-scan-line" />

            {/* Live telemetry header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest text-slate-450 uppercase">Verification Signal Radar</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#42A5F5] bg-[#42A5F5]/10 px-2.5 py-1 rounded-lg border border-[#42A5F5]/20">
                <Activity className="w-3 h-3 text-[#42A5F5] animate-pulse" />
                TELEMETRY ACTIVE
              </div>
            </div>

            {/* The Live Thread Signal Visualizer */}
            <div className="relative h-44 bg-slate-950/80 rounded-2xl p-6 overflow-hidden flex flex-col justify-between border border-slate-850 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none" />
              
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#42A5F5]" />
                  <span className="text-[9px] font-mono text-[#42A5F5] uppercase tracking-wider">Candidate_Verification_Thread</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  PROCTORED
                </span>
              </div>

              {/* Running Signal Path Wave */}
              <div className="flex items-end justify-between gap-1 h-20 w-full z-10 border-b border-slate-850 pb-2">
                {telemetrySignal.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#0D47A1] via-[#1976D2] to-[#42A5F5] rounded-t-sm transition-all duration-150 shadow-[0_0_8px_rgba(66,165,245,0.15)]"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              {/* Connected node indicator */}
              <div className="flex items-center justify-between z-10">
                <span className="text-[9px] font-mono text-slate-500 uppercase">SYS_LOG: PIPELINE_STAGE_03</span>
                <span className="text-[9px] font-mono text-[#FFC107] animate-pulse">OPTIMIZING_IDE_METRICS</span>
              </div>
            </div>

            {/* Candidate DNA Passport Blueprint */}
            <div className="mt-6 bg-slate-950/40 border border-slate-850 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center font-outfit text-white font-extrabold text-xs shadow-md border border-slate-800">
                    HA
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Huzaifa Ansari</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Candidate DNA Verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/30 rounded-lg text-emerald-400 border border-emerald-500/25 shadow-sm">
                  <Shield className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">VERIFIED</span>
                </div>
              </div>

              {/* Progress bars illustrating verified vectors */}
              <div className="grid grid-cols-3 gap-3.5 mt-5">
                {[
                  { name: "Code Optimization", value: 92 },
                  { name: "System Architecture", value: 85 },
                  { name: "AI Speech Integrity", value: 95 },
                ].map((stat, idx) => (
                  <div key={stat.name} className="space-y-1.5">
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase block tracking-wider leading-tight">{stat.name}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#1976D2] to-[#42A5F5] rounded-full transition-all duration-1000" 
                          style={{ width: `${idx === 2 ? liveScore : stat.value}%` }} 
                        />
                      </div>
                      <span className="text-[8px] font-mono font-black text-slate-400 w-6">
                        {idx === 2 ? liveScore : stat.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes scan-line-movement {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line-movement 6s linear infinite;
        }
        @keyframes hero-thread-flow {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-hero-flow {
          animation: hero-thread-flow 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
