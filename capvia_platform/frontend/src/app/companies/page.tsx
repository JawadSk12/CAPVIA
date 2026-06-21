'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { companyApi } from '../../services/api';
import { Company } from '../../types';
import { useAuthStore } from '../../store/auth';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function CompaniesPage() {
  return (
    <ProtectedRoute>
      <CompaniesContent />
    </ProtectedRoute>
  );
}

function CompaniesContent() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PER_PAGE = 20;

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyApi.list(page, PER_PAGE, search || undefined);
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load companies.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const canCreate = user?.role === 'hr' || user?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', padding: '0' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Dashboard</Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Companies
          </h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{total} organization{total !== 1 ? 's' : ''} on CAPVIA</p>
        </div>
        {canCreate && (
          <Link href="/companies/create" style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>
            + Create Company
          </Link>
        )}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 40px' }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ marginBottom: '32px', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search companies by name..."
            style={{ flex: 1, padding: '14px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '15px', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '14px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} style={{ padding: '14px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px' }}>
              Clear
            </button>
          )}
        </form>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏢</div>
            <p>Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <h3 style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>No Companies Found</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
              {search ? `No companies match "${search}".` : 'Be the first to create a company on CAPVIA.'}
            </p>
            {canCreate && !search && (
              <Link href="/companies/create" style={{ display: 'inline-block', marginTop: '20px', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
                Create First Company
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: page === 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  ← Prev
                </button>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '0 12px' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: page === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: page === totalPages ? 'rgba(255,255,255,0.3)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  return (
    <Link href={`/companies/${company.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.4)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
      >
        {/* Verified badge */}
        {company.is_verified && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.5px' }}>
            ✓ VERIFIED
          </div>
        )}

        {/* Logo + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #a78bfa22, #60a5fa22)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#a78bfa' }}>
              {company.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>{company.name}</h3>
            {company.industry && <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>{company.industry}</p>}
          </div>
        </div>

        {/* Description */}
        {company.description && (
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {company.description}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {company.headquarters && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>📍 {company.headquarters}</span>
          )}
          {company.employee_count && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>👥 {company.employee_count}</span>
          )}
          {company.founded_year && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>📅 Est. {company.founded_year}</span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>{company.internship_count}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Internships</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#a78bfa' }}>{company.member_count}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Team Members</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
