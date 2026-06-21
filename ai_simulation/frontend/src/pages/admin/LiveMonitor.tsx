import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, AlertTriangle, Eye, Clock, Activity, Shield, Users } from 'lucide-react';

interface SessionTelemetry {
    session_id: number;
    candidate_name?: string;
    candidate_email?: string;
    role?: string;
    tab_switches?: number;
    paste_count?: number;
    current_round?: number;
    time_remaining?: number;
    last_heartbeat?: string;
    risk_level?: string;
    is_idle?: boolean;
}

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
    const c = level === 'high' ? 'bg-red-500/15 text-red-600 border-red-200'
            : level === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/15 text-emerald-600 border-emerald-200';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${c}`}>{level || 'low'}</span>;
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const LiveMonitor: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const [sessions, setSessions] = useState<Record<number, SessionTelemetry>>({});
    const [alerts, setAlerts] = useState<Array<{ id: number; session_id: number; message: string; severity: string; time: string }>>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const alertIdRef = useRef(0);

    const addAlert = (session_id: number, message: string, severity: string) => {
        setAlerts(prev => [
            { id: ++alertIdRef.current, session_id, message, severity, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 49)
        ]);
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token') || '';
        const wsUrl = `ws://localhost:8000/api/v1/ws/admin?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'snapshot') {
                const snap: Record<number, SessionTelemetry> = {};
                for (const sid of data.active_sessions) snap[sid] = data.telemetry[sid] || { session_id: sid };
                setSessions(snap);
            }

            if (data.type === 'telemetry_update') {
                setSessions(prev => ({ ...prev, [data.session_id]: { session_id: data.session_id, ...data.data } }));
            }

            if (data.type === 'behavioral_alert') {
                const evType = data.event?.event_type || 'unknown';
                const severity = data.event?.severity || 'medium';
                addAlert(data.session_id, `Session ${data.session_id}: ${evType.replace(/_/g, ' ')}`, severity);
                setSessions(prev => {
                    const s = prev[data.session_id] || { session_id: data.session_id };
                    return { ...prev, [data.session_id]: { ...s, risk_level: severity === 'high' ? 'high' : s.risk_level } };
                });
            }

            if (data.type === 'candidate_disconnected') {
                setSessions(prev => { const n = { ...prev }; delete n[data.session_id]; return n; });
                addAlert(data.session_id, `Session ${data.session_id} disconnected`, 'medium');
            }
        };

        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);

        const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' })); }, 10000);

        return () => { clearInterval(ping); ws.close(); };
    }, []);

    const activeSessions = Object.values(sessions);
    const highRisk = activeSessions.filter(s => s.risk_level === 'high').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Live Monitor</h1>
                    <p className="text-gray-400 mt-1">Real-time proctoring telemetry for all active sessions.</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
                    connected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                    {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                    {connected ? 'Live' : 'Disconnected'}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Active Sessions', value: activeSessions.length, icon: Users, color: 'text-blue-600' },
                    { label: 'High Risk', value: highRisk, icon: AlertTriangle, color: 'text-red-600' },
                    { label: 'Alerts', value: alerts.length, icon: Activity, color: 'text-amber-400' },
                ].map(stat => (
                    <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        <div>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Session Cards */}
                <div className="lg:col-span-3 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Candidates</h2>
                    {activeSessions.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                            <Eye className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500">No active sessions</p>
                            <p className="text-gray-600 text-sm mt-1">Sessions will appear here when candidates start their simulation.</p>
                        </div>
                    ) : (
                        activeSessions.map(s => (
                            <div key={s.session_id} className={`bg-gray-900 border rounded-xl p-5 transition-all ${
                                s.risk_level === 'high' ? 'border-red-500/40 shadow-red-500/5 shadow-lg' : 'border-gray-800'
                            }`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-white text-sm">{s.candidate_name || `Session ${s.session_id}`}</p>
                                            <RiskBadge level={s.risk_level || 'low'} />
                                        </div>
                                        <p className="text-gray-500 text-xs">{s.role || 'Unknown Role'} · Session #{s.session_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                            <Clock className="h-3 w-3" />
                                            {s.time_remaining ? formatTime(s.time_remaining) : '--:--'}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-0.5">Round {s.current_round || 1}/5</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-gray-800 rounded-lg py-2">
                                        <p className="text-lg font-bold text-white">{s.tab_switches || 0}</p>
                                        <p className="text-[10px] text-gray-500">Tab Switches</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg py-2">
                                        <p className="text-lg font-bold text-white">{s.paste_count || 0}</p>
                                        <p className="text-[10px] text-gray-500">Paste Events</p>
                                    </div>
                                    <div className={`rounded-lg py-2 ${s.is_idle ? 'bg-amber-500/10' : 'bg-gray-800'}`}>
                                        <p className={`text-lg font-bold ${s.is_idle ? 'text-amber-400' : 'text-white'}`}>{s.is_idle ? 'IDLE' : 'Active'}</p>
                                        <p className="text-[10px] text-gray-500">Status</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Alert Feed */}
                <div className="lg:col-span-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Alert Feed</h2>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="max-h-[500px] overflow-y-auto">
                            {alerts.length === 0 ? (
                                <div className="p-6 text-center">
                                    <Shield className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No alerts yet</p>
                                </div>
                            ) : (
                                alerts.map(a => (
                                    <div key={a.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-800 last:border-0 ${
                                        a.severity === 'high' ? 'bg-red-500/5' : a.severity === 'medium' ? 'bg-amber-500/5' : ''
                                    }`}>
                                        <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                                            a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-400' : 'text-gray-500'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-300 truncate">{a.message}</p>
                                            <p className="text-[10px] text-gray-600 mt-0.5">{a.time}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
