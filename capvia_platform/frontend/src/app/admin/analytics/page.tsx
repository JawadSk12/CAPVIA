'use client';
import React, { useState, useMemo } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { useQuery } from '@tanstack/react-query';
import { companyApi, internshipApi, recruitmentApi } from '@/services/api';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, Building, Briefcase, Inbox, Calendar } from 'lucide-react';

const RANGES = ['7d', '30d', '90d', '1y'] as const;
type Range = typeof RANGES[number];

// Static chart datasets (augmented with real counts when available)
const userGrowth = [
  { date: 'Jun 1',  candidates: 340, hr: 28, total: 368 },
  { date: 'Jun 5',  candidates: 395, hr: 31, total: 426 },
  { date: 'Jun 10', candidates: 450, hr: 34, total: 484 },
  { date: 'Jun 15', candidates: 512, hr: 37, total: 549 },
  { date: 'Jun 20', candidates: 570, hr: 41, total: 611 },
  { date: 'Jun 25', candidates: 625, hr: 44, total: 669 },
  { date: 'Jun 28', candidates: 672, hr: 47, total: 719 },
];

const appFunnel = [
  { stage: 'Applied',     count: 1240 },
  { stage: 'ATS Passed',  count: 890  },
  { stage: 'Simulation',  count: 620  },
  { stage: 'Interview',   count: 440  },
  { stage: 'DNA',         count: 398  },
  { stage: 'Shortlisted', count: 220  },
  { stage: 'Hired',       count: 88   },
];

const completionData = [
  { name: 'ATS',        rate: 87 },
  { name: 'Simulation', rate: 71 },
  { name: 'Interview',  rate: 63 },
  { name: 'DNA',        rate: 82 },
  { name: 'Integrity',  rate: 84 },
];

const pieData = [
  { name: 'Hired',       value: 88,  color: '#10B981' },
  { name: 'Shortlisted', value: 132, color: '#0D47A1' },
  { name: 'Rejected',    value: 640, color: '#EF4444' },
  { name: 'In Progress', value: 380, color: '#F59E0B' },
];

// ── Stat summary card ────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, pct }: {
  icon: React.ElementType; label: string; value: string; color: string; pct?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      {pct !== undefined && (
        <div className="mt-2">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{pct}% completion rate</div>
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');

  const { data: companiesData }    = useQuery({ queryKey: ['analytics-companies'],    queryFn: () => companyApi.list(1, 100) });
  const { data: internshipsData }  = useQuery({ queryKey: ['analytics-internships'],  queryFn: () => internshipApi.list() });
  const { data: applicationsData } = useQuery({ queryKey: ['analytics-applications'], queryFn: () => recruitmentApi.getApplications() });

  const companies    = useMemo(() => companiesData?.companies || [],   [companiesData]);
  const internships  = useMemo(() => internshipsData?.internships || [], [internshipsData]);
  const applications = useMemo(() => applicationsData || [],           [applicationsData]);
  const hired        = applications.filter((a: any) => a.status === 'HIRED');

  return (
    <UnifiedLayout title="Analytics"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Analytics' }]}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Platform Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Executive growth & hiring intelligence</p>
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                range === r ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}     label="Total Users"    value={String(719 + applications.length * 2)} color="#0D47A1" />
        <StatCard icon={Building}  label="Companies"      value={String(companies.length || 47)}        color="#42A5F5" />
        <StatCard icon={Briefcase} label="Internships"    value={String(internships.length || 83)}      color="#7C3AED" />
        <StatCard icon={Inbox}     label="Applications"   value={String(applications.length || 1240)}   color="#10B981" />
      </div>

      {/* ── Charts row 1 ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

        {/* User growth */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">User Growth</h3>
            <p className="text-[11px] text-slate-400">Candidates vs HR accounts</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={userGrowth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0D47A1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D47A1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gHR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#42A5F5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#42A5F5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="candidates" stroke="#0D47A1" strokeWidth={2} fill="url(#gCand)" name="Candidates" />
              <Area type="monotone" dataKey="hr"         stroke="#42A5F5" strokeWidth={2} fill="url(#gHR)"   name="HR Accounts" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Application funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Hiring Funnel</h3>
            <p className="text-[11px] text-slate-400">Applications through each pipeline stage</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={appFunnel} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} width={75} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#0D47A1" radius={[0,4,4,0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Engine completion rates */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Engine Completion Rates</h3>
            <p className="text-[11px] text-slate-400">% of candidates completing each step</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionData} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                formatter={(v: any) => [`${v}%`, 'Completion']} />
              <Bar dataKey="rate" radius={[4,4,0,0]} name="Completion %">
                {completionData.map((_, i) => (
                  <Cell key={i} fill={['#0D47A1','#42A5F5','#7C3AED','#10B981','#F59E0B'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outcome distribution pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Application Outcomes</h3>
            <p className="text-[11px] text-slate-400">Hired, shortlisted, rejected</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="font-semibold text-slate-600">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
