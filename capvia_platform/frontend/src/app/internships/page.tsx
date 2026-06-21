'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { internshipApi } from '../../services/api';
import { Internship, InternshipFilters } from '../../types';
import { useAuthStore } from '../../store/auth';
import ProtectedRoute from '../../components/ProtectedRoute';

const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'];
const EXP_LEVELS = ['ENTRY', 'MID', 'SENIOR'];
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest First' },
  { value: 'view_count', label: 'Most Viewed' },
  { value: 'application_deadline', label: 'Deadline' },
  { value: 'stipend_min', label: 'Stipend' },
];

export default function InternshipsPage() {
  return (
    <ProtectedRoute>
      <InternshipsContent />
    </ProtectedRoute>
  );
}

function InternshipsContent() {
  const { user } = useAuthStore();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InternshipFilters>({
    sort_by: 'created_at', sort_dir: 'desc'
  });
  const [searchInput, setSearchInput] = useState('');
  const PER_PAGE = 20;

  const fetchInternships = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await internshipApi.list({ ...filters, page, per_page: PER_PAGE });
      setInternships(data.internships || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load internships.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchInternships(); }, [fetchInternships]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput }));
    setPage(1);
  };

  const updateFilter = (key: keyof InternshipFilters, val: any) => {
    setFilters((f) => ({ ...f, [key]: val || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ sort_by: 'created_at', sort_dir: 'desc' });
    setSearchInput('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const canCreate = user?.role === 'hr' || user?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Dashboard</Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Internship Marketplace
          </h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{total} opportunities available</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {canCreate && (
            <>
              <Link href="/internships/manage" style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                ⚙️ Manage
              </Link>
              <Link href="/internships/create" style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                + Post Internship
              </Link>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px', display: 'flex', gap: '28px' }}>
        {/* Filter Sidebar */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Filters</h3>
              <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Clear all</button>
            </div>

            <FilterSection title="Work Mode">
              {WORK_MODES.map((m) => (
                <FilterChip key={m} label={m} active={filters.work_mode === m} onClick={() => updateFilter('work_mode', filters.work_mode === m ? '' : m)} />
              ))}
            </FilterSection>

            <FilterSection title="Experience">
              {EXP_LEVELS.map((l) => (
                <FilterChip key={l} label={l} active={filters.experience_level === l} onClick={() => updateFilter('experience_level', filters.experience_level === l ? '' : l)} />
              ))}
            </FilterSection>

            <FilterSection title="Stipend">
              <FilterChip label="Paid Only" active={filters.has_stipend === true} onClick={() => updateFilter('has_stipend', filters.has_stipend === true ? undefined : true)} />
              <FilterChip label="Unpaid" active={filters.has_stipend === false} onClick={() => updateFilter('has_stipend', filters.has_stipend === false ? undefined : false)} />
            </FilterSection>

            <FilterSection title="Sort By" last>
              {SORT_OPTIONS.map((s) => (
                <FilterChip key={s.value} label={s.label} active={filters.sort_by === s.value} onClick={() => updateFilter('sort_by', s.value)} />
              ))}
            </FilterSection>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, description, location..."
              style={{ flex: 1, padding: '14px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '14px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
              🔍
            </button>
          </form>

          {/* Active filters display */}
          {(filters.work_mode || filters.experience_level || filters.has_stipend !== undefined || filters.search) && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {filters.search && <ActiveFilterTag label={`"${filters.search}"`} onRemove={() => { updateFilter('search', ''); setSearchInput(''); }} />}
              {filters.work_mode && <ActiveFilterTag label={filters.work_mode} onRemove={() => updateFilter('work_mode', '')} />}
              {filters.experience_level && <ActiveFilterTag label={filters.experience_level} onRemove={() => updateFilter('experience_level', '')} />}
              {filters.has_stipend !== undefined && <ActiveFilterTag label={filters.has_stipend ? 'Paid Only' : 'Unpaid'} onRemove={() => updateFilter('has_stipend', undefined)} />}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', color: '#f87171' }}>{error}</div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>💼</div>
              <p>Loading internships...</p>
            </div>
          ) : internships.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
              <h3 style={{ color: 'rgba(255,255,255,0.7)' }}>No Internships Found</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Try adjusting your search or filters.</p>
              {canCreate && (
                <Link href="/internships/create" style={{ display: 'inline-block', marginTop: '20px', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
                  Post First Internship
                </Link>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {internships.map((i) => <InternshipCard key={i.id} internship={i} />)}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: page === 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>← Prev</button>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '0 12px' }}>Page {page} of {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: page === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: page === totalPages ? 'rgba(255,255,255,0.3)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InternshipCard({ internship: i }: { internship: Internship }) {
  const statusColors: Record<string, string> = {
    PUBLISHED: '#4ade80', DRAFT: '#f59e0b', CLOSED: '#94a3b8', ARCHIVED: '#6b7280'
  };

  return (
    <Link href={`/internships/${i.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.35)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          {/* Company Logo */}
          <div style={{ flexShrink: 0 }}>
            {i.company_logo ? (
              <img src={i.company_logo} alt={i.company_name || ''} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #a78bfa22, #60a5fa22)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#a78bfa' }}>
                {(i.company_name || 'C')[0]}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>{i.title}</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: `${statusColors[i.status]}18`, color: statusColors[i.status], border: `1px solid ${statusColors[i.status]}30`, letterSpacing: '0.5px', flexShrink: 0 }}>
                {i.status}
              </span>
            </div>

            <p style={{ margin: '4px 0 10px', fontSize: '13px', color: '#a78bfa', fontWeight: 600 }}>{i.company_name}</p>

            {/* Tags Row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <Tag icon="🌐" label={i.work_mode} color="#60a5fa" />
              {i.location && <Tag icon="📍" label={i.location} color="rgba(255,255,255,0.5)" />}
              <Tag icon="📅" label={`${i.duration_weeks ? `${i.duration_weeks} weeks` : 'Duration TBD'}`} color="rgba(255,255,255,0.5)" />
              <Tag icon="🎓" label={i.experience_level} color="#f59e0b" />
              <Tag icon="👥" label={`${i.openings} opening${i.openings !== 1 ? 's' : ''}`} color="rgba(255,255,255,0.5)" />
            </div>

            {/* Skills */}
            {i.required_skills?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {i.required_skills.slice(0, 5).map((s) => (
                  <span key={s} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', color: '#c4b5fd' }}>{s}</span>
                ))}
                {i.required_skills.length > 5 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>+{i.required_skills.length - 5} more</span>}
              </div>
            )}

            {/* Footer Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {(i.stipend_min || i.stipend_max) ? (
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>
                    💰 {i.stipend_min ? `${i.stipend_currency} ${i.stipend_min.toLocaleString()}` : ''}{i.stipend_min && i.stipend_max ? ' - ' : ''}{i.stipend_max ? `${i.stipend_max.toLocaleString()}` : ''}/mo
                  </span>
                ) : (
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Stipend not specified</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                <span>👁 {i.view_count}</span>
                <span>📨 {i.application_count}</span>
                {i.application_deadline && (
                  <span style={{ color: i.is_deadline_passed ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                    {i.is_deadline_passed ? '⚠️ Deadline passed' : `⏰ ${i.application_deadline}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Tag({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span style={{ fontSize: '12px', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
      {icon} {label}
    </span>
  );
}

function FilterSection({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : '20px', paddingBottom: last ? 0 : '20px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${active ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(167,139,250,0.15)' : 'transparent', color: active ? '#a78bfa' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px', fontWeight: active ? 700 : 400, textAlign: 'left', transition: 'all 0.15s ease' }}>
      {label}
    </button>
  );
}

function ActiveFilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1, marginLeft: '2px' }}>×</button>
    </span>
  );
}
