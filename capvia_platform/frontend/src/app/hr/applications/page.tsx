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
  Inbox, Search, Filter, RefreshCw, X, Eye, FileText, Download, 
  CheckCircle2, AlertTriangle, AlertCircle, Award, Clock
} from 'lucide-react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip 
} from 'recharts';

export default function HRApplicationsPage() {
  const queryClient = useQueryClient();
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
  // Drawer Tab state
  const [drawerTab, setDrawerTab] = useState<'overview' | 'resume' | 'ats' | 'simulation' | 'interview' | 'integrity' | 'dna' | 'reports' | 'timeline'>('overview');

  // Load Internships
  const { data: internshipsData } = useQuery({
    queryKey: ['internships'],
    queryFn: () => internshipApi.list(),
  });

  const internships: Internship[] = useMemo(() => internshipsData?.internships || [], [internshipsData]);

  // Load all applications
  const { data: allApplicationsData, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });

  const applications = useMemo(() => allApplicationsData || [], [allApplicationsData]);

  // Filtered applications list
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchVacancy = !selectedInternshipId || app.vacancy_id === selectedInternshipId;
      const matchStatus = statusFilter === 'ALL' || app.status === statusFilter;
      const matchSearch = !searchQuery || 
        app.candidate?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.candidate?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchVacancy && matchStatus && matchSearch;
    });
  }, [applications, selectedInternshipId, statusFilter, searchQuery]);

  // Mutation to update candidate status
  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) => 
      applicationApi.updateStatus(appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application-detail', selectedAppId] });
    }
  });

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
      <UnifiedLayout title="Applications List" breadcrumbs={[{ label: 'Workspace' }, { label: 'Applications' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Applications Directory</h2>
            <p className="text-slate-500 text-xs mt-1">Tabular index of all candidate application filings and telemetry records</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
          
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-450"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedInternshipId}
              onChange={(e) => setSelectedInternshipId(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-xs focus:outline-none w-full cursor-pointer font-semibold"
            >
              <option value="">All Vacancies</option>
              {internships.map((int) => (
                <option key={int.id} value={int.id}>
                  {int.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-xs focus:outline-none w-full cursor-pointer font-semibold"
            >
              <option value="ALL">All Stages</option>
              <option value="APPLIED">Applied</option>
              <option value="ATS_COMPLETED">ATS Screening</option>
              <option value="SIMULATION_COMPLETED">Simulation Done</option>
              <option value="INTERVIEW_COMPLETED">Interview Done</option>
              <option value="EVALUATED">Completed</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="HIRED">Hired</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-400 font-semibold px-2">
            <span>Showing {filteredApplications.length} applications</span>
          </div>

        </div>

        {/* Table List Display */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Loading candidates index...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8">
            <Inbox className="h-10 w-10 mx-auto mb-4 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-base">No Applications Found</h3>
            <p className="text-xs text-slate-450 mt-1">No candidate records match your current filter parameters.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Candidate</th>
                    <th className="py-4 px-6">Vacancy Campaign</th>
                    <th className="py-4 px-6">Applied Date</th>
                    <th className="py-4 px-6">ATS Match</th>
                    <th className="py-4 px-6">Current Stage</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-sm">{app.candidate?.full_name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{app.candidate?.email}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-650">
                        {app.vacancy?.title || 'General Vacancy'}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-semibold">
                        {new Date(app.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-bold">
                        {app.application_mapping?.ats_score ? `${app.application_mapping.ats_score}%` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => { setSelectedAppId(app.id); setDrawerTab('overview'); }}
                          className="p-1.5 rounded-lg border border-slate-150 hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/5 text-slate-450 hover:text-[#0D47A1] transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                
                {/* 1. OVERVIEW TAB */}
                {drawerTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Level</span>
                        <h4 className="text-lg font-bold text-slate-850 mt-1 font-outfit">{selectedAppDNA?.candidate_level || 'N/A'}</h4>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Final Weighted Index</span>
                        <h4 className="text-lg font-bold text-[#0D47A1] mt-1 font-outfit">
                          {selectedAppRanking?.final_score?.toFixed(1) || '—'}%
                        </h4>
                      </div>
                    </div>

                    {selectedAppRanking?.explainability && (
                      <div className="space-y-4">
                        {/* Strengths */}
                        {selectedAppRanking.explainability.strengths && selectedAppRanking.explainability.strengths.length > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-left">
                            <h5 className="font-bold text-xs text-[#10B981] flex items-center mb-2">
                              <CheckCircle2 className="h-4.5 w-4.5 mr-1.5" /> Key Strengths
                            </h5>
                            <ul className="space-y-1 text-xs text-slate-650 list-disc list-inside leading-relaxed">
                              {selectedAppRanking.explainability.strengths.map((str: string, i: number) => (
                                <li key={i}>{str}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Risks */}
                        {selectedAppRanking.explainability.risk_signals && selectedAppRanking.explainability.risk_signals.length > 0 && (
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-left">
                            <h5 className="font-bold text-xs text-[#EF4444] flex items-center mb-2">
                              <AlertTriangle className="h-4.5 w-4.5 mr-1.5" /> Risk Signals & Telemetry Alerts
                            </h5>
                            <ul className="space-y-1 text-xs text-slate-650 list-disc list-inside leading-relaxed">
                              {selectedAppRanking.explainability.risk_signals.map((risk: string, i: number) => (
                                <li key={i}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
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

                {/* 6. INTEGRITY TAB */}
                {drawerTab === 'integrity' && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">Behavioral Integrity Index</h4>
                    
                    {selectedAppIntegrity ? (
                      <div className="grid grid-cols-2 gap-4 text-xs text-left">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Behavior Trust</span>
                          <h5 className="text-lg font-black text-slate-800 mt-1 font-outfit">{selectedAppIntegrity.trust_index || 0}/100</h5>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Risk Level</span>
                          <h5 className="text-lg font-black text-rose-500 mt-1 uppercase font-outfit">{selectedAppIntegrity.risk_level || 'LOW'}</h5>
                        </div>
                        <div className="col-span-2 border border-slate-100 p-4 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Proctoring Telemetry Warning Detections</span>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-slate-650 font-semibold">
                            <div>Tab switches: <strong className="text-slate-800">{selectedAppIntegrity.tab_switches || 0}</strong></div>
                            <div>Look aways: <strong className="text-slate-800">{selectedAppIntegrity.look_away_count || 0}</strong></div>
                            <div>Copy pastes: <strong className="text-slate-800">{selectedAppIntegrity.copy_pastes || 0}</strong></div>
                            <div>Phone detections: <strong className="text-slate-800">{selectedAppIntegrity.phone_detections_count || 0}</strong></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        Behavior integrity analysis not executed yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 7. DNA PROFILE TAB */}
                {drawerTab === 'dna' && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">Capability DNA Radar</h4>
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col items-center">
                      <div className="w-full h-64 flex justify-center items-center">
                        {radarData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                              <Radar name="Dimensions" dataKey="A" stroke="#0D47A1" fill="#0D47A1" fillOpacity={0.1} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center text-slate-400 text-xs italic">
                            DNA profile dimensions not loaded yet.
                          </div>
                        )}
                      </div>
                    </div>
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
                    className="bg-white border border-slate-200 rounded-lg text-slate-850 text-[11px] font-bold px-2 py-1.5 focus:outline-none cursor-pointer"
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
