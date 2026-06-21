import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

const inputCls = "w-full border rounded-xl px-4 py-3 text-sm transition outline-none";
const inputStyle = {
  background: '#f8fafc',
  border: '1.5px solid #e2e8f0',
  color: '#0f172a',
};

export const HRSignup: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    full_name: '', email: '', company_name: '', position: '', password: '', confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#4f46e5';
    e.target.style.boxShadow = '0 0 0 3px rgb(79 70 229 / 0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#e2e8f0';
    e.target.style.boxShadow = 'none';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await authApi.registerHR({
        email: form.email, password: form.password,
        full_name: form.full_name, company_name: form.company_name, position: form.position
      });
      const { access_token, refresh_token, user } = res.data;
      setAuth(user, access_token, refresh_token);
      navigate('/hr/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0f9ff 100%)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/auth/signup"
            className="inline-flex items-center gap-2 text-sm mb-6 transition"
            style={{ color: 'var(--text-muted)' }}>
            ← Back
          </Link>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>🏢</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create HR Account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Set up your company and start hiring smarter</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'white', boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)', border: '1px solid var(--border)' }}>

          {error && (
            <div className="mb-5 p-3 rounded-xl text-sm"
              style={{ background: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <input type="text" value={form.full_name} onChange={update('full_name')}
                placeholder="Sarah Mitchell" required
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Work Email</label>
              <input type="email" value={form.email} onChange={update('email')}
                placeholder="sarah@company.com" required
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
              <input type="text" value={form.company_name} onChange={update('company_name')}
                placeholder="Acme Corp" required
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Your Role / Title</label>
              <input type="text" value={form.position} onChange={update('position')}
                placeholder="Head of Talent"
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input type="password" value={form.password} onChange={update('password')}
                placeholder="Min. 8 characters" required
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={update('confirm')}
                placeholder="Repeat password" required
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))', boxShadow: '0 2px 12px rgb(79 70 229 / 0.3)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                : 'Create HR Account'
              }
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold transition" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
