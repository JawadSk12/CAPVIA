'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { internshipApi } from '../../../services/api';
import { Internship } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';

const STATUS_TABS = [
  { key: '', label: 'All', color: '#a78bfa' },
  { key: 'PUBLISHED', label: 'Published', color: '#4ade80' },
  { key: 'DRAFT', label: 'Draft', color: '#f59e0b' },
  { key: 'CLOSED', label: 'Closed', color: '#94a3b8' },
  { key: 'ARCHIVED', label: 'Archived', color: '#6b7280' },
];

export default function ManageInternshipsPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <ManageInternshipsContent />
    </ProtectedRoute>
  );
}

function ManageInternshipsContent() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const PER_PAGE = 15;

  const fetchInternships = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page, per_page: PER_PAGE };
      if (activeTab) params.status = activeTab;
      const data = await internshipApi.manage(params);
      setInternships(data.internships || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load internships.');
    } finally {
      setIsLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => { fetchInternships(); }, [fetchInternships]);

  const doAction = async (action: string, id: string, title: string) => {
    setActionLoading(`${action}-${id}`);
    setError(null);
    try {
      if (action === 'publish') await internshipApi.publish(id);
      else if (action === 'close') await internshipApi.close(id);
      else if (action === 'archive') await internshipApi.archive(id);
      else if (action === 'restore') await internshipApi.restore(id);
      else if (action === 'duplicate') {
        const copy = await internshipApi.duplicate(id);
        setSuccess(`Duplicated as "${copy.title}"`);
      } else if (action === 'delete') {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        await internshipApi.delete(id);
        setSuccess(`"${title}" deleted.`);
      }
      await fetchInternships();
      if (action !== 'delete' && action !== 'duplicate') {
        setSuccess(`"${title}" ${action}ed successfully.`);
      }
      setTimeout(() => setSuccess(null), 3500);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || `Action failed.`);
    } finally {
      setActionLoading(null);
    }
  };

  const statusCounts = internships.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/internships" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Marketplace</Link>
          <h1 style={{ margin: '6px 0 2px', fontSize: '26px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Manage Internships
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{total} total listings</p>
        </div>
        <Link href="/internships/create" style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '13px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', boxShadow: '0 8px 24px rgba(167,139,250,0.35)' }}>
          + Post New
        </Link>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>
        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {STATUS_TABS.slice(1).map((tab) => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
              style={{ background: activeTab === tab.key ? `${tab.color}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${activeTab === tab.key ? tab.color + '40' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: tab.color }}>{internships.filter(i => i.status === tab.key).length}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: '4px', letterSpacing: '0.4px' }}>{tab.label.toUpperCase()}</div>
            </button>
          ))}
        </div>

        {/* Status Tab Bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content' }}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
              style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: activeTab === tab.key ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontWeight: activeTab === tab.key ? 700 : 400, fontSize: '13px', transition: 'all 0.15s ease' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', color: '#f87171', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', color: '#4ade80', fontSize: '14px' }}>✅ {success}</div>}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.35)', fontSize: '15px' }}>Loading internships...</div>
        ) : internships.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.6)', fontSize: '18px' }}>No {activeTab || ''} internships yet</h3>
            <Link href="/internships/create" style={{ display: 'inline-block', marginTop: '20px', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
              Post Your First Internship
            </Link>
          </div>
        ) : (
          <>
            {/* Table */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 220px', gap: '0', padding: '14px 24px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['INTERNSHIP', 'STATUS', 'APPLICATIONS', 'VIEWS', 'DEADLINE', 'ACTIONS'].map((h) => (
                  <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.6px' }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {internships.map((i) => {
                const statusMeta: Record<string, { color: string; label: string }> = {
                  PUBLISHED: { color: '#4ade80', label: '🟢 Published' },
                  DRAFT: { color: '#f59e0b', label: '🟡 Draft' },
                  CLOSED: { color: '#94a3b8', label: '🔒 Closed' },
                  ARCHIVED: { color: '#6b7280', label: '📦 Archived' },
                };
                const sm = statusMeta[i.status] || statusMeta.DRAFT;
                return (
                  <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 220px', gap: '0', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Title & Company */}
                    <div>
                      <Link href={`/internships/${i.id}`} style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#a78bfa')}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#fff')}>
                        {i.title}
                      </Link>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#a78bfa' }}>{i.company_name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>🌐 {i.work_mode} · {i.experience_level}</p>
                    </div>
                    {/* Status */}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: sm.color }}>{sm.label}</span>
                    {/* Applications */}
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#a78bfa' }}>{i.application_count}</span>
                    {/* Views */}
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#60a5fa' }}>{i.view_count}</span>
                    {/* Deadline */}
                    <span style={{ fontSize: '12px', color: i.is_deadline_passed ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                      {i.application_deadline ? (i.is_deadline_passed ? '⚠️ Expired' : i.application_deadline) : '—'}
                    </span>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Link href={`/internships/${i.id}/dashboard`} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.08)', color: '#a78bfa', textDecoration: 'none', fontSize: '11px', fontWeight: 700 }}>📊</Link>
                      <Link href={`/internships/${i.id}/edit`} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', fontSize: '11px', fontWeight: 700 }}>✏️</Link>
                      {i.status === 'DRAFT' && <MiniAction label="🚀" color="#4ade80" onClick={() => doAction('publish', i.id, i.title)} loading={actionLoading === `publish-${i.id}`} />}
                      {i.status === 'PUBLISHED' && <MiniAction label="🔒" color="#f59e0b" onClick={() => doAction('close', i.id, i.title)} loading={actionLoading === `close-${i.id}`} />}
                      {(i.status === 'CLOSED' || i.status === 'ARCHIVED') && <MiniAction label="♻️" color="#60a5fa" onClick={() => doAction('restore', i.id, i.title)} loading={actionLoading === `restore-${i.id}`} />}
                      <MiniAction label="📋" color="#a78bfa" onClick={() => doAction('duplicate', i.id, i.title)} loading={actionLoading === `duplicate-${i.id}`} />
                      <MiniAction label="🗑️" color="#f87171" onClick={() => doAction('delete', i.id, i.title)} loading={actionLoading === `delete-${i.id}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px', alignItems: 'center' }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}>← Prev</button>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '0 10px' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MiniAction({ label, color, onClick, loading }: { label: string; color: string; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${color}28`, background: `${color}10`, color, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 700, opacity: loading ? 0.5 : 1 }}>
      {loading ? '…' : label}
    </button>
  );
}
