'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../services/api';
import { KeyRound, Mail, AlertCircle, CheckCircle2, ArrowLeft, ExternalLink, Terminal } from 'lucide-react';

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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-2">
            <Terminal className="h-3.5 w-3.5" />
            <span>Account Security Recover</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Recover Account
          </h2>
          <p className="text-xs text-slate-400">Request password reset token</p>
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Email</label>
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Dispatched request...' : 'Send Reset Link'}</span>
                  {!loading && <KeyRound className="h-4 w-4" />}
                </button>
              </div>

            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200">Request Sent</h4>
                <p className="text-xs text-slate-400 leading-relaxed px-4">{success}</p>
              </div>

              {resetToken && (
                <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Simulated Password Reset Email</span>
                  <Link
                    href={`/auth/reset-password?token=${resetToken}`}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-400 transition-all"
                  >
                    <span>Proceed to Reset Password Page</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              <div className="pt-4">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
