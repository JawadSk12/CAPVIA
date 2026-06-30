'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  internshipApi, 
  recruitmentApi, 
  applicationApi, 
  rankingsApi, 
  dnaApi, 
  integrityApi,
  reportsApi,
  apiClient
} from '../../../services/api';
import { Application, Internship } from '../../../types';
import { 
  Users, Search, Filter, RefreshCw, X, Eye, FileText, Code, Video, ShieldCheck, 
  BrainCircuit, Download, Send, CheckCircle2, AlertTriangle, AlertCircle, Info,
  Award, Clock, Check
} from 'lucide-react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip 
} from 'recharts';

const KANBAN_STAGES = [
  { id: 'applied', label: 'Applied', statuses: ['APPLIED', 'ATS_PENDING'], targetStatus: 'APPLIED', color: 'border-blue-200 bg-blue-50/50' },
  { id: 'ats', label: 'ATS', statuses: ['ATS_COMPLETED', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS'], targetStatus: 'ATS_COMPLETED', color: 'border-purple-200 bg-purple-50/50' },
  { id: 'simulation', label: 'Simulation', statuses: ['SIMULATION_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS'], targetStatus: 'SIMULATION_COMPLETED', color: 'border-orange-200 bg-orange-50/50' },
  { id: 'interview', label: 'Interview', statuses: ['INTERVIEW_COMPLETED'], targetStatus: 'INTERVIEW_COMPLETED', color: 'border-pink-200 bg-pink-50/50' },
  { id: 'completed', label: 'Completed', statuses: ['EVALUATED', 'EVALUATED_LOCAL_BASELINE'], targetStatus: 'EVALUATED', color: 'border-emerald-250 bg-emerald-50/50' },
  { id: 'selected', label: 'Selected', statuses: ['SHORTLISTED', 'HIRED'], targetStatus: 'SHORTLISTED', color: 'border-teal-200 bg-teal-50/50' },
  { id: 'rejected', label: 'Rejected', statuses: ['REJECTED'], targetStatus: 'REJECTED', color: 'border-rose-200 bg-rose-50/50' }
];

export default function HRCandidatesPage() {
  const queryClient = useQueryClient();
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
  // Drawer Tab state
  const [drawerTab, setDrawerTab] = useState<'overview' | 'resume' | 'ats' | 'simulation' | 'interview' | 'integrity' | 'dna' | 'reports' | 'timeline'>('overview');

  // Load Internships
  const { data: internshipsData, isLoading: loadingInternships } = useQuery({
    queryKey: ['internships'],
    queryFn: () => internshipApi.list(),
  });

  const internships: Internship[] = useMemo(() => internshipsData?.internships || [], [internshipsData]);

  // Set default internship
  useEffect(() => {
    if (internships.length > 0 && !selectedInternshipId) {
      setSelectedInternshipId(internships[0].id);
    }
  }, [internships, selectedInternshipId]);

  const selectedInternship = useMemo(() => {
    return internships.find((i: Internship) => i.id === selectedInternshipId);
  }, [internships, selectedInternshipId]);

  // Load all applications
  const { data: allApplicationsData, isLoading: loadingApplications, refetch: refetchApplications } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });

  const applications = useMemo(() => allApplicationsData || [], [allApplicationsData]);

  // Filter applications for current vacancy
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchVacancy = !selectedInternshipId || app.vacancy_id === selectedInternshipId;
      const matchSearch = !searchQuery || 
        app.candidate?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.candidate?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchVacancy && matchSearch;
    });
  }, [applications, selectedInternshipId, searchQuery]);

  // Group applications by Kanban Stage
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Application[]> = {
      applied: [],
      ats: [],
      simulation: [],
      interview: [],
      completed: [],
      selected: [],
      rejected: []
    };

    filteredApplications.forEach(app => {
      const stage = KANBAN_STAGES.find(s => s.statuses.includes(app.status));
      if (stage) {
        groups[stage.id].push(app);
      } else {
        // Fallback to draft/applied
        groups.applied.push(app);
      }
    });

    return groups;
  }, [filteredApplications]);

  // Mutation to update candidate status
  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) => 
      applicationApi.updateStatus(appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedInternshipId] });
      queryClient.invalidateQueries({ queryKey: ['application-detail', selectedAppId] });
    }
  });

  // DRAG & DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain');
    const stage = KANBAN_STAGES.find(s => s.id === targetStageId);
    if (appId && stage) {
      updateStatusMutation.mutate({ appId, status: stage.targetStatus });
    }
  };

  // DRILL-DOWN QUERIES FOR SELECTED CANDIDATE
  const { data: selectedAppDetail } = useQuery({
    queryKey: ['application-detail', selectedAppId],
    queryFn: () => applicationApi.getDetail(selectedAppId!),
    enabled: !!selectedAppId,
  });

  const { data: selectedAppRanking } = useQuery({
    queryKey: ['ranking-detail', selectedAppId],
    queryFn: () => rankingsApi.get(selectedAppId!),
    enabled: !!selectedAppId,
  });

  const { data: selectedAppDNA } = useQuery({
    queryKey: ['dna-detail', selectedAppId],
    queryFn: () => dnaApi.get(selectedAppId!),
    enabled: !!selectedAppId,
  });

  const { data: selectedAppIntegrity } = useQuery({
    queryKey: ['integrity-detail', selectedAppId],
    queryFn: () => integrityApi.get(selectedAppId!),
    enabled: !!selectedAppId,
  });

  // Mutators inside drawer
  const generateDNAMutation = useMutation({
    mutationFn: (appId: string) => dnaApi.generate(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dna-detail', selectedAppId] });
    }
  });

  const evaluateIntegrityMutation = useMutation({
    mutationFn: (appId: string) => integrityApi.evaluate(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrity-detail', selectedAppId] });
    }
  });

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async (appId: string, candidateName: string) => {
    setIsDownloading(true);
    try {
      await reportsApi.generate(appId);
      const response = await apiClient.get(`/reports/${appId}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${candidateName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download report.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Recharts DNA radar mappings
  const radarData = useMemo(() => {
    if (!selectedAppDNA?.capability_dimensions) return [];
    return Object.entries(selectedAppDNA.capability_dimensions).map(([key, val]) => ({
      subject: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      A: val as number,
      fullMark: 100,
    }));
  }, [selectedAppDNA]);

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Candidates Pipeline" breadcrumbs={[{ label: 'Workspace' }, { label: 'Candidates' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Hiring Pipelines</h2>
            <p className="text-slate-500 text-xs mt-1">Drag and drop candidates across stages to transition status</p>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto z-10">
            <span className="text-xs text-slate-500 font-medium">Filter Vacancy:</span>
            {loadingInternships ? (
              <span className="text-xs text-slate-400">Loading...</span>
            ) : (
              <select
                value={selectedInternshipId}
                onChange={(e) => setSelectedInternshipId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0D47A1] cursor-pointer"
              >
                <option value="">All Vacancies</option>
                {internships.map((int) => (
                  <option key={int.id} value={int.id}>
                    {int.title}
                  </option>
                ))}
              </select>
            )}
            
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-60">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Kanban Board Container */}
        {loadingApplications ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Loading applicant pipelines...
          </div>
        ) : (
          <div className="flex space-x-4 overflow-x-auto pb-6 select-none no-scrollbar items-start min-h-[600px]">
            {KANBAN_STAGES.map((stage) => {
              const cards = kanbanGroups[stage.id] || [];
              return (
                <div
                  key={stage.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`w-72 shrink-0 border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col min-h-[450px] transition-colors ${stage.color}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/50">
                    <span className="text-xs font-bold text-slate-800 font-outfit">{stage.label}</span>
                    <span className="text-[10px] bg-white border border-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500">
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards Scroll Container */}
                  <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                    {cards.map((app) => (
                      <div
                        key={app.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => { setSelectedAppId(app.id); setDrawerTab('overview'); }}
                        className="bg-white border border-slate-150/70 hover:border-[#0D47A1]/40 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing text-left"
                      >
                        <h5 className="font-bold text-slate-800 text-xs truncate">{app.candidate?.full_name}</h5>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">{app.candidate?.email}</p>
                        
                        {/* Summary Badges */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 text-[10px] text-slate-500 font-semibold">
                          <span className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {app.vacancy?.title ? app.vacancy.title.slice(0, 18) : 'Vacancy'}
                          </span>
                          {app.application_mapping?.combined_risk_level === 'HIGH' && (
                            <span className="bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded text-[8px] font-black animate-pulse">
                              RISK
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <div className="text-center py-12 text-[10px] text-slate-400 italic">
                        Drag candidates here
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* DETAILED APPLICANT PROFILE DRAWER */}
        {selectedAppId && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            
            {/* Backdrop */}
            <div 
              onClick={() => setSelectedAppId(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
            />

            {/* Drawer Panel */}
            <div className="relative w-full max-w-2xl bg-white border-l border-slate-150 shadow-2xl h-screen flex flex-col z-10">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] tracking-widest font-black text-[#0D47A1] uppercase bg-[#0D47A1]/5 border border-[#0D47A1]/15 px-2 py-0.5 rounded">
                      recruiter portal
                    </span>
                    {selectedAppRanking?.is_top_candidate && (
                      <span className="bg-amber-50 text-[#F59E0B] border border-amber-100 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                        Top Candidate
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mt-2 tracking-wide text-slate-900 font-outfit">
                    {selectedAppDetail?.candidate?.full_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedAppDetail?.candidate?.email}</p>
                </div>
                
                <button 
                  onClick={() => setSelectedAppId(null)}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex border-b border-slate-100 px-6 py-1.5 space-x-4 bg-slate-50/50 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'resume', label: 'Resume' },
                  { key: 'ats', label: 'ATS Analysis' },
                  { key: 'simulation', label: 'Simulation' },
                  { key: 'interview', label: 'Interview' },
                  { key: 'integrity', label: 'Integrity' },
                  { key: 'dna', label: 'DNA Profile' },
                  { key: 'reports', label: 'Reports' },
                  { key: 'timeline', label: 'Timeline' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDrawerTab(tab.key as any)}
                    className={`py-2 text-xs font-bold transition-all relative whitespace-nowrap ${
                      drawerTab === tab.key ? 'text-[#0D47A1]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    {drawerTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D47A1]" />}
                  </button>
                ))}
              </div>

              {/* Drawer Content Panel (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. OVERVIEW TAB — Executive Summary */}
                {drawerTab === 'overview' && (
                  <div className="space-y-5">

                    {/* Hero Score Scores row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl p-4 border text-center" style={{ background: 'rgba(13,71,161,0.05)', borderColor: 'rgba(13,71,161,0.15)' }}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CAPVIA Score</div>
                        <div className="text-3xl font-black mt-1" style={{ color: '#0D47A1' }}>
                          {selectedAppRanking?.final_score?.toFixed(0) || '—'}
                          <span className="text-lg text-slate-400">/100</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Final Weighted Index</div>
                      </div>
                      <div className="rounded-2xl p-4 border text-center" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Level</div>
                        <div className="text-xl font-black mt-1 text-slate-900">{selectedAppDNA?.candidate_level || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">AI Assessment</div>
                      </div>
                      <div className="rounded-2xl p-4 border text-center" style={{
                        background: selectedAppIntegrity?.risk_level === 'HIGH' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
                        borderColor: selectedAppIntegrity?.risk_level === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                      }}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Integrity Risk</div>
                        <div className={`text-xl font-black mt-1 uppercase ${
                          selectedAppIntegrity?.risk_level === 'HIGH' ? 'text-[#EF4444]' : 'text-[#10B981]'
                        }`}>{selectedAppIntegrity?.risk_level || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Behavioral Index</div>
                      </div>
                    </div>

                    {/* Scoring formula breakdown */}
                    <div className="rounded-2xl p-4 border border-slate-200 bg-white">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Score Composition</div>
                      {[
                        { label: 'ATS Resume', weight: 25, score: selectedAppDetail?.ats_score ?? 0, color: '#42A5F5' },
                        { label: 'Code Simulation', weight: 30, score: selectedAppDetail?.simulation_results?.score ?? 0, color: '#7C3AED' },
                        { label: 'AI Interview', weight: 25, score: selectedAppDetail?.interview_results?.score ?? 0, color: '#0D47A1' },
                        { label: 'Integrity', weight: 20, score: selectedAppIntegrity?.trust_index ?? 0, color: '#10B981' },
                      ].map(({ label, weight, score, color }) => (
                        <div key={label} className="mb-3">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold text-slate-600">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{weight}% weight</span>
                              <span className="font-bold" style={{ color }}>{score?.toFixed(0) ?? '—'}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score ?? 0}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedAppRanking?.explainability && (
                      <div className="space-y-3">
                        {/* Strengths */}
                        {selectedAppRanking.explainability.strengths?.length > 0 && (
                          <div className="rounded-2xl p-4 border" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                            <h5 className="font-bold text-xs mb-2.5 flex items-center gap-1.5" style={{ color: '#10B981' }}>
                              <CheckCircle2 className="h-4 w-4" /> Key Strengths
                            </h5>
                            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                              {selectedAppRanking.explainability.strengths.map((str: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#10B981] flex-shrink-0" />
                                  {str}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Risks */}
                        {selectedAppRanking.explainability.risk_signals?.length > 0 && (
                          <div className="rounded-2xl p-4 border" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
                            <h5 className="font-bold text-xs mb-2.5 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                              <AlertTriangle className="h-4 w-4" /> Risk Signals
                            </h5>
                            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                              {selectedAppRanking.explainability.risk_signals.map((risk: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hiring Recommendation */}
                    {selectedAppRanking?.hiring_recommendation && (
                      <div className="rounded-2xl p-5 border-2 text-center"
                        style={{
                          borderColor: selectedAppRanking.hiring_recommendation === 'STRONG_HIRE' ? '#10B981'
                            : selectedAppRanking.hiring_recommendation === 'HIRE' ? '#42A5F5'
                            : selectedAppRanking.hiring_recommendation === 'CONSIDER' ? '#F59E0B'
                            : '#EF4444',
                          background: selectedAppRanking.hiring_recommendation === 'STRONG_HIRE' ? 'rgba(16,185,129,0.04)'
                            : selectedAppRanking.hiring_recommendation === 'HIRE' ? 'rgba(66,165,245,0.04)'
                            : selectedAppRanking.hiring_recommendation === 'CONSIDER' ? 'rgba(245,158,11,0.04)'
                            : 'rgba(239,68,68,0.04)',
                        }}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Hiring Recommendation</div>
                        <div className="text-2xl font-black tracking-tight" style={{
                          color: selectedAppRanking.hiring_recommendation === 'STRONG_HIRE' ? '#10B981'
                            : selectedAppRanking.hiring_recommendation === 'HIRE' ? '#42A5F5'
                            : selectedAppRanking.hiring_recommendation === 'CONSIDER' ? '#F59E0B'
                            : '#EF4444'
                        }}>
                          {selectedAppRanking.hiring_recommendation.replace(/_/g, ' ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}




                {/* 2. RESUME TAB */}
                {drawerTab === 'resume' && (
                  <div className="space-y-4">
                    {selectedAppDetail?.resume_url ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
                        <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <h5 className="font-bold text-slate-800 text-xs">Resume Uploaded</h5>
                        <a 
                          href={selectedAppDetail.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-[#0D47A1] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#0D47A1]/95"
                        >
                          <span>Open Document</span>
                        </a>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        No uploaded resume file.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ATS TAB */}
                {drawerTab === 'ats' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <span className="text-xs font-bold text-slate-800">Overall ATS Score</span>
                      <span className="text-sm font-black text-[#0D47A1] bg-[#0D47A1]/10 px-2.5 py-1 rounded-lg">
                        {selectedAppDetail?.ats_score || 0}%
                      </span>
                    </div>

                    {selectedAppDetail?.ats_analysis ? (
                      <div className="space-y-4 text-left">
                        <div className="border border-slate-100 p-4 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Semantic Skill Matches</span>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {selectedAppDetail.ats_analysis.skills_detected?.map((skill: string) => (
                              <span key={skill} className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200/50">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="border border-slate-100 p-4 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recruiter Suggestion Summary</span>
                          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-medium">
                            {selectedAppDetail.ats_analysis.summary || 'Resume successfully screened by parser.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs italic">No ATS details computed.</div>
                    )}
                  </div>
                )}

                {/* 4. SIMULATION TAB */}
                {drawerTab === 'simulation' && (
                  <div className="space-y-4">
                    {selectedAppDetail?.simulation_results ? (
                      <div className="border border-slate-100 rounded-xl p-5 space-y-4 text-left">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                          <span className="text-xs font-bold text-slate-800">Simulation Score</span>
                          <span className="text-xs font-bold text-[#0D47A1]">
                            {selectedAppDetail.simulation_results.score || 0}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Language / Tech</span>
                          <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">
                            {selectedAppDetail.simulation_results.language || 'JavaScript'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Evaluation Feedback</span>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 font-mono">
                            {selectedAppDetail.simulation_results.evaluation_feedback || 'Completed challenge successfully.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        Simulation attempt not completed yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 5. INTERVIEW TAB */}
                {drawerTab === 'interview' && (
                  <div className="space-y-4">
                    {selectedAppDetail?.interview_results ? (
                      <div className="border border-slate-100 rounded-xl p-5 space-y-4 text-left">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                          <span className="text-xs font-bold text-slate-800">Interview Rating</span>
                          <span className="text-xs font-bold text-[#0D47A1]">
                            {selectedAppDetail.interview_results.score || 0}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Communication Evaluation</span>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            {selectedAppDetail.interview_results.communication_score_desc || 'Strong verbal alignment.'}
                          </p>
                        </div>
                        {selectedAppDetail.interview_results.video_url && (
                          <div className="pt-2">
                            <a 
                              href={selectedAppDetail.interview_results.video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-[#0D47A1] hover:underline flex items-center"
                            >
                              <span>Download Video Submission</span>
                              <Clock className="h-3.5 w-3.5 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        AI speech interview not completed yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 6. INTEGRITY TAB — Premium Behavioral Trust Display */}
                {drawerTab === 'integrity' && (
                  <div className="space-y-5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Behavioral Integrity Analysis</div>

                    {selectedAppIntegrity ? (
                      <>
                        {/* Trust index + risk level */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-2xl p-5 text-center border" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Behavior Trust</div>
                            <div className="text-4xl font-black mt-1" style={{ color: '#10B981' }}>
                              {selectedAppIntegrity.trust_index || 0}
                              <span className="text-lg text-slate-300">/100</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${selectedAppIntegrity.trust_index || 0}%`, background: '#10B981' }} />
                            </div>
                          </div>
                          <div className="rounded-2xl p-5 text-center border" style={{
                            background: selectedAppIntegrity.risk_level === 'HIGH' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
                            borderColor: selectedAppIntegrity.risk_level === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                          }}>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Level</div>
                            <div className={`text-2xl font-black mt-1 uppercase ${
                              selectedAppIntegrity.risk_level === 'HIGH' ? 'text-[#EF4444]'
                              : selectedAppIntegrity.risk_level === 'MEDIUM' ? 'text-[#F59E0B]'
                              : 'text-[#10B981]'
                            }`}>
                              {selectedAppIntegrity.risk_level || 'LOW'}
                            </div>
                          </div>
                        </div>

                        {/* Telemetry detections */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Proctoring Telemetry</div>
                          <div className="space-y-2.5">
                            {[
                              { label: 'Tab Switches', value: selectedAppIntegrity.tab_switches || 0, max: 10 },
                              { label: 'Look-Away Events', value: selectedAppIntegrity.look_away_count || 0, max: 20 },
                              { label: 'Copy/Paste Attempts', value: selectedAppIntegrity.copy_pastes || 0, max: 10 },
                              { label: 'Phone Detections', value: selectedAppIntegrity.phone_detections_count || 0, max: 5 },
                            ].map(({ label, value, max }) => (
                              <div key={label}>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="text-slate-600 font-semibold">{label}</span>
                                  <span className={`font-bold ${value > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{value}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: value > 0 ? '#EF4444' : '#10B981' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-xs italic">Behavioral integrity analysis not executed yet.</p>
                        <button
                          onClick={() => evaluateIntegrityMutation.mutate(selectedAppId!)}
                          disabled={evaluateIntegrityMutation.isPending}
                          className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl"
                          style={{ background: '#0D47A1' }}
                        >
                          {evaluateIntegrityMutation.isPending ? 'Analyzing...' : '🛡 Run Integrity Analysis'}
                        </button>
                      </div>
                    )}
                  </div>
                )}



                {/* 7. DNA PROFILE TAB — Executive Radar + Capability Cards */}
                {drawerTab === 'dna' && (
                  <div className="space-y-5">

                    {/* Radar Chart */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Capability DNA Radar</div>
                      <div className="w-full" style={{ height: 280 }}>
                        {radarData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                              <PolarGrid stroke="#E2E8F0" />
                              <PolarAngleAxis dataKey="subject" stroke="#64748B" fontSize={10} fontWeight={600} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" fontSize={9} tickCount={4} />
                              <Radar name="Score" dataKey="A" stroke="#0D47A1" fill="#0D47A1" fillOpacity={0.15} strokeWidth={2} />
                              <Tooltip
                                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
                                formatter={(value: any) => [`${value}%`, 'Score']}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                            <BrainCircuit className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-xs italic">DNA profile not generated yet.</p>
                            <button
                              onClick={() => generateDNAMutation.mutate(selectedAppId!)}
                              disabled={generateDNAMutation.isPending}
                              className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all"
                              style={{ background: '#0D47A1' }}
                            >
                              {generateDNAMutation.isPending ? 'Generating...' : '⚡ Generate DNA Profile'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capability Dimension Cards */}
                    {selectedAppDNA?.capability_dimensions && (
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(selectedAppDNA.capability_dimensions).map(([key, val]) => {
                          const score = val as number;
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          const color = score >= 80 ? '#10B981' : score >= 60 ? '#42A5F5' : score >= 40 ? '#F59E0B' : '#EF4444';
                          return (
                            <div key={key} className="rounded-xl p-3.5 border border-slate-200 bg-white">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-bold text-slate-700 truncate mr-2">{label}</span>
                                <span className="text-sm font-black flex-shrink-0" style={{ color }}>{score?.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score ?? 0}%`, background: color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Summary */}
                    {selectedAppDNA?.executive_summary && (
                      <div className="rounded-2xl p-4 border text-xs text-slate-600 leading-relaxed" style={{ background: 'rgba(13,71,161,0.03)', borderColor: 'rgba(13,71,161,0.12)' }}>
                        <div className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-widest mb-2">AI Executive Summary</div>
                        <p>{selectedAppDNA.executive_summary}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 8. REPORTS TAB */}

                {drawerTab === 'reports' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
                      <Download className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                      <h5 className="font-bold text-slate-800 text-xs">PDF Interview Summary Report</h5>
                      <p className="text-[10px] text-slate-450 mt-1 max-w-sm mx-auto leading-relaxed">
                        Export complete evaluation metrics, simulation code execution summary, and speech transcripts.
                      </p>
                      
                      <button
                        onClick={() => handleDownloadReport(selectedAppId, selectedAppDetail?.candidate?.full_name || 'candidate')}
                        disabled={isDownloading}
                        className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-55"
                      >
                        <span>{isDownloading ? 'Downloading...' : 'Download PDF Report'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 9. TIMELINE TAB */}
                {drawerTab === 'timeline' && (
                  <div className="space-y-6 text-left">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Scoring History & Audit Trail</h4>
                    
                    <div className="space-y-3">
                      {selectedAppRanking?.audit_trail && selectedAppRanking.audit_trail.length > 0 ? (
                        (selectedAppRanking.audit_trail as any[]).map((evt: any, i: number) => {
                          const date = new Date(evt.timestamp);
                          return (
                            <div key={i} className="flex justify-between items-start bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] leading-relaxed">
                              <div>
                                <div className="font-bold text-slate-800 text-xs">{evt.action || 'Evaluated'}</div>
                                <div className="text-slate-450 mt-0.5 font-medium">
                                  Actor: <span className="text-slate-600 font-semibold">{evt.actor_role}</span> 
                                  {evt.logic_version && ` · Version: ${evt.logic_version}`}
                                </div>
                              </div>
                              <span className="text-slate-400 font-medium whitespace-nowrap">
                                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400 italic">No audit computation logs.</div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer controls */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-500">Recruit Stage:</span>
                  <select
                    value={selectedAppDetail?.status || 'EVALUATED'}
                    onChange={(e) => updateStatusMutation.mutate({ appId: selectedAppId, status: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px] font-bold px-2 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="APPLIED">Applied</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="HIRED">Hired</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => evaluateIntegrityMutation.mutate(selectedAppId)}
                    disabled={evaluateIntegrityMutation.isPending}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-150 text-slate-650 text-[10px] font-bold transition-all disabled:opacity-40"
                  >
                    {evaluateIntegrityMutation.isPending ? 'Calculating...' : 'Calibrate Trust'}
                  </button>

                  <button 
                    onClick={() => generateDNAMutation.mutate(selectedAppId)}
                    disabled={generateDNAMutation.isPending}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-150 text-slate-650 text-[10px] font-bold transition-all disabled:opacity-40"
                  >
                    {generateDNAMutation.isPending ? 'Extracting...' : 'Generate DNA'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
