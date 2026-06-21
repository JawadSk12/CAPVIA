import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { applicationsApi, internshipsApi } from '@/services/api';

export const CandidateDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      applicationsApi.myApplications().catch(() => ({ data: [] })),
      internshipsApi.list({ limit: 3 }).catch(() => ({ data: [] })),
    ]).then(async ([aRes, iRes]) => {
      const apps: any[] = aRes.data || [];
      setFeatured(iRes.data || []);
      const ids = [...new Set(apps.map((a: any) => a.internship_id))] as number[];
      const internshipMap: Record<number, any> = {};
      await Promise.all(ids.map(id =>
        internshipsApi.get(id).then(r => { internshipMap[id] = r.data; }).catch(() => {})
      ));
      setApplications(apps.map((a: any) => ({ ...a, internship: internshipMap[a.internship_id] || null })));
    }).finally(() => setLoading(false));
  }, []);

  const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    applied:              { label: 'Applied',        bg: 'var(--blue-light)',   color: 'var(--blue)',   border: 'var(--blue-border)' },
    simulation_invited:   { label: 'Invited',        bg: 'var(--accent-light)', color: 'var(--accent)', border: 'var(--accent-border)' },
    simulation_started:   { label: 'Sim Started',    bg: 'var(--accent-light)', color: 'var(--accent)', border: 'var(--accent-border)' },
    simulation_completed: { label: 'Completed ✓',   bg: 'var(--green-light)',  color: 'var(--green)',  border: 'var(--green-border)' },
    shortlisted:          { label: 'Shortlisted ⭐', bg: 'var(--amber-light)',  color: 'var(--amber)',  border: 'var(--amber-border)' },
    hired:                { label: 'Hired 🎉',       bg: 'var(--green-light)',  color: 'var(--green)',  border: 'var(--green-border)' },
    rejected:             { label: 'Not Selected',   bg: 'var(--red-light)',    color: 'var(--red)',    border: 'var(--red-border)' },
  };

  const canStartSim = (s: string) => ['applied', 'simulation_invited', 'simulation_started'].includes(s);

  const handleStartSim = async (appId: number) => {
    try {
      const r = await applicationsApi.startSimulation(appId);
      navigate(`/simulation/${r.data.attempt_id}`);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Could not start simulation');
    }
  };

  const stats = [
    { label: 'Total Applications',    value: applications.length,                                                           icon: '📋', color: 'var(--accent)' },
    { label: 'Simulations Completed', value: applications.filter(a => a.status === 'simulation_completed').length,          icon: '🤖', color: 'var(--green)' },
    { label: 'Shortlisted',           value: applications.filter(a => ['shortlisted','hired'].includes(a.status)).length,   icon: '⭐', color: 'var(--amber)' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Hey {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'} 👋
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Track your applications and simulation progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl p-5 transition hover:shadow-md"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: 'var(--bg-muted)' }}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Applications */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>My Applications</h2>

        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-4xl mb-3">🎓</p>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No applications yet</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Browse open internships and apply to get started</p>
            <button onClick={() => navigate('/candidate/internships')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              Browse Internships →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app: any) => {
              const sc = statusConfig[app.status] || { label: app.status, bg: 'var(--bg-muted)', color: 'var(--text-secondary)', border: 'var(--border)' };
              return (
                <div key={app.id} className="rounded-2xl p-4 flex items-center justify-between transition hover:shadow-md"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: 'var(--accent-light)' }}>💼</div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {app.internship?.title || `Internship #${app.internship_id}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {app.internship?.company?.name || 'CapviaAI'} · Applied {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.final_score && (
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {parseFloat(app.final_score).toFixed(1)}/100
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                    {canStartSim(app.status) && (
                      <button onClick={() => handleStartSim(app.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition hover:shadow-sm"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        {app.status === 'simulation_started' ? 'Resume →' : 'Start Sim →'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Internships */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Open Internships</h2>
          <button onClick={() => navigate('/candidate/internships')}
            className="text-sm font-medium transition"
            style={{ color: 'var(--accent)' }}>
            View all →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featured.map((i: any) => (
            <div key={i.id} onClick={() => navigate(`/candidate/internships/${i.id}`)}
              className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md group"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--blue-light)' }}>💼</div>
                <div>
                  <p className="text-sm font-semibold transition" style={{ color: 'var(--text-primary)' }}>{i.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{i.company?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {i.simulation_enabled && (
                  <span className="px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>
                    🤖 AI Sim
                  </span>
                )}
                {i.work_mode && (
                  <span className="px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {i.work_mode}
                  </span>
                )}
                {i.stipend_min && (
                  <span style={{ color: 'var(--text-secondary)' }}>₹{i.stipend_min.toLocaleString()}/mo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
