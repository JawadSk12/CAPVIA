'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../services/api';
import { UserPlus, Mail, Lock, User, AlertCircle, Phone, Building, Eye, EyeOff, BrainCircuit, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
        // If the backend accepts company_name or phone, they'll process it. Otherwise ignored.
        ...(role === 'hr' ? { company_name: companyName } : {}),
        phone: phone
      });
      
      // Navigate to verification screen. The backend might return a simulated token for testing.
      // We pass the token or email as a query param so the verify-email page can use it.
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
    <main className="min-h-screen bg-white text-gray-900 flex">
      {/* Left Section - Branding & Illustration */}
      <div className="hidden lg:flex w-1/2 bg-[#0D47A1] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#42A5F5]/30 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="bg-white p-2 rounded-xl">
              <BrainCircuit className="h-8 w-8 text-[#0D47A1]" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight font-outfit">CAPVIA</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-outfit leading-tight">
              Start Your <span className="text-[#FFC107]">Journey</span>
            </h1>
            <p className="text-blue-100 text-lg font-inter">
              Join the ecosystem where exceptional talent meets visionary companies.
            </p>

            <div className="space-y-4 pt-8">
              {[
                'Enterprise-grade security',
                'Advanced capability matching',
                'Seamless interview simulations'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center space-x-3 text-blue-50">
                  <ShieldCheck className="h-5 w-5 text-[#42A5F5]" />
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-[400px] h-[400px] rounded-full border border-white/10 pointer-events-none" />
      </div>

      {/* Right Section - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative min-h-screen">
        <div className="w-full max-w-md space-y-8 my-auto">

          
          <div className="text-center lg:text-left space-y-2">
            <Link href="/" className="lg:hidden inline-flex items-center justify-center space-x-2 mb-6">
              <div className="bg-[#0D47A1] p-2 rounded-xl">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#0D47A1] tracking-tight font-outfit">CAPVIA</span>
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 font-outfit">Create an Account</h2>
            <p className="text-gray-500 font-inter text-sm">Enter your details to get started.</p>
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

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4 pb-2">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-[16px] border text-sm font-semibold transition-all ${
                  role === 'candidate' 
                    ? 'border-[#0D47A1] bg-blue-50 text-[#0D47A1]' 
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('hr')}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-[16px] border text-sm font-semibold transition-all ${
                  role === 'hr' 
                    ? 'border-[#0D47A1] bg-blue-50 text-[#0D47A1]' 
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>HR / Company</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Arjun Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
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
                  className="space-y-1.5 overflow-hidden"
                >
                  <label htmlFor="company" className="text-sm font-semibold text-gray-700">Company Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="company"
                      type="text"
                      required={role === 'hr'}
                      placeholder="Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
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
                        className={`h-1.5 flex-1 rounded-full ${level <= strengthScore ? strengthColors[strengthScore] : 'bg-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium w-16 text-right">
                    {strengthLabels[strengthScore] || 'Too weak'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm_password" className="text-sm font-semibold text-gray-700">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
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
                  className="h-4 w-4 text-[#0D47A1] focus:ring-[#0D47A1] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="font-medium text-gray-600">
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
                className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-[16px] shadow-sm text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#0A367A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D47A1] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
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

          <p className="text-center text-sm text-gray-600 font-inter">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-[#0D47A1] hover:text-[#42A5F5] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
