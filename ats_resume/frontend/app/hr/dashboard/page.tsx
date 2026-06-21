"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import { hrApi, internshipApi } from "@/lib/api";
import type { HRAnalytics, InternshipSummary } from "@/types/ats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowRight,
  BookOpen,
  Plus,
  Users,
  TrendingUp,
  Award,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const PIE_COLORS = ["#10B981", "#F59E0B", "#F43F5E", "#94A3B8"];

export default function HRDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null);
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hrApi.getAnalytics(), internshipApi.list()])
      .then(([a, i]) => {
        setAnalytics(a);
        setInternships(i.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusPieData = analytics
    ? [
        { name: "Shortlisted", value: analytics.shortlisted_count ?? 0 },
        { name: "Under Review", value: analytics.under_review_count ?? 0 },
        { name: "Rejected", value: analytics.rejected_count ?? 0 },
        { name: "Pending", value: analytics.pending_count ?? 0 },
      ]
    : [];

  const STATS = [
    {
      label: "Total Candidates",
      value: analytics?.total_candidates ?? 0,
      icon: Users,
      bg: "bg-indigo-50",
      color: "text-indigo-600",
      sub: "All time",
    },
    {
      label: "Avg ATS Score",
      value: analytics?.avg_ats_score != null ? `${Math.round(analytics.avg_ats_score)}%` : "—",
      icon: Award,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
      sub: "Across all candidates",
    },
    {
      label: "Active Roles",
      value: analytics?.active_roles ?? 0,
      icon: BookOpen,
      bg: "bg-amber-50",
      color: "text-amber-600",
      sub: "Open internships",
    },
    {
      label: "Flagged Profiles",
      value: analytics?.flagged_count ?? 0,
      icon: AlertTriangle,
      bg: "bg-rose-50",
      color: "text-rose-500",
      sub: "Require review",
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />

        <main className="flex-1 page-container">
          <div className="flex items-center justify-between mb-8 animate-slide-up">
            <div>
              <h1 className="section-title text-2xl">HR Dashboard</h1>
              <p className="section-subtitle">Hiring pipeline overview</p>
            </div>
            <Link href="/hr/internship/new" className="btn-primary btn-sm gap-1.5">
              <Plus size={14} />
              Post Internship
            </Link>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {STATS.map(({ label, value, icon: Icon, bg, color, sub }, i) => (
              <div key={label} className={clsx("stat-card card-hover animate-slide-up", `delay-${(i + 1) * 100}`)}>
                <div className={`stat-icon ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{loading ? "—" : value}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Score distribution bar chart */}
            <div className="lg:col-span-2 card p-6 animate-slide-up delay-200">
              <h2 className="font-semibold text-slate-700 mb-6">Score Distribution</h2>
              {loading ? (
                <div className="h-48 skeleton rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={analytics?.score_distribution ?? []}
                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#1E293B",
                        border: "none",
                        borderRadius: "12px",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pipeline status pie */}
            <div className="card p-6 animate-slide-up delay-300">
              <h2 className="font-semibold text-slate-700 mb-6">Pipeline Status</h2>
              {loading ? (
                <div className="h-48 skeleton rounded-xl" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1E293B",
                          border: "none",
                          borderRadius: "12px",
                          color: "#F8FAFC",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {statusPieData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx] }} />
                          <span className="text-slate-600">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active internships quick-link */}
          <div className="card p-6 animate-slide-up delay-400">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700">Active Internships</h2>
              <Link href="/hr/candidates" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                All Candidates <ArrowRight size={14} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => <SkeletonCard key={n} rows={1} />)}
              </div>
            ) : (
              <div className="space-y-2">
                {internships.map((i) => (
                  <Link
                    key={i.id}
                    href={`/hr/internship/${i.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{i.title}</p>
                      <p className="text-xs text-slate-400">{i.company_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge badge-indigo">{i.candidate_count ?? 0} applicants</span>
                      <ArrowRight size={15} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </Link>
                ))}
                {internships.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No active internships. Post one to start receiving candidates.</p>
                )}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
