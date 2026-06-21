import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { internshipsApi } from '@/services/api';

const STEPS = ['Role & Title', 'Job Details', 'Requirements', 'AI Simulation'];

const Input = ({ label, value, onChange, placeholder, type = 'text', required = false }: any) => (
  <div>
    <label className="block text-sm text-slate-500 mb-1.5">{label}{required && <span className="text-red-600 ml-1">*</span>}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition text-sm" />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 3 }: any) => (
  <div>
    <label className="block text-sm text-slate-500 mb-1.5">{label}</label>
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition text-sm resize-none" />
  </div>
);

const TagInput = ({ label, tags, onAdd, onRemove, placeholder }: any) => {
  const [val, setVal] = useState('');
  const add = () => { if (val.trim()) { onAdd(val.trim()); setVal(''); } };
  return (
    <div>
      <label className="block text-sm text-slate-500 mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder}
          className="flex-1 bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-2.5 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition text-sm" />
        <button type="button" onClick={add} className="px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-500 hover:bg-indigo-100 text-sm transition">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t: string) => (
          <span key={t} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-500">
            {t}
            <button onClick={() => onRemove(t)} className="text-violet-500 hover:text-red-600 transition">×</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export const CreateInternship: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', responsibilities: '', requirements: '',
    required_skills: [] as string[], technologies: [] as string[],
    stipend_min: '', stipend_max: '', duration_months: '', location: '',
    work_mode: 'remote', openings: '1', deadline: '',
    simulation_enabled: false, tags: [] as string[], perks: [] as string[],
  });

  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title) { setError('Internship title is required'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        stipend_min: form.stipend_min ? parseInt(form.stipend_min) : null,
        stipend_max: form.stipend_max ? parseInt(form.stipend_max) : null,
        duration_months: form.duration_months ? parseInt(form.duration_months) : null,
        openings: parseInt(form.openings) || 1,
      };
      const res = await internshipsApi.create(payload);
      navigate(`/hr/internships/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create internship');
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate('/hr/internships')} className="text-sm text-slate-400 hover:text-slate-600 transition mb-4 flex items-center gap-1">← Back to Internships</button>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create Internship</h1>
        <p className="text-slate-500 text-sm">The platform will automatically generate an AI simulation from your internship details</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <button onClick={() => i < step ? setStep(i) : null}
              className={`flex items-center gap-2 text-xs font-medium transition ${i === step ? 'text-indigo-500' : i < step ? 'text-slate-500 cursor-pointer hover:text-gray-200' : 'text-slate-500 cursor-default'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? 'bg-violet-500 text-slate-900' : i < step ? 'bg-violet-500/30 text-indigo-500' : 'bg-slate-100 text-slate-500'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-violet-500/40' : 'bg-slate-100'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-6 space-y-5">
        {/* Step 0: Role & Title */}
        {step === 0 && (
          <>
            <Input label="Internship Title" value={form.title} onChange={(e: any) => upd('title', e.target.value)} placeholder="e.g. ML Engineer Internship" required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1.5">Work Mode</label>
                <select value={form.work_mode} onChange={e => upd('work_mode', e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-violet-500/60 transition text-sm">
                  <option value="remote">Remote</option>
                  <option value="onsite">On-site</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <Input label="Location" value={form.location} onChange={(e: any) => upd('location', e.target.value)} placeholder="e.g. Bangalore" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Duration (months)" value={form.duration_months} onChange={(e: any) => upd('duration_months', e.target.value)} placeholder="3" type="number" />
              <Input label="Openings" value={form.openings} onChange={(e: any) => upd('openings', e.target.value)} placeholder="1" type="number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Stipend (₹/mo)" value={form.stipend_min} onChange={(e: any) => upd('stipend_min', e.target.value)} placeholder="10000" type="number" />
              <Input label="Max Stipend (₹/mo)" value={form.stipend_max} onChange={(e: any) => upd('stipend_max', e.target.value)} placeholder="25000" type="number" />
            </div>
            <Input label="Application Deadline" value={form.deadline} onChange={(e: any) => upd('deadline', e.target.value)} type="date" />
          </>
        )}

        {/* Step 1: Job Details */}
        {step === 1 && (
          <>
            <Textarea label="Job Description" value={form.description} onChange={(e: any) => upd('description', e.target.value)} placeholder="Describe the internship role and what the candidate will be working on..." rows={4} />
            <Textarea label="Responsibilities" value={form.responsibilities} onChange={(e: any) => upd('responsibilities', e.target.value)} placeholder="What will the intern be doing day-to-day? List key responsibilities..." rows={4} />
          </>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <>
            <Textarea label="Requirements" value={form.requirements} onChange={(e: any) => upd('requirements', e.target.value)} placeholder="What qualifications and experience does the candidate need?" rows={3} />
            <TagInput label="Required Skills" tags={form.required_skills} onAdd={(v: string) => upd('required_skills', [...form.required_skills, v])} onRemove={(v: string) => upd('required_skills', form.required_skills.filter((s: string) => s !== v))} placeholder="e.g. Python, React..." />
            <TagInput label="Technologies" tags={form.technologies} onAdd={(v: string) => upd('technologies', [...form.technologies, v])} onRemove={(v: string) => upd('technologies', form.technologies.filter((t: string) => t !== v))} placeholder="e.g. FastAPI, PostgreSQL..." />
          </>
        )}

        {/* Step 3: AI Simulation */}
        {step === 3 && (
          <div className="space-y-5">
            <div className={`relative p-6 rounded-2xl border-2 transition-all ${form.simulation_enabled ? 'border-indigo-300 bg-violet-500/5' : 'border-slate-300/60 bg-slate-100/20'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl">🤖</div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Enable AI Simulation</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      The platform will automatically analyze your internship details and generate a unique 5-round role-based simulation. <strong className="text-gray-200">No questions needed from you.</strong>
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => upd('simulation_enabled', !form.simulation_enabled)}
                  className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ml-4 ${form.simulation_enabled ? 'bg-violet-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.simulation_enabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
              {form.simulation_enabled && (
                <div className="mt-5 grid grid-cols-5 gap-2">
                  {['📋 Requirement Analysis', '💻 Technical Execution', '🏗️ Architecture', '💬 Communication', '🐛 Debugging'].map((r, i) => (
                    <div key={i} className="text-center p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                      <p className="text-lg mb-1">{r.split(' ')[0]}</p>
                      <p className="text-xs text-slate-500 leading-tight">{r.substring(r.indexOf(' ')+1)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!form.simulation_enabled && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-sm">
                💡 Enabling AI Simulation lets candidates complete a structured assessment. Without it, you only get applications with cover letters.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/hr/internships')}
          className="px-5 py-2.5 rounded-xl border border-slate-300/60 text-slate-600 hover:text-slate-900 hover:border-gray-600 transition text-sm">
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)}
            className="px-6 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-500 hover:bg-indigo-100 text-sm font-medium transition">
            Continue →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-slate-900 text-sm font-semibold transition disabled:opacity-50 shadow-lg shadow-violet-500/20">
            {loading ? 'Creating...' : '🚀 Create Internship'}
          </button>
        )}
      </div>
    </div>
  );
};
