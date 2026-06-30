'use client';
import React, { useState, useMemo } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import {
  Search, Filter, UserCheck, UserX, Edit2, Trash2, KeyRound,
  Download, ChevronLeft, ChevronRight, User, Shield, Building,
} from 'lucide-react';

type UserRole = 'all' | 'candidate' | 'hr' | 'admin';
type UserStatus = 'all' | 'active' | 'suspended';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  company_name?: string;
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  candidate: { label: 'Candidate', color: '#0D47A1', bg: '#EFF6FF', icon: User },
  hr:        { label: 'HR',        color: '#10B981', bg: '#ECFDF5', icon: Building },
  admin:     { label: 'Admin',     color: '#7C3AED', bg: '#F5F3FF', icon: Shield },
};

export default function AdminUsersPage() {
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState<UserRole>('all');
  const [statusFilter, setStat] = useState<UserStatus>('all');
  const [page, setPage]         = useState(1);
  const PER_PAGE = 12;

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return res.data as AdminUser[];
    },
  });

  // Fallback mock data when backend endpoint doesn't exist
  const users: AdminUser[] = useMemo(() => {
    if (rawUsers && Array.isArray(rawUsers)) return rawUsers;
    return Array.from({ length: 35 }, (_, i) => ({
      id: `user-${i + 1}`,
      full_name: ['Ahmed Khan', 'Sara Ali', 'Jawad Sheikh', 'Zara Ahmad', 'Hassan Raza',
        'Ayesha Malik', 'Omar Farooq', 'Fatima Noor', 'Bilal Ahmed', 'Hina Javed'][i % 10],
      email: `user${i + 1}@capvia.ai`,
      role: i % 15 === 0 ? 'admin' : i % 4 === 0 ? 'hr' : 'candidate',
      is_active: i % 8 !== 0,
      created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
      company_name: i % 4 === 0 ? ['TechCorp', 'InnovatePK', 'DigitalEdge', 'ByteWorks'][i % 4] : undefined,
    }));
  }, [rawUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole   = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = {
    all: users.length,
    candidate: users.filter((u) => u.role === 'candidate').length,
    hr:        users.filter((u) => u.role === 'hr').length,
    admin:     users.filter((u) => u.role === 'admin').length,
  };

  return (
    <UnifiedLayout title="User Management"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users' }]}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} total accounts across all roles</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* ── Role tabs ────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {(['all', 'candidate', 'hr', 'admin'] as UserRole[]).map((r) => (
          <button key={r} onClick={() => { setRole(r); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              roleFilter === r
                ? 'bg-[#0D47A1] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {r === 'all' ? 'All Users' : ROLE_META[r]?.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              roleFilter === r ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>{counts[r as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {/* ── Filters bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]/20 bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStat(e.target.value as UserStatus)}
          className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none text-slate-600">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['User', 'Role', 'Status', 'Joined', 'Company', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.map((u) => {
                const rm = ROLE_META[u.role] || ROLE_META.candidate;
                const RoleIcon = rm.icon;
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#0D47A1,#42A5F5)' }}>
                          {u.full_name[0]}
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-slate-900">{u.full_name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                        style={{ background: rm.bg, color: rm.color }}>
                        <RoleIcon className="h-3 w-3" />
                        {rm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                        u.is_active ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{u.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button title="View" className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0D47A1] text-slate-400 transition-all">
                          <User className="h-3.5 w-3.5" />
                        </button>
                        <button title="Edit" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button title={u.is_active ? 'Suspend' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-all ${u.is_active ? 'hover:bg-amber-50 hover:text-amber-500' : 'hover:bg-emerald-50 hover:text-emerald-500'} text-slate-400`}>
                          {u.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>
                        <button title="Reset Password" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-all">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                  page === pg ? 'bg-[#0D47A1] text-white' : 'border border-slate-200 text-slate-600 hover:bg-white'
                }`}>{pg}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-all">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
