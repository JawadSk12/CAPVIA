"use client";

import React from "react";
import { FileSearch, Terminal, Video, ShieldCheck, BrainCircuit, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: FileSearch,
    title: "AI Resume Screening",
    subtitle: "ATS Engine",
    description:
      "The CAPVIA ATS semantically maps candidate resumes to job requirements using transformer-based NLP — detecting real skills, not keyword stuffing.",
    points: ["Semantic skill extraction", "Gap analysis vs. job spec", "Instant ATS score (0–100)"],
    accent: "#42A5F5",
    accentBg: "rgba(66,165,245,0.1)",
    accentBorder: "rgba(66,165,245,0.2)",
  },
  {
    num: "02",
    icon: Terminal,
    title: "Live Code Simulation",
    subtitle: "Sandbox Engine",
    description:
      "Candidates solve real-world coding challenges in a proctored, browser-native IDE. CAPVIA evaluates correctness, complexity, and coding style — not just pass/fail.",
    points: ["Multi-language sandbox", "Real-time execution & scoring", "Camera + screen proctoring"],
    accent: "#F59E0B",
    accentBg: "rgba(245,158,11,0.08)",
    accentBorder: "rgba(245,158,11,0.2)",
  },
  {
    num: "03",
    icon: Video,
    title: "AI Speech Interview",
    subtitle: "Interview Engine",
    description:
      "A proctored, AI-conducted video interview assesses communication clarity, confidence, and technical depth — transcribed and scored in real time.",
    points: ["Adaptive question generation", "Speech & sentiment analysis", "Integrity telemetry"],
    accent: "#7C3AED",
    accentBg: "rgba(124,58,237,0.08)",
    accentBorder: "rgba(124,58,237,0.2)",
  },
  {
    num: "04",
    icon: ShieldCheck,
    title: "Behavioral Integrity Check",
    subtitle: "Integrity Engine",
    description:
      "Every session is monitored for tab-switches, look-aways, phone detections, and copy-paste events. A tamper-proof trust index ensures honest assessments.",
    points: ["AI gaze & attention tracking", "Tab-switch & device detection", "Integrity trust index"],
    accent: "#10B981",
    accentBg: "rgba(16,185,129,0.08)",
    accentBorder: "rgba(16,185,129,0.2)",
  },
  {
    num: "05",
    icon: BrainCircuit,
    title: "DNA Profile & Ranking",
    subtitle: "DNA + Ranking Engine",
    description:
      "All scores are combined into a composited, explainable CAPVIA DNA Index — ranking candidates by verified competence, not self-reported claims.",
    points: ["Weighted composite scoring", "Explainable AI recommendations", "Candidate DNA radar"],
    accent: "#0D47A1",
    accentBg: "rgba(13,71,161,0.08)",
    accentBorder: "rgba(13,71,161,0.2)",
  },
];

export default function Timeline() {
  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32 relative"
      style={{ background: "#030914" }}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.016) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ color: "#42A5F5" }}
          >
            The Verification Pipeline
          </p>
          <h2
            className="font-outfit font-black text-white tracking-tighter"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", lineHeight: 1.05 }}
          >
            From Application to{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #42A5F5, #1976D2)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Verified Hire
            </span>
          </h2>
          <p
            className="text-[14px] max-w-xl mx-auto mt-4 leading-relaxed"
            style={{ color: "rgba(148,163,184,0.7)" }}
          >
            Five AI-powered stages — each generating objective, tamper-proof data
            that eliminates bias and surfaces genuine talent.
          </p>
        </div>

        {/* Timeline steps */}
        <div className="relative">
          {/* Vertical connector rail */}
          <div
            className="absolute left-[26px] md:left-1/2 top-0 bottom-0 w-px hidden md:block"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(66,165,245,0.2), transparent)" }}
          />

          <div className="space-y-12 md:space-y-16">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isEven = idx % 2 === 1;
              return (
                <div
                  key={idx}
                  className={`relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center ${
                    isEven ? "md:[direction:rtl]" : ""
                  }`}
                >
                  {/* Content card */}
                  <div
                    className={`${isEven ? "md:[direction:ltr]" : ""}`}
                  >
                    <div
                      className="rounded-2xl p-6 transition-all hover:-translate-y-1"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${step.accentBorder}`,
                        boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {/* Step label */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: step.accentBg, border: `1px solid ${step.accentBorder}` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: step.accent }} />
                        </div>
                        <div>
                          <p
                            className="text-[9px] font-black uppercase tracking-widest"
                            style={{ color: step.accent }}
                          >
                            Stage {step.num} · {step.subtitle}
                          </p>
                        </div>
                      </div>

                      <h3
                        className="font-outfit font-bold text-white mb-3"
                        style={{ fontSize: "1.15rem", lineHeight: 1.2 }}
                      >
                        {step.title}
                      </h3>

                      <p
                        className="text-[13px] leading-relaxed mb-4"
                        style={{ color: "rgba(148,163,184,0.7)" }}
                      >
                        {step.description}
                      </p>

                      {/* Feature points */}
                      <ul className="space-y-1.5">
                        {step.points.map((pt) => (
                          <li key={pt} className="flex items-center gap-2">
                            <CheckCircle2
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: step.accent }}
                            />
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: "rgba(148,163,184,0.8)" }}
                            >
                              {pt}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Step number — center connector */}
                  <div
                    className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex-col items-center gap-2"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-outfit font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${step.accent}80, ${step.accent}50)`,
                        border: `2px solid ${step.accentBorder}`,
                        boxShadow: `0 0 20px ${step.accent}25`,
                        fontSize: "11px",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {step.num}
                    </div>
                  </div>

                  {/* Right side — visual placeholder */}
                  <div className={`${isEven ? "md:[direction:ltr]" : ""} hidden md:flex items-center justify-center`}>
                    <div
                      className="w-48 h-48 rounded-3xl flex items-center justify-center"
                      style={{
                        background: step.accentBg,
                        border: `1px solid ${step.accentBorder}`,
                      }}
                    >
                      <Icon
                        className="w-20 h-20"
                        style={{ color: step.accent, opacity: 0.25 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
