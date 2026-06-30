"use client";

import React, { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Mehta",
    role: "HR Lead",
    company: "TechNova Solutions",
    avatar: "PM",
    avatarBg: "bg-[#0D47A1]",
    content:
      "CAPVIA completely transformed how we hire interns. What used to take 3 weeks of manual screening now takes 3 days. The ATS scoring is frighteningly accurate — candidates we shortlist through CAPVIA consistently outperform manual hires.",
    rating: 5,
    tag: "HR Manager",
  },
  {
    name: "Rahul Verma",
    role: "Software Engineering Intern",
    company: "Hired via CAPVIA",
    avatar: "RV",
    avatarBg: "bg-[#1976D2]",
    content:
      "I was nervous about AI interviews, but CAPVIA's process was incredibly fair. It evaluated my actual coding ability, not just my resume. The DNA profile they generated gave me real feedback on my strengths — I've never had that from any other process.",
    rating: 5,
    tag: "Candidate",
  },
  {
    name: "Ayesha Khan",
    role: "Talent Acquisition Manager",
    company: "FinBridge Capital",
    avatar: "AK",
    avatarBg: "bg-[#0D47A1]",
    content:
      "The integrity engine is what sold us. We had issues with candidates misrepresenting skills. With CAPVIA's proctored simulation and behavioral analysis, every shortlisted candidate we hired has been exactly what they presented.",
    rating: 5,
    tag: "HR Manager",
  },
  {
    name: "Aditya Sharma",
    role: "Data Science Intern",
    company: "Hired at DataLogic",
    avatar: "AS",
    avatarBg: "bg-[#1976D2]",
    content:
      "The coding simulation is the most realistic I've encountered. It tested actual problem-solving, not LeetCode grinding. And I received my DNA competence report with a detailed breakdown — it helped me even after the process ended.",
    rating: 5,
    tag: "Candidate",
  },
  {
    name: "Nisha Patel",
    role: "Campus Recruiting Head",
    company: "Horizon Consulting",
    avatar: "NP",
    avatarBg: "bg-[#0D47A1]",
    content:
      "Our hiring funnel conversion rate went from 8% to 31% after switching to CAPVIA. The leaderboard view saves us hours — we can instantly see who is genuinely top-quartile versus who has a polished CV.",
    rating: 5,
    tag: "HR Manager",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a - 1 + testimonials.length) % testimonials.length);
  const next = () => setActive((a) => (a + 1) % testimonials.length);

  const t = testimonials[active];

  return (
    <section className="relative py-28 bg-[#030914] overflow-hidden text-slate-100 z-10 border-t border-slate-900">
      
      {/* SVG Thread trace running vertically - dark theme style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#162A45" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#42A5F5" strokeWidth="2.5" strokeDasharray="30 220" className="animate-test-thread" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10">

        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold tracking-wide shadow-sm mb-6">
            Customer Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white font-outfit tracking-tighter leading-none">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-[#42A5F5] to-[#FFC107] bg-clip-text text-transparent">
              Recruiters & Candidates
            </span>
          </h2>
        </div>

        {/* Testimonial Card (Dark Glass Asymmetrical Console) */}
        <div className="relative max-w-3xl mx-auto">
          <div className="bg-slate-950 border border-slate-850 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl p-10 md:p-14 shadow-2xl relative overflow-hidden group">
            
            <Quote className="w-10 h-10 text-[#42A5F5]/10 mb-6" />

            {/* Stars */}
            <div className="flex items-center gap-1 mb-6">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="w-5 h-5 text-[#FFC107] fill-[#FFC107]" />
              ))}
            </div>

            <p className="text-lg text-slate-300 leading-relaxed font-medium mb-8">
              &ldquo;{t.content}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center justify-between border-t border-slate-900 pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${t.avatarBg} flex items-center justify-center text-white font-black text-base font-outfit shadow-md`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.role} · {t.company}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${
                t.tag === "Candidate"
                  ? "bg-[#1976D2]/10 text-[#42A5F5] border-[#1976D2]/20"
                  : "bg-[#0D47A1]/10 text-slate-350 border-[#0D47A1]/20"
              }`}>
                {t.tag}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8 relative">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 hover:border-[#42A5F5]/40 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`rounded-full transition-all ${i === active ? 'w-6 h-2 bg-[#42A5F5]' : 'w-2 h-2 bg-slate-800 hover:bg-slate-700'}`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 hover:border-[#42A5F5]/40 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes test-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-test-thread {
          animation: test-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
