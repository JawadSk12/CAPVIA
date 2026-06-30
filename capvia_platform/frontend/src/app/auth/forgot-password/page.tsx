'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../services/api';
import { KeyRound, Mail, AlertCircle, CheckCircle2, ArrowLeft, ExternalLink, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await authApi.forgotPassword(email);
      setSuccess('If the email is registered, a password reset link has been dispatched.');
      setResetToken(data.simulated_token);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[24px] shadow-xl shadow-gray-200/50 p-8"
        >
          {!success ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-blue-50 text-[#0D47A1] rounded-full flex items-center justify-center mb-4">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-outfit">Forgot Password?</h2>
                <p className="text-sm text-gray-500 font-inter">
                  No worries, we'll send you reset instructions.
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
                      autoFocus
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-shadow shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-[16px] shadow-sm text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#0A367A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D47A1] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending Link...</span>
                      </div>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center">
                <Link href="/auth/login" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-[#0D47A1] transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to log in
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 font-outfit">Check your email</h2>
                <p className="text-sm text-gray-500 font-inter">
                  We sent a password reset link to <br/>
                  <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>

              {resetToken && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-[16px] space-y-3">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Simulated Environment</span>
                  <p className="text-sm text-blue-700">For development purposes, you can use the token directly.</p>
                  <Link
                    href={`/auth/reset-password?token=${resetToken}`}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent rounded-[12px] shadow-sm text-sm font-bold text-white bg-[#42A5F5] hover:bg-[#1E88E5] transition-all"
                  >
                    <span>Proceed to Reset</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm text-gray-500 mb-6">
                  Didn't receive the email? <button onClick={() => setSuccess(null)} className="text-[#0D47A1] font-semibold hover:underline">Click to resend</button>
                </p>
                <Link href="/auth/login" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-[#0D47A1] transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to log in
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
