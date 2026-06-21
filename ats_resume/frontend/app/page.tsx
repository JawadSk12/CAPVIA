"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle,
  FileText,
  Shield,
  Star,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: BrainCircuit,
    color: "bg-indigo-100 text-indigo-600",
    title: "AI-Powered ATS Analysis",
    desc: "Our enterprise-grade AI pipeline scores your resume across 8 dimensions using the same logic Fortune 500 ATS systems use.",
  },
  {
    icon: TrendingUp,
    color: "bg-emerald-100 text-emerald-600",
    title: "Skill Gap Detection",
    desc: "Instantly see which skills are missing for your target role and get a prioritized learning roadmap.",
  },
  {
    icon: FileText,
    color: "bg-purple-100 text-purple-600",
    title: "AI Resume Rewriter",
    desc: "Streaming AI rewrites transform weak bullet points into high-impact, ATS-optimized statements in real time.",
  },
  {
    icon: Shield,
    color: "bg-amber-100 text-amber-600",
    title: "Fraud Detection",
    desc: "Advanced ML models detect skill exaggeration and flag suspicious patterns before they hurt your credibility.",
  },
  {
    icon: Users,
    color: "bg-rose-100 text-rose-600",
    title: "HR Candidate Ranking",
    desc: "HR managers get ranked candidate lists with explainable scores, SHAP feature importance, and hiring funnel analytics.",
  },
  {
    icon: BarChart3,
    color: "bg-teal-100 text-teal-600",
    title: "Progress Tracking",
    desc: "Track your ATS score improvements over time and benchmark yourself against other candidates.",
  },
];

const STATS = [
  { value: "98%",   label: "ATS Pass Rate" },
  { value: "2.4×",  label: "More Interview Callbacks" },
  { value: "<60s",  label: "Analysis Time" },
  { value: "10K+",  label: "Resumes Analyzed" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Upload Resume",    desc: "PDF, DOC or DOCX — we handle OCR for scanned documents too." },
  { step: "02", title: "AI Analysis",      desc: "Our 4-stage Celery pipeline runs OCR → parse → embed → score." },
  { step: "03", title: "Review Results",   desc: "See your score, skill gaps, heatmap, and rewrite suggestions." },
  { step: "04", title: "Apply & Track",    desc: "Apply to matched internships and track your improvement journey." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">
              CAP<span className="text-indigo-600">VIA</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features"    className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#pricing"     className="hover:text-indigo-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary btn-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-6">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold border border-indigo-100">
            <Star size={14} className="fill-indigo-400 text-indigo-400" />
            Powered by XGBoost + SHAP + Sentence Transformers
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Beat the ATS.<br />
            <span className="hero-text-gradient">Land the Interview.</span>
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            CAPVIA analyzes your resume with the same AI logic enterprise ATS systems use —
            giving you an actionable score, skill gap analysis, and AI-rewritten bullet points
            in under 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary btn-lg gap-2 w-full sm:w-auto">
              Analyze My Resume Free
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-outline btn-lg w-full sm:w-auto">
              I&apos;m an HR Manager →
            </Link>
          </div>

          {/* Social proof */}
          <p className="text-xs text-slate-400">
            No credit card · Takes 30 seconds to set up · GDPR compliant
          </p>
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-14 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label} className="space-y-1">
              <p className="text-4xl font-extrabold text-white">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800">
              Everything you need to<br />
              <span className="hero-text-gradient">maximize your ATS score</span>
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              From upload to offer letter — CAPVIA covers the entire candidate journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="card card-hover p-6 space-y-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800">How CAPVIA works</h2>
            <p className="mt-4 text-slate-500">From upload to offer-ready in 4 simple steps.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-16 right-16 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-emerald-200" />

            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="relative text-center space-y-3">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200 relative z-10">
                  {step}
                </div>
                <h3 className="font-bold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 hero-gradient">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">
            Ready to beat the ATS?
          </h2>
          <p className="text-lg text-white/80">
            Join thousands of students who have boosted their ATS scores and landed interviews
            at top companies.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
          >
            <Upload size={18} />
            Start Analyzing Free
          </Link>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            {["✓ No credit card", "✓ Free forever plan", "✓ Results in 60 seconds"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-white">
              CAP<span className="text-indigo-400">VIA</span>
            </span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} CAPVIA. All rights reserved.</p>
          <div className="flex gap-4 text-sm">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms"   className="hover:text-white transition-colors">Terms</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
