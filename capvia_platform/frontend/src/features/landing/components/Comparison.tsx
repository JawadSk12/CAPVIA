"use client";

import React from "react";
import { CheckCircle2, X } from "lucide-react";

const ROWS = [
  { feature: "AI-Conducted Interview",     capvia: true,  manual: false, other: false },
  { feature: "Live Proctored Code Test",   capvia: true,  manual: false, other: false },
  { feature: "Behavioral Trust Index",     capvia: true,  manual: false, other: false },
  { feature: "Verified DNA Profile",       capvia: true,  manual: false, other: false },
  { feature: "Resume ATS Score (0–100)",   capvia: true,  manual: true,  other: true  },
  { feature: "AI Hiring Recommendation",   capvia: true,  manual: false, other: false },
  { feature: "Explainable AI Scoring",     capvia: true,  manual: false, other: false },
  { feature: "One-click PDF Report",       capvia: true,  manual: false, other: true  },
  { feature: "Drag-and-drop Pipeline",     capvia: true,  manual: false, other: true  },
  { feature: "Bias-free Evaluation",       capvia: true,  manual: false, other: false },
];

const COLS = [
  { label: "CAPVIA",         key: "capvia", primary: true },
  { label: "Traditional HR", key: "manual", primary: false },
  { label: "Generic ATS",    key: "other",  primary: false },
];

export default function Comparison() {
  return (
    <section
      id="why-capvia"
      className="py-24 md:py-32"
      style={{ background: "#030914" }}
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ color: "#42A5F5" }}
          >
            Why CAPVIA
          </p>
          <h2
            className="font-outfit font-black text-white tracking-tighter"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.05 }}
          >
            The Verified Advantage
          </h2>
          <p
            className="text-[14px] mt-4 max-w-lg mx-auto"
            style={{ color: "rgba(148,163,184,0.65)" }}
          >
            See how CAPVIA compares to conventional hiring processes — at every stage that matters.
          </p>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-4 text-center"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="py-4 px-5 text-left">
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: "rgba(100,116,139,0.5)" }}
              >
                Feature
              </span>
            </div>
            {COLS.map((col) => (
              <div
                key={col.key}
                className="py-4 px-3"
                style={
                  col.primary
                    ? {
                        background: "rgba(13,71,161,0.15)",
                        borderLeft: "1px solid rgba(66,165,245,0.15)",
                        borderRight: "1px solid rgba(66,165,245,0.15)",
                      }
                    : {}
                }
              >
                <p
                  className="text-[11px] font-black"
                  style={{ color: col.primary ? "#42A5F5" : "rgba(100,116,139,0.55)" }}
                >
                  {col.label}
                </p>
                {col.primary && (
                  <span
                    className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(66,165,245,0.15)", color: "#42A5F5", border: "1px solid rgba(66,165,245,0.2)" }}
                  >
                    Recommended
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-4 text-center"
              style={{
                borderBottom: i < ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <div className="py-3.5 px-5 text-left">
                <span
                  className="text-[12px] font-medium"
                  style={{ color: "rgba(226,232,240,0.7)" }}
                >
                  {row.feature}
                </span>
              </div>
              {COLS.map((col) => {
                const has = row[col.key as keyof typeof row] as boolean;
                return (
                  <div
                    key={col.key}
                    className="py-3.5 px-3 flex items-center justify-center"
                    style={
                      col.primary
                        ? {
                            background: "rgba(13,71,161,0.08)",
                            borderLeft: "1px solid rgba(66,165,245,0.1)",
                            borderRight: "1px solid rgba(66,165,245,0.1)",
                          }
                        : {}
                    }
                  >
                    {has ? (
                      <CheckCircle2
                        className="w-4.5 h-4.5"
                        style={{ color: col.primary ? "#10B981" : "rgba(100,116,139,0.5)" }}
                      />
                    ) : (
                      <X
                        className="w-4 h-4"
                        style={{ color: "rgba(100,116,139,0.3)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Note */}
        <p
          className="text-center text-[11px] mt-6 font-medium"
          style={{ color: "rgba(100,116,139,0.4)" }}
        >
          Comparison based on standard HR platform capabilities. Features may vary by provider.
        </p>
      </div>
    </section>
  );
}
