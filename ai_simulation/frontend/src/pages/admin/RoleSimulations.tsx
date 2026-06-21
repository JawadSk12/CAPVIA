import React, { useState, useEffect } from 'react';
import { Brain, Clock, Layers, ChevronRight, Users, Zap, CheckCircle, Send, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api/client';

const ROLE_ICONS: Record<string, string> = {
    ml_engineer: '🤖',
    backend_developer: '⚙️',
    data_scientist: '📊',
    frontend_developer: '🎨',
    devops_engineer: '🚀',
    full_stack_developer: '🔧',
    java_developer: '☕',
    python_developer: '🐍',
    data_analyst: '📈',
    cybersecurity_analyst: '🔐',
};

const DIFF_COLORS: Record<string, string> = {
    junior: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    mid: 'bg-blue-50 text-blue-600 border-blue-200',
    senior: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

interface Role { key: string; role: string; description: string; difficulty_levels: string[]; total_duration_minutes: number; total_rounds: number; }
interface AssignForm { candidate_email: string; candidate_name: string; difficulty: string; }

export const RoleSimulations: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [form, setForm] = useState<AssignForm>({ candidate_email: '', candidate_name: '', difficulty: 'mid' });
    const [lastResult, setLastResult] = useState<any>(null);

    useEffect(() => {
        apiClient.get('/simulations/roles')
            .then(r => setRoles(r.data.roles))
            .catch(() => toast.error('Failed to load roles'))
            .finally(() => setLoading(false));
    }, []);

    const handleAssign = async () => {
        if (!selectedRole || !form.candidate_email) return toast.error('Email is required');
        setAssigning(true);
        try {
            const r = await apiClient.post('/simulations/assign', {
                role_key: selectedRole.key,
                candidate_email: form.candidate_email,
                candidate_name: form.candidate_name || undefined,
                difficulty: form.difficulty,
            });
            setLastResult(r.data);
            toast.success(`Simulation assigned! Access code: ${r.data.access_code}`);
            setShowAssignModal(false);
            setForm({ candidate_email: '', candidate_name: '', difficulty: 'mid' });
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Assignment failed');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Role Simulations</h1>
                    <p className="text-gray-400 mt-1">Assign pre-built 5-round simulations to candidates by role.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                    <Layers className="h-3.5 w-3.5 text-violet-400" />
                    <span>{roles.length} roles available</span>
                </div>
            </div>

            {/* Success banner */}
            {lastResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-emerald-300 font-semibold">Simulation Assigned Successfully</p>
                        <p className="text-emerald-600/70 text-sm mt-0.5">
                            Candidate: <strong>{lastResult.candidate_email}</strong> · Role: <strong>{lastResult.role}</strong>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Access Code</p>
                        <code className="text-xl font-bold text-white tracking-widest">{lastResult.access_code}</code>
                    </div>
                    <button onClick={() => setLastResult(null)} className="text-gray-500 hover:text-gray-300"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {roles.map(role => (
                    <div
                        key={role.key}
                        className={`bg-gray-900 border rounded-2xl p-6 cursor-pointer transition-all group hover:border-violet-500/50 hover:-translate-y-0.5 ${
                            selectedRole?.key === role.key ? 'border-violet-500 shadow-lg shadow-violet-500/10' : 'border-gray-800'
                        }`}
                        onClick={() => setSelectedRole(selectedRole?.key === role.key ? null : role)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-3xl">{ROLE_ICONS[role.key] || '💼'}</div>
                            <div className="flex gap-1.5">
                                {role.difficulty_levels.map(d => (
                                    <span key={d} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${DIFF_COLORS[d]}`}>{d}</span>
                                ))}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{role.role}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-5">{role.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{role.total_rounds} Rounds</span>
                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{role.total_duration_minutes}m</span>
                            </div>
                            <ChevronRight className={`h-4 w-4 transition-transform ${selectedRole?.key === role.key ? 'text-violet-400 rotate-90' : 'text-gray-600 group-hover:text-gray-400'}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Assign Panel */}
            {selectedRole && (
                <div className="bg-gray-900 border border-violet-500/30 rounded-2xl p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{ROLE_ICONS[selectedRole.key] || '💼'}</span>
                            <div>
                                <h3 className="text-white font-bold">{selectedRole.role}</h3>
                                <p className="text-gray-500 text-xs">{selectedRole.total_rounds} rounds · {selectedRole.total_duration_minutes} minutes</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedRole(null)} className="text-gray-600 hover:text-gray-300"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="md:col-span-1">
                            <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">Candidate Email *</label>
                            <input
                                type="email"
                                value={form.candidate_email}
                                onChange={e => setForm(f => ({ ...f, candidate_email: e.target.value }))}
                                placeholder="candidate@company.com"
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">Full Name</label>
                            <input
                                type="text"
                                value={form.candidate_name}
                                onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))}
                                placeholder="John Doe"
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">Difficulty Level</label>
                            <select
                                value={form.difficulty}
                                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                            >
                                <option value="junior">Junior</option>
                                <option value="mid">Mid-Level</option>
                                <option value="senior">Senior</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleAssign}
                        disabled={assigning || !form.candidate_email}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
                    >
                        {assigning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                        {assigning ? 'Assigning...' : 'Assign Simulation'}
                    </button>
                </div>
            )}
        </div>
    );
};
