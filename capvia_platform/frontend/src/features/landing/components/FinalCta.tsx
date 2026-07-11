"use client";

import React from "react";
import { ArrowRight, Sparkles, BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function FinalCta() {
  return (
    <section
      className="py-28 md:py-36 relative overflow-hidden"
      style={{ background: "#030914" }}
    >
      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(13,71,161,0.18) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span
            className="w-px h-8 block"
            style={{ background: "linear-gradient(to bottom, transparent, #42A5F5, transparent)" }}
          />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#42A5F5" }}>
            The Future of Hiring
          </span>
          <span
            className="w-px h-8 block"
            style={{ background: "linear-gradient(to bottom, transparent, #42A5F5, transparent)" }}
          />
        </div>

        {/* Headline */}
        <h2
          className="font-outfit font-black text-white tracking-tighter mb-6"
          style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)", lineHeight: 1.0 }}
        >
          Stop Hiring on<br />
          <span
            style={{
              background: "linear-gradient(135deg, #42A5F5 0%, #1976D2 40%, #FFC107 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Assumptions.
          </span>
        </h2>

        <p
          className="text-base max-w-lg mx-auto leading-relaxed mb-10 font-medium"
          style={{ color: "rgba(148,163,184,0.75)" }}
        >
          Join thousands of companies that have switched to evidence-based,
          AI-verified hiring through CAPVIA's DNA-first platform.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[12px] uppercase tracking-widest text-white transition-all hover:-translate-y-0.5"
            style={{
              background: "#0D47A1",
              boxShadow: "0 4px 24px rgba(13,71,161,0.4), 0 0 0 1px rgba(66,165,245,0.2) inset",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(13,71,161,0.5), 0 0 0 1px rgba(66,165,245,0.3) inset";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(13,71,161,0.4), 0 0 0 1px rgba(66,165,245,0.2) inset";
            }}
          >
            <BrainCircuit className="w-4 h-4" />
            Start Hiring Smarter
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/internships"
            className="flex items-center gap-2 px-7 py-4 rounded-2xl font-bold text-[12px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
            }}
          >
            <Sparkles className="w-4 h-4" />
            Browse Internships
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-[10px] font-semibold mt-8 uppercase tracking-widest" style={{ color: "rgba(100,116,139,0.5)" }}>
          No credit card required · Full access · Free for candidates
        </p>
      </div>
    </section>
  );
}
