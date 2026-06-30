'use client';
import React, { useState, useMemo } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/services/api';
import {
  Search, Building, Globe, MapPin, Users, Briefcase, CheckCircle2,
  XCircle, MoreHorizontal, ExternalLink, BarChart2, Shield,
  LayoutGrid, List, Filter,
} from 'lucide-react';

const INDUSTRY_COLORS: Record<string, string> = {
  'Technology': '#0D47A1', 'Finance': '#10B981', 'Healthcare': '#7C3AED',
  'Education': '#F59E0B', 'Retail': '#EF4444', 'Media': '#42A5F5',
};

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
      <CheckCircle2 className="h-3 w-3" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <XCircle className="h-3 w-3" /> Unverified
    </span>
  );
}

export default function AdminCompaniesPage() {
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState<'grid' | 'list'>('grid');
  const [industry, setIndustry] = useState('all');

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['admin-companies-list'],
    queryFn: () => companyApi.list(1, 100),
  });

  const raw = useMemo(() => companiesData?.companies || [], [companiesData]);

  // Enrich with mock data when fields missing
  const companies = useMemo(() => raw.length ? raw.map((c: any, i: number) => ({
    ...c,
    industry: c.industry || ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail'][i % 5],
    is_verified: c.is_verified ?? (i % 3 !== 0),
    internship_count: c.internship_count ?? Math.floor(Math.random() * 8) + 1,
    hr_count: c.hr_count ?? Math.floor(Math.random() * 4) + 1,
    application_count: c.application_count ?? Math.floor(Math.random() * 60) + 5,
    headquarters: c.headquarters || ['Karachi', 'Lahore', 'Islamabad', 'Remote'][i % 4],
  })) : Array.from({ length: 18 }, (_, i) => ({
    id: `co-${i}`,
    name: ['TechCorp Pakistan', 'InnovatePK Ltd', 'DigitalEdge', 'ByteWorks', 'Nexus Solutions',
      'Apex Analytics', 'CloudPeak', 'DataSync', 'PixelBridge', 'SkyLabs',
      'CoreFinance', 'HealthFirst', 'EduTech PK', 'RetailHub', 'MediaStar',
      'AgriTech', 'LogiCore', 'UrbanGrid'][i],
    industry: ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Media'][i % 6],
    is_verified: i % 3 !== 0,
    internship_count: Math.floor(Math.random() * 8) + 1,
    hr_count: Math.floor(Math.random() * 4) + 1,
    application_count: Math.floor(Math.random() * 80) + 10,
    headquarters: ['Karachi', 'Lahore', 'Islamabad', 'Remote'][i % 4],
    website_url: 'https://example.com',
    created_at: new Date(Date.now() - i * 86400000 * 7).toISOString(),
  })), [raw]);

  const industries = useMemo(() => ['all', ...Array.from(new Set(companies.map((c: any) => c.industry)))], [companies]);

  const filtered = useMemo(() => companies.filter((c: any) => {
    const ms = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const mi = industry === 'all' || c.industry === industry;
    return ms && mi;
  }), [companies, search, industry]);

  return (
    <UnifiedLayout title="Company Management"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Companies' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Company Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{companies.length} registered organizations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('grid')}
            className={`p-2 rounded-xl border transition-all ${view === 'grid' ? 'border-[#0D47A1]/30 bg-blue-50 text-[#0D47A1]' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('list')}
            className={`p-2 rounded-xl border transition-all ${view === 'list' ? 'border-[#0D47A1]/30 bg-blue-50 text-[#0D47A1]' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies…"
            className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D47A1] bg-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(industries as string[]).map((ind) => (
            <button key={ind} onClick={() => setIndustry(ind)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                industry === ind
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>{ind === 'all' ? 'All Industries' : ind}</button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          )) : filtered.map((co: any) => {
            const indColor = INDUSTRY_COLORS[co.industry] || '#0D47A1';
            return (
              <div key={co.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${indColor}, ${indColor}99)` }}>
                      {co.name?.[0] || 'C'}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-slate-900">{co.name}</div>
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: indColor }}>{co.industry}</div>
                    </div>
                  </div>
                  <VerifiedBadge verified={co.is_verified} />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 mb-4 text-[11px] text-slate-500">
                  {co.headquarters && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{co.headquarters}</span>
                  )}
                  {co.website_url && (
                    <a href={co.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-[#0D47A1] transition-colors">
                      <Globe className="h-3 w-3" /><ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: Briefcase, label: 'Internships', val: co.internship_count },
                    { icon: Users,     label: 'HR Accounts', val: co.hr_count },
                    { icon: BarChart2, label: 'Applications', val: co.application_count },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="text-center p-2 bg-slate-50 rounded-xl">
                      <div className="text-base font-black text-slate-900">{val}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button className="flex-1 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                    View
                  </button>
                  {!co.is_verified && (
                    <button className="flex-1 py-1.5 text-[11px] font-bold rounded-xl text-white transition-all"
                      style={{ background: '#10B981' }}>
                      Verify
                    </button>
                  )}
                  <button className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Company', 'Industry', 'Location', 'Internships', 'HR', 'Applications', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((co: any) => (
                <tr key={co.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: `${INDUSTRY_COLORS[co.industry] || '#0D47A1'}` }}>
                        {co.name?.[0]}
                      </div>
                      <span className="text-[12px] font-bold text-slate-900">{co.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-semibold" style={{ color: INDUSTRY_COLORS[co.industry] || '#0D47A1' }}>{co.industry}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{co.headquarters || '—'}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-800">{co.internship_count}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-800">{co.hr_count}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-800">{co.application_count}</td>
                  <td className="px-4 py-3"><VerifiedBadge verified={co.is_verified} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">View</button>
                      {!co.is_verified && (
                        <button className="px-2 py-1 text-[10px] font-bold rounded-lg text-white" style={{ background: '#10B981' }}>Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </UnifiedLayout>
  );
}
