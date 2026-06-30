'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  internshipApi, 
  recruitmentApi, 
  rankingsApi, 
  dnaApi, 
  integrityApi,
  applicationApi,
  reportsApi,
  apiClient
} from '../../../services/api';
import { Application, Internship } from '../../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell
} from 'recharts';
import { 
  Users, RefreshCw, Search, ShieldAlert, Award, FileText, Download, 
  ChevronDown, X, Square, Eye, CheckCircle2, AlertTriangle, 
  AlertCircle, ShieldCheck, Info, ChevronRight, CheckSquare as CheckedBoxIcon,
  Trash2
} from 'lucide-react';

interface LeaderboardRow {
  id: string;
  application_id: string;
  internship_id: string;
  final_score: number | null;
  ats_component: number | null;
  simulation_component: number | null;
  interview_component: number | null;
  integrity_component: number | null;
  ats_raw_score: number | null;
  simulation_raw_score: number | null;
  interview_raw_score: number | null;
  integrity_raw_score: number | null;
  internship_rank: number;
  company_rank: number;
  global_percentile: number | null;
  is_top_candidate: boolean;
  recommendation_tier: string;
  data_completeness: number;
  explainability?: {
    strengths?: string[];
    risk_signals?: string[];
    absent_phase_warnings?: string[];
  };
  candidate?: {
    full_name: string;
    email: string;
  };
  status: string;
  application?: Application;
}

export default function HRRankingsPage() {
  const queryClient = useQueryClient();
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'leaderboard' | 'compare'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [showTopOnly, setShowTopOnly] = useState<boolean>(false);
  const [comparedAppIds, setComparedAppIds] = useState<string[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  
  // Drawer Tab state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'dna' | 'integrity' | 'timeline'>('overview');

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

  // Load Leaderboard for Selected Internship
  const { data: leaderboardData, isLoading: loadingLeaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['leaderboard', selectedInternshipId],
    queryFn: () => rankingsApi.getLeaderboard(selectedInternshipId),
    enabled: !!selectedInternshipId,
  });

  // Fetch all applications
  const { data: allApplicationsData, isLoading: loadingApplications } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });

  const applications = useMemo(() => allApplicationsData || [], [allApplicationsData]);

  // Correlate ranking rows with application/candidate details
  const leaderboardList = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return (leaderboardData.leaderboard as any[]).map((row: any) => {
      const app = applications.find((a: Application) => a.id === row.application_id);
      return {
        ...row,
        candidate: row.candidate || {
          full_name: app?.candidate?.full_name || 'Unknown Candidate',
          email: app?.candidate?.email || 'No email available',
        },
        status: app?.status || 'EVALUATED',
        application: app
      } as LeaderboardRow;
    });
  }, [leaderboardData, applications]);

  // Cohort Rerank Mutation
  const rerankMutation = useMutation({
    mutationFn: (internshipId: string) => rankingsApi.rerank(internshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedInternshipId] });
    }
  });

  // Filtered leaderboard list
  const filteredLeaderboard = useMemo(() => {
    return leaderboardList.filter(row => {
      const nameMatch = row.candidate?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        row.candidate?.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const statusMatch = statusFilter === 'ALL' || row.status === statusFilter;
      
      const app = applications.find((a: Application) => a.id === row.application_id);
      const riskLevel = app?.application_mapping?.combined_risk_level || 'LOW';
      const riskMatch = riskFilter === 'ALL' || riskLevel === riskFilter;

      const tierMatch = tierFilter === 'ALL' || row.recommendation_tier === tierFilter;
      const topMatch = !showTopOnly || row.is_top_candidate;

      return nameMatch && statusMatch && riskMatch && tierMatch && topMatch;
    });
  }, [leaderboardList, searchQuery, statusFilter, riskFilter, tierFilter, showTopOnly, applications]);

  // DNA comparison data query
  const { data: comparedDNAData } = useQuery({
    queryKey: ['compare-dna', comparedAppIds],
    queryFn: () => dnaApi.compare(comparedAppIds),
    enabled: comparedAppIds.length >= 2 && selectedTab === 'compare',
  });

  // Rankings comparison data query
  const { data: comparedRankingsData } = useQuery({
    queryKey: ['compare-rankings', comparedAppIds],
    queryFn: () => rankingsApi.compare(comparedAppIds),
    enabled: comparedAppIds.length >= 2 && selectedTab === 'compare',
  });

  // Correlation for comparison matrix
  const comparisonList = useMemo(() => {
    if (!comparedRankingsData?.ranked_results) return [];
    return (comparedRankingsData.ranked_results as any[]).map(row => {
      const app = applications.find((a: Application) => a.id === row.application_id);
      const dnaRow = comparedDNAData?.ranked_results?.find((d: any) => d.application_id === row.application_id);
      return {
        ...row,
        candidate: {
          full_name: app?.candidate?.full_name || 'Candidate',
          email: app?.candidate?.email || 'N/A',
        },
        status: app?.status || 'EVALUATED',
        risk_level: app?.application_mapping?.combined_risk_level || 'LOW',
        dna_dimensions: dnaRow?.dimensions || {},
        overall_average_dna: dnaRow?.overall_average || 0,
        candidate_level: dnaRow?.candidate_level || 'N/A'
      };
    });
  }, [comparedRankingsData, comparedDNAData, applications]);

  // Multiple radar chart overlay for comparison
  const comparisonRadarData = useMemo(() => {
    if (comparisonList.length === 0) return [];
    const keys = ['problem_solving', 'execution', 'communication', 'learning_ability', 'adaptability', 'consistency', 'confidence', 'role_fit', 'leadership_potential'];
    
    return keys.map(key => {
      const row: Record<string, any> = {
        subject: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        fullMark: 100,
      };
      comparisonList.forEach((cand, idx) => {
        row[`cand_${idx}`] = cand.dna_dimensions[key] || 0;
      });
      return row;
    });
  }, [comparisonList]);

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

  const changeStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) => 
      applicationApi.updateStatus(appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedInternshipId] });
      queryClient.invalidateQueries({ queryKey: ['application-detail', selectedAppId] });
    }
  });

  // Exports
  const handleExportCSV = () => {
    if (filteredLeaderboard.length === 0) return;
    const headers = ['Rank', 'Name', 'Email', 'Final Score', 'ATS Score', 'Simulation Score', 'Interview Score', 'Integrity Trust', 'Risk Level', 'Completeness', 'Recommendation Tier'];
    const rows = filteredLeaderboard.map((row) => {
      const app = applications.find((a: Application) => a.id === row.application_id);
      return [
        row.internship_rank,
        row.candidate?.full_name || 'N/A',
        row.candidate?.email || 'N/A',
        row.final_score !== null ? `${row.final_score}%` : 'N/A',
        row.ats_raw_score !== null ? `${row.ats_raw_score}%` : 'N/A',
        row.simulation_raw_score !== null ? `${row.simulation_raw_score}%` : 'N/A',
        row.interview_raw_score !== null ? `${row.interview_raw_score}%` : 'N/A',
        row.integrity_raw_score !== null ? `${row.integrity_raw_score}%` : 'N/A',
        app?.application_mapping?.combined_risk_level || 'LOW',
        `${Math.round(row.data_completeness * 100)}%`,
        row.recommendation_tier
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `leaderboard_${selectedInternship?.title.replace(/\s+/g, '_') || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  const handleExportJSON = () => {
    if (filteredLeaderboard.length === 0) return;
    const jsonStr = JSON.stringify(filteredLeaderboard, null, 2);
    const link = document.createElement("a");
    link.setAttribute("href", 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr));
    link.setAttribute("download", `leaderboard_${selectedInternship?.title.replace(/\s+/g, '_') || 'export'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  const toggleCandidateComparison = (appId: string) => {
    setComparedAppIds(prev => {
      if (prev.includes(appId)) return prev.filter(id => id !== appId);
      if (prev.length >= 6) {
        alert('Maximum 6 candidates can be compared.');
        return prev;
      }
      return [...prev, appId];
    });
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
      <UnifiedLayout title="AI Rankings & Comparison" breadcrumbs={[{ label: 'Workspace' }, { label: 'Rankings' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">AI Leaderboard & Match Score</h2>
            <p className="text-slate-500 text-xs mt-1">Recalculate cohort weights, export telemetry, and construct capabilities matrix</p>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto z-10">
            <span className="text-xs text-slate-500 font-medium">Select Vacancy:</span>
            {loadingInternships ? (
              <span className="text-xs text-slate-400">Loading...</span>
            ) : (
              <select
                value={selectedInternshipId}
                onChange={(e) => {
                  setSelectedInternshipId(e.target.value);
                  setComparedAppIds([]);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0D47A1] cursor-pointer"
              >
                {internships.map((int) => (
                  <option key={int.id} value={int.id}>
                    {int.title}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => selectedInternshipId && rerankMutation.mutate(selectedInternshipId)}
              disabled={rerankMutation.isPending || !selectedInternshipId}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#0D47A1]/10 hover:bg-[#0D47A1]/20 text-[#0D47A1] text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${rerankMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{rerankMutation.isPending ? 'Reranking...' : 'Rerank Cohort'}</span>
            </button>
          </div>
        </div>

        {/* Tab controller bar */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedTab('leaderboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTab === 'leaderboard'
                  ? 'bg-white text-[#0D47A1] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Leaderboard Cohort
            </button>
            <button
              onClick={() => setSelectedTab('compare')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
                selectedTab === 'compare'
                  ? 'bg-white text-[#0D47A1] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Comparison Overlay</span>
              {comparedAppIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                  {comparedAppIds.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTopOnly(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                showTopOnly 
                  ? 'bg-amber-50 text-amber-550 border-amber-100' 
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              Top Candidates Only
            </button>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(prev => !prev)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5 text-slate-400" />
                <span>Export Report</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden text-left">
                  <button 
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold transition-colors flex items-center space-x-2 border-b border-slate-100"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export CSV</span>
                  </button>
                  <button 
                    onClick={handleExportJSON}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold transition-colors flex items-center space-x-2"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export JSON</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 1. LEADERBOARD VIEW */}
        {selectedTab === 'leaderboard' && (
          <div className="space-y-6">
            
            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-slate-450" />
                <input 
                  type="text" 
                  placeholder="Search candidate name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none w-full placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <ShieldAlert className="h-4 w-4 text-slate-450" />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="bg-transparent border-none text-slate-800 text-xs focus:outline-none w-full cursor-pointer font-semibold"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="CRITICAL">Critical Risk</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <Award className="h-4 w-4 text-slate-450" />
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="bg-transparent border-none text-slate-800 text-xs focus:outline-none w-full cursor-pointer font-semibold"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="PLATINUM">Platinum Tier</option>
                  <option value="GOLD">Gold Tier</option>
                  <option value="SILVER">Silver Tier</option>
                  <option value="BRONZE">Bronze Tier</option>
                  <option value="UNRANKED">Unranked</option>
                </select>
              </div>

              <div className="flex items-center justify-end text-xs text-slate-400 font-semibold px-2">
                <span>Showing {filteredLeaderboard.length} candidates</span>
              </div>
            </div>

            {/* Leaderboard Table Display */}
            {loadingLeaderboard || loadingApplications ? (
              <div className="py-24 text-center text-slate-500 text-sm">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
                Calculating matching telemetry...
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl m-4 p-8">
                <Users className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                <h4 className="font-bold text-slate-800 text-base">No Ranked Candidates</h4>
                <p className="text-xs text-slate-450 mt-1">Verify that applicants have completed assessments.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 text-center w-12">Compare</th>
                        <th className="py-4 px-4 text-center w-16">Rank</th>
                        <th className="py-4 px-6">Candidate</th>
                        <th className="py-4 px-6 text-center">Weighted Score</th>
                        <th className="py-4 px-6 text-center">ATS</th>
                        <th className="py-4 px-6 text-center">Simulation</th>
                        <th className="py-4 px-6 text-center">Interview</th>
                        <th className="py-4 px-6 text-center">Risk Level</th>
                        <th className="py-4 px-6 text-center">Tier</th>
                        <th className="py-4 px-6 text-center">Completeness</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredLeaderboard.map((row) => {
                        const app = applications.find((a: Application) => a.id === row.application_id);
                        const risk = app?.application_mapping?.combined_risk_level || 'LOW';
                        const isCompared = comparedAppIds.includes(row.application_id);

                        return (
                          <tr 
                            key={row.id} 
                            className={`hover:bg-slate-50/50 transition-colors font-medium ${
                              row.is_top_candidate ? 'bg-amber-50/15' : ''
                            }`}
                          >
                            <td className="py-3 px-6 text-center">
                              <button 
                                onClick={() => toggleCandidateComparison(row.application_id)}
                                className="text-slate-400 hover:text-[#0D47A1] transition-colors inline-block"
                              >
                                {isCompared ? (
                                  <span className="text-[#0D47A1]">☑</span>
                                ) : (
                                  <span className="text-slate-350">☐</span>
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center justify-center h-6 w-8 font-black rounded-lg ${
                                row.internship_rank === 1 
                                  ? 'bg-amber-100 text-amber-500 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {row.internship_rank}
                              </span>
                            </td>

                            <td className="py-3 px-6">
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                <span>{row.candidate?.full_name}</span>
                                {row.is_top_candidate && (
                                  <span className="bg-amber-55 text-amber-550 border border-amber-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                    ★ TOP
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{row.candidate?.email}</div>
                            </td>

                            <td className="py-3 px-6 text-center">
                              <span className="text-sm font-extrabold text-[#0D47A1] bg-[#0D47A1]/5 border border-[#0D47A1]/10 px-2 py-0.5 rounded-lg">
                                {row.final_score !== null ? `${row.final_score.toFixed(1)}%` : '—'}
                              </span>
                            </td>

                            <td className="py-3 px-6 text-center text-slate-700 font-semibold">
                              {row.ats_raw_score !== null ? `${row.ats_raw_score.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-3 px-6 text-center text-slate-700 font-semibold">
                              {row.simulation_raw_score !== null ? `${row.simulation_raw_score.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-3 px-6 text-center text-slate-700 font-semibold">
                              {row.interview_raw_score !== null ? `${row.interview_raw_score.toFixed(0)}%` : '—'}
                            </td>

                            <td className="py-3 px-6 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                risk === 'LOW' 
                                  ? 'bg-emerald-50 text-[#10B981] border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {risk}
                              </span>
                            </td>

                            <td className="py-3 px-6 text-center">
                              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-50 border border-blue-100 text-blue-600">
                                {row.recommendation_tier}
                              </span>
                            </td>

                            <td className="py-3 px-6 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <div className="w-10 bg-slate-100 border border-slate-200 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                                    style={{ width: `${Math.round(row.data_completeness * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-450 font-bold">{Math.round(row.data_completeness * 100)}%</span>
                              </div>
                            </td>

                            <td className="py-3 px-6 text-right whitespace-nowrap">
                              <button
                                onClick={() => { setSelectedAppId(row.application_id); setDrawerTab('overview'); }}
                                className="p-1.5 rounded-lg border border-slate-150 hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/5 text-slate-450 hover:text-[#0D47A1] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 2. COMPARE MATRIX VIEW */}
        {selectedTab === 'compare' && (
          <div className="space-y-6">
            
            {comparedAppIds.length < 2 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-20 text-center shadow-sm">
                <Award className="h-12 w-12 mx-auto text-slate-350 mb-3" />
                <h4 className="font-bold text-slate-800 text-base font-outfit">Side-by-side Comparison Matrix</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Select at least 2 check-boxes in the Leaderboard tab to construct capability DNA overlays and evaluation metrics.
                </p>
                <button
                  onClick={() => setSelectedTab('leaderboard')}
                  className="mt-6 px-4 py-2 bg-[#0D47A1] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Go to Leaderboard
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Radar Overlay Map */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 font-outfit mb-1">Capabilities DNA Overlay Map</h4>
                  <p className="text-slate-500 text-[10px]">Comparative radar mapping of candidate capability dimensions</p>
                  
                  <div className="h-80 mt-6 flex justify-center items-center">
                    {comparisonList.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={comparisonRadarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                          
                          {comparisonList.map((cand, idx) => {
                            const colors = ['#0D47A1', '#42A5F5', '#10B981', '#FFC107', '#EF4444', '#8b5cf6'];
                            const color = colors[idx % colors.length];
                            return (
                              <Radar 
                                key={cand.application_id}
                                name={cand.candidate?.full_name} 
                                dataKey={`cand_${idx}`} 
                                stroke={color} 
                                fill={color} 
                                fillOpacity={0.03} 
                              />
                            );
                          })}
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Loading overlays...</span>
                    )}
                  </div>
                </div>

                {/* Matrix Metrics Table */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-4 px-6 w-56">Comparison Metrics</th>
                          {comparisonList.map((cand) => (
                            <th key={cand.application_id} className="py-4 px-6 min-w-[200px]">
                              <div className="font-extrabold text-slate-800 flex items-center justify-between">
                                <span>{cand.candidate?.full_name}</span>
                                <button 
                                  onClick={() => toggleCandidateComparison(cand.application_id)}
                                  className="text-slate-400 hover:text-rose-500 p-0.5"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Vacancy Cohort Rank</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6 font-bold text-slate-800">
                              #{cand.internship_rank}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Weighted Index Score</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6">
                              <span className="font-extrabold text-xs text-[#0D47A1] bg-[#0D47A1]/5 px-2 py-0.5 rounded">
                                {cand.final_score?.toFixed(1)}%
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Recommendation Tier</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6 text-slate-700">
                              {cand.recommendation_tier}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Resume Match (ATS)</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6 text-slate-700">
                              {cand.ats_raw_score !== null ? `${cand.ats_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Simulation Match</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6 text-slate-700">
                              {cand.simulation_raw_score !== null ? `${cand.simulation_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Interview Rating</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6 text-slate-700">
                              {cand.interview_raw_score !== null ? `${cand.interview_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Integrity Risk Level</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold border bg-slate-50 border-slate-100 uppercase">
                                {cand.risk_level}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-bold text-slate-500">Actions</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3 px-6">
                              <button
                                onClick={() => { setSelectedAppId(cand.application_id); setDrawerTab('overview'); }}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-650 rounded hover:bg-slate-100"
                              >
                                View DNA
                              </button>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

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
            <div className="relative w-full max-w-2xl bg-white border-l border-slate-150 shadow-2xl h-screen flex flex-col z-10 text-left">
              
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
                  { key: 'dna', label: 'DNA Profile' },
                  { key: 'integrity', label: 'Integrity' },
                  { key: 'timeline', label: 'History' }
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
                            <ul className="space-y-1 text-xs text-slate-655 list-disc list-inside leading-relaxed">
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
                            <ul className="space-y-1 text-xs text-slate-655 list-disc list-inside leading-relaxed">
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

                {/* 2. DNA TAB */}
                {drawerTab === 'dna' && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">Capability DNA radar</h4>
                    
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

                {/* 3. INTEGRITY TAB */}
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

                {/* 4. TIMELINE TAB */}
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
                    onChange={(e) => changeStatusMutation.mutate({ appId: selectedAppId, status: e.target.value })}
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-150 text-slate-655 text-[10px] font-bold transition-all disabled:opacity-40"
                  >
                    {evaluateIntegrityMutation.isPending ? 'Calculating...' : 'Calibrate Trust'}
                  </button>

                  <button 
                    onClick={() => generateDNAMutation.mutate(selectedAppId)}
                    disabled={generateDNAMutation.isPending}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-150 text-slate-655 text-[10px] font-bold transition-all disabled:opacity-40"
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
