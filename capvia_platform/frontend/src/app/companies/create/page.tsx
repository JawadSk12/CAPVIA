'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { companyApi } from '../../../services/api';
import ProtectedRoute from '../../../components/ProtectedRoute';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Media & Entertainment', 'Consulting', 'Real Estate', 'Other'
];

const EMPLOYEE_COUNTS = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
];

export default function CreateCompanyPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <CreateCompanyContent />
    </ProtectedRoute>
  );
}

function CreateCompanyContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    logo_url: '',
    industry: '',
    website_url: '',
    headquarters: '',
    founded_year: '',
    employee_count: '',
  });

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: any = { name: form.name };
      if (form.description) payload.description = form.description;
      if (form.logo_url) payload.logo_url = form.logo_url;
      if (form.industry) payload.industry = form.industry;
      if (form.website_url) payload.website_url = form.website_url;
      if (form.headquarters) payload.headquarters = form.headquarters;
      if (form.founded_year) payload.founded_year = parseInt(form.founded_year);
      if (form.employee_count) payload.employee_count = form.employee_count;

      const created = await companyApi.create(payload);
      router.push(`/companies/${created.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to create company.');
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
    color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: 'rgba(255,255,255,0.6)', marginBottom: '8px', letterSpacing: '0.5px',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', padding: '0' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px' }}>
        <Link href="/companies" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← All Companies</Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Create New Company
        </h1>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 40px' }}>
        {/* Steps */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', alignItems: 'center' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, background: step >= s ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : 'rgba(255,255,255,0.08)', color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.3s ease' }}>
                {s}
              </div>
              <span style={{ fontSize: '13px', color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: step === s ? 700 : 400 }}>
                {s === 1 ? 'Basic Info' : 'Details & Branding'}
              </span>
              {s < 2 && <div style={{ width: '40px', height: '2px', background: step > s ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', color: '#f87171', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ margin: '0 0 32px', fontSize: '20px', fontWeight: 700 }}>Basic Information</h2>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>COMPANY NAME *</label>
                <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Acme Corporation" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Brief description of what your company does..." rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>INDUSTRY</label>
                <select value={form.industry} onChange={(e) => update('industry', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" style={{ background: '#1a1a2e' }}>Select industry...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i} style={{ background: '#1a1a2e' }}>{i}</option>)}
                </select>
              </div>

              <button
                onClick={() => { if (!form.name.trim()) { setError('Company name is required.'); return; } setError(null); setStep(2); }}
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ margin: '0 0 32px', fontSize: '20px', fontWeight: 700 }}>Details & Branding</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>WEBSITE URL</label>
                  <input type="url" value={form.website_url} onChange={(e) => update('website_url', e.target.value)} placeholder="https://yourcompany.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>LOGO URL</label>
                  <input type="url" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} placeholder="https://yourcompany.com/logo.png" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>HEADQUARTERS</label>
                  <input type="text" value={form.headquarters} onChange={(e) => update('headquarters', e.target.value)} placeholder="e.g. San Francisco, CA" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>FOUNDED YEAR</label>
                  <input type="number" value={form.founded_year} onChange={(e) => update('founded_year', e.target.value)} placeholder="e.g. 2015" min="1800" max="2099" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={labelStyle}>TEAM SIZE</label>
                <select value={form.employee_count} onChange={(e) => update('employee_count', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" style={{ background: '#1a1a2e' }}>Select team size...</option>
                  {EMPLOYEE_COUNTS.map((c) => <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c} employees</option>)}
                </select>
              </div>

              {/* Logo preview */}
              {form.logo_url && (
                <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={form.logo_url} alt="Logo preview" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{form.name || 'Company Name'}</p>
                    {form.industry && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#a78bfa' }}>{form.industry}</p>}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{ flex: 2, padding: '16px', borderRadius: '12px', border: 'none', background: isSubmitting ? 'rgba(167,139,250,0.4)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Creating...' : '🚀 Create Company'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
