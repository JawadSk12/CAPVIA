'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { companyApi } from '../../services/api';
import { Company } from '../../types';
import { useAuthStore } from '../../store/auth';
import ProtectedRoute from '../../components/ProtectedRoute';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import {
  Search,
  MapPin,
  Calendar,
  Building,
  Users,
  CheckCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompaniesPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Organizations">
        <CompaniesContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function CompaniesContent() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PER_PAGE = 12;

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyApi.list(page, PER_PAGE, search || undefined);
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load companies.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const canCreate = user?.role === 'hr' || user?.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-outfit text-slate-900">
            Explore Organizations
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Browse through {total} company profile{total !== 1 ? 's' : ''} offering internships.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/companies/create"
            className="px-4 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={14} />
            Create Company
          </Link>
        )}
      </div>

      {/* Search bar Hero */}
      <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search companies by name or industry..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-800 text-sm outline-none focus:border-[#0D47A1] transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-750 text-xs p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-red-550 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 h-52 animate-pulse flex flex-col justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                  <div className="h-3 bg-slate-50 rounded-full w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-50 rounded-full w-full" />
              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <div className="h-4 bg-slate-100 rounded-full w-12" />
                <div className="h-4 bg-slate-100 rounded-full w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-8">
          <Building size={40} className="mx-auto mb-4 text-slate-350" />
          <h3 className="font-extrabold text-slate-800 text-base font-outfit">No Organizations Found</h3>
          <p className="text-slate-450 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
            {search
              ? `No companies match your query "${search}". Try searching for another name.`
              : 'Be the first to register an organization profile on CAPVIA.'}
          </p>
          {canCreate && !search && (
            <Link
              href="/companies/create"
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              Create Company Profile
              <Plus size={14} />
            </Link>
          )}
        </div>
      ) : (
        /* Grid */
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {companies.map((company) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-slate-150/70 hover:border-slate-300 rounded-[22px] p-6 hover:shadow-soft transition-all flex flex-col justify-between gap-4 relative overflow-hidden group"
                >
                  {/* Verified Badge */}
                  {company.is_verified && (
                    <div className="absolute top-5 right-5 inline-flex items-center gap-1 text-[9px] font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      <CheckCircle size={10} className="text-emerald-600" />
                      Verified
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Logo + Name */}
                    <div className="flex items-center gap-3 pr-16">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[#0D47A1] text-lg uppercase flex-shrink-0">
                          {company.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0D47A1] transition-colors truncate font-outfit">
                          {company.name}
                        </h3>
                        {company.industry && (
                          <p className="text-[10px] text-[#0D47A1] font-bold tracking-wide uppercase mt-0.5">
                            {company.industry}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {company.description && (
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {company.description}
                      </p>
                    )}

                    {/* Metadata chips */}
                    <div className="flex flex-wrap gap-y-1 gap-x-3 text-[10px] font-semibold text-slate-450">
                      {company.headquarters && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          {company.headquarters}
                        </span>
                      )}
                      {company.employee_count && (
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-slate-400" />
                          {company.employee_count} Employees
                        </span>
                      )}
                      {company.founded_year && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          Est. {company.founded_year}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Metrics and Link */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
                    <div className="flex gap-4 text-center">
                      <div>
                        <div className="text-sm font-black text-slate-800 font-outfit">
                          {company.internship_count}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          Roles
                        </div>
                      </div>
                      <div className="w-px bg-slate-100" />
                      <div>
                        <div className="text-sm font-black text-slate-800 font-outfit">
                          {company.member_count}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          Team
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/companies/${company.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0D47A1] group-hover:translate-x-0.5 transition-transform"
                    >
                      View Profile
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-4">
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
  );
}
