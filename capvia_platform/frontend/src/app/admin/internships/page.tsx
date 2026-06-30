'use client';
import React, { useState, useMemo } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { internshipApi } from '@/services/api';
import {
  Search, Briefcase, Users, Eye, Archive, ToggleLeft, Copy,
  Calendar, MapPin, ChevronLeft, ChevronRight, SlidersHorizontal,
} from 'lucide-react';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:     { label: 'Open',     color: '#10B981', bg: '#ECFDF5' },
  CLOSED:   { label: 'Closed',   color: '#EF4444', bg: '#FEF2F2' },
  DRAFT:    { label: 'Draft',    color: '#F59E0B', bg: '#FFFBEB' },
  ARCHIVED: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC' },
};

const PER_PAGE = 10;

export default function AdminInternshipsPage() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('all');
  const [page, setPage]       = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-internships-all'],
    queryFn: () => internshipApi.list({ per_page: 200 }),
  });

  const internships = useMemo(() => {
    const raw = data?.internships || [];
    if (raw.length) return raw;
    // Fallback mock
    return Array.from({ length: 28 }, (_, i) => ({
      id: `int-${i}`,
      title: ['Frontend Developer Intern', 'Backend Dev Intern', 'Data Science Intern',
        'UI/UX Design Intern', 'Machine Learning Intern', 'DevOps Intern',
        'Product Management Intern', 'Marketing Intern'][i % 8],
      company_name: ['TechCorp', 'InnovatePK', 'DigitalEdge', 'ByteWorks', 'Nexus'][i % 5],
      status: ['OPEN', 'OPEN', 'CLOSED', 'DRAFT', 'ARCHIVED'][i % 5],
      location: ['Remote', 'Karachi', 'Lahore', 'Islamabad'][i % 4],
      application_count: Math.floor(Math.random() * 80) + 5,
      view_count: Math.floor(Math.random() * 400) + 20,
      created_at: new Date(Date.now() - i * 86400000 * 4).toISOString(),
      deadline: new Date(Date.now() + (30 - i * 3) * 86400000).toISOString(),
    }));
  }, [data]);

  const filtered = useMemo(() => internships.filter((inv: any) => {
    const ms = !search || inv.title?.toLowerCase().includes(search.toLowerCase()) ||
      inv.company_name?.toLowerCase().includes(search.toLowerCase());
    const mst = status === 'all' || inv.status === status;
    return ms && mst;
  }), [internships, search, status]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const statusCounts = useMemo(() => ({
    all: internships.length,
    OPEN:     internships.filter((i: any) => i.status === 'OPEN').length,
    CLOSED:   internships.filter((i: any) => i.status === 'CLOSED').length,
    DRAFT:    internships.filter((i: any) => i.status === 'DRAFT').length,
    ARCHIVED: internships.filter((i: any) => i.status === 'ARCHIVED').length,
  }), [internships]);

  return (
    <UnifiedLayout title="Internship Management"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Internships' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Internship Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{internships.length} total vacancies across all companies</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {[['all', 'All'], ['OPEN', 'Open'], ['DRAFT', 'Draft'], ['CLOSED', 'Closed'], ['ARCHIVED', 'Archived']].map(([val, lbl]) => (
          <button key={val} onClick={() => { setStatus(val); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              status === val
                ? 'bg-[#0D47A1] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {lbl}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              status === val ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{statusCounts[val as keyof typeof statusCounts] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by title or company…"
          className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D47A1] bg-white" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Role / Company', 'Status', 'Location', 'Applications', 'Views', 'Deadline', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : paged.map((inv: any) => {
              const sm = STATUS_META[inv.status] || STATUS_META.DRAFT;
              const dl = new Date(inv.deadline);
              const expired = dl < new Date();
              return (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0D47A1]/10 flex-shrink-0">
                        <Briefcase className="h-3.5 w-3.5 text-[#0D47A1]" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-slate-900">{inv.title}</div>
                        <div className="text-[10px] text-slate-400">{inv.company_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3" />{inv.location || 'Remote'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[12px] font-bold text-slate-800">
                      <Users className="h-3.5 w-3.5 text-slate-300" />{inv.application_count}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[12px] font-bold text-slate-800">
                      <Eye className="h-3.5 w-3.5 text-slate-300" />{inv.view_count}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-[11px] font-semibold ${expired ? 'text-[#EF4444]' : 'text-slate-500'}`}>
                      {dl.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      {expired && <span className="ml-1 text-[9px] font-black">EXPIRED</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button title="Archive" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button title="Deactivate" className="p-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-500 text-slate-400 transition-all">
                        <ToggleLeft className="h-3.5 w-3.5" />
                      </button>
                      <button title="Duplicate" className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0D47A1] text-slate-400 transition-all">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-[11px] text-slate-400">
            {filtered.length} internships · Page {page} of {totalPages}
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
