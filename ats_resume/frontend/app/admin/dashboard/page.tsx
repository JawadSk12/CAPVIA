"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import { hrApi, resumeApi } from "@/lib/api";
import {
  BarChart2,
  Database,
  Shield,
  Users,
  AlertTriangle,
  Activity,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi
      .getAnalytics()
      .then(setAnalytics)
      .catch(() => toast.error("Failed to load admin analytics"))
      .finally(() => setLoading(false));
  }, []);

  const SYSTEM_STATS = [
    {
      label: "Total Users",
      value: analytics?.total_users ?? "—",
      icon: Users,
      bg: "bg-indigo-50",
      color: "text-indigo-600",
    },
    {
      label: "Total Resumes",
      value: analytics?.total_resumes ?? "—",
      icon: Database,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
    },
    {
      label: "Active Roles",
      value: analytics?.active_roles ?? "—",
      icon: BarChart2,
      bg: "bg-amber-50",
      color: "text-amber-600",
    },
    {
      label: "Flagged Profiles",
      value: analytics?.flagged_count ?? "—",
      icon: AlertTriangle,
      bg: "bg-rose-50",
      color: "text-rose-500",
    },
  ];

  const SYSTEM_HEALTH = [
    { label: "PostgreSQL",   status: "Healthy", ok: true },
    { label: "MongoDB",      status: "Healthy", ok: true },
    { label: "Redis",        status: "Healthy", ok: true },
    { label: "Celery OCR",   status: "Running", ok: true },
    { label: "Celery Score", status: "Running", ok: true },
    { label: "AI Models",    status: "Loaded",  ok: true },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 page-container">
          <div className="mb-8 animate-slide-up">
            <h1 className="section-title text-2xl">Admin Dashboard</h1>
            <p className="section-subtitle">System-wide overview and controls</p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {SYSTEM_STATS.map(({ label, value, icon: Icon, bg, color }, i) => (
              <div key={label} className={`stat-card card-hover animate-slide-up delay-${(i+1)*100}`}>
                <div className={`stat-icon ${bg}`}><Icon size={20} className={color} /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{loading ? "—" : value}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* System health */}
            <div className="card p-6 animate-slide-up delay-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  System Health
                </h2>
                <button className="btn-ghost btn-sm gap-1">
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                {SYSTEM_HEALTH.map(({ label, status, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400 shadow-sm shadow-emerald-200" : "bg-rose-400"} animate-pulse`} />
                      <span className="text-sm text-slate-700 font-medium">{label}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card p-6 animate-slide-up delay-300">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-5">
                <Shield size={16} className="text-indigo-500" />
                Admin Actions
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Flush Redis Cache",   desc: "Clear all cached scores and rate limits", danger: false },
                  { label: "Re-run All Scores",   desc: "Force re-analyze all COMPLETED resumes",  danger: false },
                  { label: "Download Audit Log",  desc: "Export full audit trail as CSV",           danger: false },
                  { label: "Purge Failed Tasks",  desc: "Remove all FAILED Celery tasks from queue", danger: true },
                ].map(({ label, desc, danger }) => (
                  <div key={label} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <button
                      className={danger ? "btn-danger btn-sm" : "btn-outline btn-sm"}
                      onClick={() => toast.success(`Action: "${label}" (demo)`)}
                    >
                      Run
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
