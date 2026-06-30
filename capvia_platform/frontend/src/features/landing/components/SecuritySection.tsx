"use client";

import React from "react";
import { ShieldCheck, EyeOff, Lock, Scale } from "lucide-react";

export default function SecuritySection() {
  const securityItems = [
    { title: "AES-256 Data Encryption", desc: "All resume documents, webcam video streams, and transaction details are encrypted at rest and in transit (SSL/TLS).", icon: Lock },
    { title: "Tenant Isolation & Privacy", desc: "JWT tokens scopes Candidate, Recruiter, and Admin spaces strictly, ensuring access is limited to validated resource owners.", icon: EyeOff },
    { title: "Bias-Free AI Fairness", desc: "Evaluation models (SBERT/KeyBERT) are calibrated strictly on capability parameters, ignoring demographic or name variables.", icon: Scale },
    { title: "Compliance & Audit Logs", desc: "System activities log events to secure databases. Fully prepared for SOC-2 Type II audits and GDPR requirements.", icon: ShieldCheck },
  ];

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-sec-thread" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Copy Info */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 text-[#0D47A1] text-[10px] font-black tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D47A1]" />
            <span>Security & Compliance</span>
          </div>
          
          <h3 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            Enterprise Security as Standard
          </h3>
          
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            We process high volumes of sensitive talent profiles. CAPVIA maintains data privacy, secure tokens, and objective algorithm fairness.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            {["SOC-2 Ready", "GDPR Compliant", "CCPA Compliant"].map((tag) => (
              <span key={tag} className="text-[9px] bg-white border border-slate-200 text-slate-550 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Features Grid with Asymmetrical Cut Glass Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {securityItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white border border-slate-200/50 p-6 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl shadow-md hover:shadow-2xl hover:border-[#1976D2]/30 hover:-translate-y-1 hover:rotate-1 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-[#42A5F5] mb-4 border border-slate-800">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold font-outfit text-slate-900 mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-550 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>

      <style jsx global>{`
        @keyframes sec-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-sec-thread {
          animation: sec-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
