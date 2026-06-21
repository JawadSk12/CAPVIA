"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import { resumeApi } from "@/lib/api";
import type { ResumeSummary } from "@/types/ats";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  Search,
  SortAsc,
  Upload,
} from "lucide-react";
import Link from "next/link";
import ProgressBar from "@/components/shared/ProgressBar";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

const STATUS_OPTIONS = ["ALL", "COMPLETED", "PROCESSING", "FAILED", "PENDING"];

function statusIcon(status: string) {
  const map: Record<string, React.ElementType> = {
    COMPLETED: CheckCircle,
    PROCESSING: Clock,
    FAILED: AlertTriangle,
    PENDING: Clock,
  };
  const Icon = map[status] ?? Clock;
  const colors: Record<string, string> = {
    COMPLETED: "text-emerald-500",
    PROCESSING: "text-indigo-500",
    FAILED: "text-rose-500",
    PENDING: "text-amber-500",
  };
  return <Icon size={14} className={colors[status] ?? "text-slate-400"} />;
}

export default function AnalysisListPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");

  useEffect(() => {
    resumeApi.getHistory(50).then(setResumes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = resumes
    .filter((r) => {
      const matchSearch = r.original_filename.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.ats_score ?? 0) - (a.ats_score ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleDelete = async (resumeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this analysis? This cannot be undone.")) return;
    try {
      await resumeApi.delete(resumeId);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
    } catch {
      alert("Failed to delete.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />

        <main className="flex-1 page-container">
          <div className="flex items-center justify-between mb-6 animate-slide-up">
            <div>
              <h1 className="section-title text-2xl">My Analyses</h1>
              <p className="section-subtitle">All your resume analyses in one place</p>
            </div>
            <Link href="/student/upload" className="btn-primary btn-sm gap-1.5">
              <Upload size={14} />
              New Upload
            </Link>
          </div>

          {/* Filters */}
          <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center animate-slide-up delay-100">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by filename…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input py-2 text-sm w-auto"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <SortAsc size={15} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "score")}
                className="input py-2 text-sm w-auto"
              >
                <option value="date">Sort: Newest</option>
                <option value="score">Sort: Best Score</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-xs text-slate-400 mb-4 animate-fade-in">
              Showing {filtered.length} of {resumes.length} analyses
            </p>
          )}

          {/* Table / Cards */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} rows={2} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-16 text-center space-y-4 animate-fade-in">
              <BrainCircuit size={40} className="mx-auto text-slate-200" />
              <p className="font-semibold text-slate-500">No analyses found</p>
              <p className="text-sm text-slate-400">
                {search || statusFilter !== "ALL"
                  ? "Try adjusting your filters."
                  : "Upload your first resume to get started."}
              </p>
              <Link href="/student/upload" className="btn-primary btn-sm inline-flex">
                Upload Resume
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r, i) => (
                <Link
                  key={r.id}
                  href={r.status === "COMPLETED" ? `/student/analysis/${r.id}` : "#"}
                  className={clsx(
                    "card flex items-center gap-4 p-4 group animate-slide-up",
                    r.status === "COMPLETED" ? "card-hover cursor-pointer" : "opacity-75 cursor-default",
                    `delay-${Math.min(i * 50, 300)}`
                  )}
                >
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-indigo-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {r.original_filename}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                        {statusIcon(r.status)}
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.detected_role && ` · ${r.detected_role}`}
                    </p>
                    {r.ats_score != null && (
                      <div className="mt-2.5 max-w-xs">
                        <ProgressBar value={r.ats_score} size="sm" showValue={false} animated={false} />
                      </div>
                    )}
                  </div>

                  {/* Score + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.ats_score != null ? (
                      <span className="text-2xl font-black text-slate-800 tabular-nums">
                        {r.ats_score}
                        <span className="text-xs font-normal text-slate-400">%</span>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                    <div className="flex gap-2">
                      {r.status === "COMPLETED" && (
                        <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                          <ArrowRight size={16} />
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className="text-slate-300 hover:text-rose-500 transition-colors text-xs"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
