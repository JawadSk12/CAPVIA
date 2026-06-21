'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { companyApi } from '../../../../services/api';
import { CompanyMember } from '../../../../types';
import { useAuthStore } from '../../../../store/auth';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function CompanyTeamPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <CompanyTeamContent />
    </ProtectedRoute>
  );
}

function CompanyTeamContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add member form
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('MEMBER');
  const [isAdding, setIsAdding] = useState(false);

  // Transfer ownership form
  const [transferUserId, setTransferUserId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await companyApi.getMembers(id as string);
      setMembers(data);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load team members.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, [id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId.trim()) return;
    setIsAdding(true);
    setError(null);
    setSuccess(null);
    try {
      await companyApi.addMember(id as string, addUserId.trim(), addRole);
      setSuccess('Team member added successfully!');
      setAddUserId('');
      setAddRole('MEMBER');
      loadMembers();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to add member.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await companyApi.removeMember(id as string, userId);
      setSuccess(`${name} removed from team.`);
      loadMembers();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to remove member.');
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferUserId.trim()) return;
    if (!confirm('Transfer ownership? You will become a regular MEMBER.')) return;
    setIsTransferring(true);
    setError(null);
    setSuccess(null);
    try {
      await companyApi.transferOwnership(id as string, transferUserId.trim());
      setSuccess('Ownership transferred successfully!');
      setShowTransfer(false);
      setTransferUserId('');
      loadMembers();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to transfer ownership.');
    } finally {
      setIsTransferring(false);
    }
  };

  const owners = members.filter((m) => m.member_role === 'OWNER');
  const regularMembers = members.filter((m) => m.member_role === 'MEMBER');

  const inputStyle: React.CSSProperties = {
    padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '14px', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href={`/companies/${id}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px' }}>← Back to Company</Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👥 Team Management
          </h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: '#f87171', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: '#4ade80', fontSize: '14px' }}>✓ {success}</div>}

        {/* Owners */}
        <Section title="Owners" count={owners.length}>
          {isLoading ? <LoadingRow /> : owners.map((m) => (
            <MemberRow key={m.id} member={m} isCurrentUser={m.email === user?.email} onRemove={() => handleRemoveMember(m.user_id, m.full_name)} canRemove={owners.length > 1} />
          ))}
        </Section>

        {/* Members */}
        <Section title="Members" count={regularMembers.length}>
          {isLoading ? <LoadingRow /> : regularMembers.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '16px 0' }}>No additional members yet.</p>
          ) : regularMembers.map((m) => (
            <MemberRow key={m.id} member={m} isCurrentUser={m.email === user?.email} onRemove={() => handleRemoveMember(m.user_id, m.full_name)} canRemove={true} />
          ))}
        </Section>

        {/* Add Member */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700 }}>Add Team Member</h2>
          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              placeholder="User ID (UUID)"
              style={{ ...inputStyle, flex: 2, minWidth: '200px' }}
            />
            <select value={addRole} onChange={(e) => setAddRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', flex: 1, minWidth: '120px' }}>
              <option value="MEMBER" style={{ background: '#1a1a2e' }}>Member</option>
              <option value="OWNER" style={{ background: '#1a1a2e' }}>Owner</option>
            </select>
            <button type="submit" disabled={isAdding || !addUserId.trim()} style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: isAdding ? 'rgba(167,139,250,0.4)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 700, cursor: isAdding ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
              {isAdding ? 'Adding...' : '+ Add'}
            </button>
          </form>
        </div>

        {/* Transfer Ownership */}
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700 }}>⚠️ Transfer Ownership</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Transfer the owner role to another team member. You will become a regular member.</p>
            </div>
            <button onClick={() => setShowTransfer(!showTransfer)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>
              {showTransfer ? 'Cancel' : 'Transfer'}
            </button>
          </div>
          {showTransfer && (
            <form onSubmit={handleTransferOwnership} style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <input
                type="text"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                placeholder="New owner's User ID (must be existing member)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" disabled={isTransferring || !transferUserId.trim()} style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: isTransferring ? 'rgba(245,158,11,0.3)' : '#f59e0b', color: '#000', fontWeight: 800, cursor: isTransferring ? 'not-allowed' : 'pointer', fontSize: '14px', flexShrink: 0 }}>
                {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700 }}>
        {title} <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>({count})</span>
      </h2>
      {children}
    </div>
  );
}

function MemberRow({ member, isCurrentUser, onRemove, canRemove }: { member: CompanyMember; isCurrentUser: boolean; onRemove: () => void; canRemove: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: member.member_role === 'OWNER' ? 'linear-gradient(135deg, #f59e0b44, #fbbf2444)' : 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: member.member_role === 'OWNER' ? '#f59e0b' : '#a78bfa', flexShrink: 0 }}>
          {member.full_name[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>
            {member.full_name}
            {isCurrentUser && <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>You</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{member.email}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: member.member_role === 'OWNER' ? 'rgba(245,158,11,0.15)' : 'rgba(167,139,250,0.15)', color: member.member_role === 'OWNER' ? '#f59e0b' : '#a78bfa', letterSpacing: '0.5px' }}>
          {member.member_role}
        </span>
        {!isCurrentUser && canRemove && (
          <button onClick={onRemove} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingRow() {
  return <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Loading members...</div>;
}
