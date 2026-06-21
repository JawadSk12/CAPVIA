import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/services/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setSent(true); } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/8 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl mx-auto mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>
        <div className="bg-white backdrop-blur-xl border border-slate-200 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✉️</div>
              <p className="text-slate-900 font-semibold mb-2">Check your inbox</p>
              <p className="text-slate-500 text-sm">If that email exists, we sent a reset link to <span className="text-indigo-600">{email}</span></p>
              <Link to="/auth/login" className="block mt-6 text-sm text-indigo-600 hover:text-indigo-500">← Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition text-sm" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-violet-400 text-slate-900 font-semibold transition-all duration-200 disabled:opacity-50 text-sm">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link to="/auth/login" className="block text-center text-sm text-slate-400 hover:text-slate-600 transition">← Back to login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
