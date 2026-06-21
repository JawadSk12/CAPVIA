import React, { useState, useEffect } from 'react';
import {
    Users, Clock, CheckCircle, AlertTriangle, TrendingUp,
    ArrowUpRight, ArrowDownRight, Brain, Trophy, Zap
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { adminApi } from '@/services/api/admin';
import { useNavigate } from 'react-router-dom';

const WEEK_DATA = [
    { day: 'Mon', sessions: 12, completed: 9 },
    { day: 'Tue', sessions: 18, completed: 14 },
    { day: 'Wed', sessions: 15, completed: 11 },
    { day: 'Thu', sessions: 25, completed: 20 },
    { day: 'Fri', sessions: 32, completed: 26 },
    { day: 'Sat', sessions: 10, completed: 8 },
    { day: 'Sun', sessions: 8, completed: 6 },
];

const SCORE_DATA = [
    { range: '0–20', count: 4, fill: '#ef4444' },
    { range: '21–40', count: 8, fill: '#f97316' },
    { range: '41–60', count: 18, fill: '#eab308' },
    { range: '61–80', count: 32, fill: '#3b82f6' },
    { range: '81–100', count: 14, fill: '#22c55e' },
];

const REC_DATA = [
    { name: 'Strong Hire', value: 14, fill: '#22c55e' },
    { name: 'Hire',        value: 22, fill: '#3b82f6' },
    { name: 'Maybe',       value: 18, fill: '#eab308' },
    { name: 'Reject',      value: 26, fill: '#ef4444' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs">
            <p className="text-gray-400 mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
            ))}
        </div>
    );
};

interface StatCardProps { title: string; value: string | number; trend: number; icon: React.ReactNode; }
const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon }) => {
    const up = trend >= 0;
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-gray-800 rounded-xl">{icon}</div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(trend)}%
                </span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{title}</p>
        </div>
    );
};

const REC_STYLES: Record<string, string> = {
    strong_hire: 'bg-emerald-50 text-emerald-600',
    hire:        'bg-blue-50 text-blue-600',
    maybe:       'bg-amber-500/10 text-amber-400',
    reject:      'bg-red-50 text-red-600',
    pending:     'bg-gray-500/10 text-gray-400',
};
const REC_LABELS: Record<string, string> = {
    strong_hire: '⭐ Strong Hire', hire: '✅ Hire', maybe: '🤔 Maybe', reject: '❌ Reject', pending: '⏳ Pending',
};

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        adminApi.getDashboard()
            .then(setStats)
            .catch(() => setStats({
                total_candidates: 1248, active_sessions: 12, avg_score: 68.5, flagged_sessions: 4,
                trends: { candidates: 12.5, sessions: 5.2, score: -1.4, flagged: -25.0 },
                recent_sessions: [
                    { id: 1, name: 'Aisha Patel',   email: 'aisha.patel@demo.com',   role: 'ML Engineer',        status: 'completed', score: 91.2, recommendation: 'strong_hire', date: new Date().toISOString() },
                    { id: 2, name: 'Alex Kim',       email: 'alex.kim@demo.com',       role: 'ML Engineer',        status: 'completed', score: 93.0, recommendation: 'reject',      date: new Date().toISOString() },
                    { id: 3, name: 'Carlos Rivera',  email: 'carlos.rivera@demo.com',  role: 'ML Engineer',        status: 'completed', score: 87.4, recommendation: 'hire',        date: new Date().toISOString() },
                    { id: 4, name: 'Natasha Ivanova','email': 'natasha.ivanova@demo.com','role': 'ML Engineer', status: 'completed', score: 91.5, recommendation: 'reject',      date: new Date().toISOString() },
                ],
            }));
    }, []);

    if (!stats) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-7">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Analytics Overview</h1>
                    <p className="text-gray-400 mt-1">Platform-wide assessment intelligence.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/admin/simulations')}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                    >
                        <Zap className="h-4 w-4" /> Assign Simulation
                    </button>
                    <button
                        onClick={() => navigate('/admin/rankings')}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-gray-700"
                    >
                        <Trophy className="h-4 w-4" /> View Rankings
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Total Candidates"      value={stats.total_candidates.toLocaleString()} trend={stats.trends.candidates}  icon={<Users className="h-5 w-5 text-blue-600" />} />
                <StatCard title="Active Sessions"       value={stats.active_sessions}                   trend={stats.trends.sessions}    icon={<Clock className="h-5 w-5 text-violet-400" />} />
                <StatCard title="Avg. Score"            value={`${stats.avg_score}%`}                   trend={stats.trends.score}       icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} />
                <StatCard title="Flagged for Review"    value={stats.flagged_sessions}                  trend={stats.trends.flagged}     icon={<AlertTriangle className="h-5 w-5 text-red-600" />} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Session trend */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-5">Session Activity — This Week</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={WEEK_DATA}>
                                <defs>
                                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="sessions"  stroke="#7c3aed" strokeWidth={2} fill="url(#g1)" name="Sessions" />
                                <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} fill="none" name="Completed" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recommendations donut */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-5">Hiring Recommendations</h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={REC_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                                    {REC_DATA.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        {REC_DATA.map(r => (
                            <div key={r.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ background: r.fill }} />
                                    <span className="text-gray-400">{r.name}</span>
                                </div>
                                <span className="text-gray-300 font-semibold">{r.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Score Distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-5">Score Distribution</h3>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={SCORE_DATA} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Candidates">
                                {SCORE_DATA.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Assessments */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Recent Assessments</h3>
                    <button onClick={() => navigate('/admin/rankings')} className="text-xs text-violet-400 hover:text-violet-300 font-semibold">View All →</button>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-800">
                            <th className="px-6 py-3 text-left font-semibold">Candidate</th>
                            <th className="px-6 py-3 text-left font-semibold">Role</th>
                            <th className="px-6 py-3 text-left font-semibold">Score</th>
                            <th className="px-6 py-3 text-left font-semibold">Recommendation</th>
                            <th className="px-6 py-3 text-left font-semibold">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stats.recent_sessions.map((s: any) => (
                            <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.name}</p>
                                            <p className="text-xs text-gray-500">{s.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3.5 text-sm text-gray-400">{s.role}</td>
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${s.score >= 80 ? 'bg-emerald-500' : s.score >= 60 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                                        </div>
                                        <span className="text-sm font-bold text-white">{s.score ? `${s.score}%` : '—'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3.5">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${REC_STYLES[s.recommendation] || REC_STYLES.pending}`}>
                                        {REC_LABELS[s.recommendation] || '—'}
                                    </span>
                                </td>
                                <td className="px-6 py-3.5 text-xs text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
