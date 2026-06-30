"use client";

import type { ATSAnalysisResponse } from "@/types/ats";
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";

interface ExplainabilityPanelProps {
  analysis: ATSAnalysisResponse | any;
}

const FEATURE_COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#F43F5E",
  "#8B5CF6", "#06B6D4", "#84CC16", "#EC4899",
];

export default function ExplainabilityPanel({ analysis }: ExplainabilityPanelProps) {
  const shapValues: { feature: string; value: number; impact: "positive" | "negative" }[] =
    analysis?.shap_values?.map((s: any) => ({
      feature: s.feature ?? s.name,
      value:   Math.abs(s.value ?? s.shap_value ?? 0),
      impact:  (s.value ?? s.shap_value ?? 0) >= 0 ? "positive" : "negative",
    })) ?? [];

  // Fallback: build from dimension scores
  const dims = analysis?.dimension_scores || {};
  const dimensionData =
    shapValues.length > 0
      ? shapValues
      : [
          { feature: "Skills Match",    value: dims.semantic_skill_match  ?? 0, impact: "positive" as const },
          { feature: "Experience",      value: dims.experience_depth      ?? 0, impact: "positive" as const },
          { feature: "Education",       value: dims.education_alignment   ?? 0, impact: "positive" as const },
          { feature: "Project Rel.",    value: dims.project_relevance     ?? 0, impact: "positive" as const },
          { feature: "Format",          value: dims.ats_format            ?? 0, impact: "positive" as const },
          { feature: "Keywords",        value: dims.keyword_intelligence  ?? 0, impact: "positive" as const },
          { feature: "Skill Proof",     value: dims.skill_proof_score     ?? 0, impact: "positive" as const },
        ].sort((a, b) => b.value - a.value);

  const positiveFactors = dimensionData.filter((d) => d.impact === "positive").slice(0, 3);
  const negativeFactors = dimensionData.filter((d) => d.impact === "negative" || d.value < 0.4).slice(0, 3);

  return (
    <div className="space-y-5">
      {/* SHAP bar chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-500" />
          Feature Importance (SHAP)
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Which factors contributed most to your ATS score.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={dimensionData}
            layout="vertical"
            margin={{ top: 0, right: 20, bottom: 0, left: 90 }}
          >
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="feature"
              type="category"
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
              width={85}
            />
            <Tooltip
              contentStyle={{
                background: "#1E293B",
                border: "none",
                borderRadius: "12px",
                color: "#F8FAFC",
                fontSize: "12px",
              }}
              formatter={(v: number) => [`${Math.round(v * 100)}%`, "Score"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {dimensionData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.impact === "positive" ? FEATURE_COLORS[i % FEATURE_COLORS.length] : "#F43F5E"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="card p-5">
          <h3 className="font-semibold text-emerald-700 text-sm flex items-center gap-2 mb-4">
            <TrendingUp size={15} />
            Top Strengths
          </h3>
          <div className="space-y-3">
            {positiveFactors.map(({ feature, value }) => (
              <div key={feature} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600">{feature}</span>
                <span className="font-bold text-emerald-600 text-sm tabular-nums">
                  {Math.round(value * 100)}%
                </span>
              </div>
            ))}
            {positiveFactors.length === 0 && (
              <p className="text-xs text-slate-400">No strong areas detected yet.</p>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="card p-5">
          <h3 className="font-semibold text-rose-700 text-sm flex items-center gap-2 mb-4">
            <TrendingDown size={15} />
            Areas to Improve
          </h3>
          <div className="space-y-3">
            {negativeFactors.map(({ feature, value }) => (
              <div key={feature} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600">{feature}</span>
                <span className="font-bold text-rose-500 text-sm tabular-nums">
                  {Math.round(Math.abs(value) * 100)}%
                </span>
              </div>
            ))}
            {negativeFactors.length === 0 && (
              <p className="text-xs text-slate-400">No major weaknesses detected.</p>
            )}
          </div>
        </div>
      </div>

      {/* Fraud flags detail */}
      {analysis?.fraud_analysis?.flags && analysis.fraud_analysis.flags.length > 0 && (
        <div className="card p-5 border-rose-200 bg-rose-50/50">
          <h3 className="font-semibold text-rose-700 text-sm flex items-center gap-2 mb-4">
            <AlertTriangle size={15} />
            Fraud / Exaggeration Flags
          </h3>
          <div className="space-y-3">
            {analysis.fraud_analysis.flags.map((flag: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-rose-700">{flag.affected_skill ?? flag.flag_type}</p>
                  <p className="text-rose-600/70 text-xs mt-0.5">{flag.detail}</p>
                  {flag.confidence != null && (
                    <p className="text-xs text-rose-400 mt-0.5">
                      Confidence: {Math.round(flag.confidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
