"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Terminal, Activity, Zap } from "lucide-react";

const BARS = 24;

export default function Hero() {
  const [bars,      setBars]      = useState<number[]>([]);
  const [liveScore, setLiveScore] = useState(91);
  const [mounted,   setMounted]   = useState(false);

  /* Waveform animation */
  useEffect(() => {
    setMounted(true);
    setBars(Array.from({ length: BARS }, () => Math.floor(Math.random() * 55) + 18));
    const iv = setInterval(() => {
      setBars(Array.from({ length: BARS }, () => Math.floor(Math.random() * 55) + 18));
    }, 140);
    return () => clearInterval(iv);
  }, []);

  /* Score oscillation */
  useEffect(() => {
    const iv = setInterval(() => {
      setLiveScore((p) => {
        const n = p + (Math.random() > 0.5 ? 1 : -1);
        return n > 97 ? 94 : n < 86 ? 89 : n;
      });
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  return (
    <section
      className="relative min-h-[100svh] flex items-center overflow-hidden text-slate-100 z-10 pt-28 pb-20"
      style={{ background: "#030914" }}
    >
      {/* ── Background mesh ───────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glows */}
        <div
          className="absolute"
          style={{
            top: "-15%", right: "-10%",
            width: "70%", height: "80%",
            background: "radial-gradient(ellipse, rgba(13,71,161,0.22) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "-20%", left: "-10%",
            width: "55%", height: "70%",
            background: "radial-gradient(ellipse, rgba(25,118,210,0.1) 0%, transparent 60%)",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ── Background SVG thread ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 1200 900"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="thread-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#42A5F5" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0D47A1" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path
            d="M 600,0 L 600,280 Q 600,380 760,380 L 820,380 Q 920,380 920,460 L 920,520 L 600,680 L 600,900"
            fill="none" stroke="rgba(22,46,92,0.6)" strokeWidth="1.5"
          />
          <path
            d="M 600,0 L 600,280 Q 600,380 760,380 L 820,380 Q 920,380 920,460 L 920,520 L 600,680 L 600,900"
            fill="none" stroke="url(#thread-grad)" strokeWidth="2"
            strokeDasharray="60 280" className="animate-hero-flow"
          />
          <circle cx="600" cy="8" r="4" fill="#42A5F5" opacity="0.8" />
          <circle cx="600" cy="8" r="8" fill="#42A5F5" opacity="0.15" />
        </svg>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">

        {/* Left — Copy */}
        <div className="lg:col-span-6 space-y-8">

          {/* Live indicator pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#10B981", boxShadow: "0 0 6px #10B981", animation: "glow-pulse 2s ease-in-out infinite" }}
            />
            Verification Engine Live
          </div>

          {/* Main headline */}
          <h1
            className="font-outfit font-black leading-[0.95] tracking-tighter"
            style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}
          >
            <span className="block text-white/90 mb-2">The Future of</span>
            <span
              style={{
                background: "linear-gradient(135deg, #42A5F5 0%, #1976D2 45%, #FFC107 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% 100%",
              }}
            >
              Hiring is Verified.
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="text-base leading-relaxed max-w-lg font-inter"
            style={{ color: "rgba(148,163,184,0.85)" }}
          >
            CAPVIA replaces biased resumes with evidence-based, verified developer
            DNA — through real-time code sandboxes and proctored AI interviews.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/internships"
              className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "white",
                color: "#0F172A",
                boxShadow: "0 4px 20px rgba(255,255,255,0.12)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(255,255,255,0.12)";
              }}
            >
              Find Internship
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest text-white/80 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
            >
              Hire Talent
            </Link>
          </div>

          {/* Trust line */}
          <div className="flex items-center gap-4">
            {[
              { icon: Shield,   text: "Proctored Integrity" },
              { icon: Terminal, text: "Live Code Sandbox" },
              { icon: Zap,      text: "DNA Verified" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{ color: "#42A5F5" }} />
                <span className="text-[10px] font-semibold" style={{ color: "rgba(148,163,184,0.7)" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Live telemetry panel */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div
            className="w-full max-w-lg relative group"
            style={{
              background: "rgba(8,21,46,0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 24,
              padding: "28px",
              boxShadow: "0 32px 80px rgba(3,9,20,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute top-0 right-0 pointer-events-none"
              style={{
                width: 220, height: 220,
                background: "radial-gradient(circle, rgba(66,165,245,0.08) 0%, transparent 70%)",
              }}
            />

            {/* Scan line animation */}
            <div
              className="absolute left-0 right-0 h-px pointer-events-none animate-scan-line"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(66,165,245,0.7), transparent)",
                boxShadow: "0 0 12px rgba(66,165,245,0.4)",
              }}
            />

            {/* Panel header */}
            <div
              className="flex items-center justify-between pb-5 mb-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#10B981", boxShadow: "0 0 8px #10B981", animation: "glow-pulse 2s ease-in-out infinite" }}
                />
                <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Verification Signal Radar
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                style={{
                  background: "rgba(66,165,245,0.1)",
                  border: "1px solid rgba(66,165,245,0.2)",
                  color: "#42A5F5",
                }}
              >
                <Activity className="w-3 h-3" style={{ animation: "glow-pulse 2s ease-in-out infinite" }} />
                TELEMETRY ACTIVE
              </div>
            </div>

            {/* Waveform visualizer */}
            <div
              className="relative overflow-hidden flex flex-col justify-between"
              style={{
                height: 168,
                background: "rgba(3,9,20,0.8)",
                borderRadius: 16,
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.04)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {/* Scan lines overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 5px, rgba(255,255,255,0.008) 5px, rgba(255,255,255,0.008) 6px)",
                }}
              />

              {/* Terminal header */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3" style={{ color: "#42A5F5" }} />
                  <span className="text-[9px] font-mono" style={{ color: "#42A5F5", letterSpacing: "0.08em" }}>
                    Candidate_Verification_Thread
                  </span>
                </div>
                <span className="text-[9px] font-mono flex items-center gap-1.5" style={{ color: "#10B981" }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#10B981", animation: "glow-pulse 1.5s ease-in-out infinite" }}
                  />
                  PROCTORED
                </span>
              </div>

              {/* Bars */}
              {mounted && (
                <div className="flex items-end justify-between gap-px h-16 relative z-10 mt-auto">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all duration-150"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, #0D47A1, #1976D2, #42A5F5)`,
                        boxShadow: "0 0 6px rgba(66,165,245,0.12)",
                        opacity: 0.8 + (i % 3) * 0.07,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between relative z-10 mt-2">
                <span className="text-[8px] font-mono" style={{ color: "rgba(100,116,139,0.7)" }}>
                  SYS_LOG: PIPELINE_STAGE_03
                </span>
                <span
                  className="text-[8px] font-mono"
                  style={{ color: "#FFC107", animation: "glow-pulse 2s ease-in-out infinite" }}
                >
                  OPTIMIZING_IDE_METRICS
                </span>
              </div>
            </div>

            {/* Candidate DNA card */}
            <div
              className="mt-4 relative overflow-hidden"
              style={{
                background: "rgba(3,9,20,0.5)",
                borderRadius: 16,
                padding: "18px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-outfit font-black text-xs text-white"
                    style={{
                      background: "linear-gradient(135deg, #0D47A1, #1976D2)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    HA
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white/90">Huzaifa Ansari</p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "rgba(100,116,139,0.6)" }}>
                      Candidate DNA Verified
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    color: "#10B981",
                  }}
                >
                  <Shield className="w-3 h-3" />
                  VERIFIED
                </div>
              </div>

              {/* Stats bars */}
              <div className="space-y-2.5">
                {[
                  { name: "Code Optimization",    value: 92 },
                  { name: "System Architecture",  value: 85 },
                  { name: "AI Speech Integrity",  value: mounted ? liveScore : 91 },
                ].map((stat) => (
                  <div key={stat.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(100,116,139,0.7)" }}>
                        {stat.name}
                      </span>
                      <span className="text-[9px] font-mono font-black" style={{ color: "#42A5F5" }}>
                        {stat.value}%
                      </span>
                    </div>
                    <div
                      className="w-full h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${stat.value}%`,
                          background: "linear-gradient(90deg, #1976D2, #42A5F5)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
