'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Internship } from '../../../types';
import { useAuthStore } from '../../../store/auth';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import ApplyButton from '@/components/ApplyButton';
import {
  Bookmark,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Briefcase,
  Trash2,
  FolderHeart,
  Plus,
  X,
  ChevronRight,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SavedJobsPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Saved Jobs & Collections">
        <SavedJobsContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function SavedJobsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [savedJobs, setSavedJobs] = useState<Internship[]>([]);
  const [collections, setCollections] = useState<Record<string, string[]>>({});
  const [activeCollection, setActiveCollection] = useState<string>('ALL');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [jobToAssign, setJobToAssign] = useState<Internship | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Load Saved Jobs & Collections from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedJobs = localStorage.getItem('capvia_saved_internships');
      if (storedJobs) {
        try {
          setSavedJobs(JSON.parse(storedJobs));
        } catch (e) {
          console.error(e);
        }
      }

      const storedCollections = localStorage.getItem('capvia_saved_collections');
      if (storedCollections) {
        try {
          setCollections(JSON.parse(storedCollections));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const removeJob = (id: string) => {
    const updated = savedJobs.filter((job) => job.id !== id);
    setSavedJobs(updated);
    localStorage.setItem('capvia_saved_internships', JSON.stringify(updated));

    // Also remove from all collections
    const updatedCollections = { ...collections };
    Object.keys(updatedCollections).forEach((key) => {
      updatedCollections[key] = updatedCollections[key].filter((jobId) => jobId !== id);
    });
    setCollections(updatedCollections);
    localStorage.setItem('capvia_saved_collections', JSON.stringify(updatedCollections));
  };

  const createCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    const name = newCollectionName.trim();
    if (collections[name]) {
      alert('A collection with this name already exists.');
      return;
    }

    const updated = { ...collections, [name]: [] };
    setCollections(updated);
    localStorage.setItem('capvia_saved_collections', JSON.stringify(updated));
    setNewCollectionName('');
    setShowNewCollectionModal(false);
  };

  const deleteCollection = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete collection "${name}"? The saved jobs will not be deleted.`)) return;

    const updated = { ...collections };
    delete updated[name];
    setCollections(updated);
    localStorage.setItem('capvia_saved_collections', JSON.stringify(updated));
    if (activeCollection === name) {
      setActiveCollection('ALL');
    }
  };

  const assignJobToCollection = (collectionName: string) => {
    if (!jobToAssign) return;

    const updated = { ...collections };
    
    // Initialize collection if it doesn't exist
    if (!updated[collectionName]) {
      updated[collectionName] = [];
    }

    // Add to collection if not already in it
    if (!updated[collectionName].includes(jobToAssign.id)) {
      updated[collectionName].push(jobToAssign.id);
    } else {
      // Toggle remove if already in it
      updated[collectionName] = updated[collectionName].filter((id) => id !== jobToAssign.id);
    }

    setCollections(updated);
    localStorage.setItem('capvia_saved_collections', JSON.stringify(updated));
  };

  const filteredJobs = savedJobs.filter((job) => {
    if (activeCollection === 'ALL') return true;
    const collectionJobIds = collections[activeCollection] || [];
    return collectionJobIds.includes(job.id);
  });

  const isCandidate = user?.role === 'candidate' || !user?.role;

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-outfit text-slate-900">
            Saved Internships
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Keep track of bookmarks, organize opportunities in Collections, and prepare applications.
          </p>
        </div>
        <Link
          href="/internships"
          className="px-4 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          Browse Listings
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar: Collections List (1 Column) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FolderHeart size={14} className="text-[#0D47A1]" />
                Collections
              </span>
              <button
                onClick={() => setShowNewCollectionModal(true)}
                className="p-1 rounded-lg hover:bg-slate-50 text-[#0D47A1] transition-colors"
                aria-label="Create collection"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveCollection('ALL')}
                className={`text-left px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all flex justify-between items-center ${
                  activeCollection === 'ALL'
                    ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                    : 'bg-white border-transparent text-slate-650 hover:bg-slate-50'
                }`}
              >
                <span>All Bookmarks</span>
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px]">
                  {savedJobs.length}
                </span>
              </button>

              {Object.keys(collections).map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveCollection(name)}
                  className={`text-left px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all flex justify-between items-center group ${
                    activeCollection === name
                      ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                      : 'bg-white border-transparent text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate pr-2">{name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px]">
                      {collections[name].length}
                    </span>
                    <button
                      onClick={(e) => deleteCollection(name, e)}
                      className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Panel: Saved Jobs Grid (3 Columns) */}
        <div className="lg:col-span-3 space-y-5">
          {filteredJobs.length === 0 ? (
            /* Empty State */
            <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-8">
              <FolderOpen size={44} className="mx-auto mb-4 text-slate-300" />
              <h3 className="font-extrabold text-slate-800 text-base font-outfit">
                {activeCollection === 'ALL' ? 'No Saved Internships' : 'Empty Collection'}
              </h3>
              <p className="text-slate-450 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                {activeCollection === 'ALL'
                  ? 'Bookmarked opportunities will appear here. Start exploring roles on the marketplace.'
                  : `There are currently no bookmarked roles assigned to collection "${activeCollection}".`}
              </p>
              <Link
                href="/internships"
                className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Browse Internships
                <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            /* Saved Cards list */
            <div className="grid grid-cols-1 gap-5">
              <AnimatePresence>
                {filteredJobs.map((job) => {
                  const deadlineDate = job.application_deadline
                    ? new Date(job.application_deadline).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => router.push(`/internships/${job.id}`)}
                      className="bg-white border border-slate-150/70 hover:border-slate-350 rounded-[22px] p-6 hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Company Logo */}
                        <div className="flex-shrink-0">
                          {job.company_logo ? (
                            <img
                              src={job.company_logo}
                              alt={job.company_name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[#0D47A1] text-lg uppercase">
                              {(job.company_name || 'C')[0]}
                            </div>
                          )}
                        </div>

                        {/* Title and actions */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-base font-bold text-slate-900 truncate hover:text-[#0D47A1] transition-colors font-outfit">
                              {job.title}
                            </h3>
                            
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setJobToAssign(job);
                                  setShowAssignModal(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold text-[#0D47A1] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                title="Assign to Collections"
                              >
                                Organize
                              </button>
                              <button
                                onClick={() => removeJob(job.id)}
                                className="p-2 rounded-lg border border-slate-150 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all"
                                title="Remove Bookmark"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-xs">
                            <span className="font-bold text-[#0D47A1]">
                              {job.company_name}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1 text-slate-500 font-semibold">
                              <MapPin size={13} className="text-slate-400" />
                              {job.location || 'Remote'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 text-[#0D47A1] font-extrabold bg-blue-50/70 px-2 py-0.5 rounded-md">
                              {job.work_mode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display what Collections this job is in */}
                      {Object.keys(collections).some((col) => collections[col].includes(job.id)) && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Lists:</span>
                          {Object.keys(collections)
                            .filter((col) => collections[col].includes(job.id))
                            .map((colName) => (
                              <span
                                key={colName}
                                className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-[#0D47A1] border border-blue-100 rounded-full"
                              >
                                {colName}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Footer Info & Apply actions */}
                      <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-slate-100 mt-2">
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                          {job.stipend_min ? (
                            <span className="flex items-center gap-1 text-emerald-650 font-bold">
                              <DollarSign size={14} className="text-emerald-500" />
                              {job.stipend_currency} {job.stipend_min.toLocaleString()}
                              {job.stipend_max ? ` - ${job.stipend_max.toLocaleString()}` : ''}/mo
                            </span>
                          ) : (
                            <span className="text-slate-400">Unpaid</span>
                          )}
                          <span className="text-slate-200">|</span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            {job.duration_weeks ? `${job.duration_weeks} weeks` : 'TBD'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/internships/${job.id}`}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-[#0D47A1] hover:bg-blue-50 transition-colors"
                          >
                            View Details
                          </Link>
                          {isCandidate && (
                            <div className="w-36 shrink-0">
                              <ApplyButton
                                internshipId={job.id}
                                internshipTitle={job.title}
                                isDeadlinePassed={job.is_deadline_passed}
                                onSuccess={(appId) => router.push(`/applications/${appId}`)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add New Collection */}
      <AnimatePresence>
        {showNewCollectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewCollectionModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-sm shadow-professional text-slate-800 relative z-10"
            >
              <h3 className="text-base font-bold text-slate-900 font-outfit mb-4">Create New Collection</h3>
              <form onSubmit={createCollection} className="space-y-4">
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. ML & Data Science, Remote Jobs"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-800 text-sm outline-none focus:border-[#0D47A1] transition-all"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCollectionModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#0D47A1] text-white font-bold text-xs"
                  >
                    Create List
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Organize Job into Collections */}
      <AnimatePresence>
        {showAssignModal && jobToAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAssignModal(false);
                setJobToAssign(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-sm shadow-professional text-slate-800 relative z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 font-outfit truncate pr-4">
                  Organize: {jobToAssign.title}
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setJobToAssign(null);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              {Object.keys(collections).length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-500">No collections created yet.</p>
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setShowNewCollectionModal(true);
                    }}
                    className="mt-3 text-xs font-bold text-[#0D47A1] hover:underline"
                  >
                    + Create First List
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Lists</p>
                  {Object.keys(collections).map((name) => {
                    const isInCollection = collections[name].includes(jobToAssign.id);
                    return (
                      <button
                        key={name}
                        onClick={() => assignJobToCollection(name)}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex justify-between items-center ${
                          isInCollection
                            ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                            : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        <span>{name}</span>
                        {isInCollection && <span className="text-xs text-[#0D47A1]">✓ Selected</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
