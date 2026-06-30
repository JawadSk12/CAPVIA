"use client";

import type { InternshipATSResult } from "@/types/ats";
import ProgressBar from "@/components/shared/ProgressBar";
import ConfidenceIndicator from "./ConfidenceIndicator";
import { CheckCircle, XCircle, AlertTriangle, Lightbulb } from "lucide-react";
import clsx from "clsx";

interface InternshipComparisonProps {
  result: InternshipATSResult;
  jdTitle?: string;
}

export default function InternshipComparison({ result, jdTitle }: InternshipComparisonProps) {
  const score = result.overall_score ?? 0;

  const scoreColor =
    score >= 80 ? "text-emerald-600" :
    score >= 60 ? "text-indigo-600"  :
    score >= 40 ? "text-amber-600"   :
    "text-rose-600";

  return (
    <div className="space-y-6">
      {/* Header score */}
      <div className="card p-6 flex items-center gap-6">
        <div className="flex-shrink-0 text-center">
          <p className={clsx("text-5xl font-black tabular-nums", scoreColor)}>
            {Math.round(score)}
            <span className="text-xl font-normal text-slate-400">%</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">JD Match Score</p>
          {jdTitle && <p className="text-xs font-medium text-indigo-600 mt-0.5">{jdTitle}</p>}
        </div>
        <div className="flex-1 space-y-3">
          <ConfidenceIndicator confidence={result.ai_confidence ?? 0.8} />
          <div className="flex gap-2 flex-wrap">
            {result.score_band && (
              <span className={clsx(
                "badge",
                result.score_band === "STRONG" ? "badge-emerald" :
                result.score_band === "GOOD"   ? "badge-indigo"  :
                result.score_band === "FAIR"   ? "badge-amber"   : "badge-rose"
              )}>
                {result.score_band}
              </span>
            )}
            {result.is_suspicious && (
              <span className="badge badge-rose gap-1">
                <AlertTriangle size={11} />
                Flagged
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dimension breakdown */}
      {result.dimensions && result.dimensions.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 mb-5">Dimension Breakdown</h2>
          <div className="space-y-4">
            {result.dimensions.map((dim) => (
              <div key={dim.dimension}>
                <ProgressBar
                  label={dim.display_name}
                  value={dim.score * 100}
                  size="md"
                />
                {dim.explanation && (
                  <p className="text-xs text-slate-400 mt-1 ml-0.5">{dim.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills comparison */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
            <CheckCircle size={13} />
            Required Skills Matched ({result.required_skills_analysis?.matched_count ?? 0})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.required_skills_analysis?.matches?.map((m) => (
              <span key={m.target_skill} className="badge badge-emerald">{m.target_skill}</span>
            )) ?? <p className="text-xs text-slate-400">None</p>}
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-rose-700 mb-3 flex items-center gap-1.5">
            <XCircle size={13} />
            Critical Gaps ({result.critical_gaps?.length ?? 0})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.critical_gaps?.map((sk) => (
              <span key={sk} className="badge badge-rose">{sk}</span>
            )) ?? <p className="text-xs text-slate-400">None</p>}
          </div>
        </div>
      </div>

      {/* Action items */}
      {result.action_items && result.action_items.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-amber-500" />
            Recommended Actions
          </h3>
          <ul className="space-y-2">
            {result.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
