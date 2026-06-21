'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { internshipApi } from '../../../../services/api';
import { InternshipAnalytics, Internship } from '../../../../types';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function InternshipDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <InternshipDashboardContent />
    </ProtectedRoute>
  );
}

function InternshipDashboardContent() {
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<InternshipAnalytics | null>(null);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      internshipApi.get(id as string),
      internshipApi.getAnalytics(id as string),
    ])
      .then(([i, a]) => { setInternship(i); setAnalytics(a); })
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Failed to load analytics.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <div style={{ minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}>Loading analytics...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href={`/internships/${id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Back to Internship</Link>
          <h1 style={{ margin: '6px 0 2px', fontSize: '22px', fontWeight: 900 }}>Performance Analytics</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#a78bfa', fontWeight: 600 }}>{internship?.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/internships/${id}/edit`} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>✏️ Edit</Link>
        </div>
      </div>

      {error && <div style={{ margin: '20px 40px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px 18px', color: '#f87171', fontSize: '14px' }}>{error}</div>}

      {analytics && (
        <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 40px' }}>
          {/* Status Banner */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px 28px', marginBottom: '28px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            {analytics.days_since_posted !== undefined && (
              <TimeMeta label="Posted" value={`${analytics.days_since_posted} days ago`} />
            )}
            {analytics.days_until_deadline !== undefined && (
              <TimeMeta label={analytics.days_until_deadline < 0 ? 'Deadline' : 'Closes In'} value={analytics.days_until_deadline < 0 ? 'Expired' : `${analytics.days_until_deadline} days`} warning={analytics.days_until_deadline < 3} />
            )}
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: analytics.status === 'PUBLISHED' ? 'rgba(74,222,128,0.12)' : 'rgba(245,158,11,0.12)', color: analytics.status === 'PUBLISHED' ? '#4ade80' : '#f59e0b', border: `1px solid ${analytics.status === 'PUBLISHED' ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                {analytics.status}
              </span>
            </div>
          </div>

          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <KPICard icon="👁" label="Total Views" value={analytics.view_count} color="#60a5fa" />
            <KPICard icon="📨" label="Applications" value={analytics.application_count} color="#a78bfa" />
            <KPICard icon="⭐" label="Shortlisted" value={analytics.shortlisted_count} color="#4ade80" />
            <KPICard icon="📉" label="Rejected" value={analytics.rejected_count} color="#f87171" />
          </div>

          {/* Conversion + Scores Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
            {/* Conversion Rate */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>CONVERSION RATE</h3>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '52px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {analytics.conversion_rate}%
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>of applicants shortlisted</p>
              </div>
              {/* Mini bar */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, analytics.conversion_rate)}%`, background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', borderRadius: '10px', transition: 'width 1s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                <span>0%</span><span>100%</span>
              </div>
            </div>

            {/* Score Averages */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>AVERAGE ASSESSMENT SCORES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ScoreBar label="ATS Score" score={analytics.avg_ats_score} max={100} color="#60a5fa" />
                <ScoreBar label="Simulation Score" score={analytics.avg_simulation_score} max={100} color="#a78bfa" />
                <ScoreBar label="Interview Score" score={analytics.avg_interview_score} max={100} color="#4ade80" />
              </div>
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', marginBottom: '28px' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>APPLICATION PIPELINE</h3>
            <PipelineFunnel breakdown={analytics.pipeline_breakdown} total={analytics.application_count} />
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href={`/internships/${id}`} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>View Listing</Link>
            <Link href={`/internships/${id}/edit`} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>Edit Internship</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '34px', fontWeight: 900, color, marginBottom: '4px' }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.4px' }}>{label.toUpperCase()}</div>
    </div>
  );
}

function ScoreBar({ label, score, max, color }: { label: string; score?: number; max: number; color: string }) {
  const pct = score != null ? Math.min(100, (score / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: score != null ? color : 'rgba(255,255,255,0.25)' }}>
          {score != null ? `${score.toFixed(1)}%` : 'No data yet'}
        </span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '8px', transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

const STAGES = [
  { key: 'APPLIED', label: 'Applied', color: '#60a5fa' },
  { key: 'ATS_COMPLETED', label: 'ATS Done', color: '#818cf8' },
  { key: 'SIMULATION_COMPLETED', label: 'Simulation Done', color: '#a78bfa' },
  { key: 'INTERVIEW_COMPLETED', label: 'Interview Done', color: '#c084fc' },
  { key: 'SHORTLISTED', label: 'Shortlisted', color: '#4ade80' },
];

function PipelineFunnel({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  if (total === 0) return <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0 }}>No applications yet.</p>;
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
      {STAGES.map((stage) => {
        const count = breakdown[stage.key] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barHeight = Math.max(20, pct * 2.2);
        return (
          <div key={stage.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: stage.color }}>{count}</span>
            <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: `${stage.color}22`, border: `1px solid ${stage.color}30`, height: `${barHeight}px`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', overflow: 'hidden', transition: 'height 0.8s ease' }}>
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%', background: `linear-gradient(180deg, transparent, ${stage.color}18)` }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: stage.color, fontWeight: 700 }}>{pct}%</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', maxWidth: '70px', lineHeight: 1.3 }}>{stage.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeMeta({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.4px' }}>{label.toUpperCase()}</p>
      <p style={{ margin: '3px 0 0', fontSize: '15px', fontWeight: 700, color: warning ? '#f87171' : '#fff' }}>{value}</p>
    </div>
  );
}
