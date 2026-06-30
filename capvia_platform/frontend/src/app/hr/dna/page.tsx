'use client';

import React, { useState, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  internshipApi,
  recruitmentApi,
  dnaApi,
  rankingsApi,
} from '../../../services/api';
import { Application, Internship } from '../../../types';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Dna, RefreshCw, Search, Eye, ChevronDown,
  Activity, Brain, ShieldCheck, Zap, Users, Star, AlertCircle,
  CheckCircle2, Loader2, BarChart2, Target, Cpu,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DnaRecord {
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  internshipTitle: string;
  status: string;
  dnaProfile: any | null;
  rankingScore: number | null;
}

const DNA_DIMENSIONS = [
  { key: 'technical_depth',  label: 'Technical Depth',  color: '#0D47A1', icon: Cpu },
  { key: 'problem_solving',  label: 'Problem Solving',  color: '#7C3AED', icon: Brain },
  { key: 'communication',    label: 'Communication',    color: '#10B981', icon: Activity },
  { key: 'learning_agility', label: 'Learning Agility', color: '#F59E0B', icon: Zap },
  { key: 'collaboration',    label: 'Collaboration',    color: '#EF4444', icon: Users },
  { key: 'integrity',        label: 'Integrity',        color: '#0891B2', icon: ShieldCheck },
  { key: 'initiative',       label: 'Initiative',       color: '#6366F1', icon: Star },
  { key: 'domain_expertise', label: 'Domain Expertise', color: '#059669', icon: Target },
  { key: 'adaptability',     label: 'Adaptability',     color: '#DC2626', icon: RefreshCw },
];

function scoreColor(val: number) {
  if (val >= 80) return '#10B981';
  if (val >= 60) return '#F59E0B';
  return '#EF4444';
}

function tierBadge(score: number | null) {
  if (score === null) return { label: 'N/A', cls: 'bg-slate-100 text-slate-500' };
  if (score >= 85) return { label: 'GOLD',     cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  if (score >= 70) return { label: 'SILVER',   cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
  if (score >= 55) return { label: 'BRONZE',   cls: 'bg-orange-50 text-orange-700 border border-orange-200' };
  return           { label: 'STANDARD',        cls: 'bg-rose-50 text-rose-700 border border-rose-200' };
}

// ── Radar mini-chart ──────────────────────────────────────────────────────────
function DnaRadar({ profile }: { profile: any }) {
  const data = DNA_DIMENSIONS.map((d) => ({
    dimension: d.label.split(' ')[0],
    score: profile?.[d.key] ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#E2E8F0" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="DNA" dataKey="score" stroke="#0D47A1" fill="#0D47A1" fillOpacity={0.15} strokeWidth={2} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11 }}
          formatter={(v: any) => [`${v}%`, 'Score']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Dimension bar ─────────────────────────────────────────────────────────────
function DimBar({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}14` }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-700">{label}</span>
          <span className="text-[11px] font-bold" style={{ color }}>{value}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${value}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ── Candidate DNA Card ────────────────────────────────────────────────────────
function DnaCard({
  record, onGenerate, generating, onExpand,
}: {
  record: DnaRecord; onGenerate: (id: string) => void;
  generating: boolean; onExpand: (r: DnaRecord) => void;
}) {
  const profile = record.dnaProfile;
  const tier = tierBadge(record.rankingScore);
  const hasProfile = !!profile;
  const avgScore = hasProfile
    ? Math.round(DNA_DIMENSIONS.reduce((s, d) => s + (profile[d.key] ?? 0), 0) / DNA_DIMENSIONS.length)
    : null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-slate-50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0D47A1,#42A5F5)' }}>
                {(record.candidateName || 'C')[0].toUpperCase()}
              </div>
              <span className="text-sm font-bold text-slate-900 truncate">{record.candidateName}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate ml-9">{record.internshipTitle}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${tier.cls}`}>
              {tier.label}
            </span>
            {record.rankingScore !== null && (
              <span className="text-[10px] font-black" style={{ color: scoreColor(record.rankingScore) }}>
                {record.rankingScore.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Radar or placeholder */}
      <div className="px-4 py-3">
        {hasProfile ? (
          <DnaRadar profile={profile} />
        ) : (
          <div className="h-[180px] flex flex-col items-center justify-center text-slate-300 gap-2">
            <Dna className="h-10 w-10" />
            <span className="text-[11px] font-semibold text-slate-400">No DNA profile generated yet</span>
          </div>
        )}
      </div>

      {/* Top 5 dimension bars */}
      {hasProfile && (
        <div className="px-4 pb-3 space-y-1.5">
          {DNA_DIMENSIONS.slice(0, 4).map((d) => (
            <div key={d.key}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] font-semibold text-slate-600">{d.label}</span>
                <span className="text-[10px] font-bold" style={{ color: d.color }}>{profile[d.key] ?? 0}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${profile[d.key] ?? 0}%`, background: d.color }} />
              </div>
            </div>
          ))}
          <button className="text-[10px] text-[#0D47A1] font-bold hover:underline pt-0.5"
            onClick={() => onExpand(record)}>
            View all 9 dimensions →
          </button>
        </div>
      )}

      {/* Avg score badge */}
      {avgScore !== null && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <BarChart2 className="h-3.5 w-3.5 text-[#0D47A1]" />
          <span className="text-[11px] font-bold text-slate-700">
            Avg DNA Score: <span style={{ color: scoreColor(avgScore) }}>{avgScore}%</span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {hasProfile ? (
          <button onClick={() => onExpand(record)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-[#0D47A1]/5 text-[#0D47A1] hover:bg-[#0D47A1]/10 transition-colors">
            <Eye className="h-3.5 w-3.5" /> View Full Profile
          </button>
        ) : (
          <button onClick={() => onGenerate(record.applicationId)} disabled={generating}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-[#0D47A1] text-white hover:bg-[#1565C0] transition-colors disabled:opacity-60">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dna className="h-3.5 w-3.5" />}
            {generating ? 'Generating…' : 'Generate DNA'}
          </button>
        )}
        {hasProfile && (
          <button onClick={() => onGenerate(record.applicationId)} disabled={generating}
            title="Regenerate DNA"
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-[#0D47A1] hover:border-[#0D47A1]/30 transition-colors disabled:opacity-60">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function DnaDrawer({ record, onClose }: { record: DnaRecord | null; onClose: () => void }) {
  if (!record || !record.dnaProfile) return null;
  const profile = record.dnaProfile;
  const avgScore = Math.round(
    DNA_DIMENSIONS.reduce((s, d) => s + (profile[d.key] ?? 0), 0) / DNA_DIMENSIONS.length
  );

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" />
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: 'linear-gradient(135deg,#0D47A1,#42A5F5)' }}>
              {(record.candidateName || 'C')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 font-outfit">{record.candidateName}</h3>
              <p className="text-[11px] text-slate-400">{record.internshipTitle}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-sm">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Radar */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Dna className="h-3.5 w-3.5 text-[#0D47A1]" /> Capability Radar
            </h4>
            <DnaRadar profile={profile} />
          </div>

          {/* Score triplet */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Avg DNA', value: `${avgScore}%`, color: scoreColor(avgScore) },
              { label: 'Rank Score', value: record.rankingScore !== null ? `${record.rankingScore.toFixed(0)}%` : '—', color: '#0D47A1' },
              { label: 'Tier', value: tierBadge(record.rankingScore).label, color: '#64748B' },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-100 rounded-xl p-3 text-center">
                <div className="text-lg font-black" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* All 9 dimensions */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4">
            <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-4">All 9 Dimensions</h4>
            <div className="space-y-3">
              {DNA_DIMENSIONS.map((d) => (
                <DimBar key={d.key} label={d.label} value={profile[d.key] ?? 0} color={d.color} icon={d.icon} />
              ))}
            </div>
          </div>

          {/* Strengths / Weaknesses */}
          {(profile.strengths?.length > 0 || profile.weaknesses?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {profile.strengths?.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <h5 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Top Strengths
                  </h5>
                  <ul className="space-y-1.5">
                    {(profile.strengths as string[]).slice(0, 4).map((s: string, i: number) => (
                      <li key={i} className="text-[11px] text-emerald-800 font-medium flex items-start gap-1">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.weaknesses?.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <h5 className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Growth Areas
                  </h5>
                  <ul className="space-y-1.5">
                    {(profile.weaknesses as string[]).slice(0, 4).map((w: string, i: number) => (
                      <li key={i} className="text-[11px] text-rose-800 font-medium flex items-start gap-1">
                        <span className="text-rose-400 mt-0.5 flex-shrink-0">•</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HRDnaProfilesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'generated' | 'pending'>('all');
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [expandedRecord, setExpandedRecord] = useState<DnaRecord | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const { data: internshipsData } = useQuery({
    queryKey: ['internships'],
    queryFn: () => internshipApi.list(),
  });
  const internships: Internship[] = useMemo(() => internshipsData?.internships || [], [internshipsData]);

  const { data: allApplicationsData, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });
  const applications: Application[] = useMemo(() => allApplicationsData || [], [allApplicationsData]);

  const eligibleApps = useMemo(() =>
    applications.filter((a) =>
      ['EVALUATED', 'EVALUATED_LOCAL_BASELINE', 'SHORTLISTED', 'HIRED', 'REJECTED'].includes(a.status)
    ),
    [applications]
  );

  const dnaQuery = useQuery({
    queryKey: ['bulk-dna', eligibleApps.map((a) => a.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        eligibleApps.map(async (app) => {
          try { return { id: app.id, profile: await dnaApi.get(app.id) }; }
          catch { return { id: app.id, profile: null }; }
        })
      );
      return results;
    },
    enabled: eligibleApps.length > 0,
  });

  const rankQuery = useQuery({
    queryKey: ['bulk-rankings', eligibleApps.map((a) => a.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        eligibleApps.map(async (app) => {
          try { const r = await rankingsApi.get(app.id); return { id: app.id, score: r?.final_score ?? null }; }
          catch { return { id: app.id, score: null }; }
        })
      );
      return results;
    },
    enabled: eligibleApps.length > 0,
  });

  const dnaRecords: DnaRecord[] = useMemo(() => {
    const dnaMap = new Map((dnaQuery.data || []).map((d) => [d.id, d.profile]));
    const rankMap = new Map((rankQuery.data || []).map((r) => [r.id, r.score]));
    return eligibleApps.map((app) => ({
      applicationId: app.id,
      candidateName: app.candidate?.full_name || 'Candidate',
      candidateEmail: app.candidate?.email || '',
      internshipTitle: (app as any).vacancy?.title || (app as any).vacancy_title || 'General Vacancy',
      status: app.status,
      dnaProfile: dnaMap.get(app.id) ?? null,
      rankingScore: rankMap.get(app.id) ?? null,
    }));
  }, [eligibleApps, dnaQuery.data, rankQuery.data]);

  const generateDna = useMutation({
    mutationFn: (applicationId: string) => dnaApi.generate(applicationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bulk-dna'] }),
  });

  const handleGenerate = async (applicationId: string) => {
    setGeneratingIds((prev) => new Set(prev).add(applicationId));
    try { await generateDna.mutateAsync(applicationId); }
    finally {
      setGeneratingIds((prev) => { const n = new Set(prev); n.delete(applicationId); return n; });
    }
  };

  const filtered = useMemo(() => {
    let list = dnaRecords;
    if (selectedInternshipId) {
      const inv = internships.find((i) => i.id === selectedInternshipId);
      if (inv) list = list.filter((r) => r.internshipTitle === inv.title);
    }
    if (filterStatus === 'generated') list = list.filter((r) => !!r.dnaProfile);
    if (filterStatus === 'pending')   list = list.filter((r) => !r.dnaProfile);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.candidateName.toLowerCase().includes(q) ||
        r.internshipTitle.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q)
      );
    }
    return list;
  }, [dnaRecords, selectedInternshipId, filterStatus, searchQuery, internships]);

  const generatedCount = dnaRecords.filter((r) => !!r.dnaProfile).length;
  const pendingCount   = dnaRecords.filter((r) => !r.dnaProfile).length;

  const avgDnaScore = generatedCount > 0
    ? Math.round(
        dnaRecords
          .filter((r) => !!r.dnaProfile)
          .reduce((sum, r) => sum + (DNA_DIMENSIONS.reduce((s, d) => s + (r.dnaProfile?.[d.key] ?? 0), 0) / 9), 0)
        / generatedCount
      )
    : null;

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="DNA Profiles" breadcrumbs={[{ label: 'AI Insights' }, { label: 'DNA Profiles' }]}>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit flex items-center gap-2">
              <Dna className="h-5 w-5 text-[#0D47A1]" /> Capability DNA Profiles
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              9-dimensional candidate capability maps synthesised from ATS, Coding Simulation, and Video Interview data
            </p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['bulk-dna'] });
              queryClient.invalidateQueries({ queryKey: ['bulk-rankings'] });
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh All
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Evaluated Candidates', value: dnaRecords.length,    color: '#0D47A1', icon: Users },
            { label: 'DNA Generated',        value: generatedCount,        color: '#10B981', icon: Dna },
            { label: 'Pending Generation',   value: pendingCount,          color: '#F59E0B', icon: AlertCircle },
            { label: 'Platform Avg DNA',     value: avgDnaScore !== null ? `${avgDnaScore}%` : '—', color: '#7C3AED', icon: BarChart2 },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}14` }}>
                  <Icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900">{s.value}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate name or internship…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0D47A1]/40 focus:ring-2 focus:ring-[#0D47A1]/10 placeholder:text-slate-400"
            />
          </div>
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedInternshipId}
              onChange={(e) => setSelectedInternshipId(e.target.value)}
              className="appearance-none pl-3 pr-9 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0D47A1]/40 text-slate-700 min-w-[180px]"
            >
              <option value="">All Internships</option>
              {internships.map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0">
            {(['all', 'generated', 'pending'] as const).map((f) => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-2.5 text-xs font-bold capitalize transition-colors ${
                  filterStatus === f ? 'bg-[#0D47A1] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}>
                {f === 'all' ? 'All' : f === 'generated' ? 'Generated' : 'Pending'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading || dnaQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Loading DNA profiles…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Dna className="h-14 w-14 text-slate-200" />
            <p className="text-sm font-semibold text-slate-500">No profiles found</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              {dnaRecords.length === 0
                ? 'DNA profiles are auto-generated once candidates complete all 3 AI assessment stages.'
                : 'Try adjusting your search or filter selections.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((record) => (
              <DnaCard
                key={record.applicationId}
                record={record}
                onGenerate={handleGenerate}
                generating={generatingIds.has(record.applicationId)}
                onExpand={setExpandedRecord}
              />
            ))}
          </div>
        )}

        {/* Detail Drawer */}
        <DnaDrawer record={expandedRecord} onClose={() => setExpandedRecord(null)} />

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
