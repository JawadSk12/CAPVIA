"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";
import ATSMeter from "@/features/ats/components/ATSMeter";
import SkillGapChart from "@/features/ats/components/SkillGapChart";
import ResumeHeatmap from "@/features/ats/components/ResumeHeatmap";
import ExplainabilityPanel from "@/features/ats/components/ExplainabilityPanel";
import ResumeRewriteAI from "@/features/ats/components/ResumeRewriteAI";
import FakeSkillAlert from "@/features/ats/components/FakeSkillAlert";
import ProgressBar from "@/components/shared/ProgressBar";
import LoadingSpinner, { SkeletonCard } from "@/components/shared/LoadingSpinner";
import { resumeApi } from "@/features/ats/services/api";
import type { ATSAnalysisResponse } from "@/types/ats";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileText,
  Lightbulb,
  Map,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import clsx from "clsx";

type TabId = "overview" | "skills" | "heatmap" | "explain" | "rewrite";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview",       icon: BarChart3    },
  { id: "skills",   label: "Skill Analysis", icon: BrainCircuit },
  { id: "heatmap",  label: "Resume Heatmap", icon: Map          },
  { id: "explain",  label: "Explainability", icon: Lightbulb    },
  { id: "rewrite",  label: "AI Rewriter",    icon: Sparkles     },
];

const BAND_CONFIG: Record<string, { gradient: string; label: string; description: string }> = {
  STRONG: {
    gradient: "from-emerald-500 to-teal-500",
    label: "Strong",
    description: "Excellent ATS alignment — high chance of passing screening",
  },
  GOOD: {
    gradient: "from-blue-500 to-indigo-500",
    label: "Good",
    description: "Good score — minor improvements could push you higher",
  },
  FAIR: {
    gradient: "from-amber-400 to-orange-500",
    label: "Fair",
    description: "Moderate alignment — focus on skill gaps and keywords",
  },
  WEAK: {
    gradient: "from-rose-400 to-red-600",
    label: "Needs Work",
    description: "Low ATS score — significant improvements recommended",
  },
};

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [analysis, setAnalysis] = useState<ATSAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    resumeApi
      .getAnalysis(id)
      .then(setAnalysis)
      .catch((err) => {
        const msg = err?.response?.data?.detail ?? "Failed to load analysis.";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Resolve score (backend may return overall_score or ats_score) ──────────
  const score = analysis?.overall_score ?? analysis?.ats_score ?? 0;
  const confidence = analysis?.ai_confidence ?? analysis?.confidence_score ?? 0.8;
  const band = analysis?.score_band ?? "FAIR";
  const bandCfg = BAND_CONFIG[band] ?? BAND_CONFIG.FAIR;

  // ── Dimensions — read from analysis.dimension_scores (correct backend field) ─────
  const dims = analysis?.dimension_scores;
  const dimensionRows = dims
    ? [
        { label: "Semantic Skill Match",  value: dims.semantic_skill_match  ?? 0, icon: "🎯" },
        { label: "Experience Depth",      value: dims.experience_depth      ?? 0, icon: "📈" },
        { label: "Education Alignment",   value: dims.education_alignment   ?? 0, icon: "🎓" },
        { label: "Project Relevance",     value: dims.project_relevance     ?? 0, icon: "🔨" },
        { label: "ATS Format",            value: dims.ats_format            ?? 0, icon: "📋" },
        { label: "Keyword Intelligence",  value: dims.keyword_intelligence  ?? 0, icon: "🔍" },
        { label: "Skill Proof Score",     value: dims.skill_proof_score     ?? 0, icon: "✅" },
      ]
    : [];

  // ── Skills — map from skill_analysis (backend structure) ──────────────────
  const skillAnalysis = analysis?.skill_analysis;
  const matchedSkills = (skillAnalysis?.matches ?? []).map(
    (m: any) => m.matched_by ?? m.target_skill ?? m
  );
  const missingSkills = (skillAnalysis?.gaps ?? []).map(
    (g: any) => g.skill ?? g
  );

  // ── Quick stats ────────────────────────────────────────────────────────────
  const quickStats = [
    {
      label: "ATS Score",
      value: `${score.toFixed(1)}%`,
      sub: bandCfg.label,
      icon: Target,
      color: "text-[#0D47A1]",
      bg: "bg-blue-50",
    },
    {
      label: "Percentile",
      value: analysis ? `Top ${(100 - (analysis.percentile ?? 50)).toFixed(0)}%` : "—",
      sub: "vs similar resumes",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Skills Matched",
      value: `${skillAnalysis?.matched_count ?? matchedSkills.length}`,
      sub: `${skillAnalysis?.gap_count ?? missingSkills.length} gaps`,
      icon: BrainCircuit,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "AI Confidence",
      value: analysis?.confidence_label ?? "—",
      sub: `${Math.round(confidence * 100)}% certainty`,
      icon: Zap,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <UnifiedLayout title="Analysis Detail">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 animate-slide-up">
        <button
          onClick={() => router.push("/candidate/ats")}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 bg-white border border-slate-200"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            {analysis?.filename ?? "Resume Analysis"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI-powered ATS breakdown • Detected role:{" "}
            <span className="font-bold text-[#0D47A1]">
              {analysis?.detected_role ?? "Analyzing…"}
            </span>
          </p>
        </div>
        {analysis && (
          <a
            href={`/api/v1/resume/${id}/download`}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-xl text-sm transition flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} />
            Download Report
          </a>
        )}
      </div>

      {/* ── Fraud Alert ─────────────────────────────────────────────── */}
      {analysis?.fraud_analysis?.is_suspicious && (
        <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 animate-fade-in">
          <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-700 text-sm">Potential credibility issues detected</p>
            <p className="text-xs text-rose-600 mt-0.5">
              Our fraud model flagged {analysis.fraud_analysis.flags?.length ?? 0} concern(s).
              Ensure all claimed skills are backed by evidence in your experience section.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                activeTab === tabId
                  ? "border-[#0D47A1] text-[#0D47A1]"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} rows={4} />)}
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <RefreshCcw size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-xl text-sm transition">
            Retry
          </button>
        </div>
      ) : analysis ? (
        <div className="animate-fade-in space-y-6">

          {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <>
              {/* Score Hero Banner */}
              <div className={clsx(
                "relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br shadow-sm",
                bandCfg.gradient
              )}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                  {/* Big Score Circle */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur flex flex-col items-center justify-center border-4 border-white/40 shadow-xl">
                      <span className="text-4xl font-black leading-none">{score.toFixed(0)}</span>
                      <span className="text-sm font-medium opacity-80">/ 100</span>
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-sm font-medium opacity-80 mb-1">Overall ATS Score</div>
                    <h2 className="text-3xl font-black mb-2">{bandCfg.label} Match</h2>
                    <p className="text-sm opacity-90 max-w-md">{bandCfg.description}</p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                        🎯 {analysis.detected_role ?? "General"}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                        📊 Top {(100 - (analysis.percentile ?? 50)).toFixed(0)}% Percentile
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                        🤖 {analysis.confidence_label ?? "HIGH"} Confidence
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickStats.map(({ label, value, sub, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center mb-3", bg)}>
                      <Icon size={18} className={color} />
                    </div>
                    <p className="text-xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Dimension Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#0D47A1]" />
                  Score Breakdown by Dimension
                </h2>
                <div className="space-y-4">
                  {dimensionRows.length > 0 ? dimensionRows.map(({ label, value, icon }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <span>{icon}</span>{label}
                        </span>
                        <span className={clsx(
                          "text-sm font-bold",
                          value >= 0.7 ? "text-emerald-600" :
                          value >= 0.5 ? "text-[#0D47A1]" : "text-rose-600"
                        )}>
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className={clsx(
                            "h-2.5 rounded-full transition-all duration-700",
                            value >= 0.7 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                            value >= 0.5 ? "bg-gradient-to-r from-blue-400 to-blue-600" :
                            "bg-gradient-to-r from-rose-400 to-red-500"
                          )}
                          style={{ width: `${Math.max(value * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No dimension data available
                    </p>
                  )}
                </div>
              </div>

              {/* Matched & Missing Skills */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <h3 className="font-semibold text-slate-700 text-sm">
                      Matched Skills ({matchedSkills.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.length > 0
                      ? matchedSkills.map((sk, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
                            {sk}
                          </span>
                        ))
                      : <p className="text-xs text-slate-400">No matches found</p>
                    }
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle size={16} className="text-rose-500" />
                    <h3 className="font-semibold text-slate-700 text-sm">
                      Skill Gaps ({missingSkills.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.length > 0
                      ? missingSkills.map((sk, i) => (
                          <span key={i} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium">
                            {sk}
                          </span>
                        ))
                      : <p className="text-xs text-slate-400">No gaps detected</p>
                    }
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {analysis.explainability?.summary && (
                <div className="bg-blue-50/20 border-l-4 border-blue-500 rounded-r-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={15} className="text-blue-600" />
                    <h3 className="font-semibold text-slate-700 text-sm">AI Analysis Summary</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {analysis.explainability.summary}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── SKILLS TAB ────────────────────────────────────────────── */}
          {activeTab === "skills" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <SkillGapChart
                matched={matchedSkills}
                missing={missingSkills}
                skillScores={analysis.skill_scores}
              />
            </div>
          )}

          {/* ── HEATMAP TAB ───────────────────────────────────────────── */}
          {activeTab === "heatmap" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <ResumeHeatmap heatmap={analysis.heatmap} />
            </div>
          )}

          {/* ── EXPLAINABILITY TAB ────────────────────────────────────── */}
          {activeTab === "explain" && (
            <ExplainabilityPanel analysis={analysis} />
          )}

          {/* ── REWRITE TAB ───────────────────────────────────────────── */}
          {activeTab === "rewrite" && (
            <ResumeRewriteAI resumeId={id} analysis={analysis} />
          )}
        </div>
      ) : null}
    </UnifiedLayout>
  );
}
