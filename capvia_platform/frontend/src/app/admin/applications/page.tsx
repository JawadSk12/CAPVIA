'use client';
import React, { useState, useMemo } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { useQuery } from '@tanstack/react-query';
import { recruitmentApi } from '@/services/api';
import {
  Search, Inbox, User, Building, Briefcase, FileText, Terminal,
  Video, Dna, ShieldCheck, ChevronLeft, ChevronRight, ArrowUpRight,
} from 'lucide-react';

const STATUS_PALETTE: Record<string, { label: string; color: string; bg: string }> = {
  applied:              { label: 'Applied',       color: '#42A5F5', bg: '#EFF6FF' },
  ats_screening:        { label: 'ATS',           color: '#F59E0B', bg: '#FFFBEB' },
  simulation_invited:   { label: 'Simulation',    color: '#7C3AED', bg: '#F5F3FF' },
  simulation_completed: { label: 'Sim Done',      color: '#10B981', bg: '#ECFDF5' },
  interview_invited:    { label: 'Interview',     color: '#0D47A1', bg: '#EFF6FF' },
  EVALUATED:            { label: 'Evaluated',     color: '#10B981', bg: '#ECFDF5' },
  shortlisted:          { label: 'Shortlisted',   color: '#7C3AED', bg: '#F5F3FF' },
  hired:                { label: 'Hired ✓',       color: '#10B981', bg: '#ECFDF5' },
  rejected:             { label: 'Rejected',      color: '#EF4444', bg: '#FEF2F2' },
};

function ScoreChip({ label, score, color }: { label: string; score?: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-slate-400 font-semibold">{label}</span>
      <span className="text-[11px] font-black" style={{ color }}>
        {score !== undefined && score !== null ? `${score.toFixed(0)}%` : '—'}
      </span>
    </div>
  );
}

const PER_PAGE = 12;

export default function AdminApplicationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage]     = useState(1);

  const { data: rawApps, isLoading } = useQuery({
    queryKey: ['admin-all-applications'],
    queryFn: () => recruitmentApi.getApplications(),
  });

  const applications: any[] = useMemo(() => {
    const raw = rawApps || [];
    if (raw.length) return raw;
    // Mock
    const statuses = Object.keys(STATUS_PALETTE);
    return Array.from({ length: 40 }, (_, i) => ({
      id: `app-${i}`,
      candidate: { full_name: ['Ahmed Khan', 'Sara Ali', 'Jawad Sheikh', 'Zara Ahmad', 'Hassan Raza'][i % 5] },
      company_name: ['TechCorp', 'InnovatePK', 'DigitalEdge', 'ByteWorks'][i % 4],
      vacancy_title: ['Frontend Dev Intern', 'Backend Dev Intern', 'Data Science Intern', 'UI/UX Intern'][i % 4],
      status: statuses[i % statuses.length],
      ats_score: i % 3 !== 0 ? 60 + Math.random() * 35 : undefined,
      simulation_results: i % 4 !== 0 ? { score: 55 + Math.random() * 40 } : undefined,
      interview_results: i % 5 !== 0 ? { score: 50 + Math.random() * 45 } : undefined,
      ranking: i % 3 === 0 ? { final_score: 65 + Math.random() * 30, hiring_recommendation: ['HIRE', 'CONSIDER', 'REJECT'][i % 3] } : undefined,
      created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    }));
  }, [rawApps]);

  const statusList = ['all', ...Object.keys(STATUS_PALETTE)];
  const counts: Record<string, number> = { all: applications.length };
  Object.keys(STATUS_PALETTE).forEach((s) => {
    counts[s] = applications.filter((a) => a.status?.toLowerCase() === s.toLowerCase()).length;
  });

  const filtered = useMemo(() => applications.filter((a) => {
    const ms = !search ||
      a.candidate?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.vacancy_title?.toLowerCase().includes(search.toLowerCase()) ||
      a.company_name?.toLowerCase().includes(search.toLowerCase());
    const mst = status === 'all' || a.status?.toLowerCase() === status.toLowerCase();
    return ms && mst;
  }), [applications, search, status]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <UnifiedLayout title="Application Management"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Applications' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Application Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{applications.length} total applications in pipeline</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
        {statusList.slice(0, 6).map((s) => {
          const sm = STATUS_PALETTE[s];
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                status === s
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {s === 'all' ? 'All' : sm?.label || s}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                status === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{counts[s] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search candidate, role, company…"
          className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D47A1] bg-white" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Candidate', 'Company', 'Role', 'Status', 'ATS', 'Simulation', 'Interview', 'DNA Score', 'Decision', ''].map((h) => (
                  <th key={h} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-3 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                  ))}
                </tr>
              )) : paged.map((app) => {
                const sm = STATUS_PALETTE[app.status?.toLowerCase()] || { label: app.status, color: '#64748B', bg: '#F8FAFC' };
                const rec = app.ranking?.hiring_recommendation;
                const recColor = rec === 'HIRE' || rec === 'STRONG_HIRE' ? '#10B981' : rec === 'CONSIDER' ? '#F59E0B' : '#EF4444';
                return (
                  <tr key={app.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#0D47A1,#42A5F5)' }}>
                          {(app.candidate?.full_name || '?')[0]}
                        </div>
                        <span className="text-[12px] font-bold text-slate-900 whitespace-nowrap">{app.candidate?.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-600 font-semibold whitespace-nowrap">{app.company_name || '—'}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-600 whitespace-nowrap max-w-[140px] truncate">{app.vacancy_title || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                        style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                    </td>
                    <td className="px-3 py-3"><ScoreChip label="ATS" score={app.ats_score} color="#42A5F5" /></td>
                    <td className="px-3 py-3"><ScoreChip label="Sim" score={app.simulation_results?.score} color="#7C3AED" /></td>
                    <td className="px-3 py-3"><ScoreChip label="Int" score={app.interview_results?.score} color="#0D47A1" /></td>
                    <td className="px-3 py-3"><ScoreChip label="DNA" score={app.ranking?.final_score} color="#10B981" /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {rec ? (
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ color: recColor, background: `${recColor}15` }}>
                          {rec.replace('_', ' ')}
                        </span>
                      ) : <span className="text-[10px] text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-[#0D47A1] transition-all">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-[11px] text-slate-400">
            Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
