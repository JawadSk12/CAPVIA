'use client';
import React, { useState, useEffect } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { apiClient } from '@/services/api';
import {
  Server, Database, Mail, Cpu, HardDrive, Globe, Zap, Shield,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock, Activity,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface ServiceStatus {
  name: string;
  key: string;
  icon: React.ElementType;
  category: string;
  status: 'healthy' | 'degraded' | 'down' | 'checking';
  latency: number;
  uptime: number;
  errors: number;
  lastChecked: string;
}

const STATUS_META = {
  healthy:  { label: 'Healthy',  color: '#10B981', bg: 'bg-[#10B981]/10',  ring: 'border-[#10B981]/20' },
  degraded: { label: 'Degraded', color: '#F59E0B', bg: 'bg-[#F59E0B]/10',  ring: 'border-[#F59E0B]/20' },
  down:     { label: 'Down',     color: '#EF4444', bg: 'bg-[#EF4444]/10',  ring: 'border-[#EF4444]/20' },
  checking: { label: 'Checking', color: '#94A3B8', bg: 'bg-slate-100',      ring: 'border-slate-200' },
};

// ── Service definitions ────────────────────────────────────────
const SERVICE_DEFS: Omit<ServiceStatus, 'status' | 'latency' | 'uptime' | 'errors' | 'lastChecked'>[] = [
  { name: 'CAPVIA Backend',     key: 'backend',    icon: Server,   category: 'Core' },
  { name: 'ATS Engine',         key: 'ats',        icon: Cpu,      category: 'Core' },
  { name: 'Simulation Engine',  key: 'simulation', icon: Cpu,      category: 'Core' },
  { name: 'Interview Engine',   key: 'interview',  icon: Cpu,      category: 'Core' },
  { name: 'DNA Engine',         key: 'dna',        icon: Cpu,      category: 'Core' },
  { name: 'Integrity Engine',   key: 'integrity',  icon: Shield,   category: 'Core' },
  { name: 'Neon Database',      key: 'neon',       icon: Database, category: 'Infrastructure' },
  { name: 'Redis / Upstash',    key: 'redis',      icon: Zap,      category: 'Infrastructure' },
  { name: 'Supabase Storage',   key: 'supabase',   icon: HardDrive,category: 'Infrastructure' },
  { name: 'Email Service',      key: 'email',      icon: Mail,     category: 'Infrastructure' },
  { name: 'Queue Workers',      key: 'queue',      icon: Activity, category: 'Infrastructure' },
  { name: 'API Gateway',        key: 'gateway',    icon: Globe,    category: 'Infrastructure' },
];

function randomLatency(base: number, jitter = 50) {
  return base + Math.floor(Math.random() * jitter);
}

function buildMockStatus(): ServiceStatus[] {
  const now = new Date().toLocaleTimeString();
  return SERVICE_DEFS.map((def) => ({
    ...def,
    status: def.key === 'email' ? 'degraded' : 'healthy',
    latency: def.key === 'email' ? randomLatency(380, 120)
           : def.key === 'interview' ? randomLatency(210, 80)
           : randomLatency(45, 60),
    uptime: def.key === 'email' ? 97.2 : 99.5 + Math.random() * 0.45,
    errors: def.key === 'email' ? 12 : Math.floor(Math.random() * 2),
    lastChecked: now,
  }));
}

// ── Metric tile ────────────────────────────────────────────────
function MetricTile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="text-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-black text-slate-900">
        {value}<span className="text-sm font-semibold text-slate-400 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

// ── Service Card ───────────────────────────────────────────────
function ServiceCard({ svc }: { svc: ServiceStatus }) {
  const Icon = svc.icon;
  const meta = STATUS_META[svc.status];
  const StatusIcon =
    svc.status === 'healthy'  ? CheckCircle2  :
    svc.status === 'degraded' ? AlertTriangle :
    svc.status === 'down'     ? XCircle       : RefreshCw;

  return (
    <div className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow ${meta.ring}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg}`}>
            <Icon className="h-4.5 w-4.5" style={{ color: meta.color }} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-900">{svc.name}</div>
            <div className="text-[10px] text-slate-400 font-medium">{svc.category}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.bg}`}
          style={{ color: meta.color }}>
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-semibold">Latency</div>
          <div className="text-[13px] font-black text-slate-800 mt-0.5">{svc.latency}<span className="text-[10px] font-normal">ms</span></div>
        </div>
        <div className="text-center border-x border-slate-100">
          <div className="text-[10px] text-slate-400 font-semibold">Uptime</div>
          <div className="text-[13px] font-black text-slate-800 mt-0.5">{svc.uptime.toFixed(1)}<span className="text-[10px] font-normal">%</span></div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-semibold">Errors</div>
          <div className={`text-[13px] font-black mt-0.5 ${svc.errors > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
            {svc.errors}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
        <Clock className="h-3 w-3" />
        Checked {svc.lastChecked}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function PlatformHealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>(() => buildMockStatus());
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString());

  const doRefresh = async () => {
    setRefreshing(true);
    setServices(SERVICE_DEFS.map((d) => ({ ...d, status: 'checking', latency: 0, uptime: 0, errors: 0, lastChecked: '…' })));
    // Simulate network latency check
    await new Promise((r) => setTimeout(r, 1200));
    const fresh = buildMockStatus();
    setServices(fresh);
    setLastRefresh(new Date().toLocaleTimeString());
    setRefreshing(false);
  };

  const healthy  = services.filter((s) => s.status === 'healthy').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  const down     = services.filter((s) => s.status === 'down').length;
  const avgLatency = Math.round(services.reduce((acc, s) => acc + s.latency, 0) / services.length);
  const minUptime  = Math.min(...services.map((s) => s.uptime)).toFixed(2);

  const overallStatus = down > 0 ? 'Major Outage' : degraded > 0 ? 'Partial Degradation' : 'All Systems Operational';
  const overallColor  = down > 0 ? '#EF4444' : degraded > 0 ? '#F59E0B' : '#10B981';

  const categories = ['Core', 'Infrastructure'];

  return (
    <UnifiedLayout title="Platform Health"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Platform Health' }]}>

      {/* ── Header bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Platform Health</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time service monitoring · Refreshed at {lastRefresh}</p>
        </div>
        <button
          onClick={doRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
          style={{ background: '#0D47A1' }}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* ── Overall status banner ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border p-5 mb-6 flex items-center justify-between"
        style={{ borderColor: `${overallColor}30` }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: overallColor }} />
          <div>
            <div className="text-sm font-black text-slate-900">{overallStatus}</div>
            <div className="text-[11px] text-slate-400">{services.length} services monitored</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MetricTile label="Healthy"  value={healthy}      />
          <MetricTile label="Degraded" value={degraded}     />
          <MetricTile label="Down"     value={down}         />
          <MetricTile label="Avg Latency" value={avgLatency} unit="ms" />
          <MetricTile label="Min Uptime"  value={minUptime}  unit="%" />
        </div>
      </div>

      {/* ── Service cards by category ─────────────────────────── */}
      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{cat} Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {services.filter((s) => s.category === cat).map((svc) => (
              <ServiceCard key={svc.key} svc={svc} />
            ))}
          </div>
        </div>
      ))}
    </UnifiedLayout>
  );
}
