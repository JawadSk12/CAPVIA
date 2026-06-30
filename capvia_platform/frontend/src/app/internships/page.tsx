'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { internshipApi } from '../../services/api';
import { Internship, InternshipFilters } from '../../types';
import { useAuthStore } from '../../store/auth';
import ProtectedRoute from '../../components/ProtectedRoute';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import ApplyButton from '@/components/ApplyButton';
import {
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Briefcase,
  Bookmark,
  ChevronRight,
  Filter,
  Sparkles,
  Award,
  ChevronDown,
  X,
  Plus,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WORK_MODES = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ONSITE', label: 'Onsite' },
];

const EXP_LEVELS = [
  { value: 'ENTRY', label: 'Entry Level' },
  { value: 'MID', label: 'Mid Level' },
  { value: 'SENIOR', label: 'Senior' },
];

const POPULAR_CATEGORIES = [
  'Machine Learning',
  'AI',
  'Data Science',
  'Backend',
  'Frontend',
  'DevOps',
  'Cloud',
  'Cyber Security',
  'UI UX',
  'Product',
  'Marketing',
  'Business',
  'Finance',
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest First' },
  { value: 'view_count', label: 'Most Popular' },
  { value: 'application_deadline', label: 'Deadline' },
  { value: 'stipend_min', label: 'Highest Salary' },
];

export default function InternshipsPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Internship Marketplace">
        <InternshipsContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function InternshipsContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [filters, setFilters] = useState<InternshipFilters>({
    sort_by: 'created_at',
    sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Bookmarks LocalState
  const [savedIds, setSavedIds] = useState<string[]>([]);
  
  // Mobile Filter Drawer Toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const PER_PAGE = 10;

  // Retrieve saved jobs list from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('capvia_saved_internships');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSavedIds(parsed.map((x: any) => x.id || x));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Sync bookmark list
  const toggleSave = (job: Internship, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window === 'undefined') return;

    let savedList: any[] = [];
    const stored = localStorage.getItem('capvia_saved_internships');
    if (stored) {
      try {
        savedList = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    const exists = savedList.some((x) => x.id === job.id);
    let updated;
    if (exists) {
      updated = savedList.filter((x) => x.id !== job.id);
    } else {
      updated = [...savedList, job];
    }

    localStorage.setItem('capvia_saved_internships', JSON.stringify(updated));
    setSavedIds(updated.map((x) => x.id));
  };

  const fetchInternships = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Map has_stipend strictly from filter query
      const data = await internshipApi.list({
        ...filters,
        page,
        per_page: PER_PAGE,
      });
      setInternships(data.internships || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load internships.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({
      ...f,
      search: searchInput || undefined,
      location: locationInput || undefined,
    }));
    setPage(1);
  };

  const selectCategory = (category: string) => {
    const newVal = selectedCategory === category ? '' : category;
    setSelectedCategory(newVal);
    setSearchInput(newVal);
    setFilters((f) => ({
      ...f,
      search: newVal || undefined,
    }));
    setPage(1);
  };

  const updateFilter = (key: keyof InternshipFilters, val: any) => {
    setFilters((f) => ({
      ...f,
      [key]: val === '' || val === undefined ? undefined : val,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ sort_by: 'created_at', sort_dir: 'desc' });
    setSearchInput('');
    setLocationInput('');
    setSelectedDuration('ALL');
    setSelectedCategory('');
    setPage(1);
  };

  // Client-side advanced filter for duration_weeks (since backend lacks duration filter)
  const filteredInternships = useMemo(() => {
    if (selectedDuration === 'ALL') return internships;
    
    return internships.filter((item) => {
      const weeks = item.duration_weeks || 0;
      if (selectedDuration === 'SHORT') return weeks <= 8; // Under 2 months
      if (selectedDuration === 'MEDIUM') return weeks > 8 && weeks <= 16; // 2-4 months
      if (selectedDuration === 'LONG') return weeks > 16; // 4+ months
      return true;
    });
  }, [internships, selectedDuration]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const isCandidate = user?.role === 'candidate' || !user?.role;
  const canCreate = user?.role === 'hr' || user?.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-outfit text-slate-900">
            Find Opportunities
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Browse through {total} active internship positions on CAPVIA.
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Link
              href="/internships/manage"
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              ⚙️ Manage Roles
            </Link>
            <Link
              href="/internships/create"
              className="px-4 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus size={14} />
              Post Internship
            </Link>
          </div>
        )}
      </div>

      {/* 1. Large Search Hero */}
      <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            {/* Role/Company Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search roles, skills, technologies..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-800 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>

            {/* Location Input */}
            <div className="w-full md:w-80 relative">
              <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Location (e.g. Bangalore, Remote)"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-800 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-8 py-3.5 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <Search size={16} />
            Search Jobs
          </button>
        </form>

        {/* 2. Popular Categories */}
        <div className="mt-6 border-t border-slate-100 pt-5 relative z-10">
          <p className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">
            Popular Categories
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 flex-wrap">
            {POPULAR_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => selectCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                    active
                      ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid + Filter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filters (1 Column) */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm space-y-6 sticky top-24">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Filter size={15} className="text-[#0D47A1]" />
                Filters
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-[#0D47A1] hover:text-[#0A3B85] transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* Work Mode */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-455 uppercase tracking-wider">Work Mode</p>
              <div className="flex flex-col gap-1.5">
                {WORK_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => updateFilter('work_mode', filters.work_mode === m.value ? '' : m.value)}
                    className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      filters.work_mode === m.value
                        ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                        : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-455 uppercase tracking-wider">Experience</p>
              <div className="flex flex-col gap-1.5">
                {EXP_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => updateFilter('experience_level', filters.experience_level === level.value ? '' : level.value)}
                    className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      filters.experience_level === level.value
                        ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                        : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stipend Options */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-455 uppercase tracking-wider">Stipend</p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => updateFilter('has_stipend', filters.has_stipend === true ? undefined : true)}
                  className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filters.has_stipend === true
                      ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                      : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Paid Only
                </button>
                <button
                  onClick={() => updateFilter('has_stipend', filters.has_stipend === false ? undefined : false)}
                  className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filters.has_stipend === false
                      ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                      : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Unpaid Only
                </button>
              </div>
            </div>

            {/* Duration Filters */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-455 uppercase tracking-wider">Duration</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: 'ALL', label: 'Any Duration' },
                  { value: 'SHORT', label: 'Short (≤ 8 weeks)' },
                  { value: 'MEDIUM', label: 'Medium (8-16 weeks)' },
                  { value: 'LONG', label: 'Long (16+ weeks)' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setSelectedDuration(item.value)}
                    className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      selectedDuration === item.value
                        ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                        : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-455 uppercase tracking-wider">Sort By</p>
              <div className="flex flex-col gap-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateFilter('sort_by', opt.value)}
                    className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      filters.sort_by === opt.value
                        ? 'bg-blue-50 border-blue-200 text-[#0D47A1] font-bold'
                        : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Content (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Tags */}
          {(filters.work_mode || filters.experience_level || filters.has_stipend !== undefined || filters.search || filters.location || selectedDuration !== 'ALL') && (
            <div className="flex gap-2 flex-wrap items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 pr-2">Active:</span>
              
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700">
                  Search: "{filters.search}"
                  <button onClick={() => { updateFilter('search', ''); setSearchInput(''); setSelectedCategory(''); }} className="text-slate-400 hover:text-slate-700"><X size={12} /></button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700">
                  Near: {filters.location}
                  <button onClick={() => { updateFilter('location', ''); setLocationInput(''); }} className="text-slate-400 hover:text-slate-700"><X size={12} /></button>
                </span>
              )}
              {filters.work_mode && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700">
                  Mode: {filters.work_mode}
                  <button onClick={() => updateFilter('work_mode', '')} className="text-slate-400 hover:text-slate-700"><X size={12} /></button>
                </span>
              )}
              {filters.experience_level && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700">
                  Exp: {filters.experience_level}
                  <button onClick={() => updateFilter('experience_level', '')} className="text-slate-400 hover:text-slate-700"><X size={12} /></button>
                </span>
              )}
              {filters.has_stipend !== undefined && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700">
                  {filters.has_stipend ? 'Paid' : 'Unpaid'}
                  <button onClick={() => updateFilter('has_stipend', undefined)} className="text-slate-400 hover:text-slate-700"><X size={12} /></button>
                </span>
              )}
              {selectedDuration !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-700">
                  Duration: {selectedDuration.toLowerCase()}
                  <button onClick={() => setSelectedDuration('ALL')} className="text-slate-400 hover:text-slate-700"><X size={12} /></button>
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-750 text-xs p-4 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="text-red-550 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Skeletons Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 h-52 animate-pulse flex flex-col justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                      <div className="h-3 bg-slate-50 rounded-full w-1/3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-50 rounded-full w-full" />
                    <div className="h-3 bg-slate-50 rounded-full w-4/5" />
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-50 pt-4 mt-2">
                    <div className="h-4 bg-slate-100 rounded-full w-24" />
                    <div className="h-8 bg-slate-100 rounded-lg w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInternships.length === 0 ? (
            /* Empty State */
            <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-8">
              <Briefcase size={40} className="mx-auto mb-4 text-slate-350" />
              <h3 className="font-extrabold text-slate-800 text-base font-outfit">No Internships Found</h3>
              <p className="text-slate-450 text-xs mt-1 max-w-sm mx-auto">
                No matching opportunities were found for your search criteria. Adjust your filters or search keywords.
              </p>
              <button
                onClick={clearFilters}
                className="mt-5 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Cards Grid */
            <div className="grid grid-cols-1 gap-5">
              <AnimatePresence>
                {filteredInternships.map((job) => {
                  const isSaved = savedIds.includes(job.id);
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

                        {/* Card Text Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-base font-bold text-slate-900 truncate hover:text-[#0D47A1] transition-colors font-outfit">
                              {job.title}
                            </h3>
                            <button
                              onClick={(e) => toggleSave(job, e)}
                              className={`p-2 rounded-lg border transition-all ${
                                isSaved
                                  ? 'bg-[#FFC107]/10 border-[#FFC107]/30 text-[#F57F17]'
                                  : 'bg-slate-50 border-slate-150 text-slate-450 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              aria-label={isSaved ? 'Remove bookmark' : 'Bookmark job'}
                            >
                              <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-xs">
                            <span className="font-bold text-[#0D47A1] hover:underline">
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

                      {/* Required Skills Row */}
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {job.required_skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 border border-slate-150/50 text-slate-600 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.required_skills.length > 4 && (
                            <span className="text-[10px] text-slate-450 font-semibold px-1 py-0.5">
                              +{job.required_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Footer Details */}
                      <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-slate-100 mt-2">
                        {/* Stipend and Duration info */}
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                          {job.stipend_min ? (
                            <span className="flex items-center gap-1 text-emerald-650 font-bold">
                              <DollarSign size={14} className="text-emerald-500" />
                              {job.stipend_currency} {job.stipend_min.toLocaleString()}
                              {job.stipend_max ? ` - ${job.stipend_max.toLocaleString()}` : ''}/mo
                            </span>
                          ) : (
                            <span className="text-slate-400">Unpaid Internship</span>
                          )}
                          <span className="text-slate-200">|</span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            {job.duration_weeks ? `${job.duration_weeks} weeks` : 'Duration TBD'}
                          </span>
                        </div>

                        {/* Interactive Buttons */}
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

                      {/* Applicants & Posted stats */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-1">
                        <div className="flex items-center gap-3">
                          <span>📨 {job.application_count} Applicants</span>
                          <span>👁 {job.view_count} Views</span>
                        </div>
                        {deadlineDate && (
                          <span className={job.is_deadline_passed ? 'text-red-550' : 'text-slate-400'}>
                            {job.is_deadline_passed ? 'Expired' : `Deadline: ${deadlineDate}`}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 pt-6 border-t border-slate-100 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-slate-250 hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs font-bold text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl border border-slate-250 hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
