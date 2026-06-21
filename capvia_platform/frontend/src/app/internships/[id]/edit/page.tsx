'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { internshipApi, companyApi } from '../../../../services/api';
import { Internship, Company } from '../../../../types';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function EditInternshipPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <EditInternshipContent />
    </ProtectedRoute>
  );
}

function EditInternshipContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [internship, setInternship] = useState<Internship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('ENTRY');
  const [workMode, setWorkMode] = useState('ONSITE');
  const [location, setLocation] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [stipendMin, setStipendMin] = useState('');
  const [stipendMax, setStipendMax] = useState('');
  const [stipendCurrency, setStipendCurrency] = useState('INR');
  const [openings, setOpenings] = useState('1');
  const [applicationLimit, setApplicationLimit] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');

  useEffect(() => {
    if (!id) return;
    internshipApi.get(id as string).then((i: Internship) => {
      setInternship(i);
      setTitle(i.title);
      setDescription(i.description || '');
      setResponsibilities(i.responsibilities || []);
      setRequiredSkills(i.required_skills || []);
      setTechnologies(i.technologies || []);
      setExperienceLevel(i.experience_level);
      setWorkMode(i.work_mode);
      setLocation(i.location || '');
      setDurationWeeks(i.duration_weeks ? String(i.duration_weeks) : '');
      setStipendMin(i.stipend_min ? String(i.stipend_min) : '');
      setStipendMax(i.stipend_max ? String(i.stipend_max) : '');
      setStipendCurrency(i.stipend_currency || 'INR');
      setOpenings(String(i.openings || 1));
      setApplicationLimit(i.application_limit ? String(i.application_limit) : '');
      setApplicationDeadline(i.application_deadline || '');
    }).catch(() => setError('Internship not found.')).finally(() => setIsLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    if (!title.trim()) { setError('Title is required.'); return; }
    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {
        title, description: description || undefined,
        responsibilities, required_skills: requiredSkills, technologies,
        experience_level: experienceLevel, work_mode: workMode,
        location: location || undefined,
        duration_weeks: durationWeeks ? Number(durationWeeks) : undefined,
        stipend_min: stipendMin ? Number(stipendMin) : undefined,
        stipend_max: stipendMax ? Number(stipendMax) : undefined,
        stipend_currency: stipendCurrency,
        openings: Number(openings) || 1,
        application_limit: applicationLimit ? Number(applicationLimit) : undefined,
        application_deadline: applicationDeadline || undefined,
      };
      const updated = await internshipApi.update(id as string, payload);
      setInternship(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (!val.trim()) return;
    setter((prev) => [...prev, val.trim()]);
  };

  const removeTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' };

  if (isLoading) return <div style={{ minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href={`/internships/${id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Back to Internship</Link>
          <h1 style={{ margin: '10px 0 4px', fontSize: '26px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Edit Internship
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>{internship?.title}</p>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: '#f87171', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: '#4ade80', fontSize: '14px' }}>✅ Changes saved successfully!</div>}

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Basic Info */}
          <FormSection title="Basic Information">
            <div>
              <label style={labelStyle}>TITLE *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DESCRIPTION</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>EXPERIENCE LEVEL</label>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} style={inputStyle}>
                  <option value="ENTRY">Entry Level</option>
                  <option value="MID">Mid Level</option>
                  <option value="SENIOR">Senior</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>WORK MODE</label>
                <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} style={inputStyle}>
                  <option value="ONSITE">Onsite</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
          </FormSection>

          {/* Skills & Responsibilities */}
          <FormSection title="Skills & Responsibilities">
            <TagEditor label="RESPONSIBILITIES" tags={responsibilities} onAdd={(v) => addTag(setResponsibilities, v)} onRemove={(i) => removeTag(setResponsibilities, i)} placeholder="Press Enter to add" color="#f59e0b" />
            <TagEditor label="REQUIRED SKILLS" tags={requiredSkills} onAdd={(v) => addTag(setRequiredSkills, v)} onRemove={(i) => removeTag(setRequiredSkills, i)} placeholder="e.g. React" color="#a78bfa" />
            <TagEditor label="TECHNOLOGIES" tags={technologies} onAdd={(v) => addTag(setTechnologies, v)} onRemove={(i) => removeTag(setTechnologies, i)} placeholder="e.g. Next.js" color="#60a5fa" />
          </FormSection>

          {/* Location & Duration */}
          <FormSection title="Location & Duration">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>LOCATION</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai, India" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>DURATION (WEEKS)</label>
                <input type="number" value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} min={1} max={104} style={inputStyle} />
              </div>
            </div>
          </FormSection>

          {/* Compensation */}
          <FormSection title="Compensation & Limits">
            <div>
              <label style={labelStyle}>MONTHLY STIPEND</label>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: '10px' }}>
                <select value={stipendCurrency} onChange={(e) => setStipendCurrency(e.target.value)} style={inputStyle}>
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
                <input type="number" value={stipendMin} onChange={(e) => setStipendMin(e.target.value)} placeholder="Min" min={0} style={inputStyle} />
                <input type="number" value={stipendMax} onChange={(e) => setStipendMax(e.target.value)} placeholder="Max" min={0} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>OPENINGS</label>
                <input type="number" value={openings} onChange={(e) => setOpenings(e.target.value)} min={1} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>APPLICATION LIMIT</label>
                <input type="number" value={applicationLimit} onChange={(e) => setApplicationLimit(e.target.value)} placeholder="Optional" min={1} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>DEADLINE</label>
                <input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </FormSection>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <Link href={`/internships/${id}`} style={{ padding: '13px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
            Cancel
          </Link>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '13px 32px', borderRadius: '10px', border: 'none', background: isSaving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: isSaving ? 'none' : '0 8px 24px rgba(167,139,250,0.3)' }}>
            {isSaving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 18px', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  );
}

function TagEditor({ label, tags, onAdd, onRemove, placeholder, color }: {
  label: string; tags: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder: string; color: string;
}) {
  const [val, setVal] = useState('');
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', padding: '10px 12px', minHeight: '48px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {tags.map((t, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: `${color}14`, border: `1px solid ${color}28`, fontSize: '13px', color }}>
            {t} <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0, fontSize: '15px', lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && val.trim()) { e.preventDefault(); onAdd(val); setVal(''); } }}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{ flex: 1, minWidth: '140px', background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
        />
      </div>
    </div>
  );
}
