import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.loginHR(email, password);
      const { access_token, refresh_token, user } = res.data;
      setAuth(user, access_token, refresh_token);
      navigate(user.role === 'hr' ? '/hr/dashboard' : '/candidate/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full border rounded-xl px-4 py-3 text-sm transition outline-none`;
  const inputStyle = {
    background: '#f8fafc',
    border: '1.5px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0f9ff 100%)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: 'linear-gradient(160deg, var(--accent) 0%, var(--blue) 100%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-lg">C</div>
            <span className="text-white font-extrabold text-xl tracking-tight">CAPVIA</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            AI-Powered<br />Internship Simulation
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed">
            Smart role detection, behavior-tracked assessments, and real-time AI dependency scoring — all in one platform.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: '🤖', text: 'AI simulation blueprint generation' },
            { icon: '🔍', text: 'Anti-cheat behavioral analytics' },
            { icon: '📊', text: 'Instant candidate ranking' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-base">{f.icon}</div>
              <span className="text-indigo-100 text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>C</div>
              <span className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>CAPVIA</span>
            </div>
          </div>

          <div className="rounded-2xl p-8" style={{ background: 'white', boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)', border: '1px solid var(--border)' }}>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>Sign in to your CAPVIA account</p>

            {error && (
              <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className={inputCls} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgb(79 70 229 / 0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className={inputCls} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgb(79 70 229 / 0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
              </div>

              <div className="flex justify-end">
                <Link to="/auth/forgot-password" className="text-sm font-medium transition" style={{ color: 'var(--accent)' }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))', boxShadow: '0 2px 12px rgb(79 70 229 / 0.3)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-muted)' }}>DEMO CREDENTIALS</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>HR Account</span>
                  <button className="font-medium transition hover:underline" style={{ color: 'var(--accent)' }}
                    onClick={() => { setEmail('hr@capvia.ai'); setPassword('HRDemo2024!'); }}>
                    hr@capvia.ai / HRDemo2024!
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Candidate</span>
                  <button className="font-medium transition hover:underline" style={{ color: 'var(--blue)' }}
                    onClick={() => { setEmail('candidate@capvia.ai'); setPassword('CandDemo2024!'); }}>
                    candidate@capvia.ai / CandDemo2024!
                  </button>
                </div>
              </div>
            </div>

            <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/auth/signup" className="font-semibold transition" style={{ color: 'var(--accent)' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};