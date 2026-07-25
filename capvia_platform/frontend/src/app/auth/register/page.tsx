'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '../../../services/api';
import {
  Mail, Lock, User, AlertCircle, Phone, Building, Key, ShieldCheck,
  Eye, EyeOff, BrainCircuit, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STRENGTH_COLORS = ['#E2E8F0', '#EF4444', '#F59E0B', '#42A5F5', '#10B981'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

function FieldInput({
  id, label, type = 'text', placeholder, value, onChange, icon: Icon,
  required = false, extra,
}: {
  id: string; label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; icon: React.ElementType;
  required?: boolean; extra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </label>
        {extra}
      </div>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type={inputType}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 rounded-xl transition-all outline-none"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.09)',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}
          onFocus={(e) => {
            (e.target as HTMLElement).style.borderColor = '#0D47A1';
            (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(13,71,161,0.1)';
          }}
          onBlur={(e) => {
            (e.target as HTMLElement).style.borderColor = 'rgba(15,23,42,0.09)';
            (e.target as HTMLElement).style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)';
          }}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted,         setMounted]         = useState(false);
  const [fullName,        setFullName]         = useState('');
  const [email,           setEmail]            = useState('');
  const [phone,           setPhone]            = useState('');
  const [password,        setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword]  = useState('');
  const [role,            setRole]             = useState<'candidate' | 'hr'>('candidate');
  const [companyName,     setCompanyName]      = useState('');
  const [hrCode,          setHrCode]           = useState('');
  const [agreedToTerms,   setAgreedToTerms]    = useState(false);
  const [error,           setError]            = useState<string | null>(null);
  const [loading,         setLoading]          = useState(false);

  useEffect(() => { 
    setMounted(true); 
    const paramEmail = searchParams?.get('email');
    const paramName = searchParams?.get('name');
    if (paramEmail) setEmail(paramEmail);
    if (paramName) setFullName(paramName);
  }, [searchParams]);

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length > 7) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strengthScore = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    if (role === 'hr' && !hrCode.trim()) {
      setError('HR Access Code is required to register as HR. Please contact your administrator.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions.');
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.register({
        email, password,
        full_name: fullName,
        role,
        ...(role === 'hr' ? { company_name: companyName, hr_code: hrCode } : {}),
        phone,
      });
      const verifyToken = data.simulated_token || '';
      router.push(`/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F6F9' }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#0D47A1', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex" style={{ background: '#F4F6F9' }}>

      {/* ── Left brand panel ───────────────────────────────── */}
      <div
        className="hidden lg:flex w-[44%] flex-col justify-between relative overflow-hidden"
        style={{ background: '#08152E' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-100">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="reg-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(66,165,245,0.07)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#reg-grid)" />
            <path d="M 60 140 L 200 140 L 240 180 L 380 180 L 420 220"
              fill="none" stroke="rgba(66,165,245,0.22)" strokeWidth="1.5" strokeDasharray="8 12" />
            <path d="M 80 460 L 220 460 L 260 420 L 400 420 L 440 380"
              fill="none" stroke="rgba(66,165,245,0.22)" strokeWidth="1.5" strokeDasharray="8 12"
              style={{ animationDelay: '2s' }} />
            {[[200,140],[240,180],[260,420],[440,380]].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill="#42A5F5" opacity="0.45" />
            ))}
          </svg>
          <div className="absolute" style={{ top: '10%', right: '-15%', width: '60%', height: '50%', background: 'radial-gradient(ellipse, rgba(13,71,161,0.18) 0%, transparent 65%)' }} />
          <div className="absolute" style={{ bottom: '10%', left: '-15%', width: '50%', height: '40%', background: 'radial-gradient(ellipse, rgba(25,118,210,0.1) 0%, transparent 65%)' }} />
        </div>

        {/* Brand mark */}
        <div className="relative z-10 p-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(13,71,161,0.8)', border: '1px solid rgba(66,165,245,0.3)', boxShadow: '0 0 20px rgba(13,71,161,0.3)' }}
            >
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight font-outfit">CAPVIA</span>
          </Link>
        </div>

        {/* Value props */}
        <div className="relative z-10 px-10 pb-4 space-y-4">
          {[
            { emoji: '🧠', title: 'AI-Powered Evaluation',  desc: 'Every candidate assessed across code, speech, and integrity.'  },
            { emoji: '🛡️', title: 'Tamper-Proof Results',   desc: 'Proctored sessions with behavioral integrity scoring.'           },
            { emoji: '📊', title: 'DNA Profile Report',     desc: 'One composited score — clear, explainable, and bias-free.'       },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xl mt-0.5">{item.emoji}</span>
              <div>
                <p className="text-[13px] font-bold text-white/90">{item.title}</p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 px-10 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(100,116,139,0.5)' }}>
            Verified AI Hiring — Free for Candidates
          </p>
        </div>
      </div>

      {/* ── Right form ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-6">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D47A1, #1976D2)' }}>
                <BrainCircuit className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900 font-outfit tracking-tight">CAPVIA</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[26px] font-black text-slate-900 font-outfit tracking-tight leading-tight">
              Create your account
            </h1>
            <p className="text-[14px] text-slate-500 mt-1.5 font-medium">
              Join the verified hiring network — free, no credit card.
            </p>
          </div>

          {/* Role selector */}
          <div
            className="flex p-1 mb-6 rounded-xl"
            style={{ background: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.06)' }}
          >
            {(['candidate', 'hr'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-bold capitalize transition-all"
                style={
                  role === r
                    ? { background: '#FFFFFF', color: '#0D47A1', boxShadow: '0 1px 4px rgba(15,23,42,0.12)' }
                    : { color: 'rgba(100,116,139,0.7)' }
                }
              >
                {r === 'candidate' ? '🎓 Candidate' : '💼 HR / Recruiter'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#DC2626' }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <FieldInput
              id="fullName" label="Full Name" icon={User}
              placeholder="Huzaifa Ansari" value={fullName}
              onChange={setFullName} required
            />

            <FieldInput
              id="email" label="Email Address" type="email" icon={Mail}
              placeholder="name@company.com" value={email}
              onChange={setEmail} required
            />

            <FieldInput
              id="phone" label="Phone Number" type="tel" icon={Phone}
              placeholder="+91 98765 43210" value={phone}
              onChange={setPhone}
            />

            {role === 'hr' && (
              <>
                <FieldInput
                  id="company" label="Company Name" icon={Building}
                  placeholder="CAPVIA Technologies" value={companyName}
                  onChange={setCompanyName} required
                />
                <FieldInput
                  id="hrCode" label="Admin HR Security Code" type="password" icon={Key}
                  placeholder="Enter HR access code from admin" value={hrCode}
                  onChange={setHrCode} required
                  extra={
                    <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Admin Code Required
                    </span>
                  }
                />
              </>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 rounded-xl transition-all outline-none"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
                  onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#0D47A1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(13,71,161,0.1)'; }}
                  onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(15,23,42,0.09)'; (e.target as HTMLElement).style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; }}
                />
              </div>
              {/* Strength bar */}
              {password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: strengthScore >= n ? STRENGTH_COLORS[strengthScore] : 'rgba(15,23,42,0.07)' }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: STRENGTH_COLORS[strengthScore] }}>
                    {STRENGTH_LABELS[strengthScore]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 rounded-xl transition-all outline-none"
                  style={{
                    background: '#FFFFFF',
                    border: confirmPassword && password !== confirmPassword ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(15,23,42,0.09)',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  }}
                  onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#0D47A1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(13,71,161,0.1)'; }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = confirmPassword && password !== confirmPassword ? 'rgba(239,68,68,0.4)' : 'rgba(15,23,42,0.09)';
                    (e.target as HTMLElement).style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)';
                  }}
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all"
                  style={{
                    background: agreedToTerms ? '#0D47A1' : '#FFFFFF',
                    borderColor: agreedToTerms ? '#0D47A1' : 'rgba(15,23,42,0.2)',
                  }}
                >
                  {agreedToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-[12px] text-slate-500 leading-relaxed">
                I agree to CAPVIA's{' '}
                <Link href="#" className="font-bold text-[#0D47A1] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" className="font-bold text-[#0D47A1] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: loading ? 'rgba(13,71,161,0.7)' : '#0D47A1',
                boxShadow: '0 4px 16px rgba(13,71,161,0.25)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLElement).style.background = '#0A3B85';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(13,71,161,0.35)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = loading ? 'rgba(13,71,161,0.7)' : '#0D47A1';
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(13,71,161,0.25)';
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-7">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold text-[#0D47A1]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F6F9' }}>
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#0D47A1', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
