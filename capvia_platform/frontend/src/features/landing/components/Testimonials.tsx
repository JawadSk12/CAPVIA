"use client";

import React from "react";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "We reduced our time-to-hire by 60% and eliminated four rounds of technical interviews. CAPVIA's DNA profiles tell us everything we need in one report.",
    name: "Priya Mehta",
    role: "Head of Engineering",
    company: "FinStack Technologies",
    rating: 5,
    avatar: "PM",
    color: "#0D47A1",
  },
  {
    quote:
      "The AI interview flagged communication gaps we never would have caught in a 30-minute phone screen. The shortlist quality is dramatically better.",
    name: "Arjun Kapoor",
    role: "Talent Acquisition Lead",
    company: "Growthify",
    rating: 5,
    avatar: "AK",
    color: "#7C3AED",
  },
  {
    quote:
      "As a candidate, I finally felt evaluated on actual skills, not how well I write a cover letter. The AI interview was challenging but fair.",
    name: "Sana Qureshi",
    role: "Software Engineer (Hired via CAPVIA)",
    company: "CloudMind",
    rating: 5,
    avatar: "SQ",
    color: "#059669",
  },
  {
    quote:
      "The integrity module alone saved us from hiring a candidate who had clearly fabricated their resume. The trust index flagged it within minutes.",
    name: "Ravi Sharma",
    role: "VP of People",
    company: "InfraBuild",
    rating: 5,
    avatar: "RS",
    color: "#B45309",
  },
  {
    quote:
      "Our HR team went from spending 3 hours per candidate to reviewing a 2-page DNA report. The ROI is undeniable.",
    name: "Neha Joshi",
    role: "HR Director",
    company: "SkyScale",
    rating: 5,
    avatar: "NJ",
    color: "#DC2626",
  },
  {
    quote:
      "The code sandbox is genuinely impressive — it runs real code, catches edge cases, and scores complexity. We haven't written a take-home test since.",
    name: "Kabir Singh",
    role: "CTO",
    company: "Nexlayer",
    rating: 5,
    avatar: "KS",
    color: "#0891B2",
  },
];

export default function Testimonials() {
  return (
    <section
      className="py-24 md:py-32 overflow-hidden relative"
      style={{ background: "#030914" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute"
          style={{
            top: "20%", left: "-10%",
            width: "50%", height: "60%",
            background: "radial-gradient(ellipse, rgba(13,71,161,0.08) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ color: "#42A5F5" }}
          >
            Trusted Globally
          </p>
          <h2
            className="font-outfit font-black text-white tracking-tighter"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.05 }}
          >
            What Hiring Teams Are Saying
          </h2>
        </div>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 flex flex-col gap-4 transition-all hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${t.color}30`;
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.035)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="w-3.5 h-3.5 fill-current"
                    style={{ color: "#FFC107" }}
                  />
                ))}
              </div>

              {/* Quote */}
              <p
                className="text-[13px] leading-relaxed flex-1"
                style={{ color: "rgba(226,232,240,0.75)" }}
              >
                "{t.quote}"
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-3 pt-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)` }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white/85">{t.name}</p>
                  <p className="text-[10px] font-medium" style={{ color: "rgba(100,116,139,0.7)" }}>
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
