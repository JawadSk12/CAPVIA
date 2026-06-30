'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { internshipApi, companyApi } from '../../../services/api';
import { Company } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';

type Step = 1 | 2 | 3;

interface WizardData {
  // Step 1 — Basic Info
  company_id: string;
  title: string;
  description: string;
  experience_level: string;
  status: string;
  // Step 2 — Details
  responsibilities: string[];
  required_skills: string[];
  technologies: string[];
  work_mode: string;
  location: string;
  duration_weeks: string;
  // Step 3 — Settings
  stipend_min: string;
  stipend_max: string;
  stipend_currency: string;
  openings: string;
  application_limit: string;
  application_deadline: string;
}

const defaultData: WizardData = {
  company_id: '', title: '', description: '', experience_level: 'ENTRY', status: 'DRAFT',
  responsibilities: [], required_skills: [], technologies: [],
  work_mode: 'ONSITE', location: '', duration_weeks: '',
  stipend_min: '', stipend_max: '', stipend_currency: 'INR',
  openings: '1', application_limit: '', application_deadline: '',
};

export default function CreateInternshipPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <CreateInternshipContent />
    </ProtectedRoute>
  );
}

function CreateInternshipContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [createNewCompany, setCreateNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    companyApi.listMine().then((res: any) => {
      const list = res.companies || [];
      setCompanies(list);
      if (list.length === 0) {
        setCreateNewCompany(true);
      }
    }).catch(() => {});
  }, []);

  const update = (field: keyof WizardData, val: any) => setData((d) => ({ ...d, [field]: val }));

  const addTag = (field: 'responsibilities' | 'required_skills' | 'technologies', val: string) => {
    if (!val.trim()) return;
    setData((d) => ({ ...d, [field]: [...(d[field] as string[]), val.trim()] }));
  };

  const removeTag = (field: 'responsibilities' | 'required_skills' | 'technologies', idx: number) => {
    setData((d) => ({ ...d, [field]: (d[field] as string[]).filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (publishNow = false) => {
    setIsSubmitting(true);
    setError(null);
    try {
      let companyId = data.company_id;
      if (createNewCompany) {
        if (!newCompanyName.trim()) {
          throw new Error('Company name is required.');
        }
        const createdCompany = await companyApi.create({ name: newCompanyName.trim() });
        companyId = createdCompany.id;
      }

      const payload = {
        company_id: companyId,
        title: data.title,
        description: data.description || undefined,
        responsibilities: data.responsibilities,
        required_skills: data.required_skills,
        technologies: data.technologies,
        experience_level: data.experience_level,
        status: publishNow ? 'PUBLISHED' : 'DRAFT',
        work_mode: data.work_mode,
        location: data.location || undefined,
        duration_weeks: data.duration_weeks ? Number(data.duration_weeks) : undefined,
        stipend_min: data.stipend_min ? Number(data.stipend_min) : undefined,
        stipend_max: data.stipend_max ? Number(data.stipend_max) : undefined,
        stipend_currency: data.stipend_currency,
        openings: Number(data.openings) || 1,
        application_limit: data.application_limit ? Number(data.application_limit) : undefined,
        application_deadline: data.application_deadline || undefined,
      };
      const result = await internshipApi.create(payload);
      router.push(`/internships/${result.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e.message || 'Failed to create internship.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: '40px' }}>
      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/internships" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Internships</Link>
        <h1 style={{ margin: '12px 0 4px', fontSize: '28px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Post New Internship
        </h1>
        <p style={{ margin: '0 0 32px', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Fill in the details to attract the best candidates</p>

        {/* Step Progress */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', alignItems: 'center' }}>
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0, background: step >= s ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : 'rgba(255,255,255,0.08)', color: step >= s ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease', boxShadow: step === s ? '0 0 20px rgba(167,139,250,0.5)' : 'none' }}>
                {s}
              </div>
              <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 600, color: step >= s ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}>
                {['Basic Info', 'Role Details', 'Settings'][s - 1]}
              </span>
              {s < 3 && <div style={{ flex: 1, height: '1px', background: step > s ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)', margin: '0 16px' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', color: '#f87171', fontSize: '14px' }}>{error}</div>}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>Basic Information</h2>
              <div>
                {createNewCompany ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={labelStyle}>COMPANY NAME *</label>
                      {companies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCreateNewCompany(false)}
                          style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
                        >
                          Select existing company
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      style={inputStyle}
                    />
                    {companies.length === 0 && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
                        💡 You don't have any registered companies yet. A new company profile will be created automatically when you submit.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={labelStyle}>COMPANY *</label>
                      <button
                        type="button"
                        onClick={() => setCreateNewCompany(true)}
                        style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
                      >
                        + Register new company
                      </button>
                    </div>
                    <select value={data.company_id} onChange={(e) => update('company_id', e.target.value)} style={inputStyle}>
                      <option value="">Select your company</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>INTERNSHIP TITLE *</label>
                <input type="text" value={data.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Frontend Developer Intern" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea value={data.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the internship, what the candidate will learn, work environment..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>EXPERIENCE LEVEL</label>
                  <select value={data.experience_level} onChange={(e) => update('experience_level', e.target.value)} style={inputStyle}>
                    <option value="ENTRY">Entry Level</option>
                    <option value="MID">Mid Level</option>
                    <option value="SENIOR">Senior</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>SAVE AS</label>
                  <select value={data.status} onChange={(e) => update('status', e.target.value)} style={inputStyle}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published (Live)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>Role Details</h2>
              <TagInput label="RESPONSIBILITIES" placeholder="e.g. Build frontend components" tags={data.responsibilities} onAdd={(v) => addTag('responsibilities', v)} onRemove={(i) => removeTag('responsibilities', i)} />
              <TagInput label="REQUIRED SKILLS" placeholder="e.g. React, TypeScript" tags={data.required_skills} onAdd={(v) => addTag('required_skills', v)} onRemove={(i) => removeTag('required_skills', i)} />
              <TagInput label="TECHNOLOGIES" placeholder="e.g. Next.js, PostgreSQL" tags={data.technologies} onAdd={(v) => addTag('technologies', v)} onRemove={(i) => removeTag('technologies', i)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>WORK MODE</label>
                  <select value={data.work_mode} onChange={(e) => update('work_mode', e.target.value)} style={inputStyle}>
                    <option value="ONSITE">Onsite</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>LOCATION</label>
                  <input type="text" value={data.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Mumbai, India" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>DURATION (WEEKS)</label>
                  <input type="number" value={data.duration_weeks} onChange={(e) => update('duration_weeks', e.target.value)} placeholder="e.g. 12" min={1} max={104} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>Settings & Compensation</h2>
              <div>
                <label style={labelStyle}>MONTHLY STIPEND</label>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '10px' }}>
                  <select value={data.stipend_currency} onChange={(e) => update('stipend_currency', e.target.value)} style={inputStyle}>
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                  <input type="number" value={data.stipend_min} onChange={(e) => update('stipend_min', e.target.value)} placeholder="Min (e.g. 5000)" min={0} style={inputStyle} />
                  <input type="number" value={data.stipend_max} onChange={(e) => update('stipend_max', e.target.value)} placeholder="Max (e.g. 15000)" min={0} style={inputStyle} />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Leave blank for unpaid / not disclosed</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>OPENINGS</label>
                  <input type="number" value={data.openings} onChange={(e) => update('openings', e.target.value)} min={1} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>APPLICATION LIMIT</label>
                  <input type="number" value={data.application_limit} onChange={(e) => update('application_limit', e.target.value)} placeholder="e.g. 500 (optional)" min={1} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>DEADLINE</label>
                  <input type="date" value={data.application_deadline} onChange={(e) => update('application_deadline', e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Preview Summary */}
              <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '12px', padding: '20px', marginTop: '8px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>PREVIEW SUMMARY</p>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>{data.title || 'Untitled Internship'}</h3>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {data.work_mode} · {data.location || 'Location TBD'} · {data.duration_weeks ? `${data.duration_weeks} weeks` : 'Duration TBD'} · {data.experience_level}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#4ade80', fontWeight: 700 }}>
                  {data.stipend_min ? `${data.stipend_currency} ${Number(data.stipend_min).toLocaleString()}${data.stipend_max ? ` – ${Number(data.stipend_max).toLocaleString()}` : ''}/mo` : 'Stipend not disclosed'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          {step > 1 ? (
            <button onClick={() => setStep((s) => (s - 1) as Step)} style={{ padding: '13px 28px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>← Back</button>
          ) : <div />}
          {step < 3 ? (
            <button onClick={() => {
              if (step === 1) {
                if (createNewCompany) {
                  if (!newCompanyName.trim()) {
                    setError('Company name is required.');
                    return;
                  }
                } else {
                  if (!data.company_id) {
                    setError('Company selection is required.');
                    return;
                  }
                }
                if (!data.title.trim()) {
                  setError('Internship title is required.');
                  return;
                }
              }
              setError(null);
              setStep((s) => (s + 1) as Step);
            }} style={{ padding: '13px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
              Next →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleSubmit(false)} disabled={isSubmitting} style={{ padding: '13px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px' }}>
                Save as Draft
              </button>
              <button onClick={() => handleSubmit(true)} disabled={isSubmitting} style={{ padding: '13px 28px', borderRadius: '10px', border: 'none', background: isSubmitting ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px' }}>
                {isSubmitting ? 'Posting...' : '🚀 Publish Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagInput({ label, placeholder, tags, onAdd, onRemove }: {
  label: string; placeholder: string; tags: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void;
}) {
  const [val, setVal] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
      e.preventDefault();
      onAdd(val);
      setVal('');
    }
  };
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', padding: '10px 12px', minHeight: '48px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {tags.map((t, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', fontSize: '13px', color: '#c4b5fd' }}>
            {t}
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', padding: 0, fontSize: '15px', lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={handleKey} placeholder={tags.length === 0 ? `${placeholder} (Enter to add)` : ''} style={{ flex: 1, minWidth: '160px', background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }} />
      </div>
    </div>
  );
}
