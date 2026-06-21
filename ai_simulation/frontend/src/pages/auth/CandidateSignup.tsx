import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

const SKILL_OPTIONS = [
  'Python', 'JavaScript', 'React', 'Node.js', 'SQL',
  'Machine Learning', 'Data Analysis', 'TypeScript', 'Java',
  'Docker', 'AWS', 'UI/UX Design', 'Project Management', 'Marketing', 'Finance'
];

const inputCls = "w-full border rounded-xl px-4 py-3 text-sm transition outline-none";
const inputStyle = { background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' };

const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#4f46e5';
  e.target.style.boxShadow = '0 0 0 3px rgb(79 70 229 / 0.12)';
};
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = '#e2e8f0';
  e.target.style.boxShadow = 'none';
};

export const CandidateSignup: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSkill = (s: string) =>
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await authApi.registerCandidate({
        email, password, full_name: fullName, skills
      });
      const { access_token, refresh_token, user } = res.data;
      setAuth(user, access_token, refresh_token);
      navigate('/candidate/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #eff6ff 100%)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/auth/signup"
            className="inline-flex items-center gap-2 text-sm mb-6 transition"
            style={{ color: 'var(--text-muted)' }}>
            ← Back
          </Link>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-border)' }}>🎓</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create Candidate Account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Start your journey with AI-powered internships</p>
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
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Alex Johnson" required
                className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="alex@gmail.com" required
                className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" required
                className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password" required
                className={inputCls} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Your Skills <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSkill(s)}
                    className="text-xs px-3 py-1.5 rounded-full border transition font-medium"
                    style={skills.includes(s)
                      ? { background: 'var(--accent-light)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }
                      : { background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                    }>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Experience Level</label>
              <select value={experience} onChange={e => setExperience(e.target.value)}
                className={inputCls} style={inputStyle}
                onFocus={focusStyle as any} onBlur={blurStyle as any}>
                <option value="">Select experience</option>
                <option value="0-1">0–1 years (Fresher)</option>
                <option value="1-2">1–2 years</option>
                <option value="2-3">2–3 years</option>
                <option value="3+">3+ years</option>
              </select>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, var(--blue), var(--accent))', boxShadow: '0 2px 12px rgb(37 99 235 / 0.3)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                : 'Create Account'
              }
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold transition" style={{ color: 'var(--blue)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
