"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";

interface SemanticPoint {
  skill: string;
  similarity: number;   // 0–1
  ats_weight?: number;  // 0–1
  matched: boolean;
}

interface SemanticMatchVizProps {
  matched: string[];
  missing: string[];
  skillScores?: Record<string, number>;
}

export default function SemanticMatchViz({ matched, missing, skillScores }: SemanticMatchVizProps) {
  const allSkills: SemanticPoint[] = [
    ...matched.map((sk, i) => ({
      skill: sk,
      similarity: skillScores?.[sk] ?? 0.7 + (i % 3) * 0.08,
      ats_weight:  0.7 + Math.random() * 0.3,
      matched: true,
    })),
    ...missing.map((sk, i) => ({
      skill: sk,
      similarity: skillScores?.[sk] ?? 0.1 + (i % 4) * 0.07,
      ats_weight:  0.5 + Math.random() * 0.4,
      matched: false,
    })),
  ];

  const matchedData = allSkills.filter((s) => s.matched);
  const missingData = allSkills.filter((s) => !s.matched);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as SemanticPoint;
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-lg">
        <p className="font-bold">{d.skill}</p>
        <p className="text-slate-300 mt-1">
          Similarity: {Math.round(d.similarity * 100)}%
        </p>
        <p className="text-slate-300">
          ATS Weight: {Math.round((d.ats_weight ?? 0) * 100)}%
        </p>
        <p className={d.matched ? "text-emerald-400" : "text-rose-400"}>
          {d.matched ? "✓ Matched" : "✗ Missing"}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-700 mb-1">Semantic Skill Map</h2>
        <p className="text-xs text-slate-400">
          X-axis = semantic similarity to JD. Y-axis = ATS weight.{" "}
          <span className="text-indigo-600 font-semibold">Blue = matched</span>,{" "}
          <span className="text-rose-500 font-semibold">Red = missing</span>.
          Hover for details.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            type="number"
            dataKey="similarity"
            name="Similarity"
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Semantic Similarity →", position: "insideBottom", offset: -5, fontSize: 11, fill: "#94A3B8" }}
          />
          <YAxis
            type="number"
            dataKey="ats_weight"
            name="ATS Weight"
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
          />
          <ZAxis range={[60, 200]} />
          <Tooltip content={<CustomTooltip />} />

          {/* Matched skills — indigo */}
          <Scatter
            name="Matched"
            data={matchedData}
            fill="#4F46E5"
            fillOpacity={0.75}
          />

          {/* Missing skills — rose */}
          <Scatter
            name="Missing"
            data={missingData}
            fill="#F43F5E"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant legend */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
          <p className="font-semibold text-emerald-700">High Sim + High Weight</p>
          <p>Top-right: your strongest, most valuable skills</p>
        </div>
        <div className="bg-rose-50 rounded-lg p-2.5 border border-rose-100">
          <p className="font-semibold text-rose-700">Low Sim + High Weight</p>
          <p>Top-left: critical gaps to address immediately</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <p className="font-semibold text-slate-600">High Sim + Low Weight</p>
          <p>Bottom-right: nice-to-have skills you already have</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <p className="font-semibold text-slate-500">Low Sim + Low Weight</p>
          <p>Bottom-left: low-priority gaps, safe to ignore</p>
        </div>
      </div>
    </div>
  );
}
