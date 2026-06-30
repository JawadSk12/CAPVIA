'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../../../services/api';
import { Company } from '../../../types';
import { Users, UserPlus, Shield, Clock, RefreshCw, Trash2, Mail } from 'lucide-react';

export default function HRTeamPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load recruiter's company
  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => companyApi.listMine(),
  });

  const company: Company | null = useMemo(() => {
    if (!companyData) return null;
    return Array.isArray(companyData) 
      ? companyData[0] 
      : companyData.companies?.[0] || companyData;
  }, [companyData]);

  // Load members of this company
  const { data: membersList, isLoading, refetch } = useQuery({
    queryKey: ['company-members', company?.id],
    queryFn: () => companyApi.getMembers(company!.id),
    enabled: !!company?.id,
  });

  const members = useMemo(() => {
    return membersList?.members || [];
  }, [membersList]);

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: (payload: { userId: string, role: string }) => 
      companyApi.addMember(company!.id, payload.userId, payload.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', company?.id] });
      setSuccess('Team member invitation sent successfully.');
      setInviteEmail('');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || 'Failed to add member.');
      setTimeout(() => setError(null), 3500);
    }
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => companyApi.removeMember(company!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', company?.id] });
      setSuccess('Team member removed successfully.');
      setTimeout(() => setSuccess(null), 3000);
    }
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    // We pass the email to addMember (which the backend uses as user identification)
    addMemberMutation.mutate({ userId: inviteEmail, role: inviteRole });
  };

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Team Management" breadcrumbs={[{ label: 'Workspace' }, { label: 'Team' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Recruiter Directory</h2>
            <p className="text-slate-500 text-xs mt-1">Invite collaborative recruiters, audit security logs, and verify seat licenses</p>
          </div>
        </div>

        {/* Feedback Messages */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-[#10B981] rounded-xl p-4 text-xs mb-6 font-semibold">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-4 text-xs mb-6 font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Members Table */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6">
            <h4 className="text-sm font-bold text-slate-900 font-outfit mb-4">Active Team Seats</h4>
            
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#0D47A1]" />
                Syncing recruiter directory...
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No seat listings found.
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member: any) => (
                  <div key={member.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-9 h-9 bg-[#0D47A1]/10 rounded-xl flex items-center justify-center font-bold text-[#0D47A1]">
                        {member.user?.full_name?.[0]?.toUpperCase() || 'R'}
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold text-slate-800">
                          {member.user?.full_name || 'Recruiter Member'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                          {member.user?.email || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        {member.role || member.member_role || 'RECRUITER'}
                      </span>
                      <button
                        onClick={() => removeMemberMutation.mutate(member.user?.id || member.user_id)}
                        disabled={removeMemberMutation.isPending}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invitation Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-outfit mb-4">Invite Recruiter</h4>
              <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
                Add an existing user to your company's recruitment hub. They will be granted permissions to manage vacancies and evaluations.
              </p>
              
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">User Email Address</label>
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0D47A1] transition-colors">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="recruiter@company.com"
                      className="bg-transparent border-none text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Access Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 font-bold"
                  >
                    <option value="MEMBER">Recruiter</option>
                    <option value="OWNER">Billing Manager</option>
                    <option value="ADMIN">Company Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#0D47A1] hover:bg-[#0D47A1]/95 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{addMemberMutation.isPending ? 'Sending...' : 'Invite Member'}</span>
                </button>
              </form>
            </div>

            <div className="mt-8 bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start space-x-3 text-left">
              <Shield className="h-5 w-5 text-[#0D47A1] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-850 block font-outfit">Security Clearance</span>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed">
                  Invited members gain complete dashboard credentials but are restricted from modifying company bank configurations.
                </span>
              </div>
            </div>

          </div>

        </div>

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
