'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { internshipApi } from '../../../services/api';
import { Internship } from '../../../types';
import { 
  Briefcase, Search, Filter, Plus, Trash2, Copy, Play, XCircle, RefreshCw, 
  Eye, Edit3, ArrowRight, ExternalLink, Calendar, Users
} from 'lucide-react';

const STATUS_TABS = [
  { key: '', label: 'All Vacancies' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'ARCHIVED', label: 'Archived' },
];

export default function HRInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal State for Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newWorkMode, setNewWorkMode] = useState('REMOTE');
  const [newExpLevel, setNewExpLevel] = useState('ENTRY_LEVEL');

  const PER_PAGE = 10;

  const fetchInternships = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page, per_page: PER_PAGE };
      if (activeTab) params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      
      const data = await internshipApi.manage(params);
      setInternships(data.internships || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load vacancies.');
    } finally {
      setIsLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const handleAction = async (action: string, id: string, title: string) => {
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
        if (!confirm(`Delete "${title}"? This action is permanent.`)) return;
        await internshipApi.delete(id);
        setSuccess(`"${title}" deleted.`);
      }
      await fetchInternships();
      if (action !== 'delete' && action !== 'duplicate') {
        setSuccess(`"${title}" ${action}ed successfully.`);
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || `Action failed.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await internshipApi.create({
        title: newTitle,
        company_name: newCompanyName,
        description: newDescription,
        requirements: newRequirements,
        location: newLocation,
        work_mode: newWorkMode,
        experience_level: newExpLevel,
        status: 'DRAFT'
      });
      setSuccess('Vacancy draft created successfully.');
      setShowCreateModal(false);
      // Reset form
      setNewTitle('');
      setNewCompanyName('');
      setNewDescription('');
      setNewRequirements('');
      setNewLocation('');
      fetchInternships();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to create internship.');
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Manage Internships" breadcrumbs={[{ label: 'Workspace' }, { label: 'Internships' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Hiring Campaigns</h2>
            <p className="text-slate-500 text-xs mt-1">Configure vacancy drafts, publish postings, and audit active applications</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0D47A1] hover:bg-[#0D47A1]/95 text-white text-xs font-bold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Post Vacancy</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-4 text-xs mb-6 font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-[#10B981] rounded-xl p-4 text-xs mb-6 font-semibold flex items-center space-x-1.5">
            <span>✓</span> <span>{success}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          
          {/* Status Tabs */}
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-[#0D47A1] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex items-center space-x-2 bg-white border border-slate-100 rounded-xl px-3.5 py-1.5 shadow-sm max-w-md w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-400"
            />
          </div>

        </div>

        {/* Vacancies Display */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Loading listings...
          </div>
        ) : internships.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8">
            <Briefcase className="h-10 w-10 mx-auto mb-4 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-base">No Vacancies Found</h3>
            <p className="text-xs text-slate-450 mt-1">Get started by posting your first campaign draft.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0D47A1] text-white text-xs font-bold shadow-sm"
            >
              Post First Vacancy
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Vacancy Campaign</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Applications</th>
                    <th className="py-4 px-6 text-center">Views</th>
                    <th className="py-4 px-6">Deadline</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {internships.map((i) => {
                    let statusLabel = 'Draft';
                    let statusClass = 'bg-amber-50 text-[#F59E0B] border-amber-100';
                    
                    if (i.status === 'PUBLISHED') {
                      statusLabel = 'Published';
                      statusClass = 'bg-emerald-50 text-[#10B981] border-emerald-100';
                    } else if (i.status === 'CLOSED') {
                      statusLabel = 'Closed';
                      statusClass = 'bg-slate-100 text-slate-600 border-slate-200';
                    } else if (i.status === 'ARCHIVED') {
                      statusLabel = 'Archived';
                      statusClass = 'bg-slate-100 text-slate-400 border-slate-200';
                    }

                    return (
                      <tr key={i.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800 text-sm">{i.title}</div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-2">
                            <span>{i.company_name}</span>
                            <span>•</span>
                            <span>{i.work_mode}</span>
                            <span>•</span>
                            <span>{i.experience_level}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-800 font-bold">
                          {i.application_count}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-550 font-bold">
                          {i.view_count}
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">
                          {i.application_deadline ? (
                            i.is_deadline_passed ? (
                              <span className="text-rose-500">⚠️ Expired</span>
                            ) : (
                              <span>{i.application_deadline}</span>
                            )
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center space-x-1.5">
                            <Link
                              href={`/hr/rankings?vacancy=${i.id}`}
                              className="p-1.5 rounded-lg border border-slate-100 hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/5 text-slate-450 hover:text-[#0D47A1] transition-colors"
                              title="View Leaderboard"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            
                            {i.status === 'DRAFT' && (
                              <button
                                onClick={() => handleAction('publish', i.id, i.title)}
                                disabled={actionLoading === `publish-${i.id}`}
                                className="px-2 py-1 rounded-lg border border-slate-100 hover:border-[#10B981]/30 hover:bg-[#10B981]/5 text-[#10B981] font-bold text-[10px]"
                                title="Publish Listing"
                              >
                                Publish
                              </button>
                            )}
                            
                            {i.status === 'PUBLISHED' && (
                              <button
                                onClick={() => handleAction('close', i.id, i.title)}
                                disabled={actionLoading === `close-${i.id}`}
                                className="px-2 py-1 rounded-lg border border-slate-100 hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/5 text-[#F59E0B] font-bold text-[10px]"
                                title="Close Applications"
                              >
                                Close
                              </button>
                            )}

                            {(i.status === 'CLOSED' || i.status === 'ARCHIVED') && (
                              <button
                                onClick={() => handleAction('restore', i.id, i.title)}
                                disabled={actionLoading === `restore-${i.id}`}
                                className="px-2 py-1 rounded-lg border border-slate-100 hover:border-blue-500/30 hover:bg-blue-50 text-blue-500 font-bold text-[10px]"
                                title="Restore Listing"
                              >
                                Restore
                              </button>
                            )}

                            <button
                              onClick={() => handleAction('duplicate', i.id, i.title)}
                              disabled={actionLoading === `duplicate-${i.id}`}
                              className="p-1.5 rounded-lg border border-slate-100 hover:border-slate-200 text-slate-450 hover:text-slate-800 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleAction('delete', i.id, i.title)}
                              disabled={actionLoading === `delete-${i.id}`}
                              className="p-1.5 rounded-lg border border-slate-100 hover:border-rose-250 hover:bg-rose-50 text-slate-450 hover:text-rose-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 p-4 flex justify-center items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 disabled:opacity-40 text-xs font-bold cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="text-slate-500 text-xs px-2 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 disabled:opacity-40 text-xs font-bold cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}

          </div>
        )}

        {/* CREATE VACANCY MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
            />

            {/* Modal Container */}
            <div className="relative bg-white border border-slate-100 rounded-2xl w-full max-w-xl shadow-2xl p-6 overflow-hidden z-10">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-outfit">Create Vacancy Campaign</h3>
                  <p className="text-slate-500 text-[10px] mt-0.5">Initialize a new vacancy draft listing</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateInternship} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Campaign Title</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Frontend Engineering Intern"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Host</label>
                    <input
                      type="text"
                      required
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="e.g. CAPVIA Labs"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Office</label>
                    <input
                      type="text"
                      required
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. Bangalore, India"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Work Mode</label>
                      <select
                        value={newWorkMode}
                        onChange={(e) => setNewWorkMode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 font-bold"
                      >
                        <option value="REMOTE">Remote</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="ON_SITE">On-Site</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Exp Level</label>
                      <select
                        value={newExpLevel}
                        onChange={(e) => setNewExpLevel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 font-bold"
                      >
                        <option value="ENTRY_LEVEL">Entry Level</option>
                        <option value="MID_LEVEL">Mid Level</option>
                        <option value="SENIOR_LEVEL">Senior Level</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Campaign Description</label>
                  <textarea
                    rows={4}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide a detailed summary of roles, tasks, and company background..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 resize-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requirements / Qualifications</label>
                  <textarea
                    rows={3}
                    required
                    value={newRequirements}
                    onChange={(e) => setNewRequirements(e.target.value)}
                    placeholder="Highlight required skills, tools, frameworks or education..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#0D47A1] text-slate-800 resize-none font-medium"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0D47A1] hover:bg-[#0D47A1]/95 text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    Save Draft
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
