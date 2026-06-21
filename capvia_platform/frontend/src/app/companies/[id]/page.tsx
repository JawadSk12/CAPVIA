'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { companyApi } from '../../../services/api';
import { Company } from '../../../types';
import { useAuthStore } from '../../../store/auth';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function CompanyProfilePage() {
  return (
    <ProtectedRoute>
      <CompanyProfileContent />
    </ProtectedRoute>
  );
}

function CompanyProfileContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    companyApi.get(id as string)
      .then(setCompany)
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Company not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading company profile...</p>
      </div>
    </div>
  );

  if (error || !company) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2>Company Not Found</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>{error}</p>
        <Link href="/companies" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>← Back to Companies</Link>
      </div>
    </div>
  );

  const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(96,165,250,0.08) 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Link href="/companies" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← All Companies</Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginTop: '24px' }}>
            {/* Logo */}
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} style={{ width: '88px', height: '88px', borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(167,139,250,0.3)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '88px', height: '88px', borderRadius: '16px', background: 'linear-gradient(135deg, #a78bfa33, #60a5fa33)', border: '2px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 900, color: '#a78bfa', flexShrink: 0 }}>
                {company.name[0].toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900 }}>{company.name}</h1>
                {company.is_verified && (
                  <span style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>
                    ✓ VERIFIED
                  </span>
                )}
              </div>
              {company.industry && <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#a78bfa', fontWeight: 600 }}>{company.industry}</p>}
              {company.description && <p style={{ margin: '12px 0 0', fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: '600px' }}>{company.description}</p>}

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '16px' }}>
                {company.headquarters && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>📍 {company.headquarters}</span>}
                {company.employee_count && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>👥 {company.employee_count}</span>}
                {company.founded_year && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>📅 Est. {company.founded_year}</span>}
                {company.website_url && (
                  <a href={company.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#60a5fa', textDecoration: 'none' }}>🔗 Website ↗</a>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            {isHrOrAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <Link href={`/companies/${id}/dashboard`} style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>
                  📊 Dashboard
                </Link>
                <Link href={`/companies/${id}/edit`} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                  ✏️ Edit
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          <StatCard label="Internships" value={company.internship_count} color="#60a5fa" icon="💼" />
          <StatCard label="Team Members" value={company.member_count} color="#a78bfa" icon="👥" />
        </div>

        {/* Quick Nav */}
        {isHrOrAdmin && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Management</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {[
                { href: `/companies/${id}/dashboard`, icon: '📊', label: 'Dashboard', desc: 'Analytics & insights' },
                { href: `/companies/${id}/team`, icon: '👥', label: 'Team', desc: 'Manage members' },
                { href: `/companies/${id}/edit`, icon: '✏️', label: 'Edit Profile', desc: 'Update company info' },
                { href: `/companies/${id}/settings`, icon: '⚙️', label: 'Settings', desc: 'Branding & danger zone' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.4)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
