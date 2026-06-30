"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";
import { applicationApi, internshipApi } from "@/services/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  Briefcase,
  FileText,
  Terminal,
  Video,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target,
  BookOpen,
  Calendar,
  Compass
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  applied:              { label: 'Applied',           bg: 'bg-blue-50',    text: 'text-[#0D47A1]',   border: 'border-blue-100',   dot: 'bg-[#0D47A1]' },
  simulation_invited:   { label: 'Test Invited',      bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-400' },
  simulation_started:   { label: 'Test In Progress',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-100',  dot: 'bg-amber-400' },
  simulation_completed: { label: 'Test Completed',    bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-400' },
  interview_invited:    { label: 'Interview Invited', bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-100', dot: 'bg-violet-400' },
  interview_completed:  { label: 'Interview Done',    bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-400' },
  shortlisted:          { label: 'Shortlisted ⭐',    bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-100',    dot: 'bg-sky-400' },
  hired:                { label: 'Hired 🎉',           bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-100',  dot: 'bg-green-400' },
  rejected:             { label: 'Closed',             bg: 'bg-slate-50',   text: 'text-slate-500',  border: 'border-slate-100',  dot: 'bg-slate-300' },
};

export default function CandidateDashboard() {
  const { user, initialize } = useAuthStore();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    initialize();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, [initialize]);

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      applicationApi.getMyApplications().catch(() => ({ items: [] })),
      internshipApi.list().catch(() => ({ internships: [] }))
    ]).then(([appRes, jobRes]) => {
      const apps = (appRes as any)?.items || (appRes as any)?.data || appRes || [];
      setApplications(Array.isArray(apps) ? apps : []);
      
      const jobs = (jobRes as any)?.internships || [];
      setRecommendedJobs(jobs.slice(0, 3));
    }).finally(() => setLoading(false));
  }, [user]);

  const handleStartSim = async (appId: number) => {
    try {
      const { applicationsApi: simApi } = await import('@/features/simulation/services/api');
      const r = await simApi.startSimulation(appId);
      router.push(`/candidate/simulation/${r.data.attempt_id}`);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Could not start simulation');
    }
  };

  const getDnaScore = () => {
    if (applications.length === 0) return 0;
    const scores = applications.map(app => app.ats_score || 0);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) || 75;
  };

  const dnaScore = getDnaScore();

  return (
    <UnifiedLayout title="Dashboard">
      <div className="space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">
              {greeting}, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage your applications, verify capabilities, and track your career growth.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/internships"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-xs transition-all hover:scale-[1.01]"
            >
              <Briefcase size={14} />
              Find Internship
            </Link>
          </div>
        </div>

        {/* Top Summary & DNA Circle Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* DNA Score Circular Ring Card */}
          <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-100/80 rounded-3xl p-6 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Verified DNA Index</h3>
            
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="stroke-[#0D47A1] transition-all duration-1000"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * dnaScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-800 font-outfit">{dnaScore}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Competence</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Based on active skill sets, simulation scores, and spoken communication indices.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            <div className="bg-white border border-slate-100/80 rounded-2xl p-6 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50/75 text-[#0D47A1] flex items-center justify-center mb-4">
                <Briefcase size={16} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Applications</span>
              <p className="text-2xl font-black text-slate-800 font-outfit mt-1">{applications.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {applications.filter(a => a.status === 'applied').length} pending review
              </p>
            </div>

            <div className="bg-white border border-slate-100/80 rounded-2xl p-6 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50/75 text-[#FFC107] flex items-center justify-center mb-4">
                <Terminal size={16} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulation Stage</span>
              <p className="text-2xl font-black text-slate-800 font-outfit mt-1">
                {applications.filter(a => a.status === 'simulation_completed').length} / {applications.length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Completed tests</p>
            </div>

            <div className="bg-white border border-slate-100/80 rounded-2xl p-6 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-50/75 text-emerald-600 flex items-center justify-center mb-4">
                <Video size={16} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spoken Interviews</span>
              <p className="text-2xl font-black text-slate-800 font-outfit mt-1">
                {applications.filter(a => a.status === 'interview_completed').length} / {applications.length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Completed interviews</p>
            </div>

          </div>

        </div>

        {/* Mid Section: Applications & Learning Roadmap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Applications list */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 font-outfit tracking-tight">Active Applications</h2>
              <Link href="/applications" className="text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-0.5">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center bg-[#F8FAFC] border border-slate-100 rounded-3xl">
                <p className="text-sm font-bold text-slate-700">No applications yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-6">Apply to an internship position to begin verification.</p>
                <Link
                  href="/internships"
                  className="px-4 py-2.5 bg-[#0D47A1] text-white text-xs font-bold rounded-xl"
                >
                  Browse Openings
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const st = statusConfig[app.status] || statusConfig.applied;
                  return (
                    <div key={app.id} className="p-5 border border-slate-100 bg-white rounded-2xl hover:border-[#0D47A1]/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-800 tracking-tight">{app.internship?.title || "Internship Position"}</h4>
                          <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border", st.bg, st.text, st.border)}>
                            <span className={clsx("w-1 h-1 rounded-full", st.dot)} />
                            {st.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          <span>🏢 {app.internship?.company_name || "Partner"}</span>
                          <span className="mx-2">•</span>
                          <span>Applied on {new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {['applied', 'simulation_invited', 'simulation_started'].includes(app.status) && (
                          <button
                            onClick={() => handleStartSim(app.id)}
                            className="px-3 py-1.5 bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                          >
                            <Terminal size={12} />
                            Start Test
                          </button>
                        )}
                        {app.status === 'simulation_completed' && (
                          <button
                            onClick={() => router.push('/candidate/interview')}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                          >
                            <Video size={12} />
                            Interview
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Learning Roadmap Widget */}
          <div className="lg:col-span-4 bg-white border border-slate-100/80 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                <BookOpen size={15} className="text-[#0D47A1]" />
                Learning Roadmap
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Recommended skill boosts based on profile</p>
            </div>

            <div className="space-y-4">
              {[
                { title: "Advanced Data Structures", provider: "AssessAI Guide", time: "2 hours" },
                { title: "RESTful API Integration", provider: "CAPVIA Dev", time: "1.5 hours" },
                { title: "Spoken English & Expression", provider: "SpeechAI Unit", time: "45 mins" },
              ].map((course, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-slate-100/60">
                  <div className="w-7 h-7 rounded-lg bg-[#0D47A1]/5 text-[#0D47A1] flex items-center justify-center shrink-0 mt-0.5">
                    <Compass size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{course.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{course.provider} • {course.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Section: Recommended Jobs & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Recommended Jobs */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-base font-bold text-slate-800 font-outfit tracking-tight">Recommended Internships</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedJobs.map((job) => (
                <div key={job.id} className="p-5 border border-slate-100 bg-[#F8FAFC] rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#0D47A1] bg-[#0D47A1]/5 px-2.5 py-1 rounded-full">
                      {job.category || "Technology"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-3 tracking-tight">{job.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-medium">🏢 {job.company_name || "Partner Company"}</p>
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100/60">
                    <span className="text-xs font-bold text-slate-700">₹{job.stipend?.toLocaleString() || "15,000"}/mo</span>
                    <Link
                      href={`/internships`}
                      className="text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-0.5"
                    >
                      Apply Now <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements / Badges */}
          <div className="lg:col-span-4 bg-white border border-slate-100/80 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                <Sparkles size={15} className="text-[#FFC107]" />
                Achievements
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Badges earned through verified merit</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "🛡️", label: "Anti-Fraud" },
                { icon: "💻", label: "Clean Code" },
                { icon: "🗣️", label: "Spoken AI" },
              ].map((badge, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-100/60 flex flex-col items-center">
                  <span className="text-xl mb-1.5">{badge.icon}</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </UnifiedLayout>
  );
}
