'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationApi, notificationApi } from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { 
  CheckCircle2, AlertTriangle, RefreshCw, FileText, Code2, 
  Video, ChevronRight, Inbox, Eye, ArrowRight, User, AlertCircle, 
  MapPin, Briefcase, Bell, Check, TrendingUp, Sparkles, X, Award
} from 'lucide-react';

const STATUS_META: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  APPLIED:                  { color: 'text-blue-700', bg: 'bg-blue-50/80', border: 'border-blue-100', icon: '📨', label: 'Applied' },
  ATS_PENDING:              { color: 'text-purple-700', bg: 'bg-purple-50/80', border: 'border-purple-100', icon: '🤖', label: 'Resume Review' },
  ATS_COMPLETED:            { color: 'text-indigo-700', bg: 'bg-indigo-50/80', border: 'border-indigo-100', icon: '✅', label: 'Resume Screened' },
  SIMULATION_INVITED:       { color: 'text-pink-700', bg: 'bg-pink-50/80', border: 'border-pink-100', icon: '📩', label: 'Simulation Invited' },
  SIMULATION_IN_PROGRESS:   { color: 'text-amber-700', bg: 'bg-amber-50/80', border: 'border-amber-100 animate-pulse', icon: '🎯', label: 'Simulation Active' },
  SIMULATION_COMPLETED:     { color: 'text-teal-700', bg: 'bg-teal-50/80', border: 'border-teal-100', icon: '🎯', label: 'Simulation Done' },
  INTERVIEW_INVITED:        { color: 'text-orange-700', bg: 'bg-orange-50/80', border: 'border-orange-100', icon: '📩', label: 'Interview Invited' },
  INTERVIEW_IN_PROGRESS:    { color: 'text-amber-700', bg: 'bg-amber-50/80', border: 'border-amber-100 animate-pulse', icon: '🎤', label: 'Interview Active' },
  INTERVIEW_COMPLETED:      { color: 'text-green-700', bg: 'bg-green-50/80', border: 'border-green-100', icon: '🎤', label: 'Interview Done' },
  EVALUATED:                { color: 'text-emerald-700', bg: 'bg-emerald-50/80', border: 'border-emerald-100', icon: '⭐', label: 'Evaluated' },
  EVALUATED_LOCAL_BASELINE: { color: 'text-cyan-700', bg: 'bg-cyan-50/80', border: 'border-cyan-100', icon: '⭐', label: 'Evaluated' },
  SHORTLISTED:              { color: 'text-purple-750', bg: 'bg-purple-50/80', border: 'border-purple-100', icon: '🌟', label: 'Shortlisted' },
  HIRED:                    { color: 'text-emerald-700', bg: 'bg-emerald-50/80', border: 'border-emerald-100', icon: '🎊', label: 'Hired!' },
  REJECTED:                 { color: 'text-rose-700', bg: 'bg-rose-50/80', border: 'border-rose-100', icon: '📋', label: 'Closed' },
  WITHDRAWN:                { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', icon: '↩️', label: 'Withdrawn' },
};

const STATUS_FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'HIRED', label: 'Hired' },
  { key: 'REJECTED', label: 'Closed' },
];

interface AppItem {
  id: string;
  vacancy_title: string;
  company_name: string;
  company_logo?: string;
  status: string;
  ats_score?: number;
  simulation_score?: number;
  created_at: string;
  progress_step: number;
  progress_total: number;
  vacancy_work_mode?: string;
  vacancy_location?: string;
}

export default function ApplicationsPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'admin']}>
      <UnifiedLayout title="Applications Tracker">
        <ApplicationsContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function ApplicationsContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  // Retrieve user details safely
  const user = useMemo(() => {
    if (typeof window !== 'undefined') {
      const uStr = localStorage.getItem('capvia_user');
      if (uStr) {
        try {
          return JSON.parse(uStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }, []);

  // Fetch dashboard stats
  const { data: dashboard } = useQuery({
    queryKey: ['applications-dashboard'],
    queryFn: () => applicationApi.getDashboard(),
  });

  // Fetch applications list
  const { data: appsData, isLoading: loadingApps, error } = useQuery({
    queryKey: ['my-applications', page, activeTab],
    queryFn: () => applicationApi.getMyApplications({ 
      page, 
      per_page: PER_PAGE, 
      status: activeTab === 'ALL' ? undefined : activeTab 
    }),
  });

  const applications = useMemo(() => appsData?.applications || [], [appsData]);
  const totalApplicationsCount = useMemo(() => appsData?.total || 0, [appsData]);
  const totalPages = Math.ceil(totalApplicationsCount / PER_PAGE);

  // Fetch unread notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list({ unread_only: true }),
  });

  const notifications = useMemo(() => notificationsData?.notifications || [], [notificationsData]);
  const unreadCount = useMemo(() => notificationsData?.unread_count || 0, [notificationsData]);

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all notifications read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      
      {/* Overview Stats Summary */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Applications</p>
              <h4 className="text-3xl font-bold text-slate-800 tracking-tight font-outfit mt-1">{dashboard.total_applications}</h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Pipelines</p>
              <h4 className="text-3xl font-bold text-[#0D47A1] tracking-tight font-outfit mt-1">{dashboard.active_applications}</h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offers Received</p>
              <h4 className="text-3xl font-bold text-emerald-600 tracking-tight font-outfit mt-1">{dashboard.hired_count}</h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left + Middle Column: Applications list (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Filter Tabs & Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-outfit tracking-tight flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-[#0D47A1]" />
                  Active Pipelines
                </h3>
                <p className="text-xs text-slate-400 mt-1">Review the status and score criteria of your job filings.</p>
              </div>
              
              <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                {STATUS_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      activeTab === tab.key 
                        ? 'bg-[#0D47A1] text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-4 rounded-xl flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{(error as any)?.response?.data?.error?.message || (error as any)?.message || 'Failed to load applications.'}</span>
              </div>
            )}

            {/* Application Cards List */}
            {loadingApps ? (
              <div className="py-24 text-center text-slate-400 text-xs font-medium">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
                Loading application pipeline telemetry...
              </div>
            ) : applications.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 rounded-[20px] bg-slate-50/50 p-8">
                <Inbox className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                <h4 className="font-bold text-slate-700 text-sm">No applications found</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                  {activeTab === 'ALL' 
                    ? "You haven't submitted any internship applications yet."
                    : `No applications match the filter: "${activeTab.toLowerCase()}".`}
                </p>
                {activeTab === 'ALL' && (
                  <Link 
                    href="/internships" 
                    className="mt-6 inline-flex items-center space-x-1 px-4 py-2 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Browse Listings
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {applications.map((app: AppItem) => {
                  const meta = STATUS_META[app.status] || { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', icon: '📋', label: app.status };
                  const pct = Math.round((app.progress_step / Math.max(app.progress_total - 1, 1)) * 100);
                  const appliedDate = new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                  return (
                    <Link key={app.id} href={`/applications/${app.id}`}>
                      <div className="p-5 border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/30 rounded-2xl transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer relative group">
                        
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          {/* Logo placeholder */}
                          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-[#0D47A1] text-lg flex-shrink-0 overflow-hidden">
                            {app.company_logo ? (
                              <img src={app.company_logo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              app.company_name?.[0] || '?'
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-[#0D47A1] transition-colors font-outfit">
                                {app.vacancy_title}
                              </h4>
                              
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${meta.bg} ${meta.border} ${meta.color}`}>
                                <span className="mr-1">{meta.icon}</span> {meta.label}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 font-medium">
                              <span className="font-semibold text-slate-500">{app.company_name}</span>
                              {app.vacancy_work_mode && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{app.vacancy_work_mode}</span>
                                </>
                              )}
                              {app.vacancy_location && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[10px] text-slate-400 flex items-center">
                                    <MapPin className="h-3 w-3 mr-0.5" /> {app.vacancy_location}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Progress Stepper and Scores */}
                        <div className="flex items-center md:items-end justify-between md:justify-start gap-6 md:text-right">
                          
                          {/* Scores summary */}
                          {(app.ats_score != null || app.simulation_score != null) && (
                            <div className="text-[10px] space-y-1 font-bold">
                              {app.ats_score != null && (
                                <div className="text-blue-700 bg-blue-50/50 px-2.5 py-0.5 rounded border border-blue-100">
                                  ATS Fit: <span className="font-black text-xs">{app.ats_score.toFixed(0)}%</span>
                                </div>
                              )}
                              {app.simulation_score != null && (
                                <div className="text-indigo-750 bg-indigo-50/50 px-2.5 py-0.5 rounded border border-indigo-105">
                                  Challenge: <span className="font-black text-xs">{app.simulation_score.toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Completion percent */}
                          <div className="flex flex-col items-end w-28 flex-shrink-0">
                            <div className="flex justify-between w-full text-[10px] text-slate-400 font-bold mb-1">
                              <span>Progress</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${pct}%`,
                                  background: app.status === 'REJECTED' ? '#ef4444' : app.status === 'HIRED' || app.status === 'SHORTLISTED' ? '#10b981' : '#0D47A1'
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 font-medium">{appliedDate}</span>
                          </div>

                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D47A1] transition-colors hidden md:block" />

                        </div>

                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-400 font-bold">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Notifications Feed (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center">
              <Bell className="h-4 w-4 mr-2 text-[#0D47A1]" />
              Inbox Alerts
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-[10px] font-bold rounded-full text-white">
                  {unreadCount}
                </span>
              )}
            </h3>
            
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-[#0D47A1] hover:text-[#0b3c8a] font-bold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications feed list */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic flex flex-col items-center justify-center gap-2">
                <Check className="h-8 w-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-full" />
                <span>All caught up! No unread notifications.</span>
              </div>
            ) : (
              notifications.map((notif: any) => {
                const date = new Date(notif.created_at);
                return (
                  <div 
                    key={notif.id}
                    className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all flex justify-between items-start gap-3 relative group"
                  >
                    <div className="space-y-1">
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {notif.content}
                      </p>
                      <span className="text-[9px] text-slate-400 block font-semibold">
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      className="p-1 rounded bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
