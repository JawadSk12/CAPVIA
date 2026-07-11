"use client";

import React, { useEffect, useRef } from "react";

const STATS = [
  { value: "94%",   label: "ATS Match Accuracy",    sub: "vs 52% industry average"  },
  { value: "3.2×",  label: "Faster Hiring Cycles",  sub: "From apply to offer"       },
  { value: "99.1%", label: "Proctoring Accuracy",   sub: "Zero false-positives"      },
  { value: "40K+",  label: "Candidates Verified",   sub: "Across all assessment types" },
];

function useCountUp(target: string, duration = 1600) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const numericPart = parseFloat(target.replace(/[^0-9.]/g, ""));
    const suffix = target.replace(/[0-9.]/g, "");
    if (isNaN(numericPart)) { el.textContent = target; return; }

    const start = performance.now();
    const animate = (ts: number) => {
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericPart * eased;
      el.textContent = (current % 1 === 0 || progress === 1
        ? current.toFixed(current % 1 === 0 ? 0 : 1)
        : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return ref;
}

function StatItem({ value, label, sub }: { value: string; label: string; sub: string }) {
  const numRef = useCountUp(value, 1800);
  return (
    <div className="text-center px-6 md:px-10 py-4 md:py-6 relative">
      <p
        className="font-outfit font-black text-white mb-1"
        style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)", lineHeight: 1, letterSpacing: "-0.03em" }}
      >
        <span ref={numRef}>{value}</span>
      </p>
      <p className="text-[12px] font-semibold text-white/70 mb-0.5">{label}</p>
      <p className="text-[10px] text-white/35 font-medium">{sub}</p>
    </div>
  );
}

export default function Stats() {
  return (
    <section
      className="py-12"
      style={{ background: "#030914", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div
          className="grid grid-cols-2 md:grid-cols-4"
        >
          {STATS.map((s, i) => (
            <div
              key={i}
              style={{ borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            >
              <StatItem {...s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
