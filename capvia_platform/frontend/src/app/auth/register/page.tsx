'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../services/api';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight, Terminal } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.register({
        email,
        password,
        full_name: fullName,
        role: 'candidate' // Defaults to candidate to prevent privilege escalation
      });
      setSuccess('Account created successfully! Please click the activation link below to verify your email.');
      setVerifyToken(data.simulated_token);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed. Please check your credentials.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyToken) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyEmail(verifyToken);
      setSuccess('Email address verified successfully! You can now log in.');
      setVerifyToken(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-2">
            <Terminal className="h-3.5 w-3.5" />
            <span>Apply to Vacancies</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Join CAPVIA
          </h2>
          <p className="text-xs text-slate-400">Create a candidate account to start screening</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-6 shadow-xl shadow-slate-950/50">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <div className="flex items-center space-x-2 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg px-3 py-2.5 transition-colors">
                  <User className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Arjun Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-transparent border-none text-slate-100 text-sm focus:outline-none w-full placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg px-3 py-2.5 transition-colors">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none text-slate-100 text-sm focus:outline-none w-full placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg px-3 py-2.5 transition-colors">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent border-none text-slate-100 text-sm focus:outline-none w-full placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Creating Profile...' : 'Sign Up'}</span>
                  {!loading && <UserPlus className="h-4 w-4" />}
                </button>
              </div>

            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200">Registration Complete</h4>
                <p className="text-xs text-slate-400 leading-relaxed px-4">{success}</p>
              </div>

              {verifyToken && (
                <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Simulated Email Verification Gate</span>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-400 transition-all"
                  >
                    <span>Click to verify email dynamically</span>
                  </button>
                </div>
              )}

              {!verifyToken && (
                <div className="pt-4">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-400 hover:underline"
                  >
                    <span>Proceed to Login</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-400 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
