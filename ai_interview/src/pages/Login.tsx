import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);
  const [showPass, setShowPass] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    const s = AuthService.getSession();
    if (s) navigate(s.role === 'hr' ? '/hr' : '/intern', { replace: true });
  }, [navigate]);

  const detectedRole = (() => {
    const u = username.trim().toLowerCase();
    if (u === 'intern') return 'intern';
    if (u === 'hr')     return 'hr';
    return null;
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600)); // slight delay for UX
    const session = AuthService.login(username, password);
    setLoading(false);
    if (!session) {
      setError('Invalid username or password. Try: intern/intern123 or hr/hr123');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    navigate(session.role === 'hr' ? '/hr' : '/intern', { replace: true });
  };

  return (
    <div className="login-root">
      {/* Animated gradient blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className={`login-card ${shake ? 'login-shake' : ''}`}>
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">🎯</div>
          <h1 className="login-title">IntelliRecruit</h1>
          <p className="login-subtitle">AI-Powered Interview Platform</p>
        </div>

        {/* Role pill */}
        {detectedRole && (
          <div className={`login-role-pill ${detectedRole === 'hr' ? 'login-role-hr' : 'login-role-intern'}`}>
            {detectedRole === 'hr' ? '👔 HR Manager Portal' : '🎓 Intern Portal'}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          {/* Username */}
          <div className="login-field">
            <label className="login-label">Username</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">👤</span>
              <input
                id="login-username"
                type="text"
                className="login-input"
                placeholder="intern  or  hr"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-show-pass"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className="login-error">⚠️ {error}</div>}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading || !username || !password}
            className="login-btn"
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>{detectedRole === 'hr' ? 'Enter HR Dashboard' : 'Enter Intern Portal'}</span>
                <span className="login-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Hint */}
        <div className="login-hint">
          <div className="login-hint-row">
            <span className="login-hint-badge intern">Intern</span>
            <span className="login-hint-cred">intern / intern123</span>
          </div>
          <div className="login-hint-row">
            <span className="login-hint-badge hr">HR</span>
            <span className="login-hint-cred">hr / hr123</span>
          </div>
        </div>

        <p className="login-footer">🔒 Secure · AI-Proctored · Fair</p>
      </div>
    </div>
  );
};

export default Login;
