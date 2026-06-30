'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../services/api';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, BrainCircuit, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!token) {
      setError('Verification token is missing. Please check your email link.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyEmail(token);
      setSuccess('Email address verified successfully!');
      // After a short delay, redirect to profile setup
      setTimeout(() => {
        router.push('/auth/profile-setup');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed. The link may have expired.');
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
            <div className="mx-auto w-16 h-16 bg-blue-50 text-[#0D47A1] rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-outfit">Verify Your Email</h2>
            <p className="text-sm text-gray-500 font-inter">
              We've sent a verification link to <br />
              <span className="font-semibold text-gray-700">{emailParam || 'your email'}</span>
            </p>
          </div>

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

          {token && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-[16px] space-y-3">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Simulated Environment</span>
              <p className="text-sm text-blue-700">For development purposes, a simulated token was captured. Click below to verify instantly.</p>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-[12px] shadow-sm text-sm font-bold text-white bg-[#42A5F5] hover:bg-[#1E88E5] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify Instantly</span>
                  </div>
                )}
              </button>
            </div>
          )}

          <div className="pt-2 text-center border-t border-gray-100 mt-6">
            <p className="text-sm text-gray-500 mt-4">
              Didn't receive the email? <button className="text-[#0D47A1] font-semibold hover:underline">Click to resend</button>
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6 py-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="h-10 w-10" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 font-outfit">Email Verified!</h2>
            <p className="text-sm text-gray-500 font-inter leading-relaxed px-4">
              {success} <br /> Redirecting you to complete your profile...
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/auth/profile-setup"
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-[16px] shadow-sm text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#0A367A] transition-all"
            >
              <span>Continue to Profile Setup</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function VerifyEmailPage() {
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
          <VerifyEmailContent />
        </Suspense>
      </div>
    </main>
  );
}
