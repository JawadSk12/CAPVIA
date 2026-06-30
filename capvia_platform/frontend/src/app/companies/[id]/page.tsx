'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { companyApi, internshipApi } from '../../../services/api';
import { Company, Internship } from '../../../types';
import { useAuthStore } from '../../../store/auth';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import ApplyButton from '@/components/ApplyButton';
import {
  MapPin,
  Calendar,
  Building2,
  Users,
  CheckCircle,
  ExternalLink,
  Briefcase,
  ArrowLeft,
  Settings,
  Mail,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Award,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompanyProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Company Dossier">
        <CompanyProfileContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function CompanyProfileContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [openJobs, setOpenJobs] = useState<Internship[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'stats' | 'reviews'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    companyApi.get(id as string)
      .then(async (data) => {
        setCompany(data);
        
        // Fetch active internships for this company
        setLoadingJobs(true);
        try {
          const listRes = await internshipApi.list({ company_id: id as string });
          setOpenJobs(listRes.internships || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingJobs(false);
        }
      })
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Company details not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-450 text-xs font-semibold space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0D47A1] rounded-full animate-spin mx-auto" />
        <p>Retrieving organization profile...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="py-20 text-center border border-dashed border-red-200 rounded-3xl bg-red-50/20 p-8 max-w-lg mx-auto">
        <ArrowLeft className="mx-auto mb-4 text-red-500" />
        <h3 className="font-extrabold text-slate-800 text-base font-outfit">Loading Error</h3>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          {error || 'The requested company profile could not be resolved.'}
        </p>
        <Link
          href="/companies"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
        >
          <ArrowLeft size={14} />
          Back to Companies
        </Link>
      </div>
    );
  }

  const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin';
  const isCandidate = user?.role === 'candidate' || !user?.role;

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      {/* Top Nav controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0D47A1] hover:text-[#0A3B85] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to directory
        </Link>

        {isHrOrAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/companies/${id}/dashboard`}
              className="px-4 py-2.5 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              📊 Recruiter Dashboard
            </Link>
            <Link
              href={`/companies/${id}/edit`}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              ✏️ Edit Profile
            </Link>
          </div>
        )}
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-slate-100 rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Logo */}
        <div className="flex-shrink-0 relative z-10">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[#0D47A1] text-3xl uppercase">
              {company.name[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Name and Basic Metadata */}
        <div className="flex-1 min-w-0 space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            {company.is_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
                <CheckCircle size={10} className="text-emerald-600" />
                Verified Partner
              </span>
            )}
            {company.industry && (
              <span className="inline-flex items-center text-[10px] font-bold bg-blue-50 text-[#0D47A1] px-2.5 py-0.5 rounded-full">
                {company.industry}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-outfit truncate">
            {company.name}
          </h1>
          <p className="text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            {company.description ? company.description.slice(0, 150) + '...' : 'Explore roles and workspace statistics.'}
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 py-1.5 space-x-6">
        {[
          { key: 'overview', label: 'Overview', icon: Building2 },
          { key: 'roles', label: `Open Roles (${openJobs.length})`, icon: Briefcase },
          { key: 'stats', label: 'Hiring Statistics', icon: TrendingUp },
          { key: 'reviews', label: 'Reviews', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                active ? 'text-[#0D47A1] font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {active && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D47A1]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Body Section Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (65%) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {/* About Company */}
                <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                    About {company.name}
                  </h3>
                  <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-wrap">
                    {company.description || 'No description available for this organization.'}
                  </p>
                </div>

                {/* Company Info Grid */}
                <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                    Company Highlights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                    <div className="flex justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400">Headquarters</span>
                      <span className="text-slate-800 font-bold">{company.headquarters || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400">Employees</span>
                      <span className="text-slate-800 font-bold">{company.employee_count || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400">Founded Year</span>
                      <span className="text-slate-800 font-bold">{company.founded_year || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400">Industry Sector</span>
                      <span className="text-slate-800 font-bold">{company.industry || 'TBD'}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'roles' && (
              <motion.div
                key="roles"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {loadingJobs ? (
                  <div className="text-center py-12 text-xs text-slate-450 font-medium">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0D47A1] rounded-full animate-spin mx-auto mb-2" />
                    Fetching active roles...
                  </div>
                ) : openJobs.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-[20px] p-10 text-center shadow-sm">
                    <Briefcase size={36} className="mx-auto mb-3 text-slate-300" />
                    <h4 className="font-extrabold text-slate-800 text-sm">No Active Openings</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {company.name} is not hiring for any internship roles at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {openJobs.map((job) => (
                      <Link href={`/internships/${job.id}`} key={job.id} className="block group">
                        <div className="bg-white border border-slate-150/70 hover:border-slate-300 rounded-2xl p-5 hover:shadow-soft transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0D47A1] transition-colors truncate">
                              {job.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                              <span>📍 {job.location || 'Remote'}</span>
                              <span className="text-slate-200">|</span>
                              <span className="text-[#0D47A1]">{job.work_mode}</span>
                              <span className="text-slate-200">|</span>
                              {job.stipend_min ? (
                                <span className="text-emerald-650 font-bold">
                                  {job.stipend_currency} {job.stipend_min.toLocaleString()}/mo
                                </span>
                              ) : (
                                <span className="text-slate-400">Unpaid</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs font-bold text-slate-400 pr-2">
                              {job.application_count} Applicants
                            </span>
                            {isCandidate && (
                              <div className="w-32 shrink-0">
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
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {/* Hiring Statistics Dashboard */}
                <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                    Recruitment & Hiring Funnel
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl text-center">
                      <span className="text-xl">💼</span>
                      <h4 className="text-2xl font-black text-slate-800 font-outfit mt-1">
                        {company.internship_count}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Total Internships
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] p-4 border border-slate-100 rounded-2xl text-center">
                      <span className="text-xl">👥</span>
                      <h4 className="text-2xl font-black text-slate-800 font-outfit mt-1">
                        {company.member_count}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Active Team Members
                      </p>
                    </div>

                    <div className="bg-blue-50/30 p-4 border border-blue-100/50 rounded-2xl text-center">
                      <span className="text-xl">🏆</span>
                      <h4 className="text-2xl font-black text-[#0D47A1] font-outfit mt-1">
                        94%
                      </h4>
                      <p className="text-[10px] text-[#0D47A1] font-bold uppercase tracking-wider mt-0.5">
                        Hiring Completion Rate
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-100 p-4 rounded-2xl bg-white space-y-3">
                    <h4 className="text-xs font-bold text-slate-700">Recruitment Timelines & Turnaround</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Resume Screen (ATS)', rate: '1-2 Days', pct: 90 },
                        { label: 'Coding Assessment (Simulation)', rate: '3-4 Days', pct: 75 },
                        { label: 'AI Video Interview evaluation', rate: '2 Days', pct: 60 },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-500">
                            <span>{item.label}</span>
                            <span className="text-[#0D47A1]">{item.rate} avg.</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0D47A1] rounded-full" style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-white border border-slate-100 rounded-[20px] p-8 text-center shadow-sm space-y-4"
              >
                <div className="text-4xl">🌟</div>
                <h3 className="font-extrabold text-slate-800 text-base font-outfit">Reviews & Workplace Ratings</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                  We are building an anonymous candidate evaluation review panel. Once active, candidates will be able to share feedback on recruitment and cohort experience.
                </p>
                <span className="inline-flex items-center text-[10px] font-bold bg-[#FFC107]/10 border border-[#FFC107]/20 text-[#F57F17] px-3 py-1 rounded-full">
                  Future Ready Feature
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column Sidebar (35%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Stats Sidebar Card */}
          <div className="bg-white border border-slate-150/70 rounded-[24px] p-5 shadow-sm space-y-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ORGANIZATION DETAILS
            </h4>

            <div className="space-y-3.5 text-xs font-semibold text-slate-650">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">📍 Headquarters</span>
                <span className="text-slate-850 font-bold">{company.headquarters || 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">👥 Employees</span>
                <span className="text-slate-850 font-bold">{company.employee_count || 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">📅 Founded</span>
                <span className="text-slate-850 font-bold">{company.founded_year || 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-slate-400 font-medium">🌐 Industry</span>
                <span className="text-slate-850 font-bold">{company.industry || 'TBD'}</span>
              </div>
              {company.website_url && (
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-slate-400 font-medium">🔗 Website</span>
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0D47A1] hover:underline flex items-center gap-1 font-bold"
                  >
                    Visit website
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Hiring Trust index card */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={18} />
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                CAPVIA VERIFIED HIRING
              </h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              This organization is a verified member on the CAPVIA recruitment portal. Applications, skills testing, and AI video vetting results are delivered directly to their HR review dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
