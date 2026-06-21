"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import { hrApi, internshipApi } from "@/lib/api";
import type { HRAnalytics, InternshipSummary } from "@/types/ats";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  FunnelChart, Funnel, LabelList,
} from "recharts";
import { BarChart3, TrendingUp, Users, Award, BookOpen } from "lucide-react";
import HiringFunnel from "@/components/hr/HiringFunnel";
import clsx from "clsx";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6"];

export default function HRAnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null);
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [selectedJd, setSelectedJd] = useState("");
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hrApi.getAnalytics(), internshipApi.list()])
      .then(([a, i]) => {
        setAnalytics(a);
        setInternships(i);
        if (i.length > 0) setSelectedJd(i[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedJd) return;
    hrApi.getFunnel(selectedJd).then(setFunnelData).catch(() => {});
  }, [selectedJd]);

  const topSkills = analytics?.top_required_skills?.slice(0, 8) ?? [];
  const scoreByRole = analytics?.avg_score_by_role ?? [];

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 page-container">
          <div className="mb-8 animate-slide-up">
            <h1 className="section-title text-2xl">Analytics</h1>
            <p className="section-subtitle">Hiring pipeline insights and talent data</p>
          </div>

          {/* Summary stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { label: "Total Candidates", value: analytics?.total_candidates ?? 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Avg ATS Score",    value: analytics?.avg_ats_score != null ? `${Math.round(analytics.avg_ats_score)}%` : "—", icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Active Roles",     value: analytics?.active_roles ?? 0, icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Shortlist Rate",   value: analytics?.shortlist_rate != null ? `${Math.round(analytics.shortlist_rate * 100)}%` : "—", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
            ].map(({ label, value, icon: Icon, color, bg }, i) => (
              <div key={label} className={clsx("stat-card card-hover animate-slide-up", `delay-${(i+1)*100}`)}>
                <div className={`stat-icon ${bg}`}><Icon size={20} className={color} /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{loading ? "—" : value}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Top required skills */}
            <div className="card p-6 animate-slide-up delay-200">
              <h2 className="font-semibold text-slate-700 mb-5 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" />
                Top Required Skills
              </h2>
              {loading ? (
                <div className="h-48 skeleton rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={topSkills}
                    layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="skill" type="category" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip
                      contentStyle={{ background: "#1E293B", border: "none", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Avg score by role */}
            <div className="card p-6 animate-slide-up delay-300">
              <h2 className="font-semibold text-slate-700 mb-5 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                Avg Score by Role
              </h2>
              {loading ? (
                <div className="h-48 skeleton rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreByRole} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="role" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#1E293B", border: "none", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }}
                      formatter={(v: number) => [`${v}%`, "Avg Score"]}
                    />
                    <Bar dataKey="avg_score" radius={[4, 4, 0, 0]}>
                      {scoreByRole.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Hiring funnel */}
          <div className="card p-6 animate-slide-up delay-400">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-700">Hiring Funnel</h2>
              <select
                value={selectedJd}
                onChange={(e) => setSelectedJd(e.target.value)}
                className="input py-1.5 text-sm w-auto"
              >
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>
            </div>
            <HiringFunnel data={funnelData} loading={loading} />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
