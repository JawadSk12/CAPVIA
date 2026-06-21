"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { resumeApi, internshipApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  TrendingUp,
  Upload,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import ProgressBar from "@/components/shared/ProgressBar";
import type { ResumeSummary, InternshipSummary } from "@/types/ats";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

function statusBadge(status: string) {
  const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    COMPLETED: { cls: "badge-emerald", icon: CheckCircle,   label: "Completed"  },
    PROCESSING: { cls: "badge-indigo", icon: Clock,         label: "Processing" },
    FAILED:    { cls: "badge-rose",    icon: AlertTriangle, label: "Failed"     },
    PENDING:   { cls: "badge-amber",   icon: Clock,         label: "Pending"    },
  };
  const entry = map[status] ?? map.PENDING;
  const Icon = entry.icon;
  return (
    <span className={`badge ${entry.cls} gap-1`}>
      <Icon size={11} />
      {entry.label}
    </span>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, i] = await Promise.all([
          resumeApi.getHistory(5),
          internshipApi.list(true),
        ]);
        setResumes(r);
        setInternships(i.slice(0, 4));
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    })();
  }, []);

  const bestScore = resumes.reduce((max, r) => {
    const s = r.ats_score ?? 0;
    return s > max ? s : max;
  }, 0);

  const avgScore =
    resumes.length > 0
      ? Math.round(resumes.reduce((s, r) => s + (r.ats_score ?? 0), 0) / resumes.length)
      : 0;

  const STATS = [
    {
      label: "Best ATS Score",
      value: bestScore ? `${bestScore}%` : "—",
      icon: TrendingUp,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      sub: bestScore >= 80 ? "Excellent!" : bestScore > 0 ? "Room to improve" : "No data yet",
    },
    {
      label: "Resumes Analyzed",
      value: resumes.length,
      icon: FileText,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      sub: "All time",
    },
    {
      label: "Avg ATS Score",
      value: avgScore ? `${avgScore}%` : "—",
      icon: BrainCircuit,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      sub: "Across all resumes",
    },
    {
      label: "Open Internships",
      value: internships.length,
      icon: BookOpen,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      sub: "Matching your profile",
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar
          onMenuToggle={() => setSidebarOpen((p) => !p)}
          sidebarOpen={sidebarOpen}
        />

        <main className="flex-1 page-container">
          {/* Welcome */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="text-slate-500 mt-1">
              Here&apos;s an overview of your resume performance.
            </p>
          </div>

          {/* Quick action */}
          <div className="mb-8 animate-slide-up delay-100">
            <Link
              href="/student/upload"
              className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="font-bold text-base">Analyze New Resume</p>
                  <p className="text-sm text-white/75">Upload PDF/DOC — results in under 60 seconds</p>
                </div>
              </div>
              <ArrowRight size={20} className="flex-shrink-0" />
            </Link>
          </div>

          {/* Stats grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {STATS.map(({ label, value, icon: Icon, iconBg, iconColor, sub }, i) => (
              <div
                key={label}
                className={clsx("stat-card card-hover animate-slide-up", `delay-${(i + 1) * 100}`)}
              >
                <div className={`stat-icon ${iconBg}`}>
                  <Icon size={20} className={iconColor} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Recent Resumes */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title text-lg">Recent Analyses</h2>
                <Link href="/student/analysis" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => <SkeletonCard key={n} rows={2} />)}
                </div>
              ) : resumes.length === 0 ? (
                <div className="card p-10 text-center space-y-3">
                  <FileText size={36} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No analyses yet</p>
                  <p className="text-sm text-slate-400">Upload your first resume to get started.</p>
                  <Link href="/student/upload" className="btn-primary btn-sm inline-flex">
                    Upload Resume
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((r) => (
                    <Link
                      key={r.id}
                      href={`/student/analysis/${r.id}`}
                      className="card card-hover flex items-center gap-4 p-4 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {r.original_filename}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </p>
                        {r.ats_score != null && (
                          <div className="mt-2">
                            <ProgressBar
                              value={r.ats_score}
                              size="sm"
                              showValue={false}
                              animated={false}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {r.ats_score != null && (
                          <span className="text-lg font-black text-slate-800 tabular-nums">
                            {r.ats_score}
                            <span className="text-xs text-slate-400 font-normal">%</span>
                          </span>
                        )}
                        {statusBadge(r.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Open Internships */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title text-lg">Open Internships</h2>
                <Link href="/student/internship" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
                  Browse <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((n) => <SkeletonCard key={n} rows={2} />)}
                </div>
              ) : internships.length === 0 ? (
                <div className="card p-8 text-center">
                  <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No internships available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {internships.map((i) => (
                    <Link
                      key={i.id}
                      href={`/student/internship`}
                      className="card card-hover p-4 block"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{i.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{i.company_name}</p>
                        </div>
                        <span className="badge badge-emerald flex-shrink-0">Active</span>
                      </div>
                      <div className="flex gap-2 mt-2.5 flex-wrap">
                        {i.required_skills?.slice(0, 3).map((sk) => (
                          <span key={sk} className="badge badge-slate font-mono text-2xs">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
