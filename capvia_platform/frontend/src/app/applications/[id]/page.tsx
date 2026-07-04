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
import ApplicationProgress from '../../../components/ApplicationProgress';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import SkeletonDossier from '../../../components/SkeletonDossier';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, RefreshCw, FileText, Code2, 
  Video, ExternalLink, ArrowLeft, ShieldCheck, 
  AlertCircle, Activity, ShieldAlert
} from 'lucide-react';

const EVENT_ICONS: Record<string, string> = {
  APPLICATION_SUBMITTED:  '📨',
  APPLICATION_WITHDRAWN:  '↩️',
  CANDIDATE_SHORTLISTED:  '🌟',
  CANDIDATE_REJECTED:     '📋',
  CANDIDATE_HIRED:        '🎊',
};

const STATUS_META: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  APPLIED:                  { color: 'text-blue-700', bg: 'bg-[#42A5F5]/10', border: 'border-[#42A5F5]/20', icon: '📨', label: 'Applied' },
  ATS_PENDING:              { color: 'text-purple-700', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: '🤖', label: 'Resume Review' },
  ATS_COMPLETED:            { color: 'text-indigo-700', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: '✅', label: 'Resume Screened' },
  SIMULATION_INVITED:       { color: 'text-pink-700', bg: 'bg-pink-500/10', border: 'border-pink-500/20', icon: '📩', label: 'Simulation Invited' },
  SIMULATION_IN_PROGRESS:   { color: 'text-amber-700', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '🎯', label: 'Simulation Active' },
  SIMULATION_COMPLETED:     { color: 'text-teal-700', bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: '🎯', label: 'Simulation Done' },
  INTERVIEW_INVITED:        { color: 'text-orange-700', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '📩', label: 'Interview Invited' },
  INTERVIEW_IN_PROGRESS:    { color: 'text-amber-700', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '🎤', label: 'Interview Active' },
  INTERVIEW_COMPLETED:      { color: 'text-green-700', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '🎤', label: 'Interview Done' },
  EVALUATED:                { color: 'text-emerald-700', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '⭐', label: 'Evaluated' },
  EVALUATED_LOCAL_BASELINE: { color: 'text-cyan-700', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: '⭐', label: 'Evaluated' },
  SHORTLISTED:              { color: 'text-purple-700', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: '🌟', label: 'Shortlisted!' },
  HIRED:                    { color: 'text-emerald-700', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '🎊', label: 'Hired!' },
  REJECTED:                 { color: 'text-rose-700', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '📋', label: 'Not Selected' },
  WITHDRAWN:                { color: 'text-slate-600', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: '↩️', label: 'Withdrawn' },
};

export default function ApplicationDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Application Dossier">
        <ApplicationDetailContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function ApplicationDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dna' | 'technical' | 'behavioral' | 'timeline'>('dna');
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  const handleStartSim = async () => {
    try {
      const { applicationsApi: simApi } = await import('@/features/simulation/services/api');
      const r = await simApi.startSimulation(id as any);
      router.push(`/candidate/simulation/${r.data.attempt_id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const errorMsg = typeof detail === 'object' && detail !== null ? (detail.message || JSON.stringify(detail)) : detail;
      alert(errorMsg || 'Could not start simulation');
    }
  };

  // Fetch application detail with auto-polling
  const { data: app, isLoading: loadingApp, error: appError } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () => applicationApi.getDetail(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3000;
      const activeStates = ['APPLIED', 'ATS_PENDING', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS'];
      return activeStates.includes(status) ? 3000 : false;
    }
  });

  // Fetch ranking details with auto-polling
  const { data: ranking } = useQuery({
    queryKey: ['ranking-detail', id],
    queryFn: () => rankingsApi.get(id as string),
    enabled: !!id,
    retry: false,
    refetchInterval: app?.status && ['APPLIED', 'ATS_PENDING', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS'].includes(app.status) ? 3000 : false,
  });

  // Fetch DNA profile with auto-polling
  const { data: dna } = useQuery({
    queryKey: ['dna-detail', id],
    queryFn: () => dnaApi.get(id as string),
    enabled: !!id,
    retry: false,
    refetchInterval: app?.status && ['APPLIED', 'ATS_PENDING', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS'].includes(app.status) ? 3000 : false,
  });

  // Fetch integrity results with auto-polling
  const { data: integrity } = useQuery({
    queryKey: ['integrity-detail', id],
    queryFn: () => integrityApi.get(id as string),
    enabled: !!id,
    retry: false,
    refetchInterval: app?.status && ['APPLIED', 'ATS_PENDING', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS'].includes(app.status) ? 3000 : false,
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: () => applicationApi.withdraw(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
      setWithdrawConfirm(false);
    }
  });

  // Status index for overall progress bar
  const STATUS_ORDER_INDEX: Record<string, number> = {
    APPLIED:                  0,
    ATS_PENDING:              2,
    ATS_COMPLETED:            3,
    SIMULATION_INVITED:       4,
    SIMULATION_IN_PROGRESS:   5,
    SIMULATION_COMPLETED:     6,
    INTERVIEW_INVITED:        7,
    INTERVIEW_IN_PROGRESS:    8,
    INTERVIEW_COMPLETED:      9,
    EVALUATED:                10,
    EVALUATED_LOCAL_BASELINE: 10,
    SHORTLISTED:              11,
    HIRED:                    12,
    REJECTED:                 12,
    WITHDRAWN:                0,
  };

  const overallProgressPercent = useMemo(() => {
    if (!app?.status) return 0;
    if (app.status === 'HIRED' || app.status === 'REJECTED') return 100;
    const currentIdx = STATUS_ORDER_INDEX[app.status] ?? 0;
    return Math.round((currentIdx / 12) * 100);
  }, [app?.status]);

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
      <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
        <UnifiedLayout title="Application Dossier">
          <SkeletonDossier />
        </UnifiedLayout>
      </ProtectedRoute>
    );
  }

  if (appError || !app) {
    return (
      <div className="py-20 text-center border border-dashed border-red-200 rounded-3xl bg-red-50/20 p-8 max-w-lg mx-auto">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-base font-outfit">Error Loading Application</h3>
        <p className="text-slate-550 text-xs mt-1 leading-relaxed">
          {(appError as any)?.response?.data?.error?.message || 'Could not retrieve application records.'}
        </p>
        <Link href="/applications" className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Applications
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[app.status] || { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-250', icon: '📋', label: app.status };
  const appliedDate = new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-850">
      
      {/* Top Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3">
          <Link href="/applications" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-[9px] tracking-widest font-black text-[#0D47A1] uppercase bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded">
              Dossier Summary
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight font-outfit">
              {app.vacancy_title}
            </h1>
            <p className="text-xs text-slate-400 font-bold">{app.company_name} · Applied on {appliedDate}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          {app.resume_url && (
            <a 
              href={app.resume_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-full border border-slate-205 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm"
            >
              📄 View Resume
            </a>
          )}
          {!app.is_terminal && app.status !== 'WITHDRAWN' && (
            <button 
              onClick={() => setWithdrawConfirm(true)}
              className="px-4 py-2.5 rounded-full border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all shadow-sm"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Timeline Stepper & Tabbed Details (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Status Hero Card */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              
              <div className="flex items-center space-x-4 w-full max-w-md">
                <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center text-3xl flex-shrink-0 shadow-sm ${meta.bg} ${meta.border}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Application State</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight font-outfit">
                    {app.status_label || meta.label}
                  </h2>
                  <p className="text-xs text-slate-550 mt-1 leading-relaxed font-medium">
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
                  
                  {/* Progress Bar inside status card */}
                  <div className="w-full mt-4 space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      <span>Overall Progress</span>
                      <span>{overallProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#0D47A1] h-full transition-all duration-500 rounded-full" style={{ width: `${overallProgressPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {ranking?.global_percentile !== undefined && ranking.global_percentile !== null && (
                <div className="text-left sm:text-right bg-blue-50 border border-blue-100 p-4 rounded-2xl flex-shrink-0 self-start sm:self-auto shadow-sm">
                  <span className="text-[9px] text-[#0D47A1] font-bold uppercase tracking-wider block">Percentile Ranking</span>
                  <h4 className="text-3xl font-black text-[#0D47A1] font-outfit mt-0.5">{ranking.global_percentile.toFixed(0)}th</h4>
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">against vacancy cohort</span>
                </div>
              )}

            </div>

            {/* Rejection Feedback */}
            {app.rejection_reason && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800 leading-relaxed font-medium">
                <div className="font-extrabold text-rose-700 mb-1 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1.5 text-rose-550" /> Feedback from Recruiter:
                </div>
                {app.rejection_reason}
              </div>
            )}
          </div>

          {/* Score Widgets Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* ATS MATCH CARD */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase block">ATS Match</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-[#0D47A1] font-outfit">
                  {app.ats_score !== undefined && app.ats_score !== null ? `${app.ats_score}%` : 'Pending'}
                </span>
              </div>
              <span className={`text-[10px] font-bold block mt-1.5 ${
                app.ats_score ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {app.ats_score ? '✓ Profile Screened' : '○ Under Review'}
              </span>
            </div>

            {/* CODING CHALLENGE CARD */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase block">Coding Assessment</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-purple-700 font-outfit">
                  {app.simulation_score !== undefined && app.simulation_score !== null ? `${app.simulation_score}%` : 'Not Started'}
                </span>
              </div>
              <span className={`text-[10px] font-bold block mt-1.5 ${
                app.simulation_score ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {app.simulation_score ? '✓ Challenge Submitted' : '○ Code Challenge'}
              </span>
            </div>

            {/* SPEECH INTERVIEW CARD */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase block">Voice Interview</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-pink-700 font-outfit">
                  {app.interview_score !== undefined && app.interview_score !== null ? `${app.interview_score}%` : 'Not Started'}
                </span>
              </div>
              <span className={`text-[10px] font-bold block mt-1.5 ${
                app.interview_score ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {app.interview_score ? '✓ Interview Completed' : '○ Verbal Assessment'}
              </span>
            </div>

            {/* CAPABILITIES DNA CARD */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase block">DNA Profile</span>
              <div className="flex items-baseline gap-1 mt-2 overflow-hidden">
                <span className="text-sm font-black text-emerald-700 uppercase font-outfit truncate">
                  {dna?.candidate_level ? dna.candidate_level.replace(/_/g, ' ') : 'Analyzing...'}
                </span>
              </div>
              <span className={`text-[10px] font-bold block mt-1.5 ${
                dna?.candidate_level ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {dna?.candidate_level ? '✓ Alignment Ready' : '○ Building Graph'}
              </span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 py-1.5 space-x-6">
            {[
              { key: 'dna', label: 'Capabilities DNA & Feedback' },
              { key: 'technical', label: 'Technical Evaluation' },
              { key: 'behavioral', label: 'Behavioral & Proctoring' },
              { key: 'timeline', label: 'Timeline History' },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 text-xs font-black uppercase tracking-wider transition-all relative ${
                    active ? 'text-[#0D47A1] font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D47A1]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENTS */}
          <div className="space-y-6">
            {activeTab === 'dna' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Radar chart of DNA */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Radar chart visual (Dark Navy Card #08152E, size 400px) */}
                  <div className="md:col-span-7 bg-[#08152E] border border-[#42A5F5]/20 rounded-3xl p-6 flex flex-col items-center shadow-xl">
                    <h4 className="text-[#42A5F5] text-[10px] font-black uppercase tracking-widest self-start mb-4">Capability DNA Alignment</h4>
                    <div className="w-full h-[400px] flex justify-center items-center">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(66, 165, 245, 0.15)" />
                            <PolarAngleAxis dataKey="subject" stroke="#94A3B8" fontSize={10} tick={{ fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.1)" fontSize={9} />
                            <Radar name="Dimensions" dataKey="value" stroke="#42A5F5" fill="#42A5F5" fillOpacity={0.25} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#08152E', borderColor: 'rgba(66, 165, 245, 0.2)', borderRadius: '12px' }}
                              itemStyle={{ fontSize: 11, color: '#ffffff' }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-slate-400 text-xs italic p-12">
                          Assessments pending. Dimensions will map once ATS, coding challenge, and speech evaluation are complete.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score breakdown metrics with Display-weight pills */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">Capability Level</span>
                      <div className="mt-2.5">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider bg-[#0D47A1]/10 text-[#0D47A1] border border-[#0d47a1]/25">
                          {dna?.candidate_level || 'EVALUATING...'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed font-semibold">
                        Assessed dynamically across problem solving, communicational adaptability, and engineering execution dimensions.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-[#0D47A1] tracking-widest uppercase block">Recommendation Placement</span>
                      <div className="mt-2.5">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider bg-[#FFC107]/10 text-amber-600 border border-[#FFC107]/25">
                          {ranking?.recommendation_tier || 'UNRANKED'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed font-semibold">
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
                      <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl shadow-sm">
                        <h5 className="font-extrabold text-xs text-emerald-800 flex items-center mb-3">
                          <CheckCircle2 className="h-4.5 w-4.5 mr-2 text-emerald-600" /> Actionable Strengths Identified
                        </h5>
                        <ul className="space-y-2 text-xs text-emerald-700 list-disc list-inside leading-relaxed font-medium">
                          {ranking.explainability.strengths.map((str: string, i: number) => (
                            <li key={i} className="pl-1">{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Performance Observations */}
                    {ranking.explainability.risk_signals && ranking.explainability.risk_signals.length > 0 && (
                      <div className="bg-red-50 border border-red-100 p-5 rounded-3xl shadow-sm">
                        <h5 className="font-extrabold text-xs text-red-800 flex items-center mb-3">
                          <ShieldAlert className="h-4.5 w-4.5 mr-2 text-red-650" /> Performance Observations
                        </h5>
                        <ul className="space-y-2 text-xs text-red-750 list-disc list-inside leading-relaxed font-medium">
                          {ranking.explainability.risk_signals.map((risk: string, i: number) => (
                            <li key={i} className="pl-1">{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pending Action Required */}
                    {ranking.explainability.absent_phase_warnings && ranking.explainability.absent_phase_warnings.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl shadow-sm">
                        <h5 className="font-extrabold text-xs text-amber-800 flex items-center mb-3">
                          <AlertCircle className="h-4.5 w-4.5 mr-2 text-amber-600" /> Pending Action Required
                        </h5>
                        <ul className="space-y-2 text-xs text-amber-700 list-disc list-inside leading-relaxed font-medium">
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
              <div className="space-y-6 animate-fade-in">
                
                {/* ATS Results card */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-55">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0D47A1] flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-[#0D47A1]" />
                      1. Resume Screening Highlights
                    </h4>
                    {app.ats_score !== undefined && app.ats_score !== null ? (
                      <span className="text-xs font-black text-[#0D47A1] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded">
                        Match: {app.ats_score}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">PENDING</span>
                    )}
                  </div>

                  {app.ats_result ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div>Grade Category: <strong className="text-slate-800 font-bold">{app.ats_result.score_band}</strong></div>
                        <div>Matching Domain: <strong className="text-slate-800 font-bold">{app.ats_result.detected_role || 'N/A'}</strong></div>
                      </div>
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div className="font-bold">Identified Skills:</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {app.ats_result.matched_skills?.map((s: string) => (
                            <span key={s} className="bg-white border border-slate-205 text-[10px] text-slate-700 px-2 py-0.5 rounded font-bold">
                              {s}
                            </span>
                          )) || <span className="text-slate-400 italic">None matched</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 italic">Resume parse results not populated yet.</div>
                  )}
                </div>

                {/* Simulation Challenge Card */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-55">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center">
                      <Code2 className="h-4 w-4 mr-2 text-purple-600" />
                      2. Coding Assessments Dashboard
                    </h4>
                    {app.simulation_score !== undefined && app.simulation_score !== null ? (
                      <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded">
                        Coding Score: {app.simulation_score}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">NOT STARTED</span>
                    )}
                  </div>

                  {app.simulation_result ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div>Recruit Recommendation: <strong className="text-slate-800 uppercase font-bold">{app.simulation_result.recommendation}</strong></div>
                        <div>Attempt ID: <strong className="text-slate-700 font-mono font-bold">#{app.simulation_result.attempt_id}</strong></div>
                      </div>
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div>AI Dependency Metric: <strong className="text-slate-800 font-bold">{Math.round(app.simulation_result.ai_dependency_score * 100)}%</strong></div>
                        <div>Submission Status: <strong className="text-emerald-700 font-bold">Successfully Submitted</strong></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 italic">
                      {['SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'SIMULATION_STARTED'].includes(app.status) ? (
                        <div className="space-y-3">
                          <p>You have been invited to participate in the interactive coding challenge.</p>
                          <button 
                            onClick={handleStartSim}
                            className="inline-block px-4 py-2 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-xs cursor-pointer transition-all"
                          >
                            {app.status === 'SIMULATION_INVITED' ? 'Start Assessment Challenge' : 'Resume Assessment Challenge'}
                          </button>
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
              <div className="space-y-6 animate-fade-in">
                
                {/* Interview scores & records */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-55">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-700 flex items-center">
                      <Video className="h-4 w-4 mr-2 text-pink-600" />
                      3. Speech Video Evaluation
                    </h4>
                    {app.interview_score !== undefined && app.interview_score !== null ? (
                      <span className="text-xs font-black text-pink-700 bg-pink-50 border border-pink-100 px-2.5 py-0.5 rounded">
                        Speech Score: {app.interview_score}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">NOT STARTED</span>
                    )}
                  </div>

                  {app.interview_result ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650">
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div>Recruiter Evaluation: <strong className="text-slate-800 font-bold">{app.interview_result.recommendation}</strong></div>
                        {app.interview_result.video_url && (
                          <div className="mt-1">
                            Recording:{' '}
                            <a 
                              href={app.interview_result.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0D47A1] hover:underline inline-flex items-center font-bold"
                            >
                              Play Video recording <ExternalLink className="h-3 w-3 ml-0.5" />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div>Cheating Probability: <strong className="text-slate-800 font-bold">{app.interview_result.cheating_probability_pct}%</strong></div>
                        <div>Behavioral Confidence: <strong className="text-slate-800 font-bold">Evaluated</strong></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 italic">
                      {app.status === 'INTERVIEW_INVITED' ? (
                        <div className="space-y-3">
                          <p>You have been invited to join the AI Speech Interview kiosk.</p>
                          <Link 
                            href={`/candidate/interview?role=${encodeURIComponent(app.vacancy_title || '')}`}
                            className="inline-block px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer transition-all"
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

                {/* Integrity proctoring */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center pb-2 border-b border-slate-55">
                    <ShieldCheck className="h-4 w-4 mr-2 text-emerald-500" />
                    Behavioral Integrity Summary
                  </h4>
                  {integrity ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-655">
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-2">
                        <div>Integrity Trust Index: <strong className="text-slate-800 font-black text-sm">{integrity.trust_index || 0}/100</strong></div>
                        <div>Proctoring Risk Rating: <strong className="text-slate-850 font-bold uppercase">{integrity.risk_level}</strong></div>
                      </div>
                      <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Webcam Proctoring Logs</span>
                        <div className="grid grid-cols-2 gap-2 text-[11px] mt-1 text-slate-700 font-semibold">
                          <div>Look aways: <span className="text-[#0D47A1] font-bold">{integrity.look_away_count || 0}</span></div>
                          <div>Tab switches: <span className="text-[#0D47A1] font-bold">{integrity.tab_switches || 0}</span></div>
                          <div>Copy pastes: <span className="text-[#0D47A1] font-bold">{integrity.copy_pastes || 0}</span></div>
                          <div>Phones flagged: <span className="text-[#0D47A1] font-bold">{integrity.phone_detections_count || 0}</span></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 italic">Integrity assessment report not generated.</div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Application Audit Logs</h3>
                <div className="flex flex-col space-y-0">
                  {app.events && app.events.length > 0 ? (
                    app.events.map((ev: any, idx: number) => {
                      const isLast = idx === app.events.length - 1;
                      const icon = EVENT_ICONS[ev.event_type] || '📌';
                      const evDate = new Date(ev.created_at);
                      return (
                        <div key={ev.id} className="flex gap-4">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm shadow-sm">
                              {icon}
                            </div>
                            {!isLast && (
                              <div className="w-0.5 flex-1 bg-slate-100 my-1 min-h-[30px]" />
                            )}
                          </div>
                          <div className="pb-6 pt-1 text-xs">
                            <p className="font-bold text-slate-800 text-sm">{ev.label}</p>
                            {ev.actor_name && (
                              <p className="text-[10px] text-[#0D47A1] font-bold mt-0.5">by {ev.actor_name} ({ev.actor_role})</p>
                            )}
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                              {evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {evDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-400 text-xs italic py-6">No historical records recorded.</div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Stepper & Metadata (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Progress Timeline Stepper */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <ApplicationProgress
              currentStatus={app.status}
              isTerminal={app.is_terminal}
              resumeUrl={app.resume_url}
              atsScore={app.ats_score}
              simulationScore={app.simulation_score}
              interviewScore={app.interview_score}
              events={app.events}
            />
          </div>

          {/* Vacancy Details Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 text-xs text-slate-600 font-semibold">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-50 pb-2 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-[#0D47A1]" /> Vacancy Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Location</span>
                <span className="text-slate-800 font-bold">{app.vacancy_location || 'Remote'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Work style</span>
                <span className="text-slate-800 font-bold uppercase">{app.vacancy_work_mode || 'Hybrid'}</span>
              </div>
              {app.cover_letter && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-slate-400 font-bold mb-1.5">Submitted Cover Letter</span>
                  <p className="bg-[#F8FAFC] border border-slate-200 p-3 rounded-xl leading-relaxed text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap font-medium text-slate-650">
                    {app.cover_letter}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Withdraw Confirmation Modal */}
      {withdrawConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setWithdrawConfirm(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative z-10">
            <div className="h-14 w-14 bg-red-50 border border-red-100 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto animate-bounce">
              ⚠️
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base text-slate-900 font-outfit">Withdraw Application?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                This will permanently withdraw your candidacy for the <strong>{app.vacancy_title}</strong> role. This action is terminal and cannot be reversed.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setWithdrawConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-250 bg-white text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-705 text-white font-extrabold text-xs transition-all disabled:opacity-40"
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
