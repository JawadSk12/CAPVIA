import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { internshipsApi } from '@/services/api';

export const HRInternships: React.FC = () => {
  const navigate = useNavigate();
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { internshipsApi.list().then(r => setInternships(r.data)).finally(() => setLoading(false)); }, []);

  const filtered = internships.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Internships</h1>
          <p className="text-slate-500 text-sm mt-0.5">{internships.length} internship{internships.length !== 1 ? 's' : ''} posted</p>
        </div>
        <button onClick={() => navigate('/hr/internships/create')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-slate-900 text-sm font-semibold transition shadow-lg shadow-violet-500/20">
          + Create Internship
        </button>
      </div>

      <div className="mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search internships..."
          className="w-full max-w-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-violet-500/60 text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">💼</p>
          <p className="text-slate-900 font-semibold mb-2">No internships yet</p>
          <p className="text-slate-500 text-sm mb-6">Create your first internship and let AI build the simulation</p>
          <button onClick={() => navigate('/hr/internships/create')} className="px-5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-500 hover:bg-indigo-100 text-sm font-medium transition">+ Create Internship</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(i => (
            <div key={i.id} onClick={() => navigate(`/hr/internships/${i.id}`)}
              className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-indigo-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">💼</div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-500 transition">{i.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{i.company?.name || 'CapviaAI'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${i.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>{i.status}</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                {i.simulation_enabled && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">🤖 AI Simulation</span>}
                {i.detected_role && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600">{i.detected_role}</span>}
                {i.work_mode && <span className="text-xs text-slate-400 capitalize">{i.work_mode}</span>}
              </div>

              <div className="flex items-center gap-2 mb-3">
                {(i.required_skills || []).slice(0, 3).map((s: string) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300">{s}</span>
                ))}
                {(i.required_skills || []).length > 3 && <span className="text-xs text-slate-400">+{i.required_skills.length - 3}</span>}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{i.applications_count || 0} applicants</span>
                <div className="flex items-center gap-3">
                  {i.stipend_min && <span>₹{i.stipend_min.toLocaleString()}–{i.stipend_max?.toLocaleString()}/mo</span>}
                  <span>{i.duration_months}mo</span>
                  <button onClick={e => { e.stopPropagation(); navigate(`/hr/internships/${i.id}/rankings`); }}
                    className="text-indigo-600 hover:text-indigo-500 transition font-medium">Rankings →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
