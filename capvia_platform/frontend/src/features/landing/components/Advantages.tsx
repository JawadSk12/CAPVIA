"use client";

import React from "react";
import { Cpu, Terminal, Video, Award, Target, BarChart3 } from "lucide-react";

export default function Advantages() {
  const engines = [
    { num: "01", icon: Cpu, title: "ATS Intelligence", desc: "Extracts capability vectors directly from resume files. Computes semantic alignment against job descriptions while completely bypassing layout keyword-stuffing bias.", span: "md:col-span-2", color: "text-[#42A5F5]", border: "hover:border-[#42A5F5]/40" },
    { num: "02", icon: Terminal, title: "AI Simulation", desc: "Browser-based sandbox testing code performance, complexity, and correctness in real time.", span: "md:col-span-1", color: "text-[#FFC107]", border: "hover:border-[#FFC107]/40" },
    { num: "03", icon: Video, title: "AI Interview", desc: "Webcam proctored dynamic speech QA measuring communication efficiency and soft skills.", span: "md:col-span-1", color: "text-[#1976D2]", border: "hover:border-[#1976D2]/40" },
    { num: "04", icon: Award, title: "DNA Capability Profile", desc: "Aggregates coding scores, semantic matcher indexes, and video interview metrics into a secure, portable candidate passport showing true merit.", span: "md:col-span-2", color: "text-[#42A5F5]", border: "hover:border-[#42A5F5]/40" },
    { num: "05", icon: Target, title: "Hiring Signals", desc: "Generates instant ranking lists, candidate highlights, and integrity flags automatically.", span: "md:col-span-1", color: "text-[#FFC107]", border: "hover:border-[#FFC107]/40" },
    { num: "06", icon: BarChart3, title: "Analytics", desc: "Deep pipeline metrics, candidate conversion rates, and skill distribution telemetry.", span: "md:col-span-1", color: "text-[#1976D2]", border: "hover:border-[#1976D2]/40" }
  ];

  return (
    <section id="advantages-section" className="relative py-32 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-adv-thread" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-24 space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 text-[#0D47A1] text-[10px] font-black tracking-widest uppercase shadow-sm">
            Product Platform
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-outfit tracking-tighter leading-none">
            Six Verified Engines
          </h2>
          <p className="text-base text-slate-500 max-w-md mx-auto font-medium">
            CAPVIA runs candidate capabilities through six specialized verification engines.
          </p>
        </div>

        {/* Bento Grid with Asymmetrical Cut Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {engines.map((eng) => {
            const Icon = eng.icon;
            return (
              <div 
                key={eng.num}
                className={`bg-white border border-slate-200/50 p-8 relative overflow-hidden transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl group ${eng.span} ${eng.border}`}
              >
                {/* Decorative blueprint node mark inside card */}
                <div className="absolute top-4 right-4 text-[9px] font-mono text-slate-350 select-none">
                  SYS_ENG_{eng.num}
                </div>

                <div className={`w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center mb-6 border border-slate-800 transition-transform group-hover:scale-105 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${eng.color}`} />
                </div>

                <div className="space-y-3">
                  <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${eng.color}`}>Engine {eng.num}</span>
                  <h3 className="text-lg font-bold font-outfit text-slate-900 tracking-tight">{eng.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {eng.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <style jsx global>{`
        @keyframes adv-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-adv-thread {
          animation: adv-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
