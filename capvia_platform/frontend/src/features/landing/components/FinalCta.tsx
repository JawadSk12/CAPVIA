"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="relative py-48 bg-[#030914] text-white overflow-hidden text-center border-t border-slate-900 z-10">
      
      {/* Background Visual aperture and micro-dot grid */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-[#42A5F5]/10 rounded-full blur-[140px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:24px_24px] opacity-80" />
      </div>

      {/* SVG Thread trace running vertically and terminating at a single center convergence node */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 450" preserveAspectRatio="none" overflow="visible">
          {/* Incoming vertical line */}
          <line x1="600" y1="0" x2="600" y2="300" stroke="#162A45" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="300" stroke="#42A5F5" strokeWidth="2.5" strokeDasharray="30 140" className="animate-cta-thread" />
          
          {/* Radial circuit paths gathering into the convergence point */}
          <path d="M 400,280 L 520,300 L 600,300" fill="none" stroke="#162A45" strokeWidth="1.5" strokeDasharray="5 5" />
          <path d="M 800,280 L 680,300 L 600,300" fill="none" stroke="#162A45" strokeWidth="1.5" strokeDasharray="5 5" />
          
          {/* Large glowing convergence node */}
          <circle cx="600" cy="300" r="10" fill="#FFC107" className="animate-ping opacity-25" />
          <circle cx="600" cy="300" r="6" fill="#FFC107" className="shadow-[0_0_25px_#FFC107]" />
        </svg>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 space-y-10 z-10">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-350 text-[10px] font-black tracking-widest uppercase shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FFC107]" />
          Join the Verification Network
        </div>

        <h2 className="text-6xl md:text-8xl font-black font-outfit tracking-tighter leading-none text-white max-w-3xl mx-auto">
          Ready to verify <br />
          <span className="bg-gradient-to-r from-[#42A5F5] to-[#FFC107] bg-clip-text text-transparent">
            true competence?
          </span>
        </h2>

        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
          Let demonstrated capability speak louder than credentials. Sign up now and experience hiring based on proven merit.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 relative">
          
          {/* Buttons offset to align around the convergence wire marker */}
          <Link
            href="/auth/register"
            className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#FFC107] text-slate-950 font-bold text-[10px] hover:bg-[#ffca28] transition-all duration-300 shadow-[0_0_15px_rgba(255,193,7,0.3)] hover:shadow-[0_0_25px_rgba(255,193,7,0.5)] hover:-translate-y-0.5 tracking-widest uppercase ring-4 ring-[#FFC107]/20"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-slate-950" />
          </Link>
          
          <Link
            href="/internships"
            className="w-full sm:w-auto text-[10px] font-bold text-slate-400 hover:text-white px-8 py-4 rounded-xl hover:bg-white/5 transition-all duration-300 border border-slate-700 hover:border-slate-500 tracking-widest uppercase"
          >
            Explore Internships
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes cta-thread-movement {
          0% { stroke-dashoffset: 170; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-cta-thread {
          animation: cta-thread-movement 6s linear infinite;
        }
      `}</style>
    </section>
  );
}
