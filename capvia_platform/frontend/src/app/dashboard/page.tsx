"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";
import { applicationApi, internshipApi } from "@/services/api";
import {
  Briefcase, FileText, Terminal, Video, ChevronRight,
  Sparkles, BookOpen, Compass, TrendingUp, ArrowRight,
  Circle, CheckCircle2, Clock,
} from "lucide-react";
import Link from "next/link";

/* ── Status config ────────────────────────────────────────── */
const STATUS_CFG: Record<string, {
  label: string; color: string; bg: string; border: string; dot: string; pct: number;
}> = {
  applied:              { label: 'Applied',          color: '#0D47A1', bg: 'rgba(13,71,161,0.06)',   border: 'rgba(13,71,161,0.15)',   dot: '#42A5F5', pct: 20 },
  simulation_invited:   { label: 'Test Invited',     color: '#B45309', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)',  dot: '#F59E0B', pct: 40 },
  simulation_started:   { label: 'Test In Progress', color: '#B45309', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)',  dot: '#F59E0B', pct: 40 },
  simulation_completed: { label: 'Test Completed',   color: '#059669', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', dot: '#10B981', pct: 60 },
  interview_invited:    { label: 'Interview Invited', color: '#6D28D9', bg: 'rgba(109,40,217,0.06)', border: 'rgba(109,40,217,0.15)', dot: '#7C3AED', pct: 70 },
  interview_completed:  { label: 'Interview Done',   color: '#6D28D9', bg: 'rgba(109,40,217,0.06)', border: 'rgba(109,40,217,0.15)', dot: '#7C3AED', pct: 80 },
  shortlisted:          { label: 'Shortlisted ⭐',   color: '#0369A1', bg: 'rgba(3,105,161,0.06)',  border: 'rgba(3,105,161,0.15)',  dot: '#0EA5E9', pct: 90 },
  hired:                { label: 'Hired 🎉',          color: '#15803D', bg: 'rgba(21,128,61,0.06)',  border: 'rgba(21,128,61,0.15)',  dot: '#22C55E', pct: 100 },
  rejected:             { label: 'Closed',            color: '#64748B', bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.12)', dot: '#CBD5E1', pct: 0 },
};

/* ── Score ring ───────────────────────────────────────────── */
function ScoreRing({ score, size = 128 }: { score: number; size?: number }) {
  const r   = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(score, 100)) / 100;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      {/* Fill */}
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1976D2" />
          <stop offset="100%" stopColor="#42A5F5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */
function Skel({ className }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className ?? ''}`} />;
}

export default function CandidateDashboard() {
  const { user, initialize } = useAuthStore();
  const router = useRouter();

  const [applications,    setApplications]    = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [greeting,        setGreeting]        = useState("Welcome back");

  useEffect(() => {
    initialize();
    const h = new Date().getHours();
    if (h < 12)      setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else             setGreeting("Good evening");
  }, [initialize]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      applicationApi.getMyApplications().catch(() => ({ items: [] })),
      internshipApi.list().catch(() => ({ internships: [] })),
    ]).then(([appRes, jobRes]) => {
      const apps = (appRes as any)?.items || (appRes as any)?.data || appRes || [];
      setApplications(Array.isArray(apps) ? apps : []);
      const jobs = (jobRes as any)?.internships || [];
      setRecommendedJobs(jobs.slice(0, 4));
    }).finally(() => setLoading(false));
  }, [user]);

  const handleStartSim = async (appId: number) => {
    try {
      const { applicationsApi: simApi } = await import('@/features/simulation/services/api');
      const r = await simApi.startSimulation(appId);
      router.push(`/candidate/simulation/${r.data.attempt_id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'object' && detail ? (detail.message || JSON.stringify(detail)) : detail;
      alert(msg || 'Could not start simulation');
    }
  };

  /* Compute DNA score as avg ats_score */
  const dnaScore = applications.length
    ? Math.round(applications.map(a => a.ats_score || 0).reduce((a, b) => a + b, 0) / applications.length) || 75
    : 0;

  const stats = [
    {
      label: 'Applications',
      value: applications.length,
      sub: `${applications.filter(a => a.status === 'applied').length} awaiting review`,
      icon: Briefcase,
      accent: '#42A5F5',
      accentBg: 'rgba(66,165,245,0.08)',
    },
    {
      label: 'Tests Completed',
      value: applications.filter(a => ['simulation_completed','interview_invited','interview_completed','shortlisted','hired'].includes(a.status)).length,
      sub: `of ${applications.length} applications`,
      icon: Terminal,
      accent: '#F59E0B',
      accentBg: 'rgba(245,158,11,0.08)',
    },
    {
      label: 'Interviews Done',
      value: applications.filter(a => ['interview_completed','shortlisted','hired'].includes(a.status)).length,
      sub: `of ${applications.length} applications`,
      icon: Video,
      accent: '#10B981',
      accentBg: 'rgba(16,185,129,0.08)',
    },
  ];

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <UnifiedLayout title="Dashboard">
      <div className="space-y-8 pb-8">

        {/* ── Welcome header ──────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl px-7 py-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
          style={{
            background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #0B1D3A 100%)",
            boxShadow: "0 8px 32px rgba(13,71,161,0.25)",
          }}
        >
          {/* Bg glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div
              className="absolute"
              style={{
                top: "-40%", right: "-10%",
                width: "60%", height: "200%",
                background: "radial-gradient(ellipse, rgba(66,165,245,0.15) 0%, transparent 65%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-1">
              {greeting},
            </p>
            <h1 className="text-2xl md:text-[28px] font-black text-white font-outfit tracking-tight leading-tight">
              {firstName}
            </h1>
            <p className="text-sm text-white/60 mt-1 font-medium">
              Your verified career profile is active.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <Link
              href="/internships"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-[#0D47A1] bg-white hover:bg-slate-100 transition-all hover:-translate-y-px"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Find Internship
            </Link>
          </div>
        </div>

        {/* ── DNA Score + Stats ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* DNA Ring Card */}
          <div
            className="lg:col-span-4 rounded-2xl p-6 text-center relative overflow-hidden"
            style={{
              background: "#08152E",
              border: "1px solid rgba(66,165,245,0.12)",
              boxShadow: "0 8px 32px rgba(3,9,20,0.4)",
            }}
          >
            {/* BG glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 50% 80%, rgba(13,71,161,0.15) 0%, transparent 70%)",
              }}
            />

            <p className="relative text-[9px] font-black uppercase tracking-widest text-[#42A5F5] mb-5">
              Verified DNA Index
            </p>

            <div className="relative flex items-center justify-center mb-4">
              <ScoreRing score={dnaScore} size={140} />
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black text-white font-outfit tracking-tight leading-none">
                  {dnaScore}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#42A5F5] mt-1">
                  Competence
                </span>
              </div>
            </div>

            <p className="relative text-[12px] text-slate-400 leading-relaxed font-medium max-w-[200px] mx-auto">
              Based on skill sets, simulation scores, and speech indices.
            </p>

            {/* Mini indicators */}
            <div className="relative mt-5 grid grid-cols-3 gap-2">
              {[
                { label: 'ATS Fit', val: Math.min(dnaScore + 8, 100) },
                { label: 'Code',    val: Math.max(dnaScore - 5, 0) },
                { label: 'Speech',  val: dnaScore },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-[15px] font-black text-white font-outfit mt-0.5">{val}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="kpi-card">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: s.accentBg }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: s.accent }} />
                    </div>
                    <TrendingUp className="w-3.5 h-3.5 text-success-DEFAULT opacity-60" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {s.label}
                  </p>
                  <p className="text-[32px] font-black text-slate-900 font-outfit leading-none">
                    {loading ? <Skel className="h-8 w-12" /> : s.value}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1.5">{s.sub}</p>
                </div>
              );
            })}

            {/* AI recommendation card */}
            <div
              className="sm:col-span-3 rounded-2xl p-4 flex items-center justify-between gap-4"
              style={{
                background: "rgba(13,71,161,0.04)",
                border: "1px solid rgba(13,71,161,0.1)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(13,71,161,0.1)" }}
                >
                  <Sparkles className="w-4.5 h-4.5 text-primary-600" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-slate-800">CAPVIA AI Recommendation</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your profile is strong. Complete your AI interview to unlock full DNA verification.
                  </p>
                </div>
              </div>
              <Link
                href="/candidate/interview"
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:-translate-y-px"
                style={{ background: "var(--capvia-primary)", boxShadow: "var(--shadow-primary)" }}
              >
                Start <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Applications + Learning ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Applications list */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900 font-outfit tracking-tight">
                Active Applications
              </h2>
              <Link
                href="/applications"
                className="flex items-center gap-1 text-[11px] font-bold transition-colors hover:opacity-80"
                style={{ color: "#0D47A1" }}
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card p-5 space-y-3">
                    <Skel className="h-4 w-48" />
                    <Skel className="h-3 w-32" />
                    <Skel className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{ background: "#FAFBFC", border: "1px dashed var(--border-default)" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(13,71,161,0.08)" }}
                >
                  <Briefcase className="w-5.5 h-5.5 text-primary-600" />
                </div>
                <p className="text-[14px] font-bold text-slate-700 mb-1">No applications yet</p>
                <p className="text-[12px] text-slate-400 mb-5">Apply to an internship to begin capability verification.</p>
                <Link
                  href="/internships"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:-translate-y-px"
                  style={{ background: "var(--capvia-primary)", boxShadow: "var(--shadow-primary)" }}
                >
                  Browse Openings <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const st = STATUS_CFG[app.status] || STATUS_CFG.applied;
                  return (
                    <div
                      key={app.id}
                      className="card-interactive p-5 rounded-2xl cursor-default"
                      style={{
                        borderLeft: `3px solid ${st.dot}`,
                        paddingLeft: 20,
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          {/* Company initials */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 text-white font-outfit"
                            style={{ background: "linear-gradient(135deg, #0D47A1, #1976D2)" }}
                          >
                            {(app.internship?.company_name || "P")[0].toUpperCase()}
                          </div>

                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[13px] font-bold text-slate-900 truncate">
                                {app.internship?.title || "Internship Position"}
                              </h4>
                              {/* Status badge */}
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border"
                                style={{ background: st.bg, color: st.color, borderColor: st.border }}
                              >
                                <span className="w-1 h-1 rounded-full" style={{ background: st.dot }} />
                                {st.label}
                              </span>
                              {app.ats_score && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border"
                                  style={{ background: "rgba(66,165,245,0.08)", color: "#0D47A1", borderColor: "rgba(66,165,245,0.2)" }}
                                >
                                  ATS {Math.round(app.ats_score)}%
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">
                              🏢 {app.internship?.company_name || "Partner"} · Applied {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Pipeline bar */}
                          <div className="w-28 space-y-1 hidden sm:block">
                            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              <span>Pipeline</span>
                              <span>{st.pct}%</span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${st.pct}%`,
                                  background: `linear-gradient(90deg, #1976D2, ${st.dot})`,
                                }}
                              />
                            </div>
                          </div>

                          {/* CTA */}
                          {['applied', 'simulation_invited', 'simulation_started'].includes(app.status) && (
                            <button
                              onClick={() => handleStartSim(app.id)}
                              className="px-3.5 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:-translate-y-px"
                              style={{ background: "var(--capvia-primary)", boxShadow: "var(--shadow-primary)" }}
                            >
                              <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
                              Start Test
                            </button>
                          )}
                          {app.status === 'simulation_completed' && (
                            <button
                              onClick={() => router.push('/candidate/interview')}
                              className="px-3.5 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:-translate-y-px"
                              style={{ background: "#6D28D9", boxShadow: "0 4px 12px rgba(109,40,217,0.2)" }}
                            >
                              <Video className="w-3.5 h-3.5 inline mr-1.5" />
                              Interview
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Learning roadmap */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-[15px] font-bold text-slate-900 font-outfit tracking-tight">
              Learning Roadmap
            </h2>

            <div className="card p-5 space-y-4">
              <p className="text-[11px] text-slate-400 font-medium -mt-1">
                Recommended skill boosts based on your DNA profile
              </p>
              <div className="space-y-2.5">
                {[
                  { title: "Advanced Data Structures",  provider: "AssessAI Guide", time: "2h", color: "#0D47A1" },
                  { title: "RESTful API Integration",   provider: "CAPVIA Dev",     time: "1.5h", color: "#7C3AED" },
                  { title: "Spoken English Expression", provider: "SpeechAI Unit",  time: "45m", color: "#059669" },
                ].map((course, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50 cursor-default"
                    style={{ border: "1px solid var(--border-hairline)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${course.color}14` }}
                    >
                      <Compass className="w-3.5 h-3.5" style={{ color: course.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{course.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {course.provider} · {course.time}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#FFC107]" />
                <h3 className="text-[13px] font-bold text-slate-900 font-outfit">Achievements</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: "🛡️", label: "Anti-Fraud",  earned: true  },
                  { emoji: "💻", label: "Clean Code",  earned: true  },
                  { emoji: "🗣️", label: "Spoken AI",   earned: false },
                  { emoji: "⚡", label: "Fast Track",  earned: false },
                  { emoji: "🔬", label: "Analyst",     earned: false },
                  { emoji: "🏆", label: "Top 10%",     earned: false },
                ].map((badge, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center transition-all hover:scale-105"
                    style={{
                      background: badge.earned ? "rgba(13,71,161,0.05)" : "var(--surface-subtle)",
                      border: `1px solid ${badge.earned ? "rgba(13,71,161,0.1)" : "var(--border-hairline)"}`,
                      opacity: badge.earned ? 1 : 0.45,
                    }}
                  >
                    <span className="text-xl">{badge.emoji}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wide leading-tight">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recommended Jobs ─────────────────────────────── */}
        {recommendedJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-slate-900 font-outfit tracking-tight">
                Recommended Internships
              </h2>
              <Link
                href="/internships"
                className="flex items-center gap-1 text-[11px] font-bold transition-colors hover:opacity-80"
                style={{ color: "#0D47A1" }}
              >
                Browse all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedJobs.map((job) => (
                <div
                  key={job.id}
                  className="card-interactive p-5 rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <span
                      className="inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                      style={{
                        background: "rgba(13,71,161,0.07)",
                        color: "#0D47A1",
                        border: "1px solid rgba(13,71,161,0.1)",
                      }}
                    >
                      {job.category || "Technology"}
                    </span>
                    <h4 className="text-[13px] font-bold text-slate-900 tracking-tight mb-1">
                      {job.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      🏢 {job.company_name || "Partner Company"}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-between mt-4 pt-3"
                    style={{ borderTop: "1px solid var(--border-hairline)" }}
                  >
                    <span className="text-[13px] font-bold text-slate-800">
                      ₹{job.stipend?.toLocaleString() || "15,000"}/mo
                    </span>
                    <Link
                      href="/internships"
                      className="flex items-center gap-1 text-[11px] font-bold transition-colors hover:opacity-80"
                      style={{ color: "#0D47A1" }}
                    >
                      Apply <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </UnifiedLayout>
  );
}
