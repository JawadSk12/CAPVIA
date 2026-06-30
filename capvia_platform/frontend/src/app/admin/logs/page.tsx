'use client';
import React, { useState } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import {
  ScrollText, User, Shield, Settings, AlertTriangle, LogIn,
  CheckCircle2, Info, ChevronDown, Search, Filter,
} from 'lucide-react';

type EventType = 'all' | 'login' | 'action' | 'system' | 'security';

interface AuditEvent {
  id: string;
  type: EventType;
  actor: string;
  actor_role: string;
  action: string;
  resource?: string;
  ip?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

const MOCK_EVENTS: AuditEvent[] = [
  { id: '1',  type: 'login',    actor: 'admin@capvia.ai',   actor_role: 'admin',  action: 'Admin logged in',                        ip: '203.128.x.x',  timestamp: '2026-06-28T09:58:12Z', severity: 'success' },
  { id: '2',  type: 'action',   actor: 'hr@techcorp.pk',    actor_role: 'hr',     action: 'Internship published',                   resource: 'Frontend Dev Intern',  timestamp: '2026-06-28T09:45:00Z', severity: 'info' },
  { id: '3',  type: 'security', actor: 'unknown',            actor_role: 'system', action: 'Failed login attempt (3×)',              ip: '41.209.x.x',   timestamp: '2026-06-28T09:30:11Z', severity: 'error' },
  { id: '4',  type: 'system',   actor: 'CAPVIA System',      actor_role: 'system', action: 'Celery worker restarted (ATS queue)',   resource: 'ats-worker-01', timestamp: '2026-06-28T09:15:00Z', severity: 'warning' },
  { id: '5',  type: 'action',   actor: 'admin@capvia.ai',   actor_role: 'admin',  action: 'User account suspended',                resource: 'user@example.com',      timestamp: '2026-06-28T09:00:00Z', severity: 'warning' },
  { id: '6',  type: 'login',    actor: 'sara@innovatepk.pk',actor_role: 'hr',     action: 'HR user logged in',                     ip: '103.20.x.x',   timestamp: '2026-06-28T08:50:00Z', severity: 'success' },
  { id: '7',  type: 'action',   actor: 'admin@capvia.ai',   actor_role: 'admin',  action: 'Company verified',                      resource: 'InnovatePK Ltd',        timestamp: '2026-06-28T08:40:00Z', severity: 'success' },
  { id: '8',  type: 'system',   actor: 'CAPVIA System',      actor_role: 'system', action: 'DNA Engine completed batch (48 profiles)', resource: 'dna-batch-28', timestamp: '2026-06-28T08:30:00Z', severity: 'info' },
  { id: '9',  type: 'action',   actor: 'hr@digitaltedge.pk',actor_role: 'hr',     action: 'Candidate hired',                       resource: 'ahmed.khan@email.com',  timestamp: '2026-06-28T08:20:00Z', severity: 'success' },
  { id: '10', type: 'security', actor: 'candidate@x.com',   actor_role: 'candidate', action: 'Integrity alert: multiple faces detected', resource: 'session-8492', timestamp: '2026-06-28T08:10:00Z', severity: 'error' },
  { id: '11', type: 'action',   actor: 'admin@capvia.ai',   actor_role: 'admin',  action: 'Platform settings updated',             resource: 'email-config',          timestamp: '2026-06-28T07:55:00Z', severity: 'info' },
  { id: '12', type: 'system',   actor: 'CAPVIA System',      actor_role: 'system', action: 'Report generated',                     resource: 'report-0492',           timestamp: '2026-06-28T07:40:00Z', severity: 'info' },
  { id: '13', type: 'login',    actor: 'candidate1@x.com',  actor_role: 'candidate', action: 'Candidate logged in',               ip: '58.65.x.x',    timestamp: '2026-06-28T07:30:00Z', severity: 'success' },
  { id: '14', type: 'system',   actor: 'CAPVIA System',      actor_role: 'system', action: 'Database backup completed',            resource: 'neon-backup-daily',     timestamp: '2026-06-28T06:00:00Z', severity: 'success' },
  { id: '15', type: 'security', actor: 'CAPVIA System',      actor_role: 'system', action: 'JWT token refresh rate spike detected', resource: 'auth-service',         timestamp: '2026-06-28T05:15:00Z', severity: 'warning' },
];

const EVENT_META = {
  login:    { icon: LogIn,         color: '#0D47A1', label: 'Login' },
  action:   { icon: User,          color: '#42A5F5', label: 'Action' },
  system:   { icon: Settings,      color: '#7C3AED', label: 'System' },
  security: { icon: Shield,        color: '#EF4444', label: 'Security' },
};

const SEV_META = {
  info:    { color: '#42A5F5', bg: '#EFF6FF',  icon: Info },
  warning: { color: '#F59E0B', bg: '#FFFBEB',  icon: AlertTriangle },
  error:   { color: '#EF4444', bg: '#FEF2F2',  icon: AlertTriangle },
  success: { color: '#10B981', bg: '#ECFDF5',  icon: CheckCircle2 },
};

export default function AdminLogsPage() {
  const [typeFilter, setType] = useState<EventType>('all');
  const [search, setSearch]   = useState('');

  const filtered = MOCK_EVENTS.filter((e) => {
    const mt = typeFilter === 'all' || e.type === typeFilter;
    const ms = !search || e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.actor.toLowerCase().includes(search.toLowerCase());
    return mt && ms;
  });

  const counts = {
    all:      MOCK_EVENTS.length,
    login:    MOCK_EVENTS.filter((e) => e.type === 'login').length,
    action:   MOCK_EVENTS.filter((e) => e.type === 'action').length,
    system:   MOCK_EVENTS.filter((e) => e.type === 'system').length,
    security: MOCK_EVENTS.filter((e) => e.type === 'security').length,
  };

  return (
    <UnifiedLayout title="Audit Logs"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Audit Logs' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform-wide activity trail · Immutable record</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
          <ScrollText className="h-3.5 w-3.5" /> Export Logs
        </button>
      </div>

      {/* Event type tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {(['all', 'login', 'action', 'system', 'security'] as EventType[]).map((t) => {
          const em = t !== 'all' ? EVENT_META[t as keyof typeof EVENT_META] : null;
          return (
            <button key={t} onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === t
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {em && <em.icon className="h-3 w-3" />}
              {t === 'all' ? 'All Events' : em?.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                typeFilter === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{counts[t]}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events or actors…"
          className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D47A1] bg-white" />
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtered.map((evt, idx) => {
          const em  = EVENT_META[evt.type as keyof typeof EVENT_META] || EVENT_META.action;

          const sm  = SEV_META[evt.severity];
          const EvtIcon = em.icon;
          const SevIcon = sm.icon;
          const dt = new Date(evt.timestamp);
          const isFirst = idx === 0 || new Date(filtered[idx - 1].timestamp).toDateString() !== dt.toDateString();

          return (
            <React.Fragment key={evt.id}>
              {isFirst && (
                <div className="flex items-center gap-3 py-2">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
              )}
              <div className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 transition-colors group">
                {/* Type icon */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${em.color}12` }}>
                  <EvtIcon className="h-3.5 w-3.5" style={{ color: em.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{evt.action}</p>
                      {evt.resource && (
                        <p className="text-[11px] text-slate-500 mt-0.5">Resource: <span className="font-semibold text-slate-700">{evt.resource}</span></p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: sm.bg, color: sm.color }}>
                        <SevIcon className="h-3 w-3" />
                        {evt.severity.charAt(0).toUpperCase() + evt.severity.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="font-semibold text-slate-600">{evt.actor}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold uppercase">{evt.actor_role}</span>
                    </span>
                    {evt.ip && <span>{evt.ip}</span>}
                    <span className="ml-auto">
                      {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold">No matching log entries found.</p>
        </div>
      )}
    </UnifiedLayout>
  );
}
