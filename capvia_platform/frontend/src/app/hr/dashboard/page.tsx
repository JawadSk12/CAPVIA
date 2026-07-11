'use client';

import React, { useState, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internshipApi, recruitmentApi, rankingsApi } from '../../../services/api';
import { Application, Internship } from '../../../types';
import {
  Briefcase, Users, CheckCircle2, Video, RefreshCw, FileText,
  ArrowRight, TrendingUp, Sparkles, Target, ChevronRight,
  BarChart3, Plus, Flame, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

/* ── Skeleton ─────────────────────────────────────────────── */
function Skel({ className }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className ?? ''}`} />;
}

/* ── Score pill ───────────────────────────────────────────── */
function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-300 font-mono">—</span>;
  const color = score >= 70 ? '#059669' : score >= 50 ? '#0D47A1' : '#DC2626';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: `${color}12`, color, border: `1px solid ${color}20` }}
    >
      {Math.round(score)}%
    </span>
  );
}

export default function HRDashboard() {
  const queryClient = useQueryClient();
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>('');

  const { data: internshipsData, isLoading: loadingInternships } = useQuery({
    queryKey: ['internships'],
    queryFn: () => internshipApi.list(),
  });
  const internships: Internship[] = useMemo(() => internshipsData?.internships || [], [internshipsData]);

  React.useEffect(() => {
    if (internships.length > 0 && !selectedInternshipId) {
      setSelectedInternshipId(internships[0].id);
    }
  }, [internships, selectedInternshipId]);

  const selectedInternship = useMemo(
    () => internships.find((i: Internship) => i.id === selectedInternshipId),
    [internships, selectedInternshipId],
  );

  const { data: allApplicationsData, isLoading: loadingApps } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });
  const applications = useMemo(() => allApplicationsData || [], [allApplicationsData]);

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', selectedInternshipId],
    queryFn: () => rankingsApi.getLeaderboard(selectedInternshipId),
    enabled: !!selectedInternshipId,
  });
  const leaderboardList = useMemo(() => leaderboardData?.leaderboard || [], [leaderboardData]);

  const rerankMutation = useMutation({
    mutationFn: (id: string) => rankingsApi.rerank(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedInternshipId] }),
  });

  const kpis = useMemo(() => {
    const activeInternships    = internships.filter(i => i.status === 'PUBLISHED').length;
    const totalApplicants      = applications.length;
    const candidatesInProgress = applications.filter(a => !['HIRED', 'REJECTED'].includes(a.status)).length;
    const completedAssessments = applications.filter(a =>
      ['SIMULATION_COMPLETED','INTERVIEW_COMPLETED','EVALUATED','SHORTLISTED','HIRED'].includes(a.status)
    ).length;
    const pendingInterviews    = applications.filter(a =>
      ['INTERVIEW_INVITED','INTERVIEW_IN_PROGRESS'].includes(a.status)
    ).length;
    return { activeInternships, totalApplicants, candidatesInProgress, completedAssessments, pendingInterviews, totalInternships: internships.length };
  }, [internships, applications]);

  const FUNNEL_STAGES = [
    { label: 'Applied',         count: applications.length, color: '#0D47A1', bgColor: 'rgba(13,71,161,0.08)' },
    { label: 'ATS ≥60%',       count: applications.filter(a => (a.application_mapping?.ats_score || 0) >= 60).length, color: '#42A5F5', bgColor: 'rgba(66,165,245,0.08)' },
    { label: 'Simulation',      count: applications.filter(a => ['simulation_invited','simulation_started','simulation_completed','interview_invited','interview_completed','shortlisted','hired'].includes(a.status)).length, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)' },
    { label: 'Interview Done',  count: applications.filter(a => ['interview_completed','shortlisted','hired'].includes(a.status)).length, color: '#10B981', bgColor: 'rgba(16,185,129,0.08)' },
  ];
  const maxCount = Math.max(...FUNNEL_STAGES.map(s => s.count), 1);

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout
        title="Hiring Command Center"
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Dashboard' }]}
      >
        <div className="space-y-8 pb-8">

          {/* ── Page Header ───────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h1 className="text-[26px] font-black text-slate-900 font-outfit tracking-tight">
                Hiring Command Center
              </h1>
              <p className="text-[13px] text-slate-500 mt-1 font-medium">
                Monitor active cohorts, verify assessments, and shortlist by verified DNA score.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Vacancy selector */}
              <div className="relative">
                <select
                  value={selectedInternshipId}
                  onChange={(e) => setSelectedInternshipId(e.target.value)}
                  className="appearance-none h-9 pl-3 pr-8 text-[12px] font-semibold text-slate-700 rounded-xl cursor-pointer focus:outline-none"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-1)",
                  }}
                >
                  {loadingInternships
                    ? <option>Loading…</option>
                    : internships.map((i) => (
                        <option key={i.id} value={i.id}>{i.title}</option>
                      ))
                  }
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Rerank */}
              <button
                onClick={() => selectedInternshipId && rerankMutation.mutate(selectedInternshipId)}
                disabled={rerankMutation.isPending || !selectedInternshipId}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 hover:-translate-y-px"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-1)",
                  color: "#475569",
                }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${rerankMutation.isPending ? 'animate-spin' : ''}`} />
                {rerankMutation.isPending ? 'Reranking…' : 'Rerank'}
              </button>

              {/* Post job */}
              <Link
                href="/hr/internships"
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[12px] font-bold text-white transition-all hover:-translate-y-px"
                style={{
                  background: "var(--capvia-primary)",
                  boxShadow: "var(--shadow-primary)",
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Post Job
              </Link>
            </div>
          </div>

          {/* ── KPI Cards ─────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              {
                label: 'Active Job Openings',
                value: kpis.activeInternships,
                sub: `${kpis.totalInternships} total postings`,
                icon: Briefcase,
                accent: '#0D47A1',
                accentBg: 'rgba(13,71,161,0.07)',
                trend: '+2 this week',
              },
              {
                label: 'Active Candidates',
                value: kpis.totalApplicants,
                sub: `${kpis.candidatesInProgress} in pipeline`,
                icon: Users,
                accent: '#42A5F5',
                accentBg: 'rgba(66,165,245,0.07)',
                trend: `+${Math.max(kpis.totalApplicants - kpis.candidatesInProgress, 0)} completed`,
              },
              {
                label: 'Assessments Done',
                value: kpis.completedAssessments,
                sub: `${kpis.pendingInterviews} pending interviews`,
                icon: CheckCircle2,
                accent: '#059669',
                accentBg: 'rgba(5,150,105,0.07)',
                trend: 'AI verified',
              },
              {
                label: 'Interviews',
                value: kpis.pendingInterviews,
                sub: 'AI Video Proctoring active',
                icon: Video,
                accent: '#7C3AED',
                accentBg: 'rgba(124,58,237,0.07)',
                trend: 'Scheduled',
              },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} className="kpi-card group cursor-default">
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: kpi.accentBg }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: kpi.accent }} />
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.15)" }}
                    >
                      <TrendingUp className="w-2.5 h-2.5" />
                      {kpi.trend}
                    </div>
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {kpi.label}
                  </p>
                  <p
                    className="text-[36px] font-black font-outfit leading-none mb-1.5"
                    style={{ color: kpi.accent }}
                  >
                    {loadingApps ? <Skel className="h-9 w-14 inline-block" /> : kpi.value}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* ── Funnel + Leaderboard ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Hiring Funnel */}
            <div className="lg:col-span-4 card p-6 space-y-5">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 font-outfit tracking-tight">
                  Hiring Funnel
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Candidate progression across stages</p>
              </div>

              <div className="space-y-4">
                {FUNNEL_STAGES.map((stage, idx) => {
                  const pct = Math.round((stage.count / maxCount) * 100);
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-semibold text-slate-700">{stage.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] font-black"
                            style={{ color: stage.color }}
                          >
                            {stage.count}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${pct}%`, background: stage.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Funnel stats summary */}
              <div
                className="pt-4 mt-2"
                style={{ borderTop: "1px solid var(--border-hairline)" }}
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Conversion Rate', value: applications.length ? `${Math.round((FUNNEL_STAGES[3].count / applications.length) * 100)}%` : '0%' },
                    { label: 'Drop-off Rate',   value: applications.length ? `${Math.round((1 - FUNNEL_STAGES[1].count / applications.length) * 100)}%` : '0%' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2.5 rounded-xl" style={{ background: "var(--surface-subtle)" }}>
                      <p className="text-[18px] font-black text-slate-900 font-outfit">{value}</p>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidate Leaderboard */}
            <div className="lg:col-span-8 card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-900 font-outfit tracking-tight">
                    Candidate Leaderboard
                    {selectedInternship && (
                      <span className="text-slate-400 font-normal ml-2 text-[12px]">
                        — {selectedInternship.title}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ranked by composite verified DNA score</p>
                </div>
                <Link
                  href="/hr/rankings"
                  className="flex items-center gap-1 text-[11px] font-bold transition-colors hover:opacity-80"
                  style={{ color: "#0D47A1" }}
                >
                  Full rankings <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto -mx-1">
                <table className="table-premium w-full">
                  <thead>
                    <tr>
                      <th className="pb-3">Candidate</th>
                      <th className="pb-3 text-center">ATS</th>
                      <th className="pb-3 text-center">Simulation</th>
                      <th className="pb-3 text-center">Interview</th>
                      <th className="pb-3 text-center" style={{ color: "#0D47A1" }}>DNA Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardList.slice(0, 6).map((cand: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            {/* Rank indicator */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                              style={
                                idx === 0 ? { background: "rgba(255,196,0,0.15)", color: "#B45309" } :
                                idx === 1 ? { background: "rgba(148,163,184,0.15)", color: "#475569" } :
                                idx === 2 ? { background: "rgba(180,126,85,0.15)", color: "#92400E" } :
                                { background: "var(--surface-subtle)", color: "#94A3B8" }
                              }
                            >
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-900">
                                {cand.candidate_name || "Candidate"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">{cand.candidate_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-center">
                          <ScorePill score={cand.ats_raw_score} />
                        </td>
                        <td className="py-3.5 text-center">
                          <ScorePill score={cand.simulation_raw_score} />
                        </td>
                        <td className="py-3.5 text-center">
                          <ScorePill score={cand.interview_raw_score} />
                        </td>
                        <td className="py-3.5 text-center">
                          {cand.final_score != null ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-black"
                              style={{
                                background: "rgba(13,71,161,0.08)",
                                color: "#0D47A1",
                                border: "1px solid rgba(13,71,161,0.15)",
                              }}
                            >
                              {Math.round(cand.final_score)}%
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leaderboardList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-slate-200" />
                            <p className="text-[12px] text-slate-400">
                              No candidates ranked yet for this position.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Recent Activity + Top Performers ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Activity feed */}
            <div className="lg:col-span-8 card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-slate-900 font-outfit tracking-tight">
                  Recent Activity
                </h3>
                <Link
                  href="/hr/candidates"
                  className="text-[11px] font-bold transition-colors hover:opacity-80"
                  style={{ color: "#0D47A1" }}
                >
                  View all candidates
                </Link>
              </div>

              <div className="space-y-2.5">
                {applications.slice(0, 5).map((app, i) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3.5 rounded-xl transition-colors hover:bg-slate-50 cursor-default"
                    style={{ border: "1px solid var(--border-hairline)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 font-outfit"
                        style={{ background: "linear-gradient(135deg, #0D47A1, #1976D2)" }}
                      >
                        {(app.candidate?.full_name || app.candidate?.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-slate-900 truncate">
                          {app.candidate?.full_name || app.candidate?.email}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Applied for <span className="font-semibold text-slate-600">{app.vacancy?.title || "Internship"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {app.application_mapping?.ats_score && (
                        <ScorePill score={app.application_mapping.ats_score} />
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
                {applications.length === 0 && (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[12px] text-slate-400">No applications received yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top performers */}
            <div
              className="lg:col-span-4 rounded-2xl p-6 space-y-5"
              style={{
                background: "linear-gradient(160deg, #08152E 0%, #0B1D3A 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 8px 32px rgba(3,9,20,0.3)",
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Flame className="w-4 h-4 text-[#FFC107]" />
                  <h3 className="text-[13px] font-bold text-white font-outfit tracking-tight">
                    Top Candidates
                  </h3>
                </div>
                <p className="text-[10px] font-medium" style={{ color: "rgba(148,163,184,0.55)" }}>
                  Highest verified DNA scores
                </p>
              </div>

              <div className="space-y-3">
                {leaderboardList.slice(0, 4).map((cand: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="text-[10px] font-black w-5 text-center"
                        style={{
                          color: idx === 0 ? '#FFC107' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7F32' : 'rgba(148,163,184,0.4)',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <p className="text-[12px] font-bold text-white/90 truncate">
                        {cand.candidate_name}
                      </p>
                    </div>
                    <span
                      className="text-[11px] font-black px-2.5 py-1 rounded-lg"
                      style={{ background: "rgba(13,71,161,0.4)", color: "#42A5F5", border: "1px solid rgba(66,165,245,0.2)" }}
                    >
                      {cand.final_score != null ? `${Math.round(cand.final_score)}%` : '—'}
                    </span>
                  </div>
                ))}
                {leaderboardList.length === 0 && (
                  <p className="text-[11px] text-center py-6" style={{ color: "rgba(148,163,184,0.4)" }}>
                    No ranked candidates yet.
                  </p>
                )}
              </div>

              <Link
                href="/hr/rankings"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[11px] font-bold transition-all hover:-translate-y-px"
                style={{
                  background: "rgba(13,71,161,0.6)",
                  border: "1px solid rgba(66,165,245,0.2)",
                  color: "white",
                }}
              >
                <Target className="w-3.5 h-3.5" />
                View Full Leaderboard
              </Link>
            </div>
          </div>

        </div>
      </UnifiedLayout>
    </ProtectedRoute>
  );
}
