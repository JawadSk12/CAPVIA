import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { internshipsApi } from '@/services/api';

interface StatCard { label: string; value: string | number; icon: string; color: string; delta?: string; }

const StatCard: React.FC<StatCard> = ({ label, value, icon, color, delta }) => (
  <div className={`bg-white backdrop-blur border border-slate-200 rounded-2xl p-5`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-lg`}>{icon}</div>
      {delta && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">{delta}</span>}
    </div>
    <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

export const HRDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    internshipsApi.list().then(r => setInternships(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const active = internships.filter(i => i.status === 'active').length;
  const totalApps = internships.reduce((sum, i) => sum + (i.applications_count || 0), 0);
  const withSim = internships.filter(i => i.simulation_enabled).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'HR'} 👋
          </h1>
          <p className="text-slate-500 text-sm">{user?.organization} · HR Dashboard</p>
        </div>
        <button onClick={() => navigate('/hr/internships/create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:opacity-90 text-white text-sm font-semibold transition shadow-lg shadow-violet-500/20">
          + Create Internship
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Internships" value={active} icon="💼" color="bg-indigo-50" delta="+2 this week" />
        <StatCard label="Total Applicants" value={totalApps} icon="👥" color="bg-blue-50" delta={`+${Math.floor(totalApps * 0.1)} new`} />
        <StatCard label="AI Simulations" value={withSim} icon="🤖" color="bg-emerald-50" />
        <StatCard label="Internships Posted" value={internships.length} icon="📋" color="bg-orange-50" />
      </div>

      {/* Internship table */}
      <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Your Internships</h2>
          <button onClick={() => navigate('/hr/internships')} className="text-sm text-indigo-600 hover:text-indigo-500 transition">View all →</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : internships.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">💼</div>
            <p className="text-slate-900 font-semibold mb-2">No internships yet</p>
            <p className="text-slate-500 text-sm mb-6">Create your first internship and let AI generate the simulation</p>
            <button onClick={() => navigate('/hr/internships/create')}
              className="px-5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-500 hover:bg-indigo-100 text-sm font-medium transition">
              + Create Internship
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {internships.slice(0, 5).map(i => (
              <div key={i.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                onClick={() => navigate(`/hr/internships/${i.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-sm">💼</div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{i.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{i.detected_role || i.title}</span>
                      {i.simulation_enabled && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">AI Sim</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{i.applications_count || 0}</p>
                    <p className="text-xs text-slate-400">applicants</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${i.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                    {i.status}
                  </span>
                  <span className="text-slate-500">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      {internships.length === 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Create Internship', desc: 'Fill in role details, skills, and responsibilities', icon: '📝' },
            { step: '02', title: 'Enable AI Simulation', desc: 'Platform auto-generates a unique 5-round simulation', icon: '🤖' },
            { step: '03', title: 'Get Ranked Reports', desc: 'View AI-evaluated rankings with cheating analysis', icon: '📊' },
          ].map(s => (
            <div key={s.step} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-indigo-600">{s.step}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{s.title}</h3>
              <p className="text-xs text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
