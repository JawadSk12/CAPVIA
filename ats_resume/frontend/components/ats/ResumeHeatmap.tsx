"use client";

import { Map, AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { HeatmapSection } from "@/types/ats";

interface ResumeHeatmapProps {
  heatmap?: HeatmapSection[];
}

const scoreToColor = (score: number, alpha = 1) => {
  if (score >= 0.8) return `rgba(16, 185, 129, ${alpha})`;   // emerald
  if (score >= 0.6) return `rgba(79,  70, 229, ${alpha})`;   // indigo
  if (score >= 0.4) return `rgba(245, 158, 11,  ${alpha})`;  // amber
  return `rgba(244,  63,  94, ${alpha})`;                    // rose
};

export default function ResumeHeatmap({ heatmap = [] }: ResumeHeatmapProps) {
  if (heatmap.length === 0) {
    return (
      <div className="py-12 text-center">
        <Map size={36} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-500 text-sm">Heatmap not available for this resume.</p>
        <p className="text-xs text-slate-400 mt-1">
          This feature requires a completed analysis with keyword scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <Map size={16} className="text-indigo-500" />
          Resume Section Heatmap
        </h2>
        <p className="text-xs text-slate-400">
          Evaluates the relevance and structure of each section in your resume.
        </p>
      </div>

      <div className="space-y-4">
        {heatmap.map((section, idx) => {
          const relevance_score = section.relevance_score ?? section.score ?? 0;
          const section_name = section.section_name ?? section.section ?? "Section";
          const content_preview = section.content_preview ?? "";
          const feedback = section.feedback ?? "";
          const issues = section.issues ?? [];
          const missing_keywords = section.missing_keywords ?? [];

          return (
            <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div 
                className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
                style={{ backgroundColor: scoreToColor(relevance_score, 0.05) }}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: scoreToColor(relevance_score) }} 
                  />
                  <h3 className="font-bold text-slate-800">{section_name}</h3>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: scoreToColor(relevance_score) }}
                >
                  {Math.round(relevance_score * 100)}% Relevance
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Content Preview */}
                {content_preview && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Content Snippet</p>
                    <div className="bg-slate-50 text-slate-600 text-sm p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                      "{content_preview}"
                    </div>
                  </div>
                )}

                {/* Feedback & Issues */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {feedback && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">AI Feedback</p>
                      <div className="flex items-start gap-2 text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-xl">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <p>{feedback}</p>
                      </div>
                    </div>
                  )}

                  {issues.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issues Detected</p>
                      <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 p-3 rounded-xl">
                        <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <ul className="list-disc list-inside space-y-1">
                          {issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Missing Keywords */}
                {missing_keywords.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {missing_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-md border border-indigo-100">
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
