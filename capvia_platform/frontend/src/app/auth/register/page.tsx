'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../services/api';
import { UserPlus, Mail, Lock, User, AlertCircle, Phone, Building, Eye, EyeOff, BrainCircuit, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
  const [companyName, setCompanyName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Password Strength Logic
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length > 7) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  const strengthColors = ['bg-gray-200', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions and Privacy Policy.');
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.register({
        email,
        password,
        full_name: fullName,
        role: role, 
        ...(role === 'hr' ? { company_name: companyName } : {}),
        phone: phone
      });
      
      const verifyToken = data.simulated_token || '';
      router.push(`/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`);
      
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed. Please check your credentials.';
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

      {/* Right Section - Register Form with Faint Tint */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative min-h-screen bg-[#0D47A1]/3">
        <div className="w-full max-w-md space-y-8 my-auto">
          
          <div className="text-center lg:text-left space-y-2">
            <Link href="/" className="lg:hidden inline-flex items-center justify-center space-x-2.5 mb-6">
              <div className="bg-[#0D47A1] p-2 rounded-xl">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black text-[#0D47A1] tracking-tight font-outfit">CAPVIA</span>
            </Link>
            <h2 className="text-3xl font-black text-slate-900 font-outfit tracking-tight">Create an Account</h2>
            <p className="text-slate-500 font-inter text-sm font-medium">Enter your details to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center space-x-2 p-3.5 rounded-[12px] bg-red-50 border border-red-100 text-red-600 text-sm font-medium overflow-hidden"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Segmented Role Selection with Sliding Indicator */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-widest text-slate-500">I want to register as</label>
              <div className="relative flex bg-slate-100 rounded-full p-1 w-full border border-slate-200">
                <div 
                  className="absolute top-1 bottom-1 left-1 rounded-full bg-[#0D47A1] shadow-md transition-all duration-300"
                  style={{
                    width: 'calc(50% - 4px)',
                    transform: role === 'hr' ? 'translateX(100%)' : 'translateX(0%)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setRole('candidate')}
                  className={`flex-1 relative z-10 flex items-center justify-center space-x-2 py-2.5 rounded-full text-xs font-bold transition-colors ${
                    role === 'candidate' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Candidate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('hr')}
                  className={`flex-1 relative z-10 flex items-center justify-center space-x-2 py-2.5 rounded-full text-xs font-bold transition-colors ${
                    role === 'hr' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span>HR / Company</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="fullName" className="text-xs uppercase font-bold tracking-widest text-slate-500">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Arjun Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-xs uppercase font-bold tracking-widest text-slate-500">Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {role === 'hr' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label htmlFor="company" className="text-xs uppercase font-bold tracking-widest text-slate-500">Company Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="company"
                      type="text"
                      required={role === 'hr'}
                      placeholder="Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs uppercase font-bold tracking-widest text-slate-500">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
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
              {password.length > 0 && (
                <div className="pt-1 flex items-center space-x-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`h-1.5 flex-1 rounded-full ${level <= strengthScore ? strengthColors[strengthScore] : 'bg-[#0D47A1]/10'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 font-bold w-16 text-right">
                    {strengthLabels[strengthScore] || 'Too weak'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-xs uppercase font-bold tracking-widest text-slate-500">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-l-4 focus:border-l-[#42A5F5] focus:border-slate-350 focus:ring-4 focus:ring-[#42A5F5]/10 transition-all shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="flex items-start pt-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 text-[#0D47A1] focus:ring-[#0D47A1] border-slate-300 rounded cursor-pointer"
                />
              </div>
              <div className="ml-3 text-xs font-semibold text-slate-600">
                <label htmlFor="terms" className="cursor-pointer">
                  I agree to the{' '}
                  <a href="#" className="text-[#0D47A1] hover:underline">Terms & Conditions</a>{' '}
                  and{' '}
                  <a href="#" className="text-[#0D47A1] hover:underline">Privacy Policy</a>.
                </label>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-full shadow-lg shadow-[#0D47A1]/20 text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#1976D2] hover:shadow-xl hover:shadow-[#0D47A1]/35 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <span>Register</span>
                )}
              </button>
            </div>

          </form>

          <p className="text-center text-sm text-slate-600 font-inter font-medium">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold text-[#0D47A1] hover:text-[#42A5F5] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
