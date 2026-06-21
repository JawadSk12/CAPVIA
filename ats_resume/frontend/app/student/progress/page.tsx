"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import ProgressBar from "@/components/shared/ProgressBar";
import { resumeApi } from "@/lib/api";
import type { ResumeSummary } from "@/types/ats";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Award, BrainCircuit, Star, TrendingUp } from "lucide-react";

export default function ProgressPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resumeApi
      .getHistory(50)
      .then((r) => setResumes(r.filter((x) => x.ats_score != null)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Chart data — ordered oldest first
  const chartData = [...resumes]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((r) => ({
      date: format(new Date(r.created_at), "MMM d"),
      score: r.ats_score,
      name: r.original_filename,
    }));

  const scores = resumes.map((r) => r.ats_score ?? 0);
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore  = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const latestScore = scores[0] ?? 0;
  const improvement =
    scores.length >= 2 ? (scores[0] ?? 0) - (scores[scores.length - 1] ?? 0) : 0;

  const STATS = [
    { label: "Best Score",    value: bestScore  ? `${bestScore}%`  : "—", icon: Star,        color: "text-amber-500",   bg: "bg-amber-50"  },
    { label: "Latest Score",  value: latestScore ? `${latestScore}%` : "—", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Average Score", value: avgScore   ? `${avgScore}%`   : "—", icon: BrainCircuit,color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Improvement",   value: improvement >= 0 ? `+${improvement}%` : `${improvement}%`, icon: Award, color: improvement >= 0 ? "text-emerald-600" : "text-rose-500", bg: improvement >= 0 ? "bg-emerald-50" : "bg-rose-50" },
  ];

  // Milestone badges
  const milestones = [
    { label: "First Upload",    earned: resumes.length >= 1,  icon: "🚀" },
    { label: "5 Analyses",      earned: resumes.length >= 5,  icon: "🔬" },
    { label: "Score > 60",      earned: bestScore > 60,       icon: "✨" },
    { label: "Score > 80",      earned: bestScore > 80,       icon: "🏆" },
    { label: "Score > 90",      earned: bestScore > 90,       icon: "⭐" },
    { label: "Consistent User", earned: resumes.length >= 10, icon: "💎" },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />

        <main className="flex-1 page-container">
          <div className="mb-6 animate-slide-up">
            <h1 className="section-title text-2xl">My Progress</h1>
            <p className="section-subtitle">Track your ATS score improvement over time</p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-slide-up delay-100">
            {STATS.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="stat-card card-hover">
                <div className={`stat-icon ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-6 mb-8 animate-slide-up delay-200">
            <h2 className="font-semibold text-slate-700 mb-6">ATS Score Over Time</h2>
            {loading ? (
              <div className="h-48 skeleton rounded-xl" />
            ) : chartData.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Upload at least 2 resumes to see your progress chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#1E293B",
                      border: "none",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    formatter={(v: number) => [`${v}%`, "ATS Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ fill: "#4F46E5", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#4F46E5" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-dimension breakdown (latest resume) */}
          {resumes[0] && (
            <div className="card p-6 mb-8 animate-slide-up delay-300">
              <h2 className="font-semibold text-slate-700 mb-5">
                Latest Resume — Score Breakdown
              </h2>
              <p className="text-xs text-slate-400 mb-4">{resumes[0].original_filename}</p>
              <div className="space-y-4">
                {[
                  { label: "Overall ATS Score", value: resumes[0].ats_score ?? 0 },
                ].map(({ label, value }) => (
                  <ProgressBar key={label} label={label} value={value} size="md" />
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="card p-6 animate-slide-up delay-400">
            <h2 className="font-semibold text-slate-700 mb-5">Achievements</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {milestones.map(({ label, earned, icon }) => (
                <div
                  key={label}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200 ${
                    earned
                      ? "bg-indigo-50 border border-indigo-100 shadow-sm"
                      : "bg-slate-50 border border-slate-100 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <p className="text-xs font-medium text-slate-700 leading-tight">{label}</p>
                  {earned && (
                    <span className="badge badge-emerald text-2xs">Earned</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
