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
  ChevronRight,
  Sparkles,
  BookOpen,
  Compass
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string; leftBorder: string }> = {
  applied:              { label: 'Applied',           bg: 'bg-blue-50',    text: 'text-[#0D47A1]',   border: 'border-blue-100',   dot: 'bg-[#0D47A1]', leftBorder: 'border-l-[#42A5F5]' },
  simulation_invited:   { label: 'Test Invited',      bg: 'bg-amber-50',  text: 'text-amber-755', border: 'border-amber-100', dot: 'bg-amber-400', leftBorder: 'border-l-[#FFC107]' },
  simulation_started:   { label: 'Test In Progress',  bg: 'bg-amber-50',   text: 'text-amber-755',  border: 'border-amber-100',  dot: 'bg-amber-400', leftBorder: 'border-l-[#FFC107]' },
  simulation_completed: { label: 'Test Completed',    bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-400', leftBorder: 'border-l-[#10B981]' },
  interview_invited:    { label: 'Interview Invited', bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-100', dot: 'bg-violet-400', leftBorder: 'border-l-[#42A5F5]' },
  interview_completed:  { label: 'Interview Done',    bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-400', leftBorder: 'border-l-[#10B981]' },
  shortlisted:          { label: 'Shortlisted ⭐',    bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-100',    dot: 'bg-sky-400', leftBorder: 'border-l-[#10B981]' },
  hired:                { label: 'Hired 🎉',           bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-100',  dot: 'bg-green-400', leftBorder: 'border-l-[#10B981]' },
  rejected:             { label: 'Closed',             bg: 'bg-slate-50',   text: 'text-slate-500',  border: 'border-slate-100',  dot: 'bg-slate-300', leftBorder: 'border-l-slate-300' },
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
      const detail = e?.response?.data?.detail;
      const errorMsg = typeof detail === 'object' && detail !== null ? (detail.message || JSON.stringify(detail)) : detail;
      alert(errorMsg || 'Could not start simulation');
    }
  };

  const getDnaScore = () => {
    if (applications.length === 0) return 0;
    const scores = applications.map(app => app.ats_score || 0);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) || 75;
  };

  const getProgressPct = (status: string) => {
    switch (status) {
      case 'applied': return 20;
      case 'simulation_invited':
      case 'simulation_started': return 40;
      case 'simulation_completed': return 60;
      case 'interview_invited':
      case 'interview_completed': return 80;
      case 'shortlisted':
      case 'hired': return 100;
      default: return 10;
    }
  };

  const dnaScore = getDnaScore();

  return (
    <UnifiedLayout title="Dashboard">
      <div className="space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight font-outfit">
              {greeting}, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage your applications, verify capabilities, and track your career growth.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/internships"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#0D47A1] hover:bg-[#1976D2] text-white font-bold text-xs transition-all hover:scale-[1.02] shadow-lg shadow-[#0D47A1]/20"
            >
              <Briefcase size={14} />
              Find Internship
            </Link>
          </div>
        </div>

        {/* Top Summary & DNA Circle Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* DNA Score Circular Ring Card (Dark Data Panel) */}
          <div className="lg:col-span-4 bg-[#08152E] border border-[#42A5F5]/20 rounded-3xl p-6 text-center shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#42A5F5] mb-6">Verified DNA Index</h3>
            
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  className="stroke-[#42A5F5] transition-all duration-1000"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * dnaScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black text-white font-outfit tracking-tight">{dnaScore}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#42A5F5] mt-0.5">Competence</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Based on active skill sets, simulation scores, and spoken communication indices.
            </p>
          </div>

          {/* Quick Metrics Grid (Surface cards with colored left borders) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            <div className="bg-white border border-slate-100 border-l-4 border-l-[#42A5F5] rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#42A5F5]/10 text-[#0D47A1] flex items-center justify-center mb-4">
                <Briefcase size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Applications</span>
              <p className="text-4xl font-black text-slate-800 font-outfit mt-1">{applications.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-2">
                {applications.filter(a => a.status === 'applied').length} pending review
              </p>
            </div>

            <div className="bg-white border border-slate-100 border-l-4 border-l-[#FFC107] rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#FFC107]/15 text-amber-600 flex items-center justify-center mb-4">
                <Terminal size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulation Stage</span>
              <p className="text-4xl font-black text-slate-800 font-outfit mt-1">
                {applications.filter(a => ['simulation_completed', 'interview_invited', 'interview_completed', 'shortlisted', 'hired'].includes(a.status)).length} / {applications.length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-2">Completed tests</p>
            </div>

            <div className="bg-white border border-slate-100 border-l-4 border-l-[#10B981] rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-emerald-600 flex items-center justify-center mb-4">
                <Video size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spoken Interviews</span>
              <p className="text-4xl font-black text-slate-800 font-outfit mt-1">
                {applications.filter(a => ['interview_completed', 'shortlisted', 'hired'].includes(a.status)).length} / {applications.length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-2">Completed interviews</p>
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
              <div className="p-12 text-center bg-white border border-slate-100 border-l-4 border-l-[#FFC107] rounded-3xl">
                <p className="text-sm font-bold text-slate-700">No applications yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-6">Apply to an internship position to begin verification.</p>
                <Link
                  href="/internships"
                  className="px-5 py-3 rounded-full bg-[#0D47A1] text-white text-xs font-bold shadow-md hover:bg-[#1976D2] transition-colors"
                >
                  Browse Openings
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const st = statusConfig[app.status] || statusConfig.applied;
                  return (
                    <div key={app.id} className={clsx("p-5 border border-slate-100 border-l-4 bg-white rounded-2xl hover:border-slate-200 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6", st.leftBorder)}>
                      <div className="flex items-start gap-4">
                        {/* Company Badge Styled as a Colored Square */}
                        <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 text-[#0D47A1] flex items-center justify-center font-black text-sm shrink-0 uppercase">
                          {(app.internship?.company_name || "P")[0]}
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-800 tracking-tight truncate">{app.internship?.title || "Internship Position"}</h4>
                            <span className={clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border", st.bg, st.text, st.border)}>
                              <span className={clsx("w-1 h-1 rounded-full", st.dot)} />
                              {st.label}
                            </span>
                            {app.ats_score && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-[#42A5F5]/10 text-[#42A5F5] border border-[#42A5F5]/20">
                                ATS Fit: {Math.round(app.ats_score)}%
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-semibold">
                            <span>🏢 {app.internship?.company_name || "Partner"}</span>
                            <span className="mx-2">•</span>
                            <span>Applied on {new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar gradient fill */}
                      <div className="w-full sm:w-40 space-y-1 shrink-0">
                        <div className="flex justify-between text-[9px] font-black text-slate-400 tracking-wider">
                          <span>PIPELINE</span>
                          <span>{getProgressPct(app.status)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#1976D2] to-[#42A5F5] rounded-full transition-all duration-500" 
                            style={{ width: `${getProgressPct(app.status)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {['applied', 'simulation_invited', 'simulation_started'].includes(app.status) && (
                          <button
                            onClick={() => handleStartSim(app.id)}
                            className="px-4 py-2 bg-[#0D47A1] hover:bg-[#1976D2] text-white font-bold text-xs rounded-full flex items-center gap-1 transition-all shadow-md shadow-[#0D47A1]/20 hover:scale-[1.01]"
                          >
                            <Terminal size={12} />
                            Start Test
                          </button>
                        )}
                        {app.status === 'simulation_completed' && (
                          <button
                            onClick={() => router.push('/candidate/interview')}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-full flex items-center gap-1 transition-all shadow-md shadow-violet-600/20 hover:scale-[1.01]"
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
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                <BookOpen size={15} className="text-[#0D47A1]" />
                Learning Roadmap
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Recommended skill boosts based on profile</p>
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
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">{course.provider} • {course.time}</p>
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
                <div key={job.id} className="p-5 border border-slate-100 bg-[#F8FAFC] rounded-2xl flex flex-col justify-between hover:shadow-sm hover:border-slate-200 transition-all">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#0D47A1] bg-[#0D47A1]/5 px-3 py-1 rounded-full border border-[#0D47A1]/10">
                      {job.category || "Technology"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-4 tracking-tight">{job.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">🏢 {job.company_name || "Partner Company"}</p>
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
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                <Sparkles size={15} className="text-[#FFC107]" />
                Achievements
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Badges earned through verified merit</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "🛡️", label: "Anti-Fraud" },
                { icon: "💻", label: "Clean Code" },
                { icon: "🗣️", label: "Spoken AI" },
              ].map((badge, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-100/60 flex flex-col items-center hover:scale-[1.03] transition-transform">
                  <span className="text-2xl mb-1.5">{badge.icon}</span>
                  <span className="text-[9px] font-black text-slate-650 uppercase tracking-wide leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </UnifiedLayout>
  );
}
