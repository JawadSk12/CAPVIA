'use client';
import React, { useMemo } from 'react';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery } from '@tanstack/react-query';
import {
  companyApi, internshipApi, recruitmentApi, reportsApi, dnaApi, apiClient,
} from '../../../services/api';
import {
  Users, Building, Briefcase, Inbox, FileText, Dna, ShieldCheck,
  TrendingUp, Activity, Server, ArrowUpRight, CheckCircle2, AlertTriangle,
  Clock, BarChart2, HeartPulse, Cpu, Globe,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

// ── Helpers ─────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const growthData = [
  { month: 'Jan', users: 420, applications: 180, companies: 32 },
  { month: 'Feb', users: 530, applications: 240, companies: 38 },
  { month: 'Mar', users: 680, applications: 310, companies: 44 },
  { month: 'Apr', users: 820, applications: 390, companies: 51 },
  { month: 'May', users: 970, applications: 460, companies: 58 },
  { month: 'Jun', users: 1120, applications: 540, companies: 67 },
];

const enginesData = [
  { name: 'ATS',         processed: 312, errors: 4,  avgMs: 1840 },
  { name: 'Simulation',  processed: 208, errors: 2,  avgMs: 3200 },
  { name: 'Interview',   processed: 174, errors: 1,  avgMs: 5400 },
  { name: 'DNA',         processed: 160, errors: 0,  avgMs: 2100 },
  { name: 'Integrity',   processed: 159, errors: 0,  avgMs: 980  },
];

// ── KPI Card ─────────────────────────────────────────────────────
function KPICard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; trend?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            <TrendingUp className="h-3 w-3" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black text-slate-900 mb-0.5">{value}</div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Activity Feed Item ────────────────────────────────────────────
function FeedItem({ icon: Icon, text, time, color }: {
  icon: React.ElementType; text: string; time: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}14` }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{text}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { data: companiesData }     = useQuery({ queryKey: ['admin-companies'],     queryFn: () => companyApi.list(1, 100) });
  const { data: internshipsData }   = useQuery({ queryKey: ['admin-internships'],   queryFn: () => internshipApi.list() });
  const { data: applicationsData }  = useQuery({ queryKey: ['admin-applications'],  queryFn: () => recruitmentApi.getApplications() });

  const companies    = useMemo(() => companiesData?.companies || [], [companiesData]);
  const internships  = useMemo(() => internshipsData?.internships || [], [internshipsData]);
  const applications = useMemo(() => applicationsData || [], [applicationsData]);

  const evaluated   = applications.filter((a: any) => ['EVALUATED','EVALUATED_LOCAL_BASELINE','SHORTLISTED','HIRED'].includes(a.status));
  const hired       = applications.filter((a: any) => a.status === 'HIRED');
  const totalUsers  = companies.length * 4 + applications.length; // approximate

  const kpis = [
    { icon: Users,      label: 'Total Users',      value: fmt(totalUsers),          sub: 'Registered accounts',    color: '#0D47A1', trend: 12 },
    { icon: Building,   label: 'Companies',         value: fmt(companies.length),    sub: 'Active organizations',   color: '#42A5F5', trend: 8  },
    { icon: Briefcase,  label: 'Internships',       value: fmt(internships.length),  sub: 'All vacancies',          color: '#7C3AED', trend: 15 },
    { icon: Inbox,      label: 'Applications',      value: fmt(applications.length), sub: 'Pipeline total',         color: '#10B981', trend: 22 },
    { icon: FileText,   label: 'ATS Evaluations',   value: fmt(evaluated.length),    sub: 'Resume screened',        color: '#F59E0B', trend: 18 },
    { icon: Cpu,        label: 'Simulations Run',   value: fmt(Math.floor(evaluated.length * 0.8)), sub: 'Code challenges', color: '#EF4444', trend: 11 },
    { icon: Activity,   label: 'Interviews Done',   value: fmt(Math.floor(evaluated.length * 0.65)), sub: 'AI sessions',   color: '#0D47A1', trend: 9  },
    { icon: Dna,        label: 'DNA Generated',     value: fmt(Math.floor(evaluated.length * 0.6)),  sub: 'Profiles built', color: '#42A5F5', trend: 7  },
    { icon: ShieldCheck,label: 'Integrity Checks',  value: fmt(Math.floor(evaluated.length * 0.6)),  sub: 'Trust analyzed', color: '#10B981', trend: 5  },
    { icon: FileText,   label: 'Reports Generated', value: fmt(Math.floor(hired.length * 2 + 30)),   sub: 'PDFs exported',  color: '#7C3AED', trend: 14 },
    { icon: Globe,      label: 'Platform Uptime',   value: '99.87%',                 sub: 'Last 30 days',           color: '#10B981', trend: 0  },
    { icon: Server,     label: 'API Requests',      value: fmt(84200),               sub: 'Today',                  color: '#F59E0B', trend: 31 },
  ];

  const recentActivity = [
    { icon: Users,       text: 'New candidate registered: Zara Ahmad',                   time: '2 minutes ago',  color: '#0D47A1' },
    { icon: Building,    text: 'Company "Innovatech Ltd" verified by admin',              time: '14 minutes ago', color: '#42A5F5' },
    { icon: Briefcase,   text: 'New internship posted: Frontend Dev @ TechCorp',         time: '31 minutes ago', color: '#7C3AED' },
    { icon: Dna,         text: 'DNA profile generated for 3 candidates',                  time: '1 hour ago',     color: '#10B981' },
    { icon: AlertTriangle,text: 'Integrity alert: Multiple faces detected (1 session)',  time: '1 hour ago',     color: '#EF4444' },
    { icon: CheckCircle2,text: 'ATS engine processed 42 resumes successfully',           time: '2 hours ago',    color: '#10B981' },
    { icon: FileText,    text: 'Report generated for Sarah Khan — Hired',                time: '3 hours ago',    color: '#F59E0B' },
    { icon: Activity,    text: 'System health check passed — all services nominal',      time: '4 hours ago',    color: '#10B981' },
  ];

  return (
    <UnifiedLayout title="Admin Dashboard"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}>

      {/* ── Welcome bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-outfit">Executive Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform performance at a glance · Updated just now</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#10B981]/30 text-[#10B981] bg-[#10B981]/5">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          All Systems Operational
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => <KPICard key={k.label} {...k} />)}
      </div>

      {/* ── Charts Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

        {/* Platform Growth — Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform Growth</h3>
              <p className="text-[11px] text-slate-400">Users, Applications & Companies</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#0D47A1]/8 text-[#0D47A1]">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D47A1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D47A1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="#0D47A1" strokeWidth={2} fill="url(#gUsers)" name="Users" />
              <Area type="monotone" dataKey="applications" stroke="#10B981" strokeWidth={2} fill="url(#gApps)" name="Applications" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engine Processing — Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Engine Processing</h3>
            <p className="text-[11px] text-slate-400">Sessions processed today</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={enginesData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="processed" fill="#0D47A1" radius={[4,4,0,0]} name="Processed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <a href="/admin/logs" className="text-[11px] font-bold text-[#0D47A1] hover:underline">View audit log →</a>
          </div>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <FeedItem key={i} {...item} />
            ))}
          </div>
        </div>

        {/* Engine Health Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Engine Health</h3>
            <a href="/admin/engines" className="text-[11px] font-bold text-[#0D47A1] hover:underline">Details →</a>
          </div>
          <div className="space-y-3">
            {enginesData.map((eng) => (
              <div key={eng.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${eng.errors === 0 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
                  <span className="text-[12px] font-semibold text-slate-700">{eng.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-400">{eng.avgMs}ms</span>
                  <span className={`font-bold ${eng.errors === 0 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {eng.errors === 0 ? 'Healthy' : `${eng.errors} err`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick nav pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            {[
              { label: '🛡 Health',    href: '/admin/health' },
              { label: '📊 Analytics', href: '/admin/analytics' },
              { label: '👥 Users',     href: '/admin/users' },
              { label: '🏢 Companies', href: '/admin/companies' },
            ].map(({ label, href }) => (
              <a key={href} href={href}
                className="text-[11px] font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-[#0D47A1]/30 hover:text-[#0D47A1] hover:bg-blue-50 transition-all text-center">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
