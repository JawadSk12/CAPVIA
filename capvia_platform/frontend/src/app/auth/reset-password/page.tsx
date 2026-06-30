'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../services/api';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, ArrowRight, BrainCircuit, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setSuccess(null);
    setLoading(true);

    if (!token) {
      setError('Password reset token is missing from the link. Please request a new link.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await authApi.resetPassword({
        token,
        new_password: password
      });
      setSuccess('Your password has been successfully reset! All active sessions have been terminated for security.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Password reset failed. The token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-[24px] shadow-xl shadow-gray-200/50 p-8"
    >
      {!success ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-blue-50 text-[#0D47A1] rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-outfit">Set New Password</h2>
            <p className="text-sm text-gray-500 font-inter">
              Please enter a strong password for your account.
            </p>
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

            {!token && (
              <div className="flex items-center space-x-2 p-3.5 rounded-[12px] bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Warning: No reset token detected in the URL query string.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
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
              <label htmlFor="confirm_password" className="text-sm font-semibold text-gray-700">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !token}
                className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-[16px] shadow-sm text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#0A367A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D47A1] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating Credentials...</span>
                  </div>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </div>

          </form>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 font-outfit">Credentials Updated</h2>
            <p className="text-sm text-gray-500 font-inter leading-relaxed px-4">
              {success}
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-[16px] shadow-sm text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#0A367A] transition-all"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md">
        
        {/* Branding */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="bg-[#0D47A1] p-2 rounded-xl shadow-md">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D47A1] tracking-tight font-outfit">CAPVIA</span>
          </Link>
        </div>

        <Suspense fallback={
          <div className="bg-white border border-gray-100 rounded-[24px] shadow-xl shadow-gray-200/50 p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D47A1] mx-auto" />
            <p className="text-sm text-gray-500 font-inter">Loading secure environment...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
