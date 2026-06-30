"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

export default function Stats() {
  const statistics = [
    { value: "142K+", label: "Verified Passports", detail: "Active candidate capability profiles stored securely", color: "text-[#42A5F5]", nodeX: 250, nodeY: 120 },
    { value: "12ms", label: "Sandbox Latency", detail: "Avg execution speed of code simulations", color: "text-[#FFC107]", nodeX: 950, nodeY: 200 },
    { value: "85%+", label: "SBERT Semantic Match", detail: "Alignment cosine distance against vacancy", color: "text-[#1976D2]", nodeX: 250, nodeY: 340 },
    { value: "99.8%", label: "Proctor Security", detail: "Face absence and keylogger integrity accuracy", color: "text-[#42A5F5]", nodeX: 950, nodeY: 420 },
  ];

  return (
    <section className="relative py-28 bg-[#030914] overflow-hidden text-slate-100">
      
      {/* SVG Thread trace running vertically and branching out to each statistic block */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 550" preserveAspectRatio="none" overflow="visible">
          {/* Main vertical thread */}
          <line x1="600" y1="0" x2="600" y2="550" stroke="#162A45" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="550" stroke="#42A5F5" strokeWidth="2.5" strokeDasharray="40 160" className="animate-stats-flow" />

          {/* Left Branch 1 (to Stat 1) */}
          <path d="M 600,120 L 320,120 L 280,120" fill="none" stroke="#162A45" strokeWidth="1.5" />
          <circle cx="280" cy="120" r="3.5" fill="#42A5F5" />

          {/* Right Branch 1 (to Stat 2) */}
          <path d="M 600,200 L 880,200 L 920,200" fill="none" stroke="#162A45" strokeWidth="1.5" />
          <circle cx="920" cy="200" r="3.5" fill="#FFC107" />

          {/* Left Branch 2 (to Stat 3) */}
          <path d="M 600,340 L 320,340 L 280,340" fill="none" stroke="#162A45" strokeWidth="1.5" />
          <circle cx="280" cy="340" r="3.5" fill="#1976D2" />

          {/* Right Branch 2 (to Stat 4) */}
          <path d="M 600,420 L 880,420 L 920,420" fill="none" stroke="#162A45" strokeWidth="1.5" />
          <circle cx="920" cy="420" r="3.5" fill="#42A5F5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        
        {/* Asymmetrical Stats Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Header column */}
          <div className="lg:col-span-4 space-y-5 text-left lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#42A5F5] text-[10px] font-black tracking-widest uppercase shadow-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              Engine Metrics
            </div>
            <h2 className="text-4xl md:text-5xl font-black font-outfit text-white tracking-tighter leading-none">
              Real-Time Verification Logs
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Every parsing session, simulation sandbox compiler run, and video gaze evaluation emits raw metrics that prove candidate credentials.
            </p>
          </div>

          {/* Statistics grid values */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            {statistics.map((stat, idx) => (
              <div 
                key={stat.label} 
                className={`space-y-3 p-6 bg-slate-950/20 border border-slate-900/60 rounded-3xl backdrop-blur-sm group hover:border-slate-800/80 transition-all duration-350 select-none ${
                  idx % 2 === 1 ? "md:translate-y-8" : ""
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className={`text-6xl sm:text-7xl font-black font-outfit tracking-tighter ${stat.color} transition-transform duration-300 group-hover:scale-[1.03]`}>
                    {stat.value}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#162A45] group-hover:bg-[#42A5F5] group-hover:shadow-[0_0_8px_#42A5F5] transition-all" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
                    {stat.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-medium font-sans">
                    {stat.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes stats-thread-flow {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-stats-flow {
          animation: stats-thread-flow 7s linear infinite;
        }
      `}</style>
    </section>
  );
}
