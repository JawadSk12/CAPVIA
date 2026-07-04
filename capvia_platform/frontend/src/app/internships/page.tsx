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

  const PER_PAGE = 9;

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
      const res = await internshipApi.list({
        page,
        per_page: PER_PAGE,
        ...filters,
        category: selectedCategory || undefined,
      });

      const items = res.internships || res.items || res.data || [];
      const totalCount = res.total || res.count || items.length;

      setInternships(items);
      setTotal(totalCount);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load internships.');
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, selectedCategory]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const updateFilter = (key: keyof InternshipFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1);
  };

  const selectCategory = (cat: string) => {
    const newVal = selectedCategory === cat ? '' : cat;
    setSelectedCategory(newVal);
    setSearchInput(newVal);
    updateFilter('search', newVal);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput);
    updateFilter('location', locationInput);
  };

  const clearFilters = () => {
    setFilters({
      sort_by: 'created_at',
      sort_dir: 'desc',
    });
    setSearchInput('');
    setLocationInput('');
    setSelectedDuration('ALL');
    setSelectedCategory('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const isCandidate = user?.role === 'candidate';
  const isHR = user?.role === 'hr';
  const isAdmin = user?.role === 'admin';

  // Client-side duration filters
  const filteredInternships = useMemo(() => {
    if (selectedDuration === 'ALL') return internships;
    return internships.filter((job) => {
      const weeks = job.duration_weeks || 0;
      if (selectedDuration === 'SHORT') return weeks <= 8;
      if (selectedDuration === 'MEDIUM') return weeks > 8 && weeks <= 16;
      if (selectedDuration === 'LONG') return weeks > 16;
      return true;
    });
  }, [internships, selectedDuration]);

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight font-outfit">
            Internship Marketplace
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Discover and apply to elite, AI-verified opportunities.
          </p>
        </div>

        {(isHR || isAdmin) && (
          <div className="flex items-center gap-3">
            <Link
              href="/hr/dashboard"
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              ⚙️ Manage Roles
            </Link>
            <Link
              href="/internships/create"
              className="px-4 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-[#1976D2] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} />
              Post Internship
            </Link>
          </div>
        )}
      </div>

      {/* 1. Large Search Hero */}
      <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            {/* Role/Company Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-4.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search roles, skills, technologies..."
                className="w-full pl-12 pr-4 h-14 rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-800 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>

            {/* Location Input */}
            <div className="w-full md:w-80 relative">
              <MapPin className="absolute left-4 top-4.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Location (e.g. Bangalore, Remote)"
                className="w-full pl-12 pr-4 h-14 rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-800 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-8 h-14 rounded-xl bg-[#0D47A1] hover:bg-[#1976D2] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <Search size={16} />
            Search Jobs
          </button>
        </form>

        {/* 2. Popular Categories */}
        <div className="mt-6 border-t border-slate-100 pt-5 relative z-10">
          <p className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3">
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
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 ${
                    active
                      ? 'bg-[#0D47A1] border-[#0D47A1] text-white font-black'
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
              <span className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
                <Filter size={14} className="text-[#0D47A1]" />
                Filters
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-black text-[#0D47A1] hover:text-[#1976D2] transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* Work Mode */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-450 uppercase tracking-wider pl-2 border-l-2 border-l-[#42A5F5]">Work Mode</p>
              <div className="flex flex-col gap-2">
                {WORK_MODES.map((m) => {
                  const isSelected = filters.work_mode === m.value;
                  return (
                    <div
                      key={m.value}
                      onClick={() => updateFilter('work_mode', isSelected ? '' : m.value)}
                      className="flex items-center gap-2.5 cursor-pointer py-1 group/opt"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#0D47A1] border-[#0D47A1] text-white' 
                          : 'border-slate-300 bg-white group-hover/opt:border-slate-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-450 uppercase tracking-wider pl-2 border-l-2 border-l-[#42A5F5]">Experience</p>
              <div className="flex flex-col gap-2">
                {EXP_LEVELS.map((level) => {
                  const isSelected = filters.experience_level === level.value;
                  return (
                    <div
                      key={level.value}
                      onClick={() => updateFilter('experience_level', isSelected ? '' : level.value)}
                      className="flex items-center gap-2.5 cursor-pointer py-1 group/opt"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#0D47A1] border-[#0D47A1] text-white' 
                          : 'border-slate-300 bg-white group-hover/opt:border-slate-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                        {level.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stipend Options */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-455 uppercase tracking-wider pl-2 border-l-2 border-l-[#42A5F5]">Stipend</p>
              <div className="flex flex-col gap-2">
                {[
                  { value: true, label: 'Paid Only' },
                  { value: false, label: 'Unpaid Only' }
                ].map((item) => {
                  const isSelected = filters.has_stipend === item.value;
                  return (
                    <div
                      key={String(item.value)}
                      onClick={() => updateFilter('has_stipend', isSelected ? undefined : item.value)}
                      className="flex items-center gap-2.5 cursor-pointer py-1 group/opt"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#0D47A1] border-[#0D47A1] text-white' 
                          : 'border-slate-300 bg-white group-hover/opt:border-slate-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duration Filters */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-455 uppercase tracking-wider pl-2 border-l-2 border-l-[#42A5F5]">Duration</p>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'ALL', label: 'Any Duration' },
                  { value: 'SHORT', label: 'Short (≤ 8 weeks)' },
                  { value: 'MEDIUM', label: 'Medium (8-16 weeks)' },
                  { value: 'LONG', label: 'Long (16+ weeks)' },
                ].map((item) => {
                  const isSelected = selectedDuration === item.value;
                  return (
                    <div
                      key={item.value}
                      onClick={() => setSelectedDuration(item.value)}
                      className="flex items-center gap-2.5 cursor-pointer py-1 group/opt"
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#0D47A1] border-[#0D47A1] text-white' 
                          : 'border-slate-300 bg-white group-hover/opt:border-slate-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <p className="text-xs font-black text-slate-455 uppercase tracking-wider pl-2 border-l-2 border-l-[#42A5F5]">Sort By</p>
              <div className="flex flex-col gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = filters.sort_by === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => updateFilter('sort_by', opt.value)}
                      className="flex items-center gap-2.5 cursor-pointer py-1 group/opt"
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#0D47A1] border-[#0D47A1] text-white' 
                          : 'border-slate-300 bg-white group-hover/opt:border-slate-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                        {opt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Card Grid (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Tags */}
          {(filters.work_mode || filters.experience_level || filters.has_stipend !== undefined || filters.search || filters.location || selectedDuration !== 'ALL') && (
            <div className="flex gap-2 flex-wrap items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 pr-2">Active:</span>
              
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 h-64 animate-pulse flex flex-col justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                      <div className="h-3 bg-slate-50 rounded-full w-1/3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-55 rounded-full w-full" />
                    <div className="h-3 bg-slate-55 rounded-full w-4/5" />
                  </div>
                  <div className="h-8 bg-slate-100 rounded-full w-full mt-4" />
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
            /* Cards Grid - 3 Columns layout on desktop */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => router.push(`/internships/${job.id}`)}
                      className="bg-white border border-slate-100 hover:border-slate-200 rounded-[20px] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-[280px] group relative"
                    >
                      <div className="space-y-4">
                        {/* Company Logo Square Badge & Bookmark Button */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-[#0D47A1]/10 border border-[#0D47A1]/20 flex items-center justify-center font-black text-[#0D47A1] text-lg uppercase shrink-0">
                            {(job.company_name || 'C')[0]}
                          </div>
                          
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

                        {/* Title & Info */}
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-slate-800 line-clamp-2 font-outfit tracking-tight group-hover:text-[#0D47A1] transition-colors leading-snug">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-bold">
                            <span className="text-[#0D47A1] uppercase tracking-wide">
                              {job.company_name}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 uppercase tracking-wide">
                              {job.location || 'Remote'}
                            </span>
                          </div>
                        </div>

                        {/* Required Skills - Dark data pills */}
                        {job.required_skills && job.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {job.required_skills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                className="px-2.5 py-0.5 text-[8px] font-black bg-[#08152E] text-white border border-[#42A5F5]/10 rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.required_skills.length > 3 && (
                              <span className="text-[9px] text-[#42A5F5] font-black px-1">
                                +{job.required_skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Details */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        {/* Stipend, Duration, and Apply Button Row */}
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex flex-col text-[10px] font-bold text-slate-400">
                            {job.stipend_min ? (
                              <span className="text-slate-800 font-extrabold text-xs">
                                ₹{job.stipend_min.toLocaleString()}
                                {job.stipend_max ? ` - ${job.stipend_max.toLocaleString()}` : ''}/mo
                              </span>
                            ) : (
                              <span className="text-slate-400">Unpaid</span>
                            )}
                            <span className="text-[8px] text-slate-400 mt-0.5">
                              ⌛ {job.duration_weeks ? `${job.duration_weeks} weeks` : 'TBD'}
                            </span>
                          </div>

                          <div onClick={(e) => e.stopPropagation()} className="w-24">
                            {isCandidate ? (
                              <ApplyButton
                                internshipId={job.id}
                                internshipTitle={job.title}
                                isDeadlinePassed={job.is_deadline_passed}
                                onSuccess={(appId) => router.push(`/applications/${appId}`)}
                              />
                            ) : (
                              <Link
                                href={`/internships/${job.id}`}
                                className="w-full block py-2 text-center bg-[#0D47A1] hover:bg-[#1976D2] text-white font-bold text-[10px] rounded-full transition-colors"
                              >
                                Details
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="col-span-full flex justify-center items-center gap-3 pt-6 border-t border-slate-100 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs font-bold text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
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
