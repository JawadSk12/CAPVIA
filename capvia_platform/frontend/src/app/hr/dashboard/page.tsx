'use client';

import React, { useState, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  internshipApi,
  recruitmentApi,
  rankingsApi
} from '../../../services/api';
import { Application, Internship } from '../../../types';
import {
  Briefcase, Users, CheckCircle2, Video, RefreshCw, FileText, ArrowRight,
  TrendingUp, Activity, Sparkles, Target, Zap, ChevronRight,
  BarChart3, Award, Plus, Building, Flame
} from 'lucide-react';
import Link from 'next/link';

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

  const selectedInternship = useMemo(() =>
    internships.find((i: Internship) => i.id === selectedInternshipId),
    [internships, selectedInternshipId]
  );

  const { data: allApplicationsData, isLoading: loadingApplications } = useQuery({
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
    mutationFn: (internshipId: string) => rankingsApi.rerank(internshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedInternshipId] });
    }
  });

  const kpis = useMemo(() => {
    const totalInternships = internships.length;
    const activeInternships = internships.filter(i => i.status === 'PUBLISHED').length;
    const totalApplicants = applications.length;
    const candidatesInProgress = applications.filter(a => !['HIRED', 'REJECTED'].includes(a.status)).length;
    const completedAssessments = applications.filter(a =>
      ['SIMULATION_COMPLETED', 'INTERVIEW_COMPLETED', 'EVALUATED', 'SHORTLISTED', 'HIRED'].includes(a.status)
    ).length;
    const pendingInterviews = applications.filter(a =>
      ['INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS'].includes(a.status)
    ).length;
    
    return {
      totalInternships,
      activeInternships,
      totalApplicants,
      candidatesInProgress,
      completedAssessments,
      pendingInterviews
    };
  }, [internships, applications]);

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Hiring Command Center">
        <div className="space-y-8">

          {/* HR Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">Hiring Command Center</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Monitor active cohorts, verify assessments, and shortlist candidates by verified DNA score.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Dropdown to select active vacancy */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Vacancy:</span>
                {loadingInternships ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : (
                  <select
                    value={selectedInternshipId}
                    onChange={(e) => setSelectedInternshipId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0D47A1] cursor-pointer"
                  >
                    {internships.map((int) => (
                      <option key={int.id} value={int.id}>
                        {int.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rerank button */}
              <button
                onClick={() => selectedInternshipId && rerankMutation.mutate(selectedInternshipId)}
                disabled={rerankMutation.isPending || !selectedInternshipId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${rerankMutation.isPending ? 'animate-spin' : ''}`} />
                {rerankMutation.isPending ? 'Reranking...' : 'Rerank Cohort'}
              </button>

              {/* Create new vacancy */}
              <Link
                href="/hr/internships"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white text-xs font-bold transition-all hover:scale-[1.01]"
              >
                <Plus className="h-3.5 w-3.5" />
                Post Job
              </Link>
            </div>
          </div>

          {/* KPIs Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Active Job Openings', val: kpis.activeInternships, sub: `${kpis.totalInternships} total postings`, icon: Briefcase, color: 'text-[#0D47A1] bg-blue-50/65 border-blue-100' },
              { label: 'Active Candidates', val: kpis.totalApplicants, sub: `${kpis.candidatesInProgress} in pipeline`, icon: Users, color: 'text-[#42A5F5] bg-sky-50/65 border-sky-100' },
              { label: 'Assessments Done', val: kpis.completedAssessments, sub: `${kpis.pendingInterviews} pending interviews`, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50/65 border-emerald-100' },
              { label: 'Interviews Scheduled', val: kpis.pendingInterviews, sub: 'AI Video Proctoring active', icon: Video, color: 'text-violet-600 bg-violet-50/65 border-violet-100' },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} className="bg-white border border-slate-100/80 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-800 font-outfit">{kpi.val}</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Mid Section: Funnel & Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Funnel Stage Visualization */}
            <div className="lg:col-span-4 bg-white border border-slate-100/80 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight">Hiring Funnel</h3>
                <p className="text-xs text-slate-400 mt-0.5">Candidate progression across stages</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Applied", count: applications.length, pct: 100, color: "bg-[#0D47A1]" },
                  { label: "ATS Passed (>=60%)", count: applications.filter(a => (a.application_mapping?.ats_score || 0) >= 60).length, pct: applications.length ? Math.round((applications.filter(a => (a.application_mapping?.ats_score || 0) >= 60).length / applications.length) * 100) : 0, color: "bg-[#42A5F5]" },
                  { label: "Simulation Invited", count: applications.filter(a => ['simulation_invited', 'simulation_started', 'simulation_completed', 'interview_invited', 'interview_completed', 'shortlisted', 'hired'].includes(a.status)).length, pct: applications.length ? Math.round((applications.filter(a => ['simulation_invited', 'simulation_started', 'simulation_completed', 'interview_invited', 'interview_completed', 'shortlisted', 'hired'].includes(a.status)).length / applications.length) * 100) : 0, color: "bg-[#FFC107]" },
                  { label: "Interview Done", count: applications.filter(a => ['interview_completed', 'shortlisted', 'hired'].includes(a.status)).length, pct: applications.length ? Math.round((applications.filter(a => ['interview_completed', 'shortlisted', 'hired'].includes(a.status)).length / applications.length) * 100) : 0, color: "bg-emerald-500" },
                ].map((stage, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{stage.label}</span>
                      <span>{stage.count} ({stage.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${stage.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Rankings Table */}
            <div className="lg:col-span-8 bg-white border border-slate-100/80 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight">
                    Candidate Leaderboard — {selectedInternship?.title || "Active Vacancy"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ranked automatically by composite DNA score</p>
                </div>
                <Link href="/hr/rankings" className="text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-0.5">
                  View Full Rankings <ChevronRight size={14} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3">Candidate</th>
                      <th className="pb-3 text-center">ATS Score</th>
                      <th className="pb-3 text-center">Simulation</th>
                      <th className="pb-3 text-center">Interview</th>
                      <th className="pb-3 text-center text-[#0D47A1]">DNA Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 text-xs sm:text-sm">
                    {leaderboardList.slice(0, 5).map((cand: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400 font-outfit font-black w-4 text-right">#{idx + 1}</span>
                          <div>
                            <p className="tracking-tight">{cand.candidate_name || "Candidate Name"}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{cand.candidate_email}</p>
                          </div>
                        </td>
                        <td className="py-3 text-center font-medium text-slate-600">{cand.ats_raw_score != null ? `${cand.ats_raw_score}%` : '—'}</td>
                        <td className="py-3 text-center font-medium text-slate-600">{cand.simulation_raw_score != null ? `${cand.simulation_raw_score}%` : '—'}</td>
                        <td className="py-3 text-center font-medium text-slate-600">{cand.interview_raw_score != null ? `${cand.interview_raw_score}%` : '—'}</td>
                        <td className="py-3 text-center font-bold text-[#0D47A1] font-outfit">{cand.final_score != null ? `${Math.round(cand.final_score)}%` : '—'}</td>
                      </tr>
                    ))}
                    {leaderboardList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400 italic">
                          No candidates ranked yet for this position.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Bottom Section: Recent Applications & Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Recent Applications Activity Feed */}
            <div className="lg:col-span-8 bg-white border border-slate-100/80 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight">Recent Activity</h3>
                <Link href="/hr/candidates" className="text-xs font-bold text-[#0D47A1] hover:underline">
                  View All Candidates
                </Link>
              </div>

              <div className="space-y-4">
                {applications.slice(0, 4).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-100/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0D47A1]/5 text-[#0D47A1] flex items-center justify-center font-outfit font-black text-xs">
                        {(app.candidate?.full_name || app.candidate?.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 tracking-tight">{app.candidate?.full_name || app.candidate?.email}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Applied for {app.vacancy?.title || "Internship"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {applications.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No applications received yet.</p>
                )}
              </div>
            </div>

            {/* Top DNA Performers comparison */}
            <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-100/80 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-1.5">
                  <Flame size={15} className="text-[#FFC107]" />
                  Top Candidates
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top performing talent by DNA index</p>
              </div>

              <div className="space-y-4">
                {leaderboardList.slice(0, 3).map((cand: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{cand.candidate_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Rank #{idx + 1}</p>
                    </div>
                    <span className="text-xs font-black text-[#0D47A1] bg-[#0D47A1]/5 px-2 py-1 rounded">
                      {cand.final_score != null ? `${Math.round(cand.final_score)}%` : '—'}
                    </span>
                  </div>
                ))}
                {leaderboardList.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No ranked candidates found.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </UnifiedLayout>
    </ProtectedRoute>
  );
}
