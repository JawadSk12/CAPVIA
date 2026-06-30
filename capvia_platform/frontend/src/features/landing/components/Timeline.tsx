"use client";

import React, { useState, useEffect } from "react";
import { Upload, Cpu, Terminal, Video, Award, CheckCircle } from "lucide-react";

interface PipelineStep {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  shortDesc: string;
  longDesc: string;
  pill: string;
  color: string;
  glow: string;
  statusText: string;
  logs: string[];
}

const steps: PipelineStep[] = [
  {
    number: "01",
    icon: Upload,
    title: "Resume Ingest",
    shortDesc: "Compulsory OCR parsing",
    longDesc: "High-integrity OCR parsing pulls core capability records and career trajectories directly from raw PDFs, ignoring formatting biases.",
    pill: "Ingestion Engine",
    color: "text-[#42A5F5]",
    glow: "shadow-[#42A5F5]/30",
    statusText: "PARSING_COMPLETED",
    logs: [
      "SYS: Reading raw PDF bytes...",
      "OCR: Extracted text blocks...",
      "CLEANER: Normalizing whitespace...",
    ],
  },
  {
    number: "02",
    icon: Cpu,
    title: "Semantic Match",
    shortDesc: "Vector alignment check",
    longDesc: "Cross-references candidate profiles against active job descriptions, evaluating core qualifications over simple keywords.",
    pill: "Screening Engine",
    color: "text-[#1976D2]",
    glow: "shadow-[#1976D2]/30",
    statusText: "VECTOR_ALIGNMENT_OK",
    logs: [
      "SBERT: Encoding resume text...",
      "COSINE: Math match = 0.854",
      "ALIGN: Qualification check ok",
    ],
  },
  {
    number: "03",
    icon: Terminal,
    title: "Code Sandbox",
    shortDesc: "Real-time IDE simulation",
    longDesc: "Candidates complete structured code tasks inside a secure browser IDE. Performance, correctness, and complexity metrics are automatically analyzed.",
    pill: "Simulation Engine",
    color: "text-[#42A5F5]",
    glow: "shadow-[#42A5F5]/30",
    statusText: "SIMULATION_ACTIVE",
    logs: [
      "IDE: Spawning runner sandbox...",
      "PROCTOR: Keylogger active...",
      "CPU: Execution monitoring loaded",
    ],
  },
  {
    number: "04",
    icon: Video,
    title: "Speech Interview",
    shortDesc: "Dynamic proctored Q&A",
    longDesc: "Spoken interview conducted by webcam AI. Telemetry checks for gaze patterns and focus deviations to verify response integrity.",
    pill: "Interview Engine",
    color: "text-indigo-400",
    glow: "shadow-indigo-500/30",
    statusText: "INTERVIEW_READY",
    logs: [
      "TTS: Audio stream active...",
      "VISION: Gaze tracking loaded...",
      "STT: Whisper transcripting...",
    ],
  },
  {
    number: "05",
    icon: Award,
    title: "Talent DNA",
    shortDesc: "9 capability vectors",
    longDesc: "Fuses signals from parsing, coding performance, and interview data into a permanent, verifiable capability passport.",
    pill: "Profiling Engine",
    color: "text-[#FFC107]",
    glow: "shadow-[#FFC107]/30",
    statusText: "DNA_MAP_GENERATED",
    logs: [
      "DNA: Calculating vectors...",
      "RADAR: Render 9 dimensions...",
      "SYNC: permanent passport created",
    ],
  },
  {
    number: "06",
    icon: CheckCircle,
    title: "Leaderboard",
    shortDesc: "Veritable talent rank",
    longDesc: "Ranks candidates purely on demonstrated skill metrics, giving recruiters instant shortlists with zero credential bias.",
    pill: "Ranking Engine",
    color: "text-[#42A5F5]",
    glow: "shadow-emerald-500/30",
    statusText: "COHORT_RANKED",
    logs: [
      "RANK: Sorting candidates...",
      "TIER: Classifying GOLD level...",
      "GATEWAY: Webhook dispatched",
    ],
  },
];

function TerminalLogs({ logs }: { logs: string[] }) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  
  useEffect(() => {
    setVisibleLogs([]);
    let logIdx = 0;
    const interval = setInterval(() => {
      if (logIdx < logs.length) {
        setVisibleLogs((prev) => [...prev, logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(interval);
      }
    }, 450);
    return () => clearInterval(interval);
  }, [logs]);

  return (
    <div className="mt-4 p-3.5 bg-slate-950 border border-slate-900 rounded-2xl font-mono text-[10px] text-slate-350 space-y-1 h-[90px] overflow-hidden select-none relative">
      <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-1.5 mb-1.5">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#42A5F5]" />
          PROCTOR_SYSTEM_LOG
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      {visibleLogs.map((log, i) => (
        <div key={i} className="truncate">
          <span className="text-[#42A5F5] mr-1.5">&gt;</span>
          {log}
        </div>
      ))}
      {visibleLogs.length < logs.length && (
        <div className="flex items-center">
          <span className="text-[#42A5F5] mr-1.5">&gt;</span>
          <span className="bg-slate-400 w-1.5 h-3 inline-block animate-ping" />
        </div>
      )}
    </div>
  );
}

export default function Timeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Auto-advance node every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePos({ x, y });
  };

  return (
    <section 
      id="how-it-works" 
      className="py-32 bg-[#030914] text-slate-100 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0D47A1]/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#42A5F5]/5 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:24px_24px] opacity-80" />
      </div>

      {/* SVG Neural Circuit Trace woven behind the cards */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 hidden lg:block"
        style={{
          transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 24}px)`,
          transition: "transform 0.3s ease-out"
        }}
      >
        <svg className="w-full h-full max-w-7xl mx-auto px-6" viewBox="0 0 1200 800" overflow="visible">
          <defs>
            <linearGradient id="timeline-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#42A5F5" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#1976D2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFC107" stopOpacity="0.1" />
            </linearGradient>
            <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* S-curve Trace running through card nodes */}
          <path
            d="M 200 240 L 600 240 L 1000 240 L 1000 580 L 600 580 L 200 580"
            fill="none"
            stroke="#162A45"
            strokeWidth="2.5"
          />

          <path
            d="M 200 240 L 600 240 L 1000 240 L 1000 580 L 600 580 L 200 580"
            fill="none"
            stroke="url(#timeline-glow-grad)"
            strokeWidth="3.5"
            filter="url(#neon-glow-filter)"
            strokeDasharray="60 220"
            className="animate-timeline-pulse"
          />

          {/* Glowing traveler dot */}
          <circle r="4" fill="#FFC107" filter="url(#neon-glow-filter)">
            <animateMotion dur="8s" repeatCount="indefinite" path="M 200 240 L 600 240 L 1000 240 L 1000 580 L 600 580 L 200 580" />
          </circle>
        </svg>
      </div>

      {/* Continuation of the page-wide vertical verification thread */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="800" stroke="#162A45" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="600" y1="0" x2="600" y2="800" stroke="#42A5F5" strokeWidth="2.5" strokeDasharray="30 200" className="animate-timeline-pulse" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#42A5F5] text-[10px] font-black tracking-widest uppercase shadow-sm">
            Verification Pipeline
          </span>
          <h2 className="text-5xl md:text-6xl font-black font-outfit tracking-tighter leading-none text-white">
            The Signal Journey
          </h2>
          <p className="text-sm text-slate-450 max-w-md mx-auto">
            A spatial node-network visual. Interactive stages auto-advancing to demonstrate real-time telemetry compilation.
          </p>
        </div>

        {/* 3x2 Asymmetric Grid with S-curve Order */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          
          {/* Mobile connecting track */}
          <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-slate-800/60 lg:hidden pointer-events-none">
            <div className="w-full h-1/2 bg-gradient-to-b from-[#42A5F5] to-transparent animate-pulse" />
          </div>

          {steps.map((step, idx) => {
            const isActive = idx === activeIndex;
            const StepIcon = step.icon;
            
            // Grid order styling to create zig-zag S-curve layout
            let orderClass = "";
            if (idx === 0) orderClass = "lg:order-1";
            if (idx === 1) orderClass = "lg:order-2";
            if (idx === 2) orderClass = "lg:order-3";
            if (idx === 3) orderClass = "lg:order-6";
            if (idx === 4) orderClass = "lg:order-5";
            if (idx === 5) orderClass = "lg:order-4";

            return (
              <div
                key={step.number}
                onClick={() => setActiveIndex(idx)}
                className={`relative bg-slate-900/40 border transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-md p-6 group rounded-2xl flex flex-col justify-between min-h-[340px] select-none ${orderClass} ${
                  isActive 
                    ? "border-[#42A5F5]/60 bg-slate-900/70 shadow-[0_0_35px_rgba(66,165,245,0.15)] -translate-y-2 scale-[1.01]" 
                    : "border-slate-800/80 hover:border-slate-700/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:-translate-y-1 hover:rotate-1"
                }`}
              >
                
                {/* Active node light tracker */}
                {isActive && (
                  <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-[#42A5F5] shadow-[0_0_12px_#42A5F5] animate-ping pointer-events-none" />
                )}

                {/* Number watermark */}
                <div className="absolute -bottom-6 -right-4 text-[120px] font-black text-slate-800/5 font-outfit select-none pointer-events-none leading-none">
                  {step.number}
                </div>

                <div className="space-y-4">
                  {/* Top tags */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-500">
                      STAGE_{step.number}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded transition-colors ${
                      isActive ? "text-[#42A5F5] border-[#42A5F5]/20 bg-[#42A5F5]/5" : "text-slate-400"
                    }`}>
                      {step.pill}
                    </span>
                  </div>

                  {/* Icon & Title block */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                      isActive 
                        ? "bg-[#42A5F5]/10 border-[#42A5F5]/30 text-[#42A5F5]" 
                        : "bg-slate-950/60 border-slate-850 text-slate-400 group-hover:text-slate-300"
                    }`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight font-outfit">{step.title}</h3>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-0.5">{step.shortDesc}</p>
                    </div>
                  </div>

                  {/* Body description text */}
                  <p className="text-xs text-slate-400 leading-relaxed font-medium pt-2">
                    {step.longDesc}
                  </p>
                </div>

                {/* Inline logs drawer expansion */}
                {isActive ? (
                  <TerminalLogs logs={step.logs} />
                ) : (
                  <div className="mt-4 p-3 bg-slate-950/30 border border-slate-900/50 rounded-2xl font-mono text-[9px] text-slate-650 flex items-center justify-between select-none">
                    <span>SYS_MODE: STANDBY</span>
                    <span>CLICK_TO_PROCTOR</span>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

      <style jsx global>{`
        @keyframes timeline-thread-flow {
          0% { stroke-dashoffset: 1200; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-timeline-pulse {
          animation: timeline-thread-flow 10s linear infinite;
        }
      `}</style>
    </section>
  );
}
