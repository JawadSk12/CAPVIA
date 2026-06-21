'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationApi, notificationApi } from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import { 
  Users, CheckCircle2, AlertTriangle, RefreshCw, FileText, Code2, 
  Video, ChevronRight, Inbox, Eye, ArrowRight, User, AlertCircle, 
  MapPin, Briefcase, Bell, Check
} from 'lucide-react';

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
  EVALUATED:                { color: 'text-emerald-450', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '⭐', label: 'Evaluated' },
  EVALUATED_LOCAL_BASELINE: { color: 'text-cyan-455', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: '⭐', label: 'Evaluated' },
  SHORTLISTED:              { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.15)]', icon: '🌟', label: 'Shortlisted!' },
  HIRED:                    { color: 'text-emerald-400', bg: 'bg-emerald-500/30', border: 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]', icon: '🎊', label: 'Hired!' },
  REJECTED:                 { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '📋', label: 'Not Selected' },
  WITHDRAWN:                { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: '↩️', label: 'Withdrawn' },
};

const STATUS_FILTER_TABS = [
  { key: 'ALL', label: 'All Applications' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'HIRED', label: 'Hired' },
  { key: 'REJECTED', label: 'Not Selected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
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
      <ApplicationsContent />
    </ProtectedRoute>
  );
}

function ApplicationsContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  // Retrieve user details from localStorage safely
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
  const { data: appsData, isLoading: loadingApps, refetch: refetchApps, error } = useQuery({
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
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background ambient radial glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-pink-500/5 via-indigo-500/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="font-extrabold text-white text-base">C</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CAPVIA PORTAL
            </h1>
            <p className="text-xs text-slate-500 font-medium">Candidate Application Workspace</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Link 
            href="/internships" 
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-650/15 transition-all hover:scale-[1.01]"
          >
            <span>Browse Internships</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
        
        {/* Left + Middle Column: Profile & Applications list (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Profile Welcome Banner */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <User className="h-36 w-36" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-650/20 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-black text-2xl shadow-lg">
                  {user?.full_name?.[0] || 'S'}
                </div>
                <div>
                  <span className="text-[9px] tracking-widest font-black text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    Student Profile
                  </span>
                  <h2 className="text-2xl font-black text-slate-100 mt-1 tracking-wide">
                    Welcome back, {user?.full_name || 'Candidate'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                </div>
              </div>
              
              {/* Cumulative stats */}
              {dashboard && (
                <div className="flex gap-3 bg-slate-950/40 border border-slate-900/60 p-3 rounded-2xl self-start md:self-auto">
                  <div className="text-center px-4 py-1 border-r border-slate-900/80">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total</span>
                    <h4 className="text-lg font-black text-slate-200 mt-0.5">{dashboard.total_applications}</h4>
                  </div>
                  <div className="text-center px-4 py-1 border-r border-slate-900/80">
                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Active</span>
                    <h4 className="text-lg font-black text-indigo-400 mt-0.5">{dashboard.active_applications}</h4>
                  </div>
                  <div className="text-center px-4 py-1">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Hired</span>
                    <h4 className="text-lg font-black text-emerald-400 mt-0.5">{dashboard.hired_count}</h4>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Applications list view */}
          <div className="space-y-4">
            
            {/* Filter Tabs & Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
                My Application Listings
              </h3>
              
              <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-900">
                {STATUS_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                      activeTab === tab.key 
                        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/10' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-xl flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-450 flex-shrink-0" />
                <span>{(error as any)?.response?.data?.error?.message || (error as any)?.message || 'Failed to load applications.'}</span>
              </div>
            )}

            {/* Application Cards List */}
            {loadingApps ? (
              <div className="py-24 text-center text-slate-500 text-xs">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-500" />
                Loading application pipeline telemetry...
              </div>
            ) : applications.length === 0 ? (
              <div className="py-24 text-center text-slate-500 text-xs border-2 border-dashed border-slate-900 rounded-3xl bg-slate-900/5">
                <Inbox className="h-10 w-10 mx-auto mb-4 text-slate-700" />
                <h4 className="font-bold text-slate-400 text-sm">No applications found</h4>
                <p className="text-slate-600 mt-1 max-w-xs mx-auto">
                  {activeTab === 'ALL' 
                    ? "You haven't submitted any internship applications yet."
                    : `No applications match the filter: "${activeTab.toLowerCase()}".`}
                </p>
                {activeTab === 'ALL' && (
                  <Link 
                    href="/internships" 
                    className="mt-6 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    Browse Listings
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {applications.map((app: AppItem) => {
                  const meta = STATUS_META[app.status] || { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: '📋', label: app.status };
                  const pct = Math.round((app.progress_step / Math.max(app.progress_total - 1, 1)) * 100);
                  const appliedDate = new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                  return (
                    <Link key={app.id} href={`/applications/${app.id}`}>
                      <div className="p-5 bg-slate-900/30 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/50 rounded-2xl transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer relative group">
                        
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          {/* Logo placeholder */}
                          <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center font-black text-indigo-400 text-lg flex-shrink-0">
                            {app.company_logo ? (
                              <img src={app.company_logo} alt="" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              app.company_name?.[0] || '?'
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-extrabold text-slate-100 text-sm tracking-wide truncate group-hover:text-indigo-400 transition-colors">
                                {app.vacancy_title}
                              </h4>
                              
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${meta.bg} ${meta.border} ${meta.color}`}>
                                <span className="mr-1">{meta.icon}</span> {meta.label}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
                              <span className="font-semibold text-slate-300">{app.company_name}</span>
                              {app.vacancy_work_mode && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{app.vacancy_work_mode}</span>
                                </>
                              )}
                              {app.vacancy_location && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-[10px] text-slate-550 flex items-center">
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
                            <div className="text-[10px] space-y-0.5 font-bold">
                              {app.ats_score != null && (
                                <div className="text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                                  ATS Matching: <span className="font-black text-xs">{app.ats_score.toFixed(0)}%</span>
                                </div>
                              )}
                              {app.simulation_score != null && (
                                <div className="text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                                  Coding Challenge: <span className="font-black text-xs">{app.simulation_score.toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Completion percent */}
                          <div className="flex flex-col items-end w-28 flex-shrink-0">
                            <div className="flex justify-between w-full text-[10px] text-slate-500 font-bold mb-1">
                              <span>Progress</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${pct}%`,
                                  background: app.status === 'REJECTED' ? '#ef4444' : app.status === 'HIRED' || app.status === 'SHORTLISTED' ? '#10b981' : '#6366f1'
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 font-medium">{appliedDate}</span>
                          </div>

                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors hidden md:block" />

                        </div>

                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-3 pt-4">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="px-3.5 py-2 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-90/40 hover:bg-slate-900 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-500 font-semibold">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-90/40 hover:bg-slate-900 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Notifications Feed (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/30 border border-slate-900 rounded-3xl p-5 backdrop-blur-md space-y-4">
          
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center">
              <Bell className="h-4 w-4 mr-2 text-slate-400" />
              Inbox alerts
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-[9px] font-black rounded-full text-white">
                  {unreadCount}
                </span>
              )}
            </h3>
            
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications feed list */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-600 text-xs italic">
                <Check className="h-6 w-6 mx-auto mb-2 text-slate-700" />
                All caught up! No unread notifications.
              </div>
            ) : (
              notifications.map((notif: any) => {
                const date = new Date(notif.created_at);
                return (
                  <div 
                    key={notif.id}
                    className="p-3 bg-slate-950/40 border border-slate-900/60 hover:border-slate-850 hover:bg-slate-900/30 rounded-xl transition-all flex justify-between items-start gap-3 relative group"
                  >
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-200 font-medium leading-relaxed">
                        {notif.content}
                      </p>
                      <span className="text-[9px] text-slate-550 block font-medium">
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      className="p-1 rounded bg-slate-900 hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 border border-slate-850 hover:border-indigo-500/30 transition-all opacity-0 group-hover:opacity-100"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
