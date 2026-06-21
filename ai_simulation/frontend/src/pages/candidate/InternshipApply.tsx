import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipsApi, applicationsApi } from '@/services/api';

export const InternshipApply: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [internship, setInternship] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    internshipsApi.get(parseInt(id!)).then(r => setInternship(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    setApplying(true); setError('');
    try {
      const res = await applicationsApi.apply(parseInt(id!), { cover_letter: coverLetter });
      setApplicationId(res.data.id);
      setApplied(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply');
    } finally { setApplying(false); }
  };

  const handleStartSim = async () => {
    if (!applicationId) return;
    try {
      const res = await applicationsApi.startSimulation(applicationId);
      navigate(`/simulation/${res.data.attempt_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not start simulation');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!internship) return <div className="p-8 text-center text-slate-500">Internship not found</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={() => navigate('/candidate/internships')} className="text-sm text-slate-400 hover:text-slate-600 transition mb-6 flex items-center gap-1">← Browse Internships</button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl">💼</div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{internship.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{internship.company?.name} · {internship.work_mode} · {internship.location}</p>
            <div className="flex items-center gap-2 mt-2">
              {internship.simulation_enabled && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">🤖 AI Simulation Included</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Duration', val: `${internship.duration_months || '?'}mo` },
            { label: 'Stipend', val: internship.stipend_min ? `₹${internship.stipend_min.toLocaleString()}/mo` : 'Unpaid' },
            { label: 'Openings', val: internship.openings || 1 },
          ].map(s => (
            <div key={s.label} className="bg-slate-100 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-slate-900">{s.val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {internship.description && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">About this Internship</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{internship.description}</p>
        </div>
      )}

      {internship.responsibilities && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Responsibilities</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{internship.responsibilities}</p>
        </div>
      )}

      {(internship.required_skills || []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {internship.required_skills.map((s: string) => (
              <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-500">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI Simulation Info */}
      {internship.simulation_enabled && (
        <div className="bg-indigo-600/5 border border-indigo-200 rounded-2xl p-5 mb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-sm font-semibold text-indigo-500 mb-1">AI Simulation Required</h3>
              <p className="text-xs text-slate-500 leading-relaxed">After applying, you'll complete a 5-round AI-generated simulation tailored for <strong className="text-slate-900">{internship.title}</strong>. The simulation tests your real skills — no prep needed.</p>
              <div className="flex gap-2 mt-3">
                {['📋 Analysis', '💻 Coding', '🏗️ Architecture', '💬 Communication', '🐛 Debugging'].map(r => (
                  <span key={r} className="text-xs px-2 py-1 rounded bg-indigo-50 border border-indigo-300/15 text-indigo-600">{r}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      {!applied ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Cover Letter <span className="text-slate-500 text-xs">(optional)</span></h2>
          <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
            placeholder="Tell us why you're excited about this role and what you'll bring to the team..."
            rows={4}
            className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 transition text-sm resize-none mb-4" />
          <button onClick={handleApply} disabled={applying}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:opacity-90 text-white font-semibold transition disabled:opacity-50 shadow-lg shadow-indigo-200 text-sm">
            {applying ? 'Submitting Application...' : 'Apply Now'}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-500 text-sm mb-6">
            {internship.simulation_enabled
              ? 'Ready to start your AI simulation? It will take about 90 minutes.'
              : 'Your application is under review. We\'ll notify you of any updates.'}
          </p>
          {internship.simulation_enabled && (
            <button onClick={handleStartSim}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:opacity-90 text-white font-semibold transition shadow-lg shadow-indigo-200 text-sm">
              🚀 Start AI Simulation
            </button>
          )}
          <button onClick={() => navigate('/candidate/dashboard')} className="block mt-3 text-sm text-slate-400 hover:text-slate-600 transition mx-auto">
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
