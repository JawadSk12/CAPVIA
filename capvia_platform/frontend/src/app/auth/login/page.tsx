'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/auth';
import { authApi } from '../../../services/api';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle,
  ArrowRight, Shield, Terminal, Video, Check, BrainCircuit,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PIPELINE_STEPS = [
  { icon: '📝', label: 'Apply',     done: true  },
  { icon: '🔍', label: 'Screen',    done: true  },
  { icon: '💻', label: 'Simulate',  done: true, pulse: true },
  { icon: '📹', label: 'Interview', done: false },
  { icon: '🛡️', label: 'Verify',   done: false },
  { icon: '🎉', label: 'Hire',      done: false },
];

const TRUST_BADGES = [
  { icon: Shield,   label: 'Proctored Integrity' },
  { icon: Terminal, label: 'Live Code Sandbox' },
  { icon: Video,    label: 'AI Speech Interview' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();

  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [showGoogleModal,setShowGoogleModal] = useState(false);
  const [mounted,        setMounted]        = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('capvia_access_token') : null;
    if (token) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      login(data.access_token, data.refresh_token, {
        id: data.user_id || data.id || '',
        email,
        full_name: data.full_name,
        role: data.role,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimLogin = async (loginEmail: string, pass: string, redirect: string) => {
    setShowGoogleModal(false);
    setLoading(true);
    try {
      const data = await authApi.login({ email: loginEmail, password: pass });
      login(data.access_token, data.refresh_token, {
        id: data.user_id || data.id || '',
        email: loginEmail,
        full_name: data.full_name,
        role: data.role,
      });
      router.push(redirect);
    } catch {
      setError('Simulated login failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F6F9' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#0D47A1', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex" style={{ background: '#F4F6F9' }}>

      {/* ── Left — Brand Panel ─────────────────────────────── */}
      <div
        className="hidden lg:flex w-[46%] flex-col justify-between relative overflow-hidden"
        style={{ background: '#08152E' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-100">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(66,165,245,0.07)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Circuit trace lines */}
            <path d="M 60 120 L 200 120 L 240 160 L 380 160 L 420 200 L 560 200"
              fill="none" stroke="rgba(66,165,245,0.25)" strokeWidth="1.5" strokeDasharray="8 12"
              className="animate-draw" />
            <path d="M 80 480 L 220 480 L 260 440 L 400 440 L 440 400 L 580 400"
              fill="none" stroke="rgba(66,165,245,0.25)" strokeWidth="1.5" strokeDasharray="8 12"
              className="animate-draw" style={{ animationDelay: "2s" }} />
            {[
              [200, 120], [240, 160], [420, 200],
              [260, 440], [440, 400],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill="#42A5F5" opacity="0.5" />
            ))}
          </svg>
          {/* Ambient glows */}
          <div
            className="absolute"
            style={{
              top: "10%", right: "-15%",
              width: "60%", height: "50%",
              background: "radial-gradient(ellipse, rgba(13,71,161,0.2) 0%, transparent 65%)",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: "10%", left: "-15%",
              width: "50%", height: "40%",
              background: "radial-gradient(ellipse, rgba(25,118,210,0.12) 0%, transparent 65%)",
            }}
          />
        </div>

        {/* Brand mark */}
        <div className="relative z-10 p-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(13,71,161,0.8)",
                border: "1px solid rgba(66,165,245,0.3)",
                boxShadow: "0 0 20px rgba(13,71,161,0.3)",
              }}
            >
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight font-outfit">
              CAPVIA
            </span>
          </Link>
        </div>

        {/* Pipeline visualization */}
        <div className="relative z-10 flex flex-col items-center px-10 pb-2">
          <div
            className="w-full rounded-2xl p-7"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[10px] font-bold text-center uppercase tracking-widest mb-6" style={{ color: "#42A5F5" }}>
              Verification Pipeline
            </p>

            {/* Step indicators */}
            <div className="relative flex items-start justify-between">
              {/* Connector rail */}
              <div className="absolute top-4 left-5 right-5 h-px" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full w-1/2"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(66,165,245,0.6), transparent)", animation: "shimmer 2.5s ease-in-out infinite" }}
                />
              </div>

              {PIPELINE_STEPS.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all"
                    style={
                      step.pulse
                        ? { borderColor: "#42A5F5", background: "rgba(13,71,161,0.5)", boxShadow: "0 0 16px rgba(66,165,245,0.4)" }
                        : step.done
                          ? { borderColor: "#42A5F5", background: "rgba(13,71,161,0.8)" }
                          : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(3,9,20,0.7)" }
                    }
                  >
                    <span className="text-xs">{step.icon}</span>
                    {step.pulse && (
                      <span
                        className="absolute inset-[-4px] rounded-full border border-[#42A5F5]"
                        style={{ animation: "pulse-ring 2s ease-out infinite" }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider"
                    style={{ color: step.done || step.pulse ? "rgba(186,230,253,0.8)" : "rgba(100,116,139,0.5)" }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4 mt-6 mb-2">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{ color: "#42A5F5", opacity: 0.7 }} />
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "rgba(100,116,139,0.7)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="relative z-10 px-10 py-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(100,116,139,0.5)" }}>
            AI‑Verified Internships &amp; Careers
          </p>
        </div>
      </div>

      {/* ── Right — Form ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0D47A1, #1976D2)" }}
              >
                <BrainCircuit className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900 font-outfit tracking-tight">CAPVIA</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] font-black text-slate-900 font-outfit tracking-tight leading-tight">
              Welcome back
            </h1>
            <p className="text-[14px] text-slate-500 mt-1.5 font-medium">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Error alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm font-medium"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "#DC2626",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 rounded-xl transition-all"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-1)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--capvia-primary)";
                    (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(13,71,161,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--border-default)";
                    (e.target as HTMLElement).style.boxShadow = "var(--shadow-1)";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: "#42A5F5" }}
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 text-sm text-slate-900 placeholder-slate-400 rounded-xl transition-all"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-1)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--capvia-primary)";
                    (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(13,71,161,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--border-default)";
                    (e.target as HTMLElement).style.boxShadow = "var(--shadow-1)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex items-center justify-center py-3 px-5 rounded-xl text-sm font-bold text-white transition-all overflow-hidden"
              style={{
                background: loading ? "rgba(13,71,161,0.7)" : "var(--capvia-primary)",
                boxShadow: "var(--shadow-primary)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLElement).style.background = "var(--capvia-primary-hover)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-primary-lg)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = loading ? "rgba(13,71,161,0.7)" : "var(--capvia-primary)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-primary)";
                (e.currentTarget as HTMLElement).style.transform = "";
              }}
            >
              {/* Shimmer sweep */}
              <div
                className="absolute inset-0 pointer-events-none -translate-x-full hover:animate-shimmer"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
              />
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-hairline)" }} />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-hairline)" }} />
            </div>

            {/* Google simulated */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 transition-all"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
              }}
            >
              {/* Google logo */}
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-sm text-slate-500 mt-7">
            Don't have an account?{' '}
            <Link
              href="/auth/register"
              className="font-bold transition-colors"
              style={{ color: "#0D47A1" }}
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* ── Google Simulated Modal ─────────────────────────── */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,21,46,0.6)", backdropFilter: "blur(8px)" }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm"
              style={{
                background: "#FFFFFF",
                borderRadius: 24,
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-5)",
                padding: 24,
              }}
            >
              <div className="mb-5">
                <h2 className="text-[17px] font-bold text-slate-900 font-outfit">Demo Login</h2>
                <p className="text-[12px] text-slate-400 mt-1">Select a pre-seeded account to sign in instantly:</p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    name: 'Arjun Kumar',
                    email: 'candidate@example.com',
                    role: 'Candidate',
                    color: '#6D28D9',
                    bg: '#F5F3FF',
                    redirect: '/dashboard',
                  },
                  {
                    name: 'Jane Smith',
                    email: 'hr@capvia.ai',
                    role: 'HR Recruiter',
                    color: '#059669',
                    bg: '#ECFDF5',
                    redirect: '/hr/dashboard',
                  },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSimLogin(acc.email, 'password123', acc.redirect)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left"
                    style={{
                      border: "1px solid var(--border-default)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = acc.bg;
                      (e.currentTarget as HTMLElement).style.borderColor = `${acc.color}30`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black"
                        style={{ background: `linear-gradient(135deg, ${acc.color}, ${acc.color}cc)` }}
                      >
                        {acc.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{acc.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{acc.email} · {acc.role}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-full mt-3 py-3 text-center text-[12px] font-semibold rounded-xl transition-colors text-slate-500 hover:bg-slate-50"
                style={{ border: "1px solid var(--border-default)" }}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
