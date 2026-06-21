'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { companyApi } from '../../../../services/api';
import { Company } from '../../../../types';
import ProtectedRoute from '../../../../components/ProtectedRoute';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Media & Entertainment', 'Consulting', 'Real Estate', 'Other'
];
const EMPLOYEE_COUNTS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

export default function EditCompanyPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <EditCompanyContent />
    </ProtectedRoute>
  );
}

function EditCompanyContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', logo_url: '', industry: '',
    website_url: '', headquarters: '', founded_year: '', employee_count: ''
  });

  useEffect(() => {
    companyApi.get(id as string)
      .then((c: Company) => {
        setCompany(c);
        setForm({
          name: c.name || '',
          description: c.description || '',
          logo_url: c.logo_url || '',
          industry: c.industry || '',
          website_url: c.website_url || '',
          headquarters: c.headquarters || '',
          founded_year: c.founded_year ? String(c.founded_year) : '',
          employee_count: c.employee_count || '',
        });
      })
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Failed to load company.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {};
      if (form.name) payload.name = form.name;
      if (form.description) payload.description = form.description;
      if (form.logo_url) payload.logo_url = form.logo_url;
      if (form.industry) payload.industry = form.industry;
      if (form.website_url) payload.website_url = form.website_url;
      if (form.headquarters) payload.headquarters = form.headquarters;
      if (form.founded_year) payload.founded_year = parseInt(form.founded_year);
      if (form.employee_count) payload.employee_count = form.employee_count;

      const updated = await companyApi.update(id as string, payload);
      setCompany(updated);
      setSuccess('Company updated successfully!');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to update company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
    color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700,
    color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.8px',
  };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <p>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px' }}>
        <Link href={`/companies/${id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Back to Company</Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Edit Company
        </h1>
        {company && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{company.name}</p>}
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 40px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px' }}>
            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', color: '#f87171', fontSize: '14px' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', color: '#4ade80', fontSize: '14px' }}>✓ {success}</div>}

            <h2 style={{ margin: '0 0 28px', fontSize: '18px', fontWeight: 700 }}>Company Information</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>COMPANY NAME *</label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>INDUSTRY</label>
                <select value={form.industry} onChange={(e) => update('industry', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" style={{ background: '#1a1a2e' }}>Select...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i} style={{ background: '#1a1a2e' }}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>TEAM SIZE</label>
                <select value={form.employee_count} onChange={(e) => update('employee_count', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" style={{ background: '#1a1a2e' }}>Select...</option>
                  {EMPLOYEE_COUNTS.map((c) => <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>WEBSITE URL</label>
                <input type="url" value={form.website_url} onChange={(e) => update('website_url', e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>LOGO URL</label>
                <input type="url" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label style={labelStyle}>HEADQUARTERS</label>
                <input type="text" value={form.headquarters} onChange={(e) => update('headquarters', e.target.value)} placeholder="City, Country" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>FOUNDED YEAR</label>
                <input type="number" value={form.founded_year} onChange={(e) => update('founded_year', e.target.value)} min="1800" max="2099" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => router.push(`/companies/${id}`)} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '16px', borderRadius: '12px', border: 'none', background: isSubmitting ? 'rgba(167,139,250,0.4)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                {isSubmitting ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
