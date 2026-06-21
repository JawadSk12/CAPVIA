'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { companyApi } from '../../../../services/api';
import { Company } from '../../../../types';
import { useAuthStore } from '../../../../store/auth';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function CompanySettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <CompanySettingsContent />
    </ProtectedRoute>
  );
}

function CompanySettingsContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    companyApi.get(id as string)
      .then(setCompany)
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Failed to load company.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const result = await companyApi.verify(id as string);
      setCompany((prev) => prev ? { ...prev, is_verified: result.is_verified } : prev);
      setSuccess(result.message);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to update verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== company?.name) {
      setError('Company name does not match. Type the exact company name to confirm.');
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await companyApi.delete(id as string);
      router.push('/companies');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to delete company.');
      setIsDeleting(false);
    }
  };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <p>Loading settings...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px' }}>
        <Link href={`/companies/${id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Back to Company</Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚙️ Company Settings
        </h1>
        {company && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{company.name}</p>}
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 18px', color: '#f87171', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '14px 18px', color: '#4ade80', fontSize: '14px' }}>✓ {success}</div>}

        {/* Quick Navigation */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700 }}>Quick Navigation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { href: `/companies/${id}/edit`, label: '✏️ Edit Profile', desc: 'Update company info' },
              { href: `/companies/${id}/team`, label: '👥 Team', desc: 'Manage members' },
              { href: `/companies/${id}/dashboard`, label: '📊 Dashboard', desc: 'Analytics' },
              { href: `/companies/${id}`, label: '🏢 View Profile', desc: 'Public view' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Company Status */}
        {company && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700 }}>Company Status</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: company.is_verified ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${company.is_verified ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  {company.is_verified ? '✅ Verified Company' : '⏳ Not Verified'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                  {company.is_verified ? 'This company has a verified badge on the directory.' : 'Contact an administrator to get your company verified.'}
                </div>
              </div>
              {user?.role === 'admin' && (
                <button onClick={handleVerify} disabled={isVerifying} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: company.is_verified ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: company.is_verified ? '#f87171' : '#4ade80', fontWeight: 700, cursor: isVerifying ? 'not-allowed' : 'pointer', fontSize: '13px', flexShrink: 0 }}>
                  {isVerifying ? 'Updating...' : company.is_verified ? 'Unverify' : 'Verify'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {company && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#f87171' }}>⚠️ Danger Zone</h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              Deleting this company will remove all associated internship listings. This action cannot be undone.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.8px' }}>
                TYPE THE COMPANY NAME TO CONFIRM
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={company.name}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirm !== company.name}
              style={{ padding: '14px 24px', borderRadius: '10px', border: 'none', background: (isDeleting || deleteConfirm !== company.name) ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.8)', color: (isDeleting || deleteConfirm !== company.name) ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: 800, cursor: (isDeleting || deleteConfirm !== company.name) ? 'not-allowed' : 'pointer', fontSize: '14px' }}
            >
              {isDeleting ? 'Deleting...' : '🗑 Delete Company Permanently'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
