"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "What makes CAPVIA different from a standard ATS?",
      a: "Standard ATS systems match literal keywords in resumes, introducing high false negatives and bias. CAPVIA uses Sentence-BERT semantic models to assess conceptual relevance, then runs candidates through proctored coding and adaptive video interviews to score actual capability."
    },
    {
      q: "How does browser proctoring detect cheating without native plugins?",
      a: "CAPVIA leverages standard browser HTML5 APIs via a custom React security hook: the Page Visibility API flags tab switches; window blur checks track focus loss; the Fullscreen API enforces kiosk lockouts; and the Window Management API checks for secondary displays."
    },
    {
      q: "Can we calibrate assessment weights for different role requirements?",
      a: "Yes. Recruiter teams can adjust evaluation weights (e.g. ATS overall score, simulation correctness, verbal Q&A accuracy, and proctoring trust limits) directly via our backend gateway configuration, which updates calibration weights cached in Redis."
    },
    {
      q: "Is the DNA profiling model objective and bias-free?",
      a: "Yes. The 9-dimension DNA Engine compiles raw performance metrics (test success rate, speech analysis, execution speed) without accessing candidate demographic metadata, names, or location fields, ensuring compliance and fairness."
    },
    {
      q: "How do webhooks sync candidate assessment states?",
      a: "CAPVIA implements dynamic webhook subscription callbacks. When a candidate uploads a resume, completes a simulation, or finishes an interview, subsystems dispatch signed HMAC-SHA256 webhooks to synchronize status changes automatically."
    }
  ];

  return (
    <section className="relative py-24 bg-[#030914] overflow-hidden text-slate-100 z-10 border-t border-slate-900">
      
      {/* SVG Thread trace running vertically - dark theme style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#162A45" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#42A5F5" strokeWidth="2.5" strokeDasharray="30 220" className="animate-faq-thread" />
        </svg>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-white font-outfit tracking-tighter leading-none">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-slate-400 leading-relaxed font-medium">
            Have questions about proctoring, calibrations, or data security? We have answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`border overflow-hidden transition-all duration-300 rounded-tr-[24px] rounded-bl-[24px] rounded-tl-lg rounded-br-lg ${
                  isOpen 
                    ? "bg-slate-900/60 border-[#42A5F5]/30 shadow-[0_0_20px_rgba(66,165,245,0.05)]" 
                    : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between space-x-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <HelpCircle className="w-5 h-5 text-[#42A5F5] flex-shrink-0" />
                    <span className="text-base font-bold text-slate-200 leading-snug font-outfit">
                      {faq.q}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                      isOpen ? "transform rotate-180 text-[#FFC107]" : ""
                    }`}
                  />
                </button>

                {/* Accordion Expandable Content */}
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? "max-h-[250px] border-t border-slate-900/80" : "max-h-0"
                  }`}
                >
                  <div className="p-6 text-sm text-slate-400 leading-relaxed font-medium">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        @keyframes faq-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-faq-thread {
          animation: faq-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
