import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { apiClient } from '@/services/api/client';
import { toast } from 'react-hot-toast';

const REC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    strong_hire:  { label: '⭐ Strong Hire',  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    hire:         { label: '✅ Hire',          color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
    maybe:        { label: '🤔 Maybe',         color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
    reject:       { label: '❌ Reject',        color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
    pending:      { label: '⏳ Pending',       color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-700' },
};

const RISK_CONFIG: Record<string, string> = {
    low:    'bg-emerald-50 text-emerald-600 border-emerald-200',
    medium: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    high:   'bg-red-50    text-red-600    border-red-200',
};

const ROLE_KEYS = ['ml_engineer','backend_developer','data_scientist','frontend_developer','devops_engineer'];

interface Candidate {
    rank: number;
    session_id: number;
    candidate_name: string;
    candidate_email: string;
    role: string;
    role_key: string;
    difficulty: string;
    total_score: number;
    grade: string;
    recommendation: string;
    behavior_risk: string;
    has_suspicious_activity: boolean;
    completed_at: string | null;
}

export const Rankings: React.FC = () => {
    const [data, setData] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('');
    const [recFilter, setRecFilter] = useState('');

    const load = async (rk = roleFilter) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (rk) params.set('role_key', rk);
            const r = await apiClient.get(`/simulations/leaderboard?${params}`);
            setData(r.data.leaderboard);
        } catch {
            toast.error('Failed to load rankings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = recFilter ? data.filter(d => d.recommendation === recFilter) : data;

    const stats = {
        total: data.length,
        strongHire: data.filter(d => d.recommendation === 'strong_hire').length,
        hire: data.filter(d => d.recommendation === 'hire').length,
        suspicious: data.filter(d => d.has_suspicious_activity).length,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Candidate Rankings</h1>
                    <p className="text-gray-400 mt-1">AI-scored leaderboard across all role simulations.</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Evaluated', value: stats.total,      color: 'text-white' },
                    { label: 'Strong Hire',      value: stats.strongHire, color: 'text-emerald-600' },
                    { label: 'Hire',             value: stats.hire,       color: 'text-blue-600' },
                    { label: 'Flagged',          value: stats.suspicious, color: 'text-red-600' },
                ].map(s => (
                    <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); load(e.target.value); }}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                    <option value="">All Roles</option>
                    {ROLE_KEYS.map(k => <option key={k} value={k}>{k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                </select>
                <select
                    value={recFilter}
                    onChange={e => setRecFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                    <option value="">All Recommendations</option>
                    <option value="strong_hire">Strong Hire</option>
                    <option value="hire">Hire</option>
                    <option value="maybe">Maybe</option>
                    <option value="reject">Reject</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500">
                                    <th className="px-5 py-3 text-left font-semibold">Rank</th>
                                    <th className="px-5 py-3 text-left font-semibold">Candidate</th>
                                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                                    <th className="px-5 py-3 text-left font-semibold">Score</th>
                                    <th className="px-5 py-3 text-left font-semibold">Grade</th>
                                    <th className="px-5 py-3 text-left font-semibold">Risk</th>
                                    <th className="px-5 py-3 text-left font-semibold">Recommendation</th>
                                    <th className="px-5 py-3 text-left font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((c, idx) => {
                                    const rec = REC_CONFIG[c.recommendation] || REC_CONFIG.pending;
                                    return (
                                        <tr key={c.session_id} className="hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                                    idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                                                    idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                                    idx === 2 ? 'bg-orange-500/15 text-orange-600' :
                                                    'bg-gray-800 text-gray-500'
                                                }`}>
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : c.rank}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                                                        {c.candidate_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                                                            {c.candidate_name}
                                                            {c.has_suspicious_activity && <AlertTriangle className="h-3 w-3 text-red-600" />}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{c.candidate_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-xs text-gray-300">{c.role}</p>
                                                <p className="text-[10px] text-gray-600 capitalize">{c.difficulty}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${c.total_score >= 80 ? 'bg-emerald-500' : c.total_score >= 60 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                            style={{ width: `${c.total_score}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-white">{c.total_score.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-lg font-bold text-white">{c.grade}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${RISK_CONFIG[c.behavior_risk] || RISK_CONFIG.low}`}>
                                                    {c.behavior_risk}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${rec.bg} ${rec.color}`}>
                                                    {rec.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-gray-500">
                                                {c.completed_at ? new Date(c.completed_at).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No candidates match the selected filters.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
