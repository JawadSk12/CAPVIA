'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { companyApi } from '../../../../services/api';
import { CompanyAnalytics } from '../../../../types';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function CompanyDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <CompanyDashboardContent />
    </ProtectedRoute>
  );
}

function CompanyDashboardContent() {
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    companyApi.getAnalytics(id as string)
      .then(setAnalytics)
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Failed to load analytics.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading analytics...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#f87171' }}>{error}</p>
        <Link href={`/companies/${id}`} style={{ color: '#a78bfa', textDecoration: 'none' }}>← Back to Company</Link>
      </div>
    </div>
  );

  const a = analytics!;

  const pipelineStages = [
    { key: 'APPLIED', label: 'Applied', color: '#60a5fa' },
    { key: 'ATS_COMPLETED', label: 'ATS Passed', color: '#a78bfa' },
    { key: 'SIMULATION_COMPLETED', label: 'Sim Passed', color: '#f59e0b' },
    { key: 'INTERVIEW_COMPLETED', label: 'Interview Done', color: '#10b981' },
    { key: 'SHORTLISTED', label: 'Shortlisted', color: '#4ade80' },
  ];

  const maxPipeline = Math.max(...pipelineStages.map((s) => a.pipeline_breakdown[s.key] || 0), 1);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href={`/companies/${id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Back to Company</Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📊 Company Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{a.company_name}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/companies/${id}/team`} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            👥 Team
          </Link>
          <Link href={`/companies/${id}/edit`} style={{ padding: '10px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
            ✏️ Edit
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          <KPICard label="Total Internships" value={a.total_internships} sub={`${a.active_internships} active`} color="#60a5fa" icon="💼" />
          <KPICard label="Total Applications" value={a.total_applications} color="#a78bfa" icon="📨" />
          {a.avg_ats_score != null && <KPICard label="Avg ATS Score" value={`${a.avg_ats_score}%`} color="#f59e0b" icon="📄" />}
          {a.avg_simulation_score != null && <KPICard label="Avg Sim Score" value={`${a.avg_simulation_score}%`} color="#10b981" icon="💻" />}
          {a.avg_interview_score != null && <KPICard label="Avg Interview" value={`${a.avg_interview_score}%`} color="#ec4899" icon="🎥" />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Pipeline Funnel */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '17px', fontWeight: 700 }}>Recruitment Pipeline</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pipelineStages.map((stage) => {
                const count = a.pipeline_breakdown[stage.key] || 0;
                const pct = a.total_applications > 0 ? (count / maxPipeline) * 100 : 0;
                return (
                  <div key={stage.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{stage.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: stage.color }}>{count}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: stage.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Application Status Breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '17px', fontWeight: 700 }}>Applications by Status</h2>
            {Object.keys(a.applications_by_status).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.35)' }}>
                <p>No applications yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(a.applications_by_status).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>{status.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#a78bfa' }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Internship */}
          {a.top_internship && (
            <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(96,165,250,0.08))', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '16px', padding: '28px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 700 }}>🏆 Most Popular Internship</h2>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#a78bfa' }}>{a.top_internship}</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Highest number of applications</p>
            </div>
          )}

          {/* Score Summary */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700 }}>Average Scores</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'ATS Score', value: a.avg_ats_score, color: '#f59e0b' },
                { label: 'Simulation', value: a.avg_simulation_score, color: '#10b981' },
                { label: 'Interview', value: a.avg_interview_score, color: '#ec4899' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', width: '90px', flexShrink: 0 }}>{s.label}</span>
                  {s.value != null ? (
                    <>
                      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: s.color, width: '44px', textAlign: 'right' }}>{s.value}%</span>
                    </>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No data</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color, icon }: { label: string; value: number | string; sub?: string; color: string; icon: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px' }}>
      <div style={{ fontSize: '22px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 600, letterSpacing: '0.3px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}
