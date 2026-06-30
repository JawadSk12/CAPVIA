'use client';
import React, { useState } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import {
  Cpu, Activity, Clock, AlertTriangle, CheckCircle2, RefreshCw,
  BarChart2, Zap, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface EngineStats {
  name: string;
  key: string;
  color: string;
  processed: number;
  queued: number;
  errors: number;
  avgMs: number;
  p99Ms: number;
  lastRun: string;
  status: 'healthy' | 'busy' | 'error';
  description: string;
}

const ENGINES: EngineStats[] = [
  {
    name: 'ATS Resume Engine', key: 'ats', color: '#42A5F5',
    processed: 1842, queued: 4,  errors: 7,  avgMs: 1840, p99Ms: 4200,
    lastRun: '12 seconds ago', status: 'healthy',
    description: 'NLP-based resume parser & JD keyword matcher using spaCy + TF-IDF',
  },
  {
    name: 'Simulation Engine', key: 'simulation', color: '#7C3AED',
    processed: 1104, queued: 2,  errors: 3,  avgMs: 3200, p99Ms: 8100,
    lastRun: '1 minute ago', status: 'healthy',
    description: 'Code execution sandbox with language-agnostic challenge evaluation',
  },
  {
    name: 'AI Interview Engine', key: 'interview', color: '#0D47A1',
    processed: 892,  queued: 1,  errors: 2,  avgMs: 5400, p99Ms: 11200,
    lastRun: '3 minutes ago', status: 'healthy',
    description: 'Whisper STT + speech evaluation + proctor ML pipeline via Celery',
  },
  {
    name: 'DNA Engine', key: 'dna', color: '#10B981',
    processed: 820,  queued: 0,  errors: 0,  avgMs: 2100, p99Ms: 4800,
    lastRun: '5 minutes ago', status: 'healthy',
    description: 'Candidate dimensional profiling using interview + ATS + sim data fusion',
  },
  {
    name: 'Integrity Engine', key: 'integrity', color: '#F59E0B',
    processed: 815,  queued: 0,  errors: 1,  avgMs: 980,  p99Ms: 2200,
    lastRun: '5 minutes ago', status: 'healthy',
    description: 'Proctoring telemetry aggregator — tab switches, gaze, face, phone detection',
  },
];

const throughputHistory = [
  { time: '00:00', ats: 12, simulation: 8,  interview: 5 },
  { time: '04:00', ats: 5,  simulation: 3,  interview: 2 },
  { time: '08:00', ats: 38, simulation: 24, interview: 18 },
  { time: '12:00', ats: 72, simulation: 51, interview: 39 },
  { time: '16:00', ats: 89, simulation: 63, interview: 48 },
  { time: '20:00', ats: 55, simulation: 38, interview: 29 },
  { time: 'Now',   ats: 47, simulation: 31, interview: 22 },
];

function EngineCard({ eng }: { eng: EngineStats }) {
  const statusCfg = {
    healthy: { color: '#10B981', label: 'Healthy', Icon: CheckCircle2 },
    busy:    { color: '#F59E0B', label: 'Busy',    Icon: AlertTriangle },
    error:   { color: '#EF4444', label: 'Error',   Icon: AlertTriangle },
  }[eng.status];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${eng.color}14` }}>
            <Cpu className="h-5 w-5" style={{ color: eng.color }} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-900">{eng.name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 max-w-[220px]">{eng.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: `${statusCfg.color}14`, color: statusCfg.color }}>
          <statusCfg.Icon className="h-3 w-3" />
          {statusCfg.label}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Processed',  value: eng.processed.toLocaleString(), icon: CheckCircle2, color: '#10B981' },
          { label: 'Queued',     value: String(eng.queued),              icon: Clock,        color: '#F59E0B' },
          { label: 'Errors',     value: String(eng.errors),              icon: AlertTriangle,color: eng.errors > 0 ? '#EF4444' : '#10B981' },
          { label: 'Avg Latency',value: `${eng.avgMs}ms`,                icon: Zap,          color: '#42A5F5' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-lg font-black text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar — error rate */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-semibold mb-1">
          <span className="text-slate-400">Error rate</span>
          <span style={{ color: eng.errors > 0 ? '#EF4444' : '#10B981' }}>
            {((eng.errors / (eng.processed || 1)) * 100).toFixed(2)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${Math.min(100, (eng.errors / (eng.processed || 1)) * 100 * 10)}%`,
            background: eng.errors > 0 ? '#EF4444' : '#10B981',
          }} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Clock className="h-3 w-3" />
        Last run: <span className="font-semibold text-slate-600">{eng.lastRun}</span>
        <span className="ml-auto text-slate-400">P99: {eng.p99Ms}ms</span>
      </div>
    </div>
  );
}

export default function AdminEnginesPage() {
  const totalProcessed = ENGINES.reduce((acc, e) => acc + e.processed, 0);
  const totalErrors    = ENGINES.reduce((acc, e) => acc + e.errors, 0);
  const totalQueued    = ENGINES.reduce((acc, e) => acc + e.queued, 0);

  return (
    <UnifiedLayout title="Engine Monitor"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Engine Monitor' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">AI Engine Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">5 engines · {totalProcessed.toLocaleString()} total sessions processed</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: CheckCircle2, label: 'Total Processed', value: totalProcessed.toLocaleString(), color: '#10B981' },
          { icon: AlertTriangle, label: 'Total Errors',   value: String(totalErrors),              color: totalErrors > 0 ? '#EF4444' : '#10B981' },
          { icon: Clock,         label: 'Queued Jobs',    value: String(totalQueued),              color: '#F59E0B' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{value}</div>
              <div className="text-[11px] font-semibold text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Throughput chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">Hourly Throughput</h3>
          <p className="text-[11px] text-slate-400">Jobs processed per hour today</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={throughputHistory} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
            <Bar dataKey="ats"        fill="#42A5F5" radius={[3,3,0,0]} name="ATS" />
            <Bar dataKey="simulation" fill="#7C3AED" radius={[3,3,0,0]} name="Simulation" />
            <Bar dataKey="interview"  fill="#0D47A1" radius={[3,3,0,0]} name="Interview" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engine cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {ENGINES.map((eng) => <EngineCard key={eng.key} eng={eng} />)}
      </div>
    </UnifiedLayout>
  );
}
