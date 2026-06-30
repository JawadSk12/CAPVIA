"use client";

import React from "react";

export default function Companies() {
  const brandLogos = [
    { name: "Google", text: "Google" },
    { name: "Microsoft", text: "Microsoft" },
    { name: "Amazon", text: "Amazon" },
    { name: "Meta", text: "Meta" },
    { name: "Netflix", text: "Netflix" },
    { name: "Stripe", text: "Stripe" },
  ];

  return (
    <section className="relative py-8 bg-[#030914] border-t border-b border-slate-900 overflow-hidden text-slate-100">
      
      {/* SVG Thread trace running vertically through the section */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 80" preserveAspectRatio="none" overflow="visible">
          {/* Main vertical trace line */}
          <line x1="600" y1="0" x2="600" y2="80" stroke="#162A45" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="80" stroke="#42A5F5" strokeWidth="2.5" strokeDasharray="30 80" className="animate-thread-pulse" />
          
          {/* Horizontal cross trace representing junction block */}
          <line x1="200" y1="40" x2="1000" y2="40" stroke="#162A45" strokeWidth="1.5" strokeDasharray="10 5" />
          
          {/* Glowing center junction node */}
          <circle cx="600" cy="40" r="4.5" fill="#42A5F5" className="shadow-[0_0_12px_#42A5F5] animate-pulse" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 z-10">
        <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase select-none">
          TRUSTED BY ELITE CAMPUS COHORTS
        </span>
        
        {/* Simple compressed row of logos */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {brandLogos.map((logo) => (
            <div 
              key={logo.name} 
              className="text-lg font-black font-outfit text-white/30 tracking-tight hover:text-white/60 transition-colors duration-300 select-none cursor-default"
            >
              {logo.text}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes thread-movement {
          0% { stroke-dashoffset: 110; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-thread-pulse {
          animation: thread-movement 5s linear infinite;
        }
      `}</style>
    </section>
  );
}
