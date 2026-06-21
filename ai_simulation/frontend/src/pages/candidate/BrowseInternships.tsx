import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { internshipsApi } from '@/services/api';

export const BrowseInternships: React.FC = () => {
  const navigate = useNavigate();
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'simulation'>('all');

  useEffect(() => { internshipsApi.list({ limit: 50 }).then(r => setInternships(r.data || [])).finally(() => setLoading(false)); }, []);

  const filtered = internships.filter(i => {
    const q = search.toLowerCase();
    const match = !q || i.title.toLowerCase().includes(q) || (i.detected_role || '').toLowerCase().includes(q) || (i.required_skills || []).some((s: string) => s.toLowerCase().includes(q));
    const sim = filter === 'simulation' ? i.simulation_enabled : true;
    return match && sim;
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Browse Internships</h1>
        <p className="text-slate-500 text-sm">{filtered.length} open opportunities</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, role, skill..."
          className="flex-1 max-w-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 text-sm" />
        <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
          {(['all', 'simulation'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filter === f ? 'bg-blue-50 text-blue-500 border border-blue-200' : 'text-slate-500 hover:text-slate-900'}`}>
              {f === 'simulation' ? '🤖 With AI Sim' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading internships...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-slate-900 font-semibold">No internships found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(i => (
            <div key={i.id} onClick={() => navigate(`/candidate/internships/${i.id}`)}
              className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">💼</div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-500 transition">{i.title}</h3>
                    <p className="text-xs text-slate-400">{i.company?.name || 'Company'}</p>
                  </div>
                </div>
                {i.simulation_enabled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex-shrink-0">🤖 AI Sim</span>
                )}
              </div>

              {i.description && <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{i.description}</p>}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {(i.required_skills || []).slice(0, 4).map((s: string) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300">{s}</span>
                ))}
                {(i.required_skills || []).length > 4 && <span className="text-xs text-slate-400">+{i.required_skills.length - 4} more</span>}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="capitalize">{i.work_mode}</span>
                  {i.location && <span>📍 {i.location}</span>}
                  {i.duration_months && <span>⏱ {i.duration_months}mo</span>}
                </div>
                <div className="flex items-center gap-2">
                  {i.stipend_min && (
                    <span className="text-blue-600 font-medium">₹{i.stipend_min.toLocaleString()}–{i.stipend_max?.toLocaleString()}/mo</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
