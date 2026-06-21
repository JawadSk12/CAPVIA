'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  recruitmentApi, 
  internshipApi, 
  rankingsApi, 
  dnaApi, 
  integrityApi,
  applicationApi,
  reportsApi,
  apiClient
} from '../../services/api';
import { Application, Internship } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  AreaChart, Area, Cell
} from 'recharts';
import { 
  Users, CheckCircle2, AlertTriangle, Play, RefreshCw, Search, ShieldAlert, 
  Award, FileText, Code2, Video, Check, ExternalLink, Filter, ChevronRight, 
  Download, BarChart3, HelpCircle, X, CheckSquare, Square, Info, ShieldCheck, 
  ArrowRight, User, AlertCircle, ChevronDown, CheckSquare as CheckedBox, Eye
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
  score_breakdown?: Record<string, any>;
  ranking_analytics?: Record<string, any>;
  audit_trail?: Array<{
    timestamp: string;
    actor_id?: string;
    actor_role: string;
    action: string;
    logic_version?: string;
  }>;
  candidate?: {
    full_name: string;
    email: string;
  };
  status: string;
  application?: Application;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'analytics' | 'leaderboard' | 'compare'>('leaderboard');
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [showTopOnly, setShowTopOnly] = useState<boolean>(false);
  const [comparedAppIds, setComparedAppIds] = useState<string[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  
  // Drawer Tab state for applicant details
  const [drawerTab, setDrawerTab] = useState<'dna' | 'insights' | 'audit'>('dna');

  // Load Internships List
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
  const { data: leaderboardData, isLoading: loadingLeaderboard, refetch: refetchLeaderboard, isFetching: isFetchingLeaderboard } = useQuery({
    queryKey: ['leaderboard', selectedInternshipId],
    queryFn: () => rankingsApi.getLeaderboard(selectedInternshipId),
    enabled: !!selectedInternshipId,
  });

  // Load Cohort Analytics for Selected Internship
  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics', selectedInternshipId],
    queryFn: () => rankingsApi.getAnalytics(selectedInternshipId),
    enabled: !!selectedInternshipId,
  });

  // Fetch all applications for mapping status/candidate metadata
  const { data: allApplicationsData, isLoading: loadingApplications } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });

  const applications = useMemo(() => allApplicationsData || [], [allApplicationsData]);

  // Correlate ranking rows with application/candidate details
  const leaderboardList = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return (leaderboardData.leaderboard as any[]).map((row: any) => {
      // Find candidate from applications list
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
      queryClient.invalidateQueries({ queryKey: ['analytics', selectedInternshipId] });
    }
  });

  // Fetch single candidate deep details
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

  // Action mutations inside drawer
  const recomputeRankingMutation = useMutation({
    mutationFn: (appId: string) => rankingsApi.compute(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedInternshipId] });
      queryClient.invalidateQueries({ queryKey: ['ranking-detail', selectedAppId] });
      queryClient.invalidateQueries({ queryKey: ['dna-detail', selectedAppId] });
    }
  });

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
    }
  });

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async (appId: string, candidateName: string) => {
    setIsDownloading(true);
    try {
      await reportsApi.generate(appId);
      const response = await apiClient.get(`/reports/${appId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `capvia_report_${candidateName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report PDF:', err);
      alert('Failed to generate or download report PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Filtered leaderboard list
  const filteredLeaderboard = useMemo(() => {
    return leaderboardList.filter(row => {
      const nameMatch = row.candidate?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        row.candidate?.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const statusMatch = statusFilter === 'ALL' || row.status === statusFilter;
      
      // Correlate with app mapping risk level
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

  // Aggregate stats from analytics endpoint
  const stats = useMemo(() => {
    const defaultStats = {
      cohortSize: 0,
      meanScore: 0,
      medianScore: 0,
      topScore: 0,
      bottomScore: 0,
      platinumCount: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      unrankedCount: 0,
      highRiskCount: 0,
    };

    if (!analyticsData?.analytics) return defaultStats;
    const analytics = analyticsData.analytics;
    const tierDist = analytics.tier_distribution || {};

    // Calculate high risk candidate count from matched applications
    const selectedInternshipApps = applications.filter((app: Application) => app.vacancy_id === selectedInternshipId);
    const highRiskCount = selectedInternshipApps.filter((app: Application) => app.application_mapping?.combined_risk_level === 'HIGH' || app.application_mapping?.combined_risk_level === 'CRITICAL').length;

    return {
      cohortSize: analytics.cohort_size || 0,
      meanScore: analytics.mean_score || 0,
      medianScore: analytics.median_score || 0,
      topScore: analytics.top_score || 0,
      bottomScore: analytics.bottom_score || 0,
      platinumCount: tierDist.PLATINUM || 0,
      goldCount: tierDist.GOLD || 0,
      silverCount: tierDist.SILVER || 0,
      bronzeCount: tierDist.BRONZE || 0,
      unrankedCount: tierDist.UNRANKED || 0,
      highRiskCount,
    };
  }, [analyticsData, applications, selectedInternshipId]);

  // Funnel calculations
  const funnelData = useMemo(() => {
    const selectedInternshipApps = applications.filter((app: Application) => app.vacancy_id === selectedInternshipId);
    const total = selectedInternshipApps.length;

    const stagesCount = {
      APPLIED: 0,
      ATS_COMPLETED: 0,
      SIMULATION_COMPLETED: 0,
      INTERVIEW_COMPLETED: 0,
      EVALUATED: 0,
      SHORTLISTED: 0,
      HIRED: 0,
    };

    selectedInternshipApps.forEach((app: Application) => {
      // Map candidate progress
      if (['APPLIED', 'ATS_PENDING', 'ATS_COMPLETED', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'SIMULATION_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'EVALUATED', 'EVALUATED_LOCAL_BASELINE', 'SHORTLISTED', 'REJECTED', 'HIRED'].includes(app.status)) {
        stagesCount.APPLIED++;
      }
      if (['ATS_COMPLETED', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'SIMULATION_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'EVALUATED', 'EVALUATED_LOCAL_BASELINE', 'SHORTLISTED', 'HIRED'].includes(app.status)) {
        stagesCount.ATS_COMPLETED++;
      }
      if (['SIMULATION_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'EVALUATED', 'EVALUATED_LOCAL_BASELINE', 'SHORTLISTED', 'HIRED'].includes(app.status)) {
        stagesCount.SIMULATION_COMPLETED++;
      }
      if (['INTERVIEW_COMPLETED', 'EVALUATED', 'EVALUATED_LOCAL_BASELINE', 'SHORTLISTED', 'HIRED'].includes(app.status)) {
        stagesCount.INTERVIEW_COMPLETED++;
      }
      if (['EVALUATED', 'EVALUATED_LOCAL_BASELINE', 'SHORTLISTED', 'HIRED'].includes(app.status)) {
        stagesCount.EVALUATED++;
      }
      if (['SHORTLISTED', 'HIRED'].includes(app.status)) {
        stagesCount.SHORTLISTED++;
      }
      if (app.status === 'HIRED') {
        stagesCount.HIRED++;
      }
    });

    return [
      { name: 'Applied', value: stagesCount.APPLIED, fill: '#6366f1' },
      { name: 'ATS Screened', value: stagesCount.ATS_COMPLETED, fill: '#818cf8' },
      { name: 'Simulation', value: stagesCount.SIMULATION_COMPLETED, fill: '#a855f7' },
      { name: 'Interview', value: stagesCount.INTERVIEW_COMPLETED, fill: '#ec4899' },
      { name: 'Evaluated', value: stagesCount.EVALUATED, fill: '#10b981' },
      { name: 'Shortlisted', value: stagesCount.SHORTLISTED, fill: '#059669' },
      { name: 'Hired', value: stagesCount.HIRED, fill: '#34d399' },
    ];
  }, [applications, selectedInternshipId]);

  // DNA radar chart values formatted for Recharts
  const drawerRadarData = useMemo(() => {
    if (!selectedAppDNA?.capability_dimensions) return [];
    const dims = selectedAppDNA.capability_dimensions;
    return Object.entries(dims).map(([key, val]) => ({
      subject: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      A: val as number,
      fullMark: 100,
    }));
  }, [selectedAppDNA]);

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

  // Export handlers
  const handleExportCSV = () => {
    if (filteredLeaderboard.length === 0) return;
    
    const headers = ['Rank', 'Name', 'Email', 'Final Score', 'ATS Score', 'Simulation Score', 'Interview Score', 'Integrity Trust', 'Risk Level', 'Completeness', 'Recommendation Tier'];
    const rows = filteredLeaderboard.map((row, idx) => {
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

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leaderboard_${selectedInternship?.title.replace(/\s+/g, '_') || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  const handleExportJSON = () => {
    if (filteredLeaderboard.length === 0) return;
    
    const jsonStr = JSON.stringify(filteredLeaderboard, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
    
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", `leaderboard_${selectedInternship?.title.replace(/\s+/g, '_') || 'export'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  const toggleCandidateComparison = (appId: string) => {
    setComparedAppIds(prev => {
      if (prev.includes(appId)) {
        return prev.filter(id => id !== appId);
      } else {
        if (prev.length >= 20) {
          alert('Maximum 20 applications can be compared at once.');
          return prev;
        }
        return [...prev, appId];
      }
    });
  };

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
        
        {/* Background ambient radial glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-pink-500/5 via-indigo-500/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />

        {/* Global Navigation Header */}
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="font-extrabold text-white text-base">C</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                CAPVIA RECRUITER
              </h1>
              <p className="text-xs text-slate-500 font-medium">Enterprise Candidate Assessment Suite</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Internship Selector Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 z-50">
              <Filter className="h-4 w-4 text-slate-400" />
              {loadingInternships ? (
                <span className="text-xs text-slate-400">Loading internships...</span>
              ) : (
                <select 
                  value={selectedInternshipId}
                  onChange={(e) => {
                    setSelectedInternshipId(e.target.value);
                    setComparedAppIds([]); // Clear compared candidates
                  }}
                  className="bg-transparent border-none text-slate-100 text-xs font-semibold focus:ring-0 focus:outline-none cursor-pointer pr-8"
                >
                  {internships.map((int) => (
                    <option key={int.id} value={int.id} className="bg-slate-950 text-slate-300">
                      {int.title} ({int.company_name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Recalculate cohort button */}
            <button 
              onClick={() => selectedInternshipId && rerankMutation.mutate(selectedInternshipId)} 
              disabled={rerankMutation.isPending || !selectedInternshipId}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${rerankMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{rerankMutation.isPending ? 'Reranking...' : 'Rerank Cohort'}</span>
            </button>
          </div>
        </header>

        {/* Workspace Layout */}
        <main className="max-w-[1600px] mx-auto p-6 space-y-6 relative z-10">
          
          {/* Top Tabs Bar */}
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div className="flex space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-900">
              <button
                onClick={() => setSelectedTab('leaderboard')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedTab === 'leaderboard'
                    ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => setSelectedTab('analytics')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedTab === 'analytics'
                    ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Cohort Analytics</span>
              </button>
              <button
                onClick={() => setSelectedTab('compare')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
                  selectedTab === 'compare'
                    ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Comparison</span>
                {comparedAppIds.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 px-1 bg-gradient-to-r from-pink-500 to-rose-500 border border-slate-950 text-[10px] font-black rounded-full flex items-center justify-center text-white">
                    {comparedAppIds.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {/* Show top candidates toggle */}
              <button
                onClick={() => setShowTopOnly(prev => !prev)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  showTopOnly 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className={`h-3.5 w-3.5 ${showTopOnly ? 'fill-amber-400' : ''}`} />
                <span>Top Candidates Only</span>
              </button>

              {/* Exports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(prev => !prev)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-850 text-xs font-bold transition-all text-slate-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Report</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {exportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button 
                      onClick={handleExportCSV}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-850 hover:text-white font-medium transition-colors flex items-center space-x-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span>Export as CSV</span>
                    </button>
                    <button 
                      onClick={handleExportJSON}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-850 hover:text-white font-medium transition-colors flex items-center space-x-2"
                    >
                      <Code2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>Export as JSON</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MAIN VIEWS CONTROLLER */}
          {selectedTab === 'leaderboard' && (
            <div className="space-y-6">
              
              {/* Leaderboard Filters Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/30 border border-slate-900 p-4 rounded-2xl backdrop-blur-md">
                
                {/* Search query */}
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search candidate name or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-slate-100 text-xs focus:outline-none w-full placeholder:text-slate-600"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-300 text-xs focus:outline-none w-full cursor-pointer"
                  >
                    <option value="ALL">All Stages</option>
                    <option value="APPLIED">Applied</option>
                    <option value="ATS_COMPLETED">ATS Completed</option>
                    <option value="SIMULATION_COMPLETED">Simulation Completed</option>
                    <option value="INTERVIEW_COMPLETED">Interview Completed</option>
                    <option value="EVALUATED">Evaluated</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="HIRED">Hired</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Risk Filter */}
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-300 text-xs focus:outline-none w-full cursor-pointer"
                  >
                    <option value="ALL">All Integrity Risks</option>
                    <option value="LOW">Low Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="HIGH">High Risk</option>
                    <option value="CRITICAL">Critical Risk</option>
                  </select>
                </div>

                {/* Recommendation Tier Filter */}
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2">
                  <Award className="h-4 w-4 text-slate-500" />
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-300 text-xs focus:outline-none w-full cursor-pointer"
                  >
                    <option value="ALL">All Recommendation Tiers</option>
                    <option value="PLATINUM">Platinum Tier</option>
                    <option value="GOLD">Gold Tier</option>
                    <option value="SILVER">Silver Tier</option>
                    <option value="BRONZE">Bronze Tier</option>
                    <option value="UNRANKED">Unranked</option>
                  </select>
                </div>

              </div>

              {/* Grid / Leaderboard List */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-2xl backdrop-blur-md overflow-hidden">
                {loadingLeaderboard || loadingApplications ? (
                  <div className="py-24 text-center text-slate-500 text-sm">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-500" />
                    Fetching candidate rankings & telemetry...
                  </div>
                ) : filteredLeaderboard.length === 0 ? (
                  <div className="py-24 text-center text-slate-500 text-sm border-2 border-dashed border-slate-900 rounded-2xl m-4">
                    <Users className="h-10 w-10 mx-auto mb-4 text-slate-600" />
                    No ranked candidates match your filter criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-900 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          <th className="py-4 px-6 text-center w-12">Compare</th>
                          <th className="py-4 px-4 text-center w-16">Rank</th>
                          <th className="py-4 px-6">Candidate</th>
                          <th className="py-4 px-6 text-center">Final Score</th>
                          <th className="py-4 px-6 text-center">ATS</th>
                          <th className="py-4 px-6 text-center">Coding Sim</th>
                          <th className="py-4 px-6 text-center">Interview</th>
                          <th className="py-4 px-6 text-center">Risk Level</th>
                          <th className="py-4 px-6 text-center">Tier</th>
                          <th className="py-4 px-6 text-center">Completeness</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/40 text-xs">
                        {filteredLeaderboard.map((row) => {
                          const app = applications.find((a: Application) => a.id === row.application_id);
                          const risk = app?.application_mapping?.combined_risk_level || 'LOW';
                          const isCompared = comparedAppIds.includes(row.application_id);

                          return (
                            <tr 
                              key={row.id}
                              className={`group hover:bg-slate-900/40 transition-colors ${
                                row.is_top_candidate ? 'bg-amber-500/[0.015]' : ''
                              }`}
                            >
                              {/* Checkbox select */}
                              <td className="py-3 px-6 text-center">
                                <button 
                                  onClick={() => toggleCandidateComparison(row.application_id)}
                                  className="text-slate-500 hover:text-indigo-400 transition-colors inline-block"
                                >
                                  {isCompared ? (
                                    <CheckedBox className="h-4.5 w-4.5 text-indigo-500 fill-indigo-500/20" />
                                  ) : (
                                    <Square className="h-4.5 w-4.5" />
                                  )}
                                </button>
                              </td>

                              {/* Rank badge */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center justify-center h-6 w-8 font-black rounded-lg ${
                                  row.internship_rank === 1 
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 shadow-md shadow-amber-500/5'
                                    : row.internship_rank === 2
                                    ? 'bg-slate-300/20 text-slate-300 border border-slate-300/35'
                                    : row.internship_rank === 3
                                    ? 'bg-amber-700/20 text-amber-600 border border-amber-700/35'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800/40'
                                }`}>
                                  {row.internship_rank}
                                </span>
                              </td>

                              {/* Name & Email */}
                              <td className="py-3 px-6">
                                <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                                  <span>{row.candidate?.full_name}</span>
                                  {row.is_top_candidate && (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                      <span>★</span> <span>TOP</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{row.candidate?.email}</div>
                              </td>

                              {/* Final Score */}
                              <td className="py-3 px-6 text-center">
                                <span className="text-sm font-extrabold text-indigo-400 bg-indigo-500/[0.08] border border-indigo-500/25 px-2.5 py-1 rounded-lg">
                                  {row.final_score !== null ? `${row.final_score.toFixed(1)}%` : '—'}
                                </span>
                                {row.global_percentile !== null && (
                                  <div className="text-[9px] text-slate-500 mt-1 font-semibold">
                                    {row.global_percentile.toFixed(0)}th percentile
                                  </div>
                                )}
                              </td>

                              {/* Raw scores */}
                              <td className="py-3 px-6 text-center text-slate-300 font-semibold">
                                {row.ats_raw_score !== null ? `${row.ats_raw_score.toFixed(0)}%` : '—'}
                              </td>
                              <td className="py-3 px-6 text-center text-slate-300 font-semibold">
                                {row.simulation_raw_score !== null ? `${row.simulation_raw_score.toFixed(0)}%` : '—'}
                              </td>
                              <td className="py-3 px-6 text-center text-slate-300 font-semibold">
                                {row.interview_raw_score !== null ? `${row.interview_raw_score.toFixed(0)}%` : '—'}
                              </td>

                              {/* Risk */}
                              <td className="py-3 px-6 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  risk === 'LOW' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : risk === 'MEDIUM'
                                    ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                                }`}>
                                  {risk}
                                </span>
                              </td>

                              {/* Tier */}
                              <td className="py-3 px-6 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${
                                  row.recommendation_tier === 'PLATINUM'
                                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                                    : row.recommendation_tier === 'GOLD'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : row.recommendation_tier === 'SILVER'
                                    ? 'bg-slate-300/15 text-slate-300 border-slate-300/30'
                                    : row.recommendation_tier === 'BRONZE'
                                    ? 'bg-amber-700/15 text-amber-500 border-amber-700/30'
                                    : 'bg-slate-900 text-slate-500 border-slate-800'
                                }`}>
                                  {row.recommendation_tier}
                                </span>
                              </td>

                              {/* Completeness */}
                              <td className="py-3 px-6 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <div className="w-10 bg-slate-950 border border-slate-900 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
                                      style={{ width: `${Math.round(row.data_completeness * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-bold">{Math.round(row.data_completeness * 100)}%</span>
                                </div>
                              </td>

                              {/* Action tools */}
                              <td className="py-3 px-6 text-right whitespace-nowrap">
                                <div className="flex justify-end items-center space-x-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setSelectedAppId(row.application_id)}
                                    className="p-1.5 rounded-lg border border-slate-800 hover:border-indigo-500/40 bg-slate-950 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 transition-colors"
                                    title="View DNA & Insights Profile"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => changeStatusMutation.mutate({ appId: row.application_id, status: 'SHORTLISTED' })}
                                    disabled={row.status === 'SHORTLISTED' || row.status === 'HIRED'}
                                    className="px-2 py-1 rounded-lg border border-slate-800 hover:border-emerald-500/30 bg-slate-950 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 transition-colors text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    Shortlist
                                  </button>
                                  <button
                                    onClick={() => changeStatusMutation.mutate({ appId: row.application_id, status: 'REJECTED' })}
                                    disabled={row.status === 'REJECTED'}
                                    className="px-2 py-1 rounded-lg border border-slate-800 hover:border-rose-500/30 bg-slate-950 hover:bg-rose-500/5 text-slate-400 hover:text-rose-450 transition-colors text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="space-y-6">
              
              {/* Analytics Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">Cohort Size</p>
                  <h3 className="text-3xl font-black mt-2 text-indigo-400">{stats.cohortSize}</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Ranked applicants for vacancy</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">Mean Score</p>
                  <h3 className="text-3xl font-black mt-2 text-indigo-400">{stats.meanScore.toFixed(1)}%</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Cohort average final rating</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">Median Score</p>
                  <h3 className="text-3xl font-black mt-2 text-indigo-400">{stats.medianScore.toFixed(1)}%</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">50th percentile final score</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">Top Score</p>
                  <h3 className="text-3xl font-black mt-2 text-emerald-400">{stats.topScore.toFixed(1)}%</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Cohort highest scorer rating</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">High Integrity Risk</p>
                  <h3 className={`text-3xl font-black mt-2 ${stats.highRiskCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {stats.highRiskCount}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Candidates flagged as high-risk</p>
                </div>

              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Hiring Funnel Chart */}
                <div className="lg:col-span-7 bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Recruitment Funnel Progress</h4>
                    <p className="text-[10px] text-slate-500">Applicant conversion count across pipeline benchmarks.</p>
                  </div>
                  
                  <div className="h-64 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical" margin={{ left: -10, right: 30, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={110} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                          labelStyle={{ fontWeight: 'black', color: '#94a3b8', fontSize: 11 }}
                          itemStyle={{ fontSize: 11, color: '#f1f5f9' }}
                        />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                          {funnelData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Score Recommendation Tier Distribution */}
                <div className="lg:col-span-5 bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Recommendation Tier Distribution</h4>
                    <p className="text-[10px] text-slate-500">Cohort volume allocated per candidate recommendation tier.</p>
                  </div>

                  <div className="h-64 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Platinum', value: stats.platinumCount, fill: 'url(#gradPlat)' },
                        { name: 'Gold', value: stats.goldCount, fill: 'url(#gradGold)' },
                        { name: 'Silver', value: stats.silverCount, fill: 'url(#gradSilver)' },
                        { name: 'Bronze', value: stats.bronzeCount, fill: 'url(#gradBronze)' },
                        { name: 'Unranked', value: stats.unrankedCount, fill: 'url(#gradUnranked)' },
                      ]}>
                        <defs>
                          <linearGradient id="gradPlat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="gradSilver" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#64748b" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="gradBronze" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#b45309" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#78350f" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="gradUnranked" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#475569" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#334155" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                          labelStyle={{ fontWeight: 'black', color: '#94a3b8', fontSize: 11 }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Top candidates & Risk candidates widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top Candidates list */}
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center mb-4">
                    <Award className="h-4 w-4 text-amber-400 mr-2" />
                    Top Cohort Candidates
                  </h4>
                  <div className="space-y-3">
                    {filteredLeaderboard.filter(row => row.is_top_candidate).slice(0, 5).map(row => (
                      <div 
                        key={row.id} 
                        onClick={() => setSelectedAppId(row.application_id)}
                        className="flex justify-between items-center p-3 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 cursor-pointer transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-450 border border-amber-500/25 flex items-center justify-center font-black text-xs">
                            {row.internship_rank}
                          </span>
                          <div>
                            <span className="font-bold text-slate-200 text-xs">{row.candidate?.full_name}</span>
                            <span className="text-[9px] text-slate-500 ml-2">{row.candidate?.email}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {row.final_score?.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                    {filteredLeaderboard.filter(row => row.is_top_candidate).length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-600 italic">No candidates flagged as top candidates yet.</div>
                    )}
                  </div>
                </div>

                {/* Risk candidates list */}
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center mb-4">
                    <ShieldAlert className="h-4 w-4 text-rose-400 mr-2" />
                    High Integrity Risk Applicants
                  </h4>
                  <div className="space-y-3">
                    {filteredLeaderboard.filter(row => {
                      const app = applications.find((a: Application) => a.id === row.application_id);
                      const risk = app?.application_mapping?.combined_risk_level || 'LOW';
                      return risk === 'HIGH' || risk === 'CRITICAL';
                    }).slice(0, 5).map(row => {
                      const app = applications.find((a: Application) => a.id === row.application_id);
                      const risk = app?.application_mapping?.combined_risk_level || 'LOW';
                      return (
                        <div 
                          key={row.id} 
                          onClick={() => setSelectedAppId(row.application_id)}
                          className="flex justify-between items-center p-3 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 cursor-pointer transition-all animate-pulse"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-450 border border-rose-500/25 flex items-center justify-center font-black text-xs">
                              ⚠️
                            </span>
                            <div>
                              <span className="font-bold text-slate-200 text-xs">{row.candidate?.full_name}</span>
                              <span className="text-[9px] text-slate-500 ml-2">{row.candidate?.email}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            {risk}
                          </span>
                        </div>
                      );
                    })}
                    {filteredLeaderboard.filter(row => {
                      const app = applications.find((a: Application) => a.id === row.application_id);
                      const risk = app?.application_mapping?.combined_risk_level || 'LOW';
                      return risk === 'HIGH' || risk === 'CRITICAL';
                    }).length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-600 italic">No candidates flagged as high/critical risk. Great!</div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {selectedTab === 'compare' && (
            <div className="space-y-6">
              
              {comparedAppIds.length < 2 ? (
                <div className="bg-slate-900/20 border-2 border-dashed border-slate-900 rounded-2xl p-24 text-center text-slate-500 text-sm">
                  <CheckedBox className="h-10 w-10 mx-auto mb-4 text-slate-700" />
                  <h4 className="font-bold text-slate-400 text-base">Side-by-side Candidate Comparison</h4>
                  <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                    Select at least 2 candidate check-boxes in the Leaderboard tab to construct a capabilities matrix.
                  </p>
                  <button 
                    onClick={() => setSelectedTab('leaderboard')}
                    className="mt-6 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    Go to Leaderboard
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Overlay radar chart of all compared candidates */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Capabilities DNA Overlay Map</h4>
                      <p className="text-[10px] text-slate-500">Comparative radar overview mapping capability dimension alignment.</p>
                    </div>

                    <div className="h-96 mt-6">
                      {comparisonList.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonList.length > 0 ? comparisonRadarData : []}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                            
                            {comparisonList.map((cand, idx) => {
                              const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
                              const color = colors[idx % colors.length];
                              return (
                                <Radar 
                                  key={cand.application_id}
                                  name={cand.candidate?.full_name || `Candidate ${idx+1}`} 
                                  dataKey={`cand_${idx}`} 
                                  stroke={color} 
                                  fill={color} 
                                  fillOpacity={0.05} 
                                />
                              );
                            })}
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                              itemStyle={{ fontSize: 11 }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
                          Loading comparison radar vectors...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Side-by-side comparison matrix table */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl backdrop-blur-md overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-4 px-6 w-56">Comparison Metrics</th>
                          {comparisonList.map((cand, idx) => (
                            <th key={cand.application_id} className="py-4 px-6 min-w-[200px]">
                              <div className="font-extrabold text-slate-100 flex items-center justify-between">
                                <span>{cand.candidate?.full_name}</span>
                                <button 
                                  onClick={() => toggleCandidateComparison(cand.application_id)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-500 normal-case font-medium">{cand.candidate?.email}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/40">
                        {/* Comparison Rank */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Relative Group Rank</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6">
                              <span className="inline-flex items-center justify-center h-6 w-8 bg-indigo-500/20 border border-indigo-500/30 font-black text-indigo-400 rounded-lg">
                                #{cand.comparison_rank}
                              </span>
                            </td>
                          ))}
                        </tr>
                        {/* Overall Cohort Rank */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Vacancy Cohort Rank</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6 text-slate-200 font-extrabold">
                              #{cand.internship_rank}
                            </td>
                          ))}
                        </tr>
                        {/* Final Score */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Overall Weighted Score</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6">
                              <span className="font-extrabold text-sm text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded">
                                {cand.final_score?.toFixed(1)}%
                              </span>
                            </td>
                          ))}
                        </tr>
                        {/* Recommendation Tier */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Recommendation Tier</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                                {cand.recommendation_tier}
                              </span>
                            </td>
                          ))}
                        </tr>
                        {/* Candidate Level */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Inferred Capability Level</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6 font-bold text-purple-400">
                              {cand.candidate_level}
                            </td>
                          ))}
                        </tr>
                        {/* ATS Score */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">ATS Resume Parser</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6 text-slate-350 font-semibold">
                              {cand.ats_raw_score !== null ? `${cand.ats_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        {/* Simulation Score */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Interactive Coding Challenge</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6 text-slate-350 font-semibold">
                              {cand.simulation_raw_score !== null ? `${cand.simulation_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        {/* Interview Score */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Video Speech Evaluation</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6 text-slate-350 font-semibold">
                              {cand.interview_raw_score !== null ? `${cand.interview_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        {/* Integrity Score */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Integrity Trust Index</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6 text-slate-350 font-semibold">
                              {cand.integrity_raw_score !== null ? `${cand.integrity_raw_score.toFixed(0)}%` : '—'}
                            </td>
                          ))}
                        </tr>
                        {/* Risk Level */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-3.5 px-6 font-bold text-slate-400">Proctoring Risk Level</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-3.5 px-6">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                cand.risk_level === 'LOW' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {cand.risk_level}
                              </span>
                            </td>
                          ))}
                        </tr>
                        {/* Actions */}
                        <tr className="hover:bg-slate-900/20">
                          <td className="py-4 px-6 font-bold text-slate-400">Candidate Recruitment Actions</td>
                          {comparisonList.map(cand => (
                            <td key={cand.application_id} className="py-4 px-6">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => changeStatusMutation.mutate({ appId: cand.application_id, status: 'SHORTLISTED' })}
                                  disabled={cand.status === 'SHORTLISTED'}
                                  className="px-2.5 py-1 rounded bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  Shortlist
                                </button>
                                <button
                                  onClick={() => setSelectedAppId(cand.application_id)}
                                  className="px-2 py-1 rounded border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-white font-bold text-[10px] transition-colors"
                                >
                                  View DNA
                                </button>
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

        </main>

        {/* SIDE DRAWER FOR DETAILED APPLICANT PROFILE */}
        {selectedAppId && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            
            {/* Overlay backdrop */}
            <div 
              onClick={() => setSelectedAppId(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
            />

            {/* Drawer panel */}
            <div className="relative w-full max-w-2xl bg-slate-950/95 border-l border-slate-900 shadow-2xl h-screen flex flex-col z-10 animate-slide-in">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-900 bg-slate-950/50 backdrop-blur-md flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] tracking-widest font-black text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                      Applicant Intelligence
                    </span>
                    {selectedAppRanking?.is_top_candidate && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                        Top Candidate
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black mt-2 tracking-wide text-slate-100">
                    {selectedAppDetail?.candidate?.full_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedAppDetail?.candidate?.email}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setSelectedAppId(null)}
                    className="p-1.5 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Tabs Navigation */}
              <div className="flex border-b border-slate-900 bg-slate-950 px-6 py-1.5 space-x-4">
                <button
                  onClick={() => setDrawerTab('dna')}
                  className={`py-2 text-xs font-bold transition-all relative ${
                    drawerTab === 'dna' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Capabilities DNA
                  {drawerTab === 'dna' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </button>
                <button
                  onClick={() => setDrawerTab('insights')}
                  className={`py-2 text-xs font-bold transition-all relative ${
                    drawerTab === 'insights' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Phase Insights
                  {drawerTab === 'insights' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </button>
                <button
                  onClick={() => setDrawerTab('audit')}
                  className={`py-2 text-xs font-bold transition-all relative ${
                    drawerTab === 'audit' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Trust & Audit Trail
                  {drawerTab === 'audit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </button>
              </div>

              {/* Drawer Content Area (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 z-0">
                
                {drawerTab === 'dna' && (
                  <div className="space-y-6">
                    
                    {/* Radar Chart Visual */}
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 flex flex-col items-center">
                      <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-wider self-start mb-4">Capability Profile Radar</h4>
                      <div className="w-full h-64 flex justify-center items-center">
                        {drawerRadarData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={drawerRadarData}>
                              <PolarGrid stroke="#1e293b" />
                              <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" fontSize={8} />
                              <Radar name="Dimensions" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.12} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                                itemStyle={{ fontSize: 11 }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center text-slate-500 text-xs italic">
                            No DNA profile loaded. Click "Generate DNA" below to evaluate capability vectors.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DNA Profile Level Summary & Strengths */}
                    {selectedAppDNA && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
                          <span className="text-[9px] font-black text-emerald-400 tracking-wider uppercase">Capability Level</span>
                          <h4 className="text-xl font-black text-slate-100 mt-1">{selectedAppDNA.candidate_level || 'N/A'}</h4>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                            Overall level inferred across Problem Solving, Adaptability, Consistency, and Leadership benchmarks.
                          </p>
                        </div>
                        <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
                          <span className="text-[9px] font-black text-indigo-400 tracking-wider uppercase">Weighted Final Score</span>
                          <h4 className="text-xl font-black text-indigo-400 mt-1">{selectedAppRanking?.final_score?.toFixed(1) || '—'}%</h4>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                            Formulated with: ATS (25%) + Sim (30%) + Interview (25%) + Integrity (20%) weights.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Explainability Breakdown (Strengths & Risks) */}
                    {selectedAppRanking?.explainability && (
                      <div className="space-y-4">
                        
                        {/* Strengths */}
                        {selectedAppRanking.explainability.strengths && selectedAppRanking.explainability.strengths.length > 0 && (
                          <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-2xl">
                            <h5 className="font-bold text-xs text-emerald-400 flex items-center mb-2">
                              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Key Strengths
                            </h5>
                            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside leading-relaxed">
                              {selectedAppRanking.explainability.strengths.map((str: string, i: number) => (
                                <li key={i}>{str}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Risk Signals */}
                        {selectedAppRanking.explainability.risk_signals && selectedAppRanking.explainability.risk_signals.length > 0 && (
                          <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-2xl">
                            <h5 className="font-bold text-xs text-rose-400 flex items-center mb-2">
                              <AlertTriangle className="h-4 w-4 mr-1.5" /> Risk Signals & Flags
                            </h5>
                            <ul className="space-y-1.5 text-[11px] text-slate-350 list-disc list-inside leading-relaxed">
                              {selectedAppRanking.explainability.risk_signals.map((risk: string, i: number) => (
                                <li key={i}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Absent phase warnings */}
                        {selectedAppRanking.explainability.absent_phase_warnings && selectedAppRanking.explainability.absent_phase_warnings.length > 0 && (
                          <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-2xl">
                            <h5 className="font-bold text-xs text-amber-400 flex items-center mb-2">
                              <AlertCircle className="h-4 w-4 mr-1.5" /> Incomplete Stage Warnings
                            </h5>
                            <ul className="space-y-1.5 text-[11px] text-slate-350 list-disc list-inside leading-relaxed">
                              {selectedAppRanking.explainability.absent_phase_warnings.map((warn: string, i: number) => (
                                <li key={i}>{warn}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}

                {drawerTab === 'insights' && (
                  <div className="space-y-6">
                    
                    {/* Phase 1: ATS Insights */}
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center">
                          <FileText className="h-4 w-4 mr-1.5 text-indigo-400" />
                          1. ATS Resume Analyzer
                        </h4>
                        {selectedAppDetail?.ats_score !== undefined ? (
                          <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded">
                            ATS Score: {selectedAppDetail.ats_score}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-650 font-bold">UNRUN</span>
                        )}
                      </div>

                      {selectedAppDetail?.ats_result ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-400">
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <div>Score Band: <strong className="text-slate-200 font-bold">{selectedAppDetail.ats_result.score_band}</strong></div>
                            <div>Role Matches: <strong className="text-slate-200 font-semibold">{selectedAppDetail.ats_result.detected_role || 'N/A'}</strong></div>
                            <div>Fraud Probability: <strong className="text-slate-200 font-semibold">{Math.round(selectedAppDetail.ats_result.fraud_probability * 100)}%</strong></div>
                          </div>
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-2">
                            <div>Matched Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedAppDetail.ats_result.matched_skills?.map((s: string) => (
                                <span key={s} className="bg-slate-900 border border-slate-800 text-[9px] text-slate-350 px-1.5 py-0.5 rounded">
                                  {s}
                                </span>
                              )) || <span className="text-slate-600 italic">None matched</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-650 italic">No ATS details available.</div>
                      )}
                    </div>

                    {/* Phase 2: Simulation Insights */}
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center">
                          <Code2 className="h-4 w-4 mr-1.5 text-purple-400" />
                          2. Interactive Coding Challenge
                        </h4>
                        {selectedAppDetail?.simulation_score !== undefined ? (
                          <span className="text-xs font-black text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded">
                            Sim Score: {selectedAppDetail.simulation_score}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-650 font-bold">UNRUN</span>
                        )}
                      </div>

                      {selectedAppDetail?.simulation_result ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-400">
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <div>Recommendation: <strong className="text-slate-200 uppercase font-extrabold">{selectedAppDetail.simulation_result.recommendation}</strong></div>
                            <div>Attempt ID: <strong className="text-slate-200 font-mono font-medium">#{selectedAppDetail.simulation_result.attempt_id}</strong></div>
                          </div>
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <div>Cheating Risk: <strong className="text-slate-200 font-bold">{selectedAppDetail.simulation_result.cheating_risk_level}</strong></div>
                            <div>AI Dependency: <strong className="text-slate-200 font-bold">{Math.round(selectedAppDetail.simulation_result.ai_dependency_score * 100)}%</strong></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-650 italic">No Interactive Simulation details available.</div>
                      )}
                    </div>

                    {/* Phase 3: Interview Insights */}
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center">
                          <Video className="h-4 w-4 mr-1.5 text-pink-400" />
                          3. Speech Kiosk Evaluation
                        </h4>
                        {selectedAppDetail?.interview_score !== undefined ? (
                          <span className="text-xs font-black text-pink-400 bg-pink-500/10 border border-pink-500/25 px-2 py-0.5 rounded">
                            IV Score: {selectedAppDetail.interview_score}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-650 font-bold">UNRUN</span>
                        )}
                      </div>

                      {selectedAppDetail?.interview_result ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-400">
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <div>Overall Rating: <strong className="text-slate-200 font-bold">{selectedAppDetail.interview_result.recommendation}</strong></div>
                            <div>Cheating Prob: <strong className="text-slate-200 font-bold">{selectedAppDetail.interview_result.cheating_probability_pct}%</strong></div>
                            {selectedAppDetail.interview_result.video_url && (
                              <div>
                                Recording: {' '}
                                <a 
                                  href={selectedAppDetail.interview_result.video_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:underline inline-flex items-center"
                                >
                                  Download Video <ExternalLink className="h-3 w-3 ml-0.5" />
                                </a>
                              </div>
                            )}
                          </div>
                          
                          {/* Proctoring telemetry counts */}
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <span className="text-[9px] uppercase font-black text-slate-500">Proctoring Telemetry</span>
                            <div className="grid grid-cols-2 gap-1 text-[10px] mt-1 text-slate-350">
                              <div>Look aways: <span className="text-slate-100 font-bold">{selectedAppIntegrity?.look_away_count || 0}</span></div>
                              <div>Tab switches: <span className="text-slate-100 font-bold">{selectedAppIntegrity?.tab_switches || 0}</span></div>
                              <div>Copy pastes: <span className="text-slate-100 font-bold">{selectedAppIntegrity?.copy_pastes || 0}</span></div>
                              <div>Phones: <span className="text-slate-100 font-bold">{selectedAppIntegrity?.phone_detections_count || 0}</span></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-650 italic">No Speech Evaluation details available.</div>
                      )}
                    </div>

                  </div>
                )}

                {drawerTab === 'audit' && (
                  <div className="space-y-6">
                    
                    {/* Integrity breakdown */}
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-400" />
                        Behavioral Integrity Assessment
                      </h4>
                      {selectedAppIntegrity ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-400">
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <div>Trust Index: <strong className="text-slate-200 font-black text-xs">{selectedAppIntegrity.trust_index || 0}/100</strong></div>
                            <div>Risk Level: <strong className="text-slate-200 font-bold uppercase">{selectedAppIntegrity.risk_level || 'LOW'}</strong></div>
                          </div>
                          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 space-y-1.5">
                            <div>Completeness Confidence: <strong className="text-slate-200 font-bold">{Math.round((selectedAppIntegrity.confidence_level || 0) * 100)}%</strong></div>
                            <div>AI Dependency Score: <strong className="text-slate-200 font-bold">{Math.round((selectedAppIntegrity.ai_dependency_score || 0) * 100)}%</strong></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-650 italic">No integrity audit available.</div>
                      )}
                    </div>

                    {/* Rankings Audit trail */}
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center">
                        <Info className="h-4 w-4 mr-1.5 text-indigo-400" />
                        Scoring Computation History
                      </h4>
                      
                      <div className="space-y-3">
                        {selectedAppRanking?.audit_trail && selectedAppRanking.audit_trail.length > 0 ? (
                          (selectedAppRanking.audit_trail as any[]).map((evt: any, i: number) => {
                            const date = new Date(evt.timestamp);
                            return (
                              <div key={i} className="flex justify-between items-start bg-slate-950/50 p-3 rounded-xl border border-slate-900/60 text-[10px] leading-relaxed">
                                <div>
                                  <div className="font-bold text-slate-200 text-xs">{evt.action || 'Evaluated'}</div>
                                  <div className="text-slate-500 mt-0.5">
                                    Actor: <span className="text-slate-400 font-semibold">{evt.actor_role}</span> 
                                    {evt.logic_version && ` · Version: ${evt.logic_version}`}
                                  </div>
                                </div>
                                <span className="text-slate-500 font-medium whitespace-nowrap">
                                  {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6 text-xs text-slate-650 italic">No computation history available.</div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Drawer footer with admin override controls */}
              <div className="p-6 border-t border-slate-900 bg-slate-950/50 backdrop-blur-md flex flex-wrap gap-3 items-center justify-between">
                
                {/* Change status controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-500">Recruit Stage:</span>
                  <select
                    value={selectedAppDetail?.status || 'EVALUATED'}
                    onChange={(e) => changeStatusMutation.mutate({ appId: selectedAppId, status: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-[11px] font-bold px-2 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="APPLIED">Applied</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="HIRED">Hired</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Compute controls */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => evaluateIntegrityMutation.mutate(selectedAppId)}
                    disabled={evaluateIntegrityMutation.isPending}
                    className="px-3 py-2 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold transition-all disabled:opacity-40"
                    title="Recalculate proctoring trust and AI dependency"
                  >
                    {evaluateIntegrityMutation.isPending ? 'Calculating...' : 'Calibrate Trust'}
                  </button>

                  <button 
                    onClick={() => generateDNAMutation.mutate(selectedAppId)}
                    disabled={generateDNAMutation.isPending}
                    className="px-3 py-2 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold transition-all disabled:opacity-40"
                    title="Extract capability dimensions & radar maps"
                  >
                    {generateDNAMutation.isPending ? 'Extracting...' : 'Generate DNA'}
                  </button>

                  <button 
                    onClick={() => handleDownloadReport(selectedAppId, selectedAppDetail?.candidate?.full_name || 'candidate')}
                    disabled={isDownloading}
                    className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-650 hover:bg-emerald-600 text-white text-[10px] font-black tracking-wide shadow-md shadow-emerald-600/10 transition-all disabled:opacity-40 hover:scale-[1.01]"
                    title="Generate and download recruiter PDF report"
                  >
                    {isDownloading ? 'Downloading...' : 'Download PDF Report'}
                  </button>

                  <button 
                    onClick={() => recomputeRankingMutation.mutate(selectedAppId)}
                    disabled={recomputeRankingMutation.isPending}
                    className="px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-black tracking-wide shadow-md shadow-indigo-600/10 transition-all disabled:opacity-40 hover:scale-[1.01]"
                    title="Trigger weighted scoring & ranking"
                  >
                    {recomputeRankingMutation.isPending ? 'Computing...' : 'Recalculate Rank'}
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
