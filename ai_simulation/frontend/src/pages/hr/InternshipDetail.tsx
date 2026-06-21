import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipsApi } from '@/services/api';

export const InternshipDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [internship, setInternship] = useState<any>(null);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'simulation' | 'applicants'>('overview');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      internshipsApi.get(parseInt(id)),
      internshipsApi.getApplications(parseInt(id)).catch(() => ({ data: { applications: [] } })),
    ]).then(([iRes, aRes]) => {
      setInternship(iRes.data);
      setApplications(aRes.data.applications || []);
      if (iRes.data.blueprint_id) {
        internshipsApi.getBlueprint(parseInt(id)).then(r => setBlueprint(r.data)).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const generateSim = async () => {
    setGenerating(true);
    try {
      await internshipsApi.generateSimulation(parseInt(id!));
      const r = await internshipsApi.getBlueprint(parseInt(id!));
      setBlueprint(r.data);
      setInternship((prev: any) => ({ ...prev, simulation_enabled: true }));
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!internship) return <div className="p-8 text-center text-slate-500">Internship not found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/hr/internships')} className="text-sm text-slate-400 hover:text-slate-600 transition mb-6 flex items-center gap-1">← All Internships</button>

      {/* Header */}
      <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl">💼</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{internship.title}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{internship.company?.name} · {internship.work_mode} · {internship.location}</p>
              <div className="flex items-center gap-2 mt-2">
                {internship.simulation_enabled && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">🤖 AI Simulation Active</span>}
                {internship.detected_role && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600">{internship.detected_role}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${internship.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>{internship.status}</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate(`/hr/internships/${id}/rankings`)}
            className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-500 hover:bg-indigo-100 text-sm font-medium transition">
            View Rankings →
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Applicants', val: applications.length },
            { label: 'Openings', val: internship.openings },
            { label: 'Duration', val: `${internship.duration_months}mo` },
            { label: 'Stipend', val: internship.stipend_min ? `₹${internship.stipend_min.toLocaleString()}` : 'Unpaid' },
          ].map(s => (
            <div key={s.label} className="bg-slate-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{s.val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {(['overview', 'simulation', 'applicants'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-indigo-50 text-indigo-500 border border-indigo-200' : 'text-slate-500 hover:text-slate-900'}`}>
            {t === 'simulation' ? '🤖 Simulation' : t === 'applicants' ? `👥 Applicants (${applications.length})` : 'Overview'}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {internship.description && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{internship.description}</p>
            </div>
          )}
          {internship.responsibilities && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Responsibilities</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{internship.responsibilities}</p>
            </div>
          )}
          {(internship.required_skills || []).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {internship.required_skills.map((s: string) => (
                  <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-500">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simulation */}
      {tab === 'simulation' && (
        <div className="space-y-4">
          {!internship.simulation_enabled ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <p className="text-slate-900 font-semibold mb-2">AI Simulation Not Enabled</p>
              <p className="text-slate-500 text-sm mb-6">Enable AI simulation to automatically generate a 5-round role-based assessment for candidates.</p>
              <button onClick={generateSim} disabled={generating}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 text-slate-900 font-semibold text-sm transition disabled:opacity-50 shadow-lg shadow-violet-500/20">
                {generating ? 'Generating...' : '🚀 Generate AI Simulation'}
              </button>
            </div>
          ) : blueprint ? (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Simulation Blueprint</h3>
                  <div className="flex gap-2 text-xs text-slate-400">
                    <span>{blueprint.total_duration_minutes} min</span>
                    <span>·</span>
                    <span>{blueprint.total_tasks} tasks</span>
                    <span>·</span>
                    <span className="text-indigo-600">{blueprint.role_name}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {(blueprint.rounds || []).map((round: any) => (
                    <div key={round.round_number} className="bg-slate-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">R{round.round_number}</span>
                          <span className="text-sm font-medium text-slate-900">{round.name}</span>
                        </div>
                        <span className="text-xs text-slate-400">{round.duration_minutes} min · {round.tasks?.length || 0} tasks</span>
                      </div>
                      <p className="text-xs text-slate-500">{round.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(round.tasks || []).map((t: any) => (
                          <span key={t.id} className="text-xs px-2 py-0.5 rounded bg-slate-200/60 text-slate-500">{t.title}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">Loading blueprint...</div>
          )}
        </div>
      )}

      {/* Applicants */}
      {tab === 'applicants' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {applications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No applicants yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.map((a: any) => (
                <div key={a.application_id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-500">
                      {(a.candidate_name || 'C')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.candidate_name}</p>
                      <p className="text-xs text-slate-400">{a.candidate_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.final_score && <span className="text-sm font-bold text-slate-900">{a.final_score}/100</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${a.status === 'simulation_completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                      {a.status?.replace(/_/g, ' ')}
                    </span>
                    {a.attempt_id && (
                      <button onClick={() => navigate(`/hr/internships/${id}/reports/${a.candidate_id}`)}
                        className="text-xs text-indigo-600 hover:text-indigo-500 transition">Report →</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
