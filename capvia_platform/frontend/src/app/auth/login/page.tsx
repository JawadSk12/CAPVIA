'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/auth';
import { authApi } from '../../../services/api';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Terminal } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initialize();
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-2">
            <Terminal className="h-3.5 w-3.5" />
            <span>Secure Gatekeeper Access</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Login to CAPVIA
          </h2>
          <p className="text-xs text-slate-400">Enter your credentials to manage your pipeline</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-6 shadow-xl shadow-slate-950/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="flex items-center space-x-2 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-indigo-400 hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-lg px-3 py-2.5 transition-colors">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
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
                <span>{loading ? 'Verifying Identity...' : 'Sign In'}</span>
                {!loading && <LogIn className="h-4 w-4" />}
              </button>
            </div>

          </form>
        </div>

        <p className="text-center text-xs text-slate-400">
          New to CAPVIA?{' '}
          <Link href="/auth/register" className="text-indigo-400 hover:underline font-semibold">
            Create candidate account
          </Link>
        </p>
      </div>
    </main>
  );
}
