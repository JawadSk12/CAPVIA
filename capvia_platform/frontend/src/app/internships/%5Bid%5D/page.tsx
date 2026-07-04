'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { internshipApi } from '../../../services/api';
import { Internship } from '../../../types';
import { useAuthStore } from '../../../store/auth';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import ApplyButton from '@/components/ApplyButton';
import {
  MapPin,
  Bookmark,
  AlertCircle,
  Mail,
  Compass,
  ArrowLeft
} from 'lucide-react';

export default function InternshipDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Internship Details">
        <InternshipDetailContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function InternshipDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [internship, setInternship] = useState<Internship | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

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

  const isSaved = savedIds.includes(id as string);

  const toggleSave = () => {
    if (!internship || typeof window === 'undefined') return;

    let savedList: any[] = [];
    const stored = localStorage.getItem('capvia_saved_internships');
    if (stored) {
      try {
        savedList = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    const exists = savedList.some((x) => x.id === internship.id);
    let updated;
    if (exists) {
      updated = savedList.filter((x) => x.id !== internship.id);
    } else {
      updated = [...savedList, internship];
    }

    localStorage.setItem('capvia_saved_internships', JSON.stringify(updated));
    setSavedIds(updated.map((x) => x.id));
  };

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    internshipApi.get(id as string)
      .then(async (data) => {
        setInternship(data);
        if (data.company_id) {
          try {
            const listRes = await internshipApi.list({ company_id: data.company_id });
            const filtered = (listRes.internships || [])
              .filter((x: Internship) => x.id !== (id as string))
              .slice(0, 3);
            setRelatedJobs(filtered);
          } catch (e) {
            console.error('Failed to load related jobs', e);
          }
        }
      })
      .catch((e: any) => setError(e?.response?.data?.error?.message || 'Internship details not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const canManage = user?.role === 'hr' || user?.role === 'admin';
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
      else if (action === 'duplicate') {
        result = await internshipApi.duplicate(id as string);
        router.push(`/internships/${result.id}`);
        return;
      } else if (action === 'delete') {
        if (!confirm('Delete this internship? This cannot be undone.')) {
          setActionLoading(null);
          return;
        }
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

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-450 text-xs font-semibold space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0D47A1] rounded-full animate-spin mx-auto" />
        <p>Retrieving internship details...</p>
      </div>
    );
  }

  if (error || !internship) {
    return (
      <div className="py-20 text-center border border-dashed border-red-200 rounded-3xl bg-red-50/20 p-8 max-w-lg mx-auto">
        <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
        <h3 className="font-extrabold text-slate-800 text-base font-outfit">Loading Error</h3>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          {error || 'The requested internship opportunity could not be resolved.'}
        </p>
        <Link
          href="/internships"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
        >
          <ArrowLeft size={14} />
          Back to Listings
        </Link>
      </div>
    );
  }

  const statusMeta: Record<string, { color: string; bg: string; text: string }> = {
    PUBLISHED: { color: 'text-white border-white/20 bg-white/10', bg: 'bg-white/10 border-white/25', text: 'Active' },
    DRAFT:     { color: 'text-amber-300 border-amber-300/20 bg-amber-500/10', bg: 'bg-amber-500/10 border-amber-500/25', text: 'Draft' },
    CLOSED:    { color: 'text-slate-300 border-slate-300/20 bg-slate-500/10', bg: 'bg-slate-500/10 border-slate-500/25', text: 'Closed' },
    ARCHIVED:  { color: 'text-slate-350 border-slate-350/20 bg-slate-600/10', bg: 'bg-slate-650/10 border-slate-650/25', text: 'Archived' },
  };
  const sm = statusMeta[internship.status] || statusMeta.DRAFT;
  const isCandidate = user?.role === 'candidate' || !user?.role;

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      {/* Top Controls Nav */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <Link
          href="/internships"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0D47A1] hover:text-[#1976D2] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to marketplace
        </Link>

        {showActions && (
          <div className="flex flex-wrap gap-2">
            {internship.status === 'DRAFT' && (
              <button
                disabled={actionLoading === 'publish'}
                onClick={() => doAction('publish')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-655 text-white text-xs font-bold transition-colors"
              >
                🚀 Publish
              </button>
            )}
            {internship.status === 'PUBLISHED' && (
              <button
                disabled={actionLoading === 'close'}
                onClick={() => doAction('close')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
              >
                🔒 Close
              </button>
            )}
            {(internship.status === 'CLOSED' || internship.status === 'ARCHIVED') && (
              <button
                disabled={actionLoading === 'restore'}
                onClick={() => doAction('restore')}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
              >
                ♻️ Restore
              </button>
            )}
            {internship.status !== 'ARCHIVED' && (
              <button
                disabled={actionLoading === 'archive'}
                onClick={() => doAction('archive')}
                className="px-4 py-2 rounded-xl bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold transition-colors"
              >
                📦 Archive
              </button>
            )}
            <button
              disabled={actionLoading === 'duplicate'}
              onClick={() => doAction('duplicate')}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors"
            >
              📋 Duplicate
            </button>
            <Link
              href={`/internships/${id}/edit`}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              ✏️ Edit
            </Link>
            <Link
              href={`/internships/${id}/dashboard`}
              className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0D47A1] text-xs font-bold transition-colors"
            >
              📊 Analytics
            </Link>
            <button
              disabled={actionLoading === 'delete'}
              onClick={() => doAction('delete')}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold transition-colors"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Layout 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (65%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Company Header Banner (Blue Gradient from #0D47A1 to #1976D2) */}
          <div className="bg-gradient-to-r from-[#0D47A1] to-[#1976D2] border border-[#0D47A1]/20 rounded-[24px] p-6 md:p-8 shadow-md flex flex-col md:flex-row gap-6 items-start md:items-center text-white">
            {/* Logo */}
            <div className="flex-shrink-0">
              {internship.company_logo ? (
                <img
                  src={internship.company_logo}
                  alt={internship.company_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-white/20 shadow-lg bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-2xl uppercase">
                  {(internship.company_name || 'C')[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${sm.color}`}>
                  {sm.text}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-full">
                  {internship.work_mode}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black font-outfit truncate tracking-tight">
                {internship.title}
              </h2>
              <p className="text-sm font-bold text-blue-100 hover:text-white underline">
                <Link href={`/companies/${internship.company_id}`}>{internship.company_name}</Link>
              </p>
            </div>
          </div>

          {/* Sticky Section Navigation Tabs */}
          <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md border-b border-slate-100 py-3.5 mb-2 flex gap-6 text-[10px] uppercase tracking-widest font-black text-slate-400">
            <a href="#desc" className="hover:text-[#0D47A1] focus:text-[#0D47A1] active:text-[#0D47A1] transition-colors">Description</a>
            <a href="#reqs" className="hover:text-[#0D47A1] focus:text-[#0D47A1] active:text-[#0D47A1] transition-colors">Requirements</a>
            <a href="#perks" className="hover:text-[#0D47A1] focus:text-[#0D47A1] active:text-[#0D47A1] transition-colors">Perks</a>
            <a href="#process" className="hover:text-[#0D47A1] focus:text-[#0D47A1] active:text-[#0D47A1] transition-colors">Evaluation</a>
          </div>

          {/* Description Section */}
          <div id="desc" className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4 scroll-mt-24">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
              Internship Description
            </h3>
            <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-wrap">
              {internship.description || 'No description provided.'}
            </p>
          </div>

          {/* Responsibilities Section */}
          {internship.responsibilities && internship.responsibilities.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                Key Responsibilities
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-650">
                {internship.responsibilities.map((resp, idx) => (
                  <li key={idx} className="leading-relaxed">{resp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements & Skills */}
          {internship.required_skills && internship.required_skills.length > 0 && (
            <div id="reqs" className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4 scroll-mt-24">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                Required Core Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {internship.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-150 text-slate-700 font-bold text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Technologies */}
          {internship.technologies && internship.technologies.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                Preferred Technology Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {internship.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-100 text-[#0D47A1] font-bold text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Static Perks Card */}
          <div id="perks" className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-4 scroll-mt-24">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
              Perks & Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-slate-655">
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-lg">📜</span> Certificate of Internship completion
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-lg">⚡</span> Pre-Placement Offer (PPO) opportunities
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-lg">📅</span> Flexible working hours
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-lg">☕</span> Informal dress code & free beverages
              </div>
            </div>
          </div>

          {/* Selection Process Timeline */}
          <div id="process" className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm space-y-5 scroll-mt-24">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
              Evaluation Process
            </h3>
            <p className="text-xs text-slate-450 font-bold leading-relaxed uppercase tracking-wider">
              CAPVIA uses unified validation checkpoints to screen candidates objectively in five steps:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              {[
                { step: '1', label: 'Applied', icon: '📨' },
                { step: '2', label: 'Resume Screen', icon: '🤖' },
                { step: '3', label: 'Skills Assessment', icon: '🎯' },
                { step: '4', label: 'AI Video Interview', icon: '🎤' },
                { step: '5', label: 'Decision Check', icon: '⭐' },
              ].map((proc) => (
                <div key={proc.step} className="bg-[#F8FAFC] border border-slate-100 p-3.5 rounded-2xl flex flex-col items-center">
                  <div className="text-lg mb-1">{proc.icon}</div>
                  <span className="text-[9px] font-black text-slate-400">STEP {proc.step}</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5">{proc.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column Sidebar (35%) - Dark Navy #08152E Data Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sticky Apply & Info Card */}
          <div className="bg-[#08152E] border border-[#42A5F5]/20 rounded-[24px] p-5 shadow-xl space-y-5 sticky top-24 text-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[9px] font-black text-[#42A5F5] uppercase tracking-widest">MONTHLY STIPEND</p>
                {internship.stipend_min ? (
                  <h4 className="text-2xl font-black text-white font-outfit mt-1 tracking-tight">
                    {internship.stipend_currency} {internship.stipend_min.toLocaleString()}
                    {internship.stipend_max ? ` - ${internship.stipend_max.toLocaleString()}` : ''}
                  </h4>
                ) : (
                  <h4 className="text-lg font-bold text-slate-350 mt-1">Unpaid Role</h4>
                )}
              </div>
              <button
                onClick={toggleSave}
                className={`p-2.5 rounded-xl border transition-all ${
                  isSaved
                    ? 'bg-[#FFC107]/20 border-[#FFC107]/45 text-[#FFC107]'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3.5 text-xs font-semibold text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">📍 Location</span>
                <span className="text-white font-bold">{internship.location || 'Remote'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">🌐 Mode of Work</span>
                <span className="text-white font-bold">{internship.work_mode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">📅 Duration</span>
                <span className="text-white font-bold">
                  {internship.duration_weeks ? `${internship.duration_weeks} weeks` : 'TBD'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Open Openings</span>
                <span className="text-white font-bold">{internship.openings} positions</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Experience Req.</span>
                <span className="text-white font-bold">{internship.experience_level}</span>
              </div>
              {internship.application_deadline && (
                <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                  <span className="text-slate-400 font-medium">⏰ Deadline</span>
                  <span className="font-extrabold text-[#FFC107]">
                    {internship.is_deadline_passed ? 'Expired' : internship.application_deadline}
                  </span>
                </div>
              )}
            </div>

            {/* Apply Button Integration */}
            {isCandidate && (
              <div className="pt-2">
                <ApplyButton
                  internshipId={internship.id}
                  internshipTitle={internship.title}
                  isDeadlinePassed={internship.is_deadline_passed}
                  onSuccess={(appId) => router.push(`/applications/${appId}`)}
                />
              </div>
            )}
          </div>

          {/* Recruiter Card */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              RECRUITER INFORMATION
            </h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[#0D47A1] text-sm">
                SJ
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-850">Sarah Jenkins</h5>
                <p className="text-[10px] text-slate-400 font-semibold">Talent Acquisition Lead</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Mail size={12} className="text-slate-400" />
              recruitment@{internship.company_name?.toLowerCase().replace(/\s+/g, '') || 'company'}.com
            </div>
          </div>

          {/* Map Placement Card */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              OFFICE LOCATION
            </h4>
            <div className="w-full h-32 rounded-xl bg-slate-50 border border-slate-150 flex flex-col items-center justify-center text-slate-400 gap-1.5 relative overflow-hidden">
              <Compass size={24} className="text-[#0D47A1]/40 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-700">{internship.location || 'Remote'}</span>
              <span className="text-[9px] text-slate-400 font-semibold">Interactive map disabled offline</span>
            </div>
          </div>

          {/* Related Jobs Section */}
          {relatedJobs.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                MORE FROM THIS COMPANY
              </h4>
              <div className="flex flex-col gap-3">
                {relatedJobs.map((rj) => (
                  <Link href={`/internships/${rj.id}`} key={rj.id} className="block group">
                    <div className="p-3 border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 rounded-xl transition-all">
                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-[#0D47A1] transition-colors truncate">
                        {rj.title}
                      </h5>
                      <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-450 font-semibold">
                        <span>{rj.work_mode}</span>
                        {rj.stipend_min && <span>💰 Paid</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
