'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/auth';
import { authApi } from '../../../services/api';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    const token = typeof window !== 'undefined' ? localStorage.getItem('capvia_access_token') : null;
    if (token) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authApi.login({ email, password });
      
      // Store in Zustand
      login(data.access_token, data.refresh_token, {
        id: data.user_id || data.id || '',
        email: email,
        full_name: data.full_name,
        role: data.role
      });
      
      router.push('/dashboard');
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Invalid email or password. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-gray-900 flex">
      {/* Left Section - Deep Navy Brand Experience */}
      <div className="hidden lg:flex w-1/2 bg-[#08152E] relative flex-col justify-between p-12 overflow-hidden border-r border-[#42A5F5]/10">
        {/* Circuit board grid & trace lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(66, 165, 245, 0.15)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <path d="M 50 100 L 200 100 L 250 150 L 400 150 L 450 200 L 600 200" fill="none" stroke="rgba(66, 165, 245, 0.4)" strokeWidth="2" strokeDasharray="10 15" className="animate-draw" />
            <path d="M 100 500 L 250 500 L 300 450 L 450 450 L 500 400 L 650 400" fill="none" stroke="rgba(66, 165, 245, 0.4)" strokeWidth="2" strokeDasharray="10 15" className="animate-draw" />
            <circle cx="200" cy="100" r="4" fill="#42A5F5" />
            <circle cx="250" cy="150" r="4" fill="#42A5F5" />
            <circle cx="450" cy="200" r="4" fill="#42A5F5" />
            <circle cx="300" cy="450" r="4" fill="#42A5F5" />
            <circle cx="500" cy="400" r="4" fill="#42A5F5" />
          </svg>
        </div>
        
        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center space-x-2.5">
            <div className="bg-[#0D47A1] p-2.5 rounded-2xl shadow-lg border border-[#42A5F5]/35">
              <BrainCircuit className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight font-outfit">CAPVIA</span>
          </Link>
        </div>

        {/* Center - Visual Assessment Pipeline */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-grow space-y-8">
          <div className="flex flex-col items-center space-y-6 bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl w-full max-w-md">
            <span className="text-xs font-bold text-[#42A5F5] uppercase tracking-widest">Verification Pipeline</span>
            <div className="flex items-center justify-between w-full relative">
              {/* Connector Line */}
              <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-slate-800 -z-10 overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#42A5F5] to-transparent animate-[shimmer_2s_infinite]" />
              </div>
              
              {[
                { label: 'Apply', icon: '📝', active: true },
                { label: 'Screen', icon: '🔍', active: true },
                { label: 'Simulate', icon: '💻', active: true, pulse: true },
                { label: 'Interview', icon: '📹', active: false },
                { label: 'Verify', icon: '🛡️', active: false },
                { label: 'Hire', icon: '🎉', active: false }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-2">
                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 ${
                    step.pulse 
                      ? 'border-[#42A5F5] bg-[#0D47A1]/40 text-white shadow-[0_0_15px_rgba(66,165,245,0.4)] animate-pulse'
                      : step.active
                        ? 'border-[#42A5F5] bg-[#0D47A1] text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-600'
                  }`}>
                    <span>{step.icon}</span>
                    {step.pulse && (
                      <span className="absolute -inset-1 rounded-full border border-[#42A5F5] opacity-75 animate-ping" />
                    )}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${step.active || step.pulse ? 'text-blue-200' : 'text-slate-650'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer Brand Tagline */}
        <div className="relative z-10 border-t border-white/5 pt-6">
          <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">AI-VERIFIED INTERNSHIPS & CAREERS</p>
        </div>
      </div>

      {/* Right Section - Login Form with Faint Tint */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-[#0D47A1]/3">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center lg:text-left space-y-2">
            <Link href="/" className="lg:hidden inline-flex items-center justify-center space-x-2.5 mb-6">
              <div className="bg-[#0D47A1] p-2 rounded-xl">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black text-[#0D47A1] tracking-tight font-outfit">CAPVIA</span>
            </Link>
            <h2 className="text-3xl font-black text-slate-900 font-outfit tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 font-inter text-sm font-medium">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center space-x-2 p-3.5 rounded-[12px] bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs uppercase font-bold tracking-widest text-slate-500">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs uppercase font-bold tracking-widest text-slate-500">Password</label>
                <Link href="/auth/forgot-password" className="text-xs font-bold text-[#42A5F5] hover:text-[#0D47A1] transition-colors" tabIndex={-1}>
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#0D47A1] focus:ring-[#0D47A1] border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember_me" className="ml-2 block text-xs font-semibold text-slate-600 cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-full shadow-lg shadow-[#0D47A1]/20 text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#1976D2] hover:shadow-xl hover:shadow-[#0D47A1]/35 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold">
                  <span className="px-3 bg-[#F8FAFC] text-slate-500 font-inter uppercase tracking-wide">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-slate-200 rounded-full shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#42A5F5] transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </div>
            </div>
            
          </form>

          <p className="text-center text-sm text-slate-600 font-inter font-medium">
            Don't have an account?{' '}
            <Link href="/auth/register" className="font-bold text-[#0D47A1] hover:text-[#42A5F5] transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Simulated Google Login Account Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[24px] border border-slate-100 shadow-2xl p-6 w-full max-w-sm text-left space-y-5"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-outfit">Simulated Google Login</h3>
              <p className="text-xs text-gray-500 mt-1">Select a pre-seeded account to instantly sign in:</p>
            </div>
            
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={async () => {
                  setShowGoogleModal(false);
                  setLoading(true);
                  try {
                    const data = await authApi.login({ email: 'candidate@example.com', password: 'password123' });
                    login(data.access_token, data.refresh_token, {
                      id: data.user_id || data.id || '',
                      email: 'candidate@example.com',
                      full_name: data.full_name,
                      role: data.role
                    });
                    router.push('/dashboard');
                  } catch (err: any) {
                    setError('Simulated login failed.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full flex items-center justify-between p-4 border border-slate-150 rounded-[16px] hover:bg-blue-50/50 hover:border-[#0D47A1]/35 transition-all text-left"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Arjun Kumar</span>
                  <span className="text-[10px] text-gray-500 block font-medium">candidate@example.com · Candidate</span>
                </div>
                <span className="text-xs text-[#0D47A1] font-bold">Sign In →</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowGoogleModal(false);
                  setLoading(true);
                  try {
                    const data = await authApi.login({ email: 'hr@capvia.ai', password: 'password123' });
                    login(data.access_token, data.refresh_token, {
                      id: data.user_id || data.id || '',
                      email: 'hr@capvia.ai',
                      full_name: data.full_name,
                      role: data.role
                    });
                    router.push('/hr/dashboard');
                  } catch (err: any) {
                    setError('Simulated login failed.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full flex items-center justify-between p-4 border border-slate-150 rounded-[16px] hover:bg-emerald-50/50 hover:border-emerald-600/35 transition-all text-left"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Jane Smith</span>
                  <span className="text-[10px] text-gray-500 block font-medium">hr@capvia.ai · Recruiter / HR</span>
                </div>
                <span className="text-xs text-emerald-600 font-bold">Sign In →</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-3.5 text-center text-xs font-bold border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}
