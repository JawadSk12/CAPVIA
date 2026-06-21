'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { internshipApi } from '../../../services/api';
import { Internship } from '../../../types';
import { useAuthStore } from '../../../store/auth';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function InternshipDetailPage() {
  return (
    <ProtectedRoute>
      <InternshipDetailContent />
    </ProtectedRoute>
  );
}

function InternshipDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    internshipApi.get(id as string)
      .then(setInternship)
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Internship not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const canManage = user?.role === 'hr' || user?.role === 'admin';
  const isCreator = internship?.created_by && user?.id === internship.created_by;
  const showActions = canManage;

  const doAction = async (action: string) => {
    if (!id) return;
    setActionLoading(action);
    try {
      let result;
      if (action === 'publish') result = await internshipApi.publish(id as string);
      else if (action === 'close') result = await internshipApi.close(id as string);
      else if (action === 'archive') result = await internshipApi.archive(id as string);
      else if (action === 'restore') result = await internshipApi.restore(id as string);
      else if (action === 'duplicate') { result = await internshipApi.duplicate(id as string); router.push(`/internships/${result.id}`); return; }
      else if (action === 'delete') {
        if (!confirm('Delete this internship? This cannot be undone.')) { setActionLoading(null); return; }
        await internshipApi.delete(id as string);
        router.push('/internships');
        return;
      }
      if (result) setInternship(result);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || `Action '${action}' failed.`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return <LoadingScreen />;
  if (error || !internship) return <ErrorScreen message={error || 'Not found'} />;

  const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
    PUBLISHED: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', label: '🟢 Published' },
    DRAFT:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '🟡 Draft' },
    CLOSED:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: '🔒 Closed' },
    ARCHIVED:  { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: '📦 Archived' },
  };
  const sm = statusMeta[internship.status] || statusMeta.DRAFT;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Nav */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/internships" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Internships</Link>
        {showActions && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {internship.status === 'DRAFT' && (
              <ActionBtn label="🚀 Publish" color="#4ade80" onClick={() => doAction('publish')} loading={actionLoading === 'publish'} />
            )}
            {internship.status === 'PUBLISHED' && (
              <ActionBtn label="🔒 Close" color="#f59e0b" onClick={() => doAction('close')} loading={actionLoading === 'close'} />
            )}
            {(internship.status === 'CLOSED' || internship.status === 'ARCHIVED') && (
              <ActionBtn label="♻️ Restore" color="#60a5fa" onClick={() => doAction('restore')} loading={actionLoading === 'restore'} />
            )}
            {internship.status !== 'ARCHIVED' && (
              <ActionBtn label="📦 Archive" color="#6b7280" onClick={() => doAction('archive')} loading={actionLoading === 'archive'} />
            )}
            <ActionBtn label="📋 Duplicate" color="#a78bfa" onClick={() => doAction('duplicate')} loading={actionLoading === 'duplicate'} />
            <Link href={`/internships/${id}/edit`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>✏️ Edit</Link>
            <Link href={`/internships/${id}/dashboard`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>📊 Analytics</Link>
            <ActionBtn label="🗑️" color="#ef4444" onClick={() => doAction('delete')} loading={actionLoading === 'delete'} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ margin: '16px 40px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 18px', color: '#f87171', fontSize: '14px' }}>{error}</div>
      )}

      <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 40px' }}>
        {/* Hero Section */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {internship.company_logo ? (
              <img src={internship.company_logo} alt={internship.company_name || ''} style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: 'linear-gradient(135deg, #a78bfa22, #60a5fa22)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#a78bfa', flexShrink: 0 }}>
                {(internship.company_name || 'C')[0]}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 900, lineHeight: 1.2 }}>{internship.title}</h1>
                  <p style={{ margin: 0, fontSize: '15px', color: '#a78bfa', fontWeight: 700 }}>{internship.company_name}</p>
                </div>
                <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, background: sm.bg, color: sm.color, border: `1px solid ${sm.color}30`, flexShrink: 0 }}>
                  {sm.label}
                </span>
              </div>

              {/* Key Tags */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px' }}>
                <InfoPill icon="🌐" text={internship.work_mode} />
                {internship.location && <InfoPill icon="📍" text={internship.location} />}
                {internship.duration_weeks && <InfoPill icon="📅" text={`${internship.duration_weeks} weeks`} />}
                <InfoPill icon="🎓" text={internship.experience_level} />
                <InfoPill icon="👥" text={`${internship.openings} opening${internship.openings !== 1 ? 's' : ''}`} />
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <Stat icon="👁" label="Views" value={internship.view_count} />
                <Stat icon="📨" label="Applications" value={internship.application_count} />
                {(internship.stipend_min || internship.stipend_max) ? (
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>STIPEND/MONTH</p>
                    <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: '#4ade80' }}>
                      {internship.stipend_currency} {internship.stipend_min?.toLocaleString()}{internship.stipend_min && internship.stipend_max ? '–' : ''}{internship.stipend_max?.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>STIPEND</p><p style={{ margin: '2px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Not disclosed</p></div>
                )}
                {internship.application_deadline && (
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>DEADLINE</p>
                    <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: internship.is_deadline_passed ? '#f87171' : '#f59e0b' }}>
                      {internship.is_deadline_passed ? '⚠️ Expired' : internship.application_deadline}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {internship.description && (
              <Section title="About the Role">
                <p style={{ margin: 0, lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap' }}>{internship.description}</p>
              </Section>
            )}
            {internship.responsibilities?.length > 0 && (
              <Section title="Responsibilities">
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {internship.responsibilities.map((r: string, i: number) => <li key={i} style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{r}</li>)}
                </ul>
              </Section>
            )}
            {internship.required_skills?.length > 0 && (
              <Section title="Required Skills">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {internship.required_skills.map((s: string) => <SkillBadge key={s} text={s} color="#a78bfa" />)}
                </div>
              </Section>
            )}
            {internship.technologies?.length > 0 && (
              <Section title="Technologies">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {internship.technologies.map((t: string) => <SkillBadge key={t} text={t} color="#60a5fa" />)}
                </div>
              </Section>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Apply CTA */}
            {internship.status === 'PUBLISHED' && !internship.is_deadline_passed && user?.role !== 'hr' && user?.role !== 'admin' && (
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800 }}>Interested?</h3>
                <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{internship.application_count} applications already submitted</p>
                <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(167,139,250,0.35)' }}>
                  Apply Now →
                </button>
              </div>
            )}
            {/* Meta Card */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>INTERNSHIP DETAILS</h4>
              {[
                ['Work Mode', internship.work_mode, '🌐'],
                ['Location', internship.location || 'Remote/TBD', '📍'],
                ['Duration', internship.duration_weeks ? `${internship.duration_weeks} weeks` : 'TBD', '📅'],
                ['Openings', String(internship.openings), '👥'],
                ['Experience', internship.experience_level, '🎓'],
                ['Deadline', internship.application_deadline || 'Open', '⏰'],
              ].map(([label, val, icon]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{icon} {label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', textAlign: 'right', maxWidth: '55%' }}>{val}</span>
                </div>
              ))}
            </div>
            {internship.published_at && (
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                Posted {new Date(internship.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{title}</h3>
      {children}
    </div>
  );
}
function InfoPill({ icon, text }: { icon: string; text: string }) {
  return <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>{icon} {text}</span>;
}
function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{icon} {label.toUpperCase()}</p>
      <p style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 900 }}>{value}</p>
    </div>
  );
}
function SkillBadge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding: '6px 14px', borderRadius: '20px', background: `${color}14`, border: `1px solid ${color}28`, fontSize: '13px', color, fontWeight: 600 }}>{text}</span>;
}
function ActionBtn({ label, color, onClick, loading }: { label: string; color: string; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${color}30`, background: `${color}12`, color, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
      {loading ? '...' : label}
    </button>
  );
}
function LoadingScreen() {
  return <div style={{ minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif', fontSize: '16px' }}>Loading internship...</div>;
}
function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0c29', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontFamily: 'Inter, sans-serif', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <p style={{ fontSize: '16px', margin: 0 }}>{message}</p>
      <Link href="/internships" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px', fontWeight: 700 }}>← Back to Internships</Link>
    </div>
  );
}
