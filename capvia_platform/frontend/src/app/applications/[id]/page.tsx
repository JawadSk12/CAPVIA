'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  applicationApi, 
  rankingsApi, 
  dnaApi, 
  integrityApi 
} from '../../../services/api';
import { Application } from '../../../types';
import ApplicationProgress from '../../../components/ApplicationProgress';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { 
  Users, CheckCircle2, AlertTriangle, RefreshCw, FileText, Code2, 
  Video, ExternalLink, ChevronRight, X, ArrowLeft, ShieldCheck, 
  User, AlertCircle, Calendar, MapPin, Award, Activity, Heart, ShieldAlert
} from 'lucide-react';

const EVENT_ICONS: Record<string, string> = {
  APPLICATION_SUBMITTED:  '📨',
  APPLICATION_WITHDRAWN:  '↩️',
  CANDIDATE_SHORTLISTED:  '🌟',
  CANDIDATE_REJECTED:     '📋',
  CANDIDATE_HIRED:        '🎊',
};

const STATUS_META: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  APPLIED:                  { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: '📨', label: 'Applied' },
  ATS_PENDING:              { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: '🤖', label: 'Resume Review' },
  ATS_COMPLETED:            { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: '✅', label: 'Resume Screened' },
  SIMULATION_INVITED:       { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', icon: '📩', label: 'Simulation Invited' },
  SIMULATION_IN_PROGRESS:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20 animate-pulse', icon: '🎯', label: 'Simulation Active' },
  SIMULATION_COMPLETED:     { color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: '🎯', label: 'Simulation Done' },
  INTERVIEW_INVITED:        { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '📩', label: 'Interview Invited' },
  INTERVIEW_IN_PROGRESS:    { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20 animate-pulse', icon: '🎤', label: 'Interview Active' },
  INTERVIEW_COMPLETED:      { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '🎤', label: 'Interview Done' },
  EVALUATED:                { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '⭐', label: 'Evaluated' },
  EVALUATED_LOCAL_BASELINE: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: '⭐', label: 'Evaluated' },
  SHORTLISTED:              { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.15)]', icon: '🌟', label: 'Shortlisted!' },
  HIRED:                    { color: 'text-emerald-400', bg: 'bg-emerald-500/30', border: 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]', icon: '🎊', label: 'Hired!' },
  REJECTED:                 { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '📋', label: 'Not Selected' },
  WITHDRAWN:                { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: '↩️', label: 'Withdrawn' },
};

export default function ApplicationDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <ApplicationDetailContent />
    </ProtectedRoute>
  );
}

function ApplicationDetailContent() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dna' | 'technical' | 'behavioral' | 'timeline'>('dna');
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  // Fetch application detail
  const { data: app, isLoading: loadingApp, error: appError } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () => applicationApi.getDetail(id as string),
    enabled: !!id,
  });

  // Fetch ranking details
  const { data: ranking } = useQuery({
    queryKey: ['ranking-detail', id],
    queryFn: () => rankingsApi.get(id as string),
    enabled: !!id,
    retry: false, // Don't spam retries if ranking is not computed yet
  });

  // Fetch DNA profile
  const { data: dna } = useQuery({
    queryKey: ['dna-detail', id],
    queryFn: () => dnaApi.get(id as string),
    enabled: !!id,
    retry: false,
  });

  // Fetch integrity results
  const { data: integrity } = useQuery({
    queryKey: ['integrity-detail', id],
    queryFn: () => integrityApi.get(id as string),
    enabled: !!id,
    retry: false,
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: () => applicationApi.withdraw(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
      setWithdrawConfirm(false);
    }
  });

  // Format DNA capability dimensions for Recharts Radar
  const radarData = useMemo(() => {
    if (!dna?.capability_dimensions) return [];
    return Object.entries(dna.capability_dimensions).map(([key, val]) => ({
      subject: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: val as number,
      fullMark: 100,
    }));
  }, [dna]);

  if (loadingApp) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
        Retrieving application dossier...
      </div>
    );
  }

  if (appError || !app) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-rose-400 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="font-extrabold text-base">Error Loading Application</h3>
        <p className="text-xs text-slate-550 mt-1 max-w-sm">
          {(appError as any)?.response?.data?.error?.message || 'Could not retrieve application records.'}
        </p>
        <Link href="/applications" className="mt-6 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
          Back to Applications
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[app.status] || { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: '📋', label: app.status };
  const appliedDate = new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background radial glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-pink-500/5 via-indigo-500/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <div className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/applications" className="p-2 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-[9px] tracking-widest font-black text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
              Dossier Summary
            </span>
            <h1 className="text-lg font-black text-slate-100 mt-1 tracking-wide">
              {app.vacancy_title}
            </h1>
            <p className="text-xs text-slate-400 font-semibold">{app.company_name} · Applied on {appliedDate}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {app.resume_url && (
            <a 
              href={app.resume_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              📄 View Resume
            </a>
          )}
          {!app.is_terminal && app.status !== 'WITHDRAWN' && (
            <button 
              onClick={() => setWithdrawConfirm(true)}
              className="px-4 py-2 rounded-xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-bold transition-all"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
        
        {/* Left Column: Stage Progress Stepper & Tabbed views (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Status Hero Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-slate-900 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                  {meta.icon}
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Application State</span>
                  <h2 className="text-xl font-black text-slate-100 mt-0.5 tracking-wide">
                    {app.status_label || meta.label}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                    {app.status === 'HIRED' 
                      ? "Congratulations! You have successfully completed all assessment milestones and have been selected for this vacancy!"
                      : app.status === 'SHORTLISTED'
                      ? "Excellent! The recruiter has shortlisted your application for final selection reviews."
                      : app.status === 'REJECTED'
                      ? "Thank you for participating. While you were not selected for this cohort, your capability dimensions have been saved in our talent pool."
                      : app.status === 'WITHDRAWN'
                      ? "You have withdrawn this application. Rerunning assessment algorithms is disabled."
                      : "Your application is currently active. The engines are evaluating your assessments in real-time."}
                  </p>
                </div>
              </div>

              {ranking?.global_percentile !== undefined && ranking.global_percentile !== null && (
                <div className="text-left sm:text-right bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-2xl flex-shrink-0 self-start sm:self-auto">
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Percentile Ranking</span>
                  <h4 className="text-2xl font-black text-indigo-400 mt-0.5">{ranking.global_percentile.toFixed(0)}th</h4>
                  <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">against internship cohort</span>
                </div>
              )}

            </div>

            {/* Rejection Feedback */}
            {app.rejection_reason && (
              <div className="mt-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 text-xs text-slate-300 leading-relaxed">
                <div className="font-extrabold text-rose-400 mb-1 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1.5" /> Feedback from Recruiter:
                </div>
                {app.rejection_reason}
              </div>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-900 bg-slate-950/20 px-2 py-1.5 space-x-5">
            <button
              onClick={() => setActiveTab('dna')}
              className={`py-2 text-xs font-bold transition-all relative ${
                activeTab === 'dna' ? 'text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Capabilities DNA & Feedback
              {activeTab === 'dna' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`py-2 text-xs font-bold transition-all relative ${
                activeTab === 'technical' ? 'text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Technical Evaluation
              {activeTab === 'technical' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
            <button
              onClick={() => setActiveTab('behavioral')}
              className={`py-2 text-xs font-bold transition-all relative ${
                activeTab === 'behavioral' ? 'text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Behavioral & Proctoring
              {activeTab === 'behavioral' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2 text-xs font-bold transition-all relative ${
                activeTab === 'timeline' ? 'text-indigo-400 font-extrabold' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Timeline History
              {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
          </div>

          {/* TAB CONTENTS */}
          {activeTab === 'dna' && (
            <div className="space-y-6">
              
              {/* Radar chart of DNA */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Radar chart visual */}
                <div className="md:col-span-7 bg-slate-900/20 border border-slate-900 rounded-3xl p-5 flex flex-col items-center">
                  <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-wider self-start mb-4">Capability Dimension Alignment</h4>
                  <div className="w-full h-72 flex justify-center items-center">
                    {radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                          <PolarGrid stroke="#1e293b" />
                          <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" fontSize={8} />
                          <Radar name="Dimensions" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                            itemStyle={{ fontSize: 11 }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-slate-650 text-xs italic p-12">
                        Assessments pending. Dimensions will map once ATS, coding challenge, and speech evaluation are complete.
                      </div>
                    )}
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="md:col-span-5 space-y-4">
                  <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl">
                    <span className="text-[9px] font-black text-purple-400 tracking-wider uppercase">Capability Level</span>
                    <h4 className="text-xl font-black text-slate-100 mt-1">{dna?.candidate_level || 'EVALUATING...'}</h4>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                      Assessed dynamically across problem solving, communicational adaptability, and engineering execution dimensions.
                    </p>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl">
                    <span className="text-[9px] font-black text-indigo-400 tracking-wider uppercase">Recommendation Placement</span>
                    <h4 className="text-xl font-black text-indigo-400 mt-1">{ranking?.recommendation_tier || 'UNRANKED'}</h4>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                      Placement tier calculated based on your final weighted assessment scores against vacancies cohort.
                    </p>
                  </div>
                </div>

              </div>

              {/* Actionable Feedback Lists */}
              {ranking?.explainability && (
                <div className="space-y-4">
                  
                  {/* Strengths */}
                  {ranking.explainability.strengths && ranking.explainability.strengths.length > 0 && (
                    <div className="bg-emerald-950/15 border border-emerald-900/30 p-5 rounded-3xl">
                      <h5 className="font-extrabold text-xs text-emerald-450 flex items-center mb-3">
                        <CheckCircle2 className="h-4.5 w-4.5 mr-2 text-emerald-400" /> Actionable Strengths Identified
                      </h5>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
                        {ranking.explainability.strengths.map((str: string, i: number) => (
                          <li key={i} className="pl-1">{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk signals */}
                  {ranking.explainability.risk_signals && ranking.explainability.risk_signals.length > 0 && (
                    <div className="bg-rose-950/15 border border-rose-900/30 p-5 rounded-3xl">
                      <h5 className="font-extrabold text-xs text-rose-400 flex items-center mb-3">
                        <ShieldAlert className="h-4.5 w-4.5 mr-2 text-rose-450" /> Performance Observations
                      </h5>
                      <ul className="space-y-2 text-xs text-slate-350 list-disc list-inside leading-relaxed">
                        {ranking.explainability.risk_signals.map((risk: string, i: number) => (
                          <li key={i} className="pl-1">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Absent warnings */}
                  {ranking.explainability.absent_phase_warnings && ranking.explainability.absent_phase_warnings.length > 0 && (
                    <div className="bg-amber-950/15 border border-amber-900/30 p-5 rounded-3xl">
                      <h5 className="font-extrabold text-xs text-amber-400 flex items-center mb-3">
                        <AlertCircle className="h-4.5 w-4.5 mr-2 text-amber-400" /> Pending Action Required
                      </h5>
                      <ul className="space-y-2 text-xs text-slate-350 list-disc list-inside leading-relaxed">
                        {ranking.explainability.absent_phase_warnings.map((warn: string, i: number) => (
                          <li key={i} className="pl-1">{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {activeTab === 'technical' && (
            <div className="space-y-6">
              
              {/* ATS Results card */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-indigo-400" />
                    1. Resume Screening Highlights
                  </h4>
                  {app.ats_score !== undefined && app.ats_score !== null ? (
                    <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded">
                      Match: {app.ats_score}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-650 font-bold">PENDING</span>
                  )}
                </div>

                {app.ats_result ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>Grade Category: <strong className="text-slate-200 font-bold">{app.ats_result.score_band}</strong></div>
                      <div>Matching Domain: <strong className="text-slate-200 font-semibold">{app.ats_result.detected_role || 'N/A'}</strong></div>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>Skills Identified:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {app.ats_result.matched_skills?.map((s: string) => (
                          <span key={s} className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded">
                            {s}
                          </span>
                        )) || <span className="text-slate-650 italic">None matched</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-650 italic">Resume parse results not populated yet.</div>
                )}
              </div>

              {/* Simulation Challenge Card */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center">
                    <Code2 className="h-4 w-4 mr-2 text-purple-400" />
                    2. Coding Assessments Dashboard
                  </h4>
                  {app.simulation_score !== undefined && app.simulation_score !== null ? (
                    <span className="text-xs font-black text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5 rounded">
                      Coding Score: {app.simulation_score}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-650 font-bold">NOT STARTED</span>
                  )}
                </div>

                {app.simulation_result ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>Recruit Recommendation: <strong className="text-slate-200 uppercase font-black">{app.simulation_result.recommendation}</strong></div>
                      <div>Attempt ID: <strong className="text-slate-250 font-mono font-medium">#{app.simulation_result.attempt_id}</strong></div>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>AI Dependency Metric: <strong className="text-slate-200 font-bold">{Math.round(app.simulation_result.ai_dependency_score * 100)}%</strong></div>
                      <div>Submission Status: <strong className="text-emerald-400 font-bold">Successfully Submitted</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-650 italic">
                    {app.status === 'SIMULATION_INVITED' ? (
                      <div className="space-y-3">
                        <p>You have been invited to participate in the interactive coding challenge.</p>
                        <Link 
                          href={`/internships/${app.vacancy_id}`}
                          className="inline-block px-4 py-2 rounded-xl bg-purple-650 hover:bg-purple-600 text-white font-bold text-xs"
                        >
                          Start Assessment Challenge
                        </Link>
                      </div>
                    ) : (
                      "Coding assessment challenge not started yet."
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'behavioral' && (
            <div className="space-y-6">
              
              {/* Interview scores & records */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center">
                    <Video className="h-4 w-4 mr-2 text-pink-400" />
                    3. Speech Video Evaluation
                  </h4>
                  {app.interview_score !== undefined && app.interview_score !== null ? (
                    <span className="text-xs font-black text-pink-400 bg-pink-500/10 border border-pink-500/25 px-2.5 py-0.5 rounded">
                      Speech Score: {app.interview_score}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-650 font-bold">NOT STARTED</span>
                  )}
                </div>

                {app.interview_result ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>Recruiter Evaluation: <strong className="text-slate-200 font-bold">{app.interview_result.recommendation}</strong></div>
                      {app.interview_result.video_url && (
                        <div>
                          Recording: {' '}
                          <a 
                            href={app.interview_result.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline inline-flex items-center"
                          >
                            Play Video recording <ExternalLink className="h-3 w-3 ml-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>Cheating Probability: <strong className="text-slate-200 font-bold">{app.interview_result.cheating_probability_pct}%</strong></div>
                      <div>Behavioral Confidence: <strong className="text-slate-200 font-bold">Evaluated</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-650 italic">
                    {app.status === 'INTERVIEW_INVITED' ? (
                      <div className="space-y-3">
                        <p>You have been invited to join the AI Speech Interview kiosk.</p>
                        <Link 
                          href={`/applications/${id}`} // or the interview portal link
                          className="inline-block px-4 py-2 rounded-xl bg-pink-650 hover:bg-pink-600 text-white font-bold text-xs"
                        >
                          Join Kiosk Interview
                        </Link>
                      </div>
                    ) : (
                      "Kiosk interview session not started."
                    )}
                  </div>
                )}
              </div>

              {/* Integrity trust metrics */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" />
                  Behavioral Integrity Summary
                </h4>
                {integrity ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                      <div>Integrity Trust Index: <strong className="text-slate-200 font-black text-sm">{integrity.trust_index || 0}/100</strong></div>
                      <div>Proctoring Risk Rating: <strong className="text-slate-200 font-bold uppercase">{integrity.risk_level}</strong></div>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-1.5">
                      <span className="text-[9px] uppercase font-black text-slate-550">Webcam Proctoring Logs</span>
                      <div className="grid grid-cols-2 gap-1 text-[10px] mt-1 text-slate-350">
                        <div>Look aways: <span className="text-slate-100 font-bold">{integrity.look_away_count || 0}</span></div>
                        <div>Tab switches: <span className="text-slate-100 font-bold">{integrity.tab_switches || 0}</span></div>
                        <div>Copy pastes: <span className="text-slate-100 font-bold">{integrity.copy_pastes || 0}</span></div>
                        <div>Phones flagged: <span className="text-slate-100 font-bold">{integrity.phone_detections_count || 0}</span></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-650 italic">Integrity assessment report not generated.</div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6">Application Audit Logs</h3>
              <div className="flex flex-col space-y-0">
                {app.events && app.events.length > 0 ? (
                  app.events.map((ev: any, idx: number) => {
                    const isLast = idx === app.events.length - 1;
                    const icon = EVENT_ICONS[ev.event_type] || '📌';
                    const evDate = new Date(ev.created_at);
                    return (
                      <div key={ev.id} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-sm shadow-md">
                            {icon}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 flex-1 bg-slate-900/80 my-1 min-h-[30px]" />
                          )}
                        </div>
                        <div className="pb-6 pt-1 text-xs">
                          <p className="font-bold text-slate-100 text-sm">{ev.label}</p>
                          {ev.actor_name && (
                            <p className="text-[10px] text-indigo-400 mt-0.5">by {ev.actor_name} ({ev.actor_role})</p>
                          )}
                          <p className="text-[10px] text-slate-500 mt-1">
                            {evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {evDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-500 text-xs italic py-6">No historical records recorded.</div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Progress Indicators (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Progress indicators wrapper */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 backdrop-blur-md">
            <ApplicationProgress currentStatus={app.status} isTerminal={app.is_terminal} />
          </div>

          {/* Details metadata */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 backdrop-blur-md space-y-4 text-xs text-slate-400">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 border-b border-slate-900 pb-2 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-indigo-400" /> Vacancy Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="text-slate-200 font-bold">{app.vacancy_location || 'Remote'}</span>
              </div>
              <div className="flex justify-between">
                <span>Working style:</span>
                <span className="text-slate-200 font-bold uppercase">{app.vacancy_work_mode || 'Hybrid'}</span>
              </div>
              {app.cover_letter && (
                <div className="pt-2 border-t border-slate-900">
                  <span className="block text-slate-350 font-bold mb-1.5">Your Cover Letter:</span>
                  <p className="bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl leading-relaxed text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {app.cover_letter}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Withdraw Modal Confirm */}
      {withdrawConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-scale-up">
            <div className="h-14 w-14 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto">
              ⚠️
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base text-slate-100">Withdraw Application?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently withdraw your active candidacy for the <strong>{app.vacancy_title}</strong> role. This action is terminal and cannot be reversed.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setWithdrawConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all disabled:opacity-40"
              >
                {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
