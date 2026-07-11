"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How does CAPVIA's AI interview differ from a human interview?",
    a: "CAPVIA's AI interview is fully proctored, consistent, and objective. It adapts questions based on the candidate's prior answers, scores communication clarity and technical depth in real time, and eliminates interviewer bias. Results are transcribed and scored immediately — no waiting, no subjectivity.",
  },
  {
    q: "Is the coding simulation proctored?",
    a: "Yes. Every simulation session is monitored via webcam for gaze direction, tab-switch detection, phone detection, and copy-paste event tracking. All events are logged to the candidate's integrity trust index.",
  },
  {
    q: "What is a CAPVIA DNA Profile?",
    a: "The DNA Profile is a composited, weighted competence index derived from all four assessment stages — ATS score, code simulation score, AI interview rating, and behavioral integrity index. It's displayed as a radar chart across capability dimensions.",
  },
  {
    q: "Can HR teams customize the scoring weights?",
    a: "Yes. HR administrators can adjust the weighting of each component (ATS, Simulation, Interview, Integrity) to match role-specific requirements from the settings panel.",
  },
  {
    q: "Is CAPVIA suitable for non-technical roles?",
    a: "Absolutely. The ATS and AI interview engines work across any domain. The coding simulation stage is optional and can be disabled for non-engineering pipelines.",
  },
  {
    q: "How does CAPVIA prevent cheating?",
    a: "Multiple layers: live proctoring via webcam (gaze, phone, face detection), tab-switch monitoring, clipboard event detection, timed challenges, and AI-powered anomaly detection on submitted code. All events are recorded and included in the final integrity report.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: open ? "1px solid rgba(66,165,245,0.2)" : "1px solid rgba(255,255,255,0.06)",
        background: open ? "rgba(66,165,245,0.04)" : "rgba(255,255,255,0.02)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span
          className="text-[14px] font-semibold"
          style={{ color: open ? "white" : "rgba(226,232,240,0.85)" }}
        >
          {q}
        </span>
        <ChevronDown
          className="shrink-0 w-4.5 h-4.5 transition-transform duration-200"
          style={{
            color: open ? "#42A5F5" : "rgba(100,116,139,0.6)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          className="px-6 pb-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p
            className="text-[13px] leading-relaxed pt-4"
            style={{ color: "rgba(148,163,184,0.75)" }}
          >
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FaqSection() {
  return (
    <section
      id="faq"
      className="py-24 md:py-32"
      style={{ background: "#030914" }}
    >
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ color: "#42A5F5" }}
          >
            Frequently Asked
          </p>
          <h2
            className="font-outfit font-black text-white tracking-tighter"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", lineHeight: 1.05 }}
          >
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
