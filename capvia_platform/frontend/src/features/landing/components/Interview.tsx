"use client";

import React, { useEffect, useState } from "react";
import { Video, Mic, ShieldCheck } from "lucide-react";

export default function Interview() {
  const [typedTranscript, setTypedTranscript] = useState("");
  const transcriptText = "I typically employ Redis as a write-through cache backed by asynchronous message brokers like RabbitMQ or Celery to maintain eventually consistent data layers...";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedTranscript((prev) => prev + transcriptText[index]);
      index++;
      if (index >= transcriptText.length - 1) {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-int-thread" />
          
          {/* Branch to the webcam visual */}
          <path d="M 600,280 L 480,280 L 400,280" fill="none" stroke="#1976D2" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="400" cy="280" r="3" fill="#1976D2" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Column: Interview Preview Panel (Dark Glass UI) */}
        <div className="lg:col-span-7 flex justify-center w-full">
          <div className="w-full max-w-xl bg-slate-950 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-900/40 border border-slate-850 hover:shadow-[0_0_40px_rgba(13,71,161,0.15)] transition-all duration-300 group relative text-slate-350 font-mono">
            
            {/* Ambient reflective glow */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-[#42A5F5]/6 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Live Webcam Interview
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                Session: INT_SS-4421
              </span>
            </div>

            {/* Simulated Stream Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Webcam Window */}
              <div className="md:col-span-5 relative aspect-video md:aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                
                {/* Silhouette or placeholder avatar */}
                <div className="w-16 h-16 rounded-full bg-slate-850 flex items-center justify-center text-slate-500 font-bold border border-slate-800 shadow-inner font-sans">
                  HR
                </div>

                {/* Face Tracker Overlay Bounds */}
                <div className="absolute inset-x-4 top-4 bottom-12 border-2 border-emerald-500/45 rounded-lg pointer-events-none flex items-end justify-start p-1.5 animate-pulse">
                  <span className="text-[8px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase font-sans">Face Tracked</span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 text-[9px] font-mono text-white">
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded">Gaze Offset: 0%</span>
                  <span className="bg-[#0D47A1] px-2 py-0.5 rounded">127.0.0.1</span>
                </div>
              </div>

              {/* Speech Transcript Window */}
              <div className="md:col-span-7 space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Question Prompt</span>
                    <span className="text-[8px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-bold">Question 3/5</span>
                  </div>
                  <p className="text-xs text-slate-200 font-bold leading-relaxed font-sans">
                    "How do you handle state persistence across microservices in a high-concurrency architecture?"
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Candidate Response</span>
                    <span className="text-[8px] text-emerald-450 flex items-center space-x-1 font-bold">
                      <Mic className="w-3 h-3 animate-pulse" />
                      <span>Transcribing...</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed italic h-16 overflow-y-auto font-sans">
                    "{typedTranscript}"
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Footer */}
            <div className="mt-6 pt-4 border-t border-slate-900 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500">
              <div>
                <span className="text-[8px] font-bold uppercase tracking-wider block">Speech Clarity</span>
                <span className="text-xs font-black text-slate-350 mt-1 block">92% (High)</span>
              </div>
              <div>
                <span className="text-[8px] font-bold uppercase tracking-wider block">Communication</span>
                <span className="text-xs font-black text-slate-350 mt-1 block">Confident</span>
              </div>
              <div>
                <span className="text-[8px] font-bold uppercase tracking-wider block">Risk Flags</span>
                <span className="text-xs font-black text-emerald-450 mt-1 block">0 Flags</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Copy Info */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 shadow-sm text-slate-650 text-[10px] font-black tracking-widest uppercase">
            <Video className="w-3.5 h-3.5 text-[#0D47A1]" />
            Phase 3: Video Q&A
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            AI-Scored Video Interviews
          </h2>
          
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Conduct structured browser interviews with face tracking proctor telemetry and real-time semantic speech transcript matching.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Gaze Tracking", "Voice Transcription", "Clarity Scores"].map((tag) => (
              <span key={tag} className="text-[9px] font-black uppercase tracking-wider text-[#0D47A1] bg-[#0D47A1]/5 border border-[#0D47A1]/10 px-3 py-1.5 rounded-lg shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes int-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-int-thread {
          animation: int-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
