'use client';
import React, { useState } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import {
  Bell, AlertTriangle, CheckCircle2, Info, XCircle, X,
  Zap, Server, Shield, Database,
} from 'lucide-react';

type NotifType = 'all' | 'error' | 'warning' | 'info' | 'success';

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  body: string;
  source: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFS: Notification[] = [
  { id: '1', type: 'error',   title: 'Email service degraded',           body: 'Resend API returning 503s. Verification emails may be delayed. ETA: 15 mins.', source: 'Infrastructure', timestamp: '2026-06-28T09:55:00Z', read: false },
  { id: '2', type: 'warning', title: 'High queue depth on ATS worker',   body: 'ATS Celery queue has 42 pending jobs. Consider scaling workers.', source: 'Engine Monitor', timestamp: '2026-06-28T09:30:00Z', read: false },
  { id: '3', type: 'success', title: 'Database backup completed',         body: 'Daily Neon PostgreSQL backup finished in 2m 14s with no errors.', source: 'Database', timestamp: '2026-06-28T06:00:00Z', read: true },
  { id: '4', type: 'info',    title: 'New company registration',          body: 'TechVision Inc. registered and awaiting verification.', source: 'Pipeline', timestamp: '2026-06-28T08:40:00Z', read: false },
  { id: '5', type: 'warning', title: 'Unusual login activity',            body: '3 failed login attempts from IP 41.209.x.x in the last 10 minutes.', source: 'Security', timestamp: '2026-06-28T08:10:00Z', read: true },
  { id: '6', type: 'success', title: 'DNA engine batch completed',         body: '48 candidate DNA profiles generated for Q2 cohort. Average score: 72/100.', source: 'Engine Monitor', timestamp: '2026-06-28T07:30:00Z', read: true },
  { id: '7', type: 'info',    title: 'Platform traffic spike',            body: 'DAU increased 34% today. Monitor resource usage closely.', source: 'Analytics', timestamp: '2026-06-28T07:00:00Z', read: true },
  { id: '8', type: 'error',   title: 'Interview session error',           body: 'Session #8492 failed during whisper transcription. Candidate notified.', source: 'Engine Monitor', timestamp: '2026-06-28T06:45:00Z', read: false },
  { id: '9', type: 'info',    title: 'Supabase storage usage',            body: 'Storage at 68% capacity (6.8GB / 10GB). Consider upgrading plan.', source: 'Infrastructure', timestamp: '2026-06-28T05:00:00Z', read: true },
];

const TYPE_META = {
  error:   { icon: XCircle,     color: '#EF4444', bg: '#FEF2F2', label: 'Error' },
  warning: { icon: AlertTriangle,color: '#F59E0B', bg: '#FFFBEB', label: 'Warning' },
  info:    { icon: Info,         color: '#42A5F5', bg: '#EFF6FF', label: 'Info' },
  success: { icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5', label: 'Update' },
};

export default function AdminNotificationsPage() {
  const [filter, setFilter] = useState<NotifType>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = MOCK_NOTIFS.filter((n) => !dismissed.has(n.id));
  const filtered = visible.filter((n) => filter === 'all' || n.type === filter);

  const unread = visible.filter((n) => !n.read).length;

  const counts: Record<NotifType, number> = {
    all:     visible.length,
    error:   visible.filter((n) => n.type === 'error').length,
    warning: visible.filter((n) => n.type === 'warning').length,
    info:    visible.filter((n) => n.type === 'info').length,
    success: visible.filter((n) => n.type === 'success').length,
  };

  return (
    <UnifiedLayout title="Notifications"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Notifications' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">System Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unread > 0
              ? <span className="font-bold text-[#EF4444]">{unread} unread alerts requiring attention</span>
              : 'All alerts reviewed'}
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {(['all', 'error', 'warning', 'info', 'success'] as NotifType[]).map((t) => {
          const tm = t !== 'all' ? TYPE_META[t] : null;
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === t
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {tm && <tm.icon className="h-3 w-3" />}
              {t === 'all' ? 'All' : tm?.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                filter === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{counts[t]}</span>
            </button>
          );
        })}
      </div>

      {/* Notification cards */}
      <div className="space-y-3">
        {filtered.map((notif) => {
          const tm = TYPE_META[notif.type];
          const Icon = tm.icon;
          const dt = new Date(notif.timestamp);
          return (
            <div key={notif.id}
              className={`bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                notif.read ? 'border-slate-200' : 'border-l-4'
              }`}
              style={notif.read ? {} : { borderLeftColor: tm.color }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tm.bg }}>
                  <Icon className="h-4 w-4" style={{ color: tm.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-bold text-slate-900">{notif.title}</h4>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{notif.body}</p>
                    </div>
                    <button onClick={() => setDismissed((prev) => new Set([...Array.from(prev), notif.id]))}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-all flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: tm.bg, color: tm.color }}>{notif.source}</span>
                    <span className="text-[10px] text-slate-400">
                      {dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">No notifications in this category.</p>
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}
