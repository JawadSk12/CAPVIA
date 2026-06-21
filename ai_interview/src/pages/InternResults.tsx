import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionPersistenceService, CompletedSession } from '../services/sessionPersistenceService';
import { AuthService } from '../services/authService';

const RECO_CONFIG: Record<string, { cls: string; icon: string; desc: string }> = {
  'Strong Hire':     { cls: 'ir-reco-strong',  icon: '🌟', desc: 'Outstanding performance!' },
  'Consider':        { cls: 'ir-reco-consider', icon: '👍', desc: 'Good candidate.' },
  'Review Required': { cls: 'ir-reco-review',   icon: '🔍', desc: 'Being reviewed.' },
  'Not Recommended': { cls: 'ir-reco-weak',     icon: '📋', desc: 'Keep improving!' },
};

const ScoreRing = ({ score }: { score: number }) => {
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="ir-score-ring-svg">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
      <text x="70" y="65" textAnchor="middle" fill="white" fontSize="28" fontWeight="800">{score}</text>
      <text x="70" y="85" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">/100</text>
    </svg>
  );
};

const InternResults: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<CompletedSession | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = SessionPersistenceService.getCurrentSession();
    setSession(s);
    setLoaded(true);

    if (s?.videoBase64) {
      try {
        const base64 = s.videoBase64.includes(',') ? s.videoBase64.split(',')[1] : s.videoBase64;
        const bytes = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
        const blob = new Blob([bytes], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Video error:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login', { replace: true });
  };

  if (!loaded) {
    return (
      <div className="ir-loading">
        <div className="ir-spinner" />
        <p>Loading your results…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="ir-no-data">
        <div className="ir-no-data-icon">📋</div>
        <h2>No Interview Data</h2>
        <p>Please complete an interview first.</p>
        <button onClick={() => navigate('/intern')} className="ir-back-btn">← Back to Dashboard</button>
      </div>
    );
  }

  const { evalReport } = session;
  const reco = RECO_CONFIG[evalReport.recommendation] ?? RECO_CONFIG['Review Required'];

  return (
    <div className="ir-root">
      {/* Background */}
      <div className="ir-bg-blob ir-bg-blob-1" />
      <div className="ir-bg-blob ir-bg-blob-2" />

      {/* Nav */}
      <nav className="ir-nav">
        <div className="ir-nav-inner">
          <div className="ir-nav-brand">
            <span className="ir-nav-logo">🎯</span>
            <span className="ir-nav-title">IntelliRecruit</span>
          </div>
          <div className="ir-nav-actions">
            <button onClick={() => navigate('/intern')} className="ir-nav-btn-secondary">
              ← Dashboard
            </button>
            <button onClick={handleLogout} className="ir-nav-btn-logout">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="ir-content">

        {/* Hero header */}
        <div className="ir-hero">
          <div className="ir-hero-left">
            <div className="ir-hero-eyebrow">✅ Interview Complete</div>
            <h1 className="ir-hero-title">Your Results</h1>
            <p className="ir-hero-role">
              {session.internshipRole} · {session.company}
            </p>
            <p className="ir-hero-date">
              {new Date(session.timestamp).toLocaleString('en-IN', {
                dateStyle: 'long', timeStyle: 'short',
              })}
            </p>
          </div>

          {/* Score ring */}
          <div className="ir-score-block">
            <ScoreRing score={evalReport.percentage} />
            <div className="ir-score-label">Overall Score</div>
            <div className={`ir-reco-pill ${reco.cls}`}>
              {reco.icon} {evalReport.recommendation}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="ir-grid">

          {/* Left col */}
          <div className="ir-col-main">

            {/* Video */}
            <div className="ir-card">
              <h2 className="ir-card-title">🎬 Your Interview Recording</h2>
              {videoUrl ? (
                <video src={videoUrl} controls className="ir-video" />
              ) : (
                <div className="ir-no-video">No video recording available</div>
              )}
            </div>

            {/* Summary message */}
            <div className="ir-card ir-summary-card">
              <h2 className="ir-card-title">💬 Thank You!</h2>
              <p className="ir-summary-text">
                Great job completing the AI interview for <strong>{session.internshipRole}</strong> at{' '}
                <strong>{session.company}</strong>. Your responses have been recorded and will be
                reviewed by the HR team. You'll be contacted regarding the next steps.
              </p>
              <div className="ir-summary-note">
                🔒 Your interview data is securely stored and only visible to the hiring team.
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="ir-col-side">

            {/* Score summary */}
            <div className="ir-card">
              <h3 className="ir-card-title">📊 Score Summary</h3>
              <div className="ir-score-items">
                <div className="ir-score-row">
                  <span>Overall Score</span>
                  <span className="ir-score-val">{evalReport.percentage}/100</span>
                </div>
                <div className="ir-score-row">
                  <span>Questions Answered</span>
                  <span className="ir-score-val">{evalReport.questionResults.length}</span>
                </div>
                <div className="ir-score-row">
                  <span>Correct Answers</span>
                  <span className="ir-score-val ir-score-green">
                    {evalReport.questionResults.filter(q => q.verdict === 'Correct').length}
                  </span>
                </div>
                <div className="ir-score-row">
                  <span>Partial Answers</span>
                  <span className="ir-score-val ir-score-amber">
                    {evalReport.questionResults.filter(q => q.verdict === 'Partially Correct').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {evalReport.strengths.length > 0 && (
              <div className="ir-card">
                <h3 className="ir-card-title">✨ Your Strengths</h3>
                <ul className="ir-list">
                  {evalReport.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="ir-list-item ir-list-strength">
                      <span className="ir-list-dot">✅</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {evalReport.improvements.length > 0 && (
              <div className="ir-card">
                <h3 className="ir-card-title">💡 Areas to Grow</h3>
                <ul className="ir-list">
                  {evalReport.improvements.slice(0, 3).map((imp, i) => (
                    <li key={i} className="ir-list-item ir-list-improve">
                      <span className="ir-list-dot">→</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div className={`ir-card ir-reco-card ${reco.cls}`}>
              <h3 className="ir-card-title">🏷️ Recommendation</h3>
              <div className="ir-reco-big-pill">
                {reco.icon} {evalReport.recommendation}
              </div>
              <p className="ir-reco-desc">{reco.desc}</p>
            </div>

          </div>
        </div>

        {/* Back button */}
        <div className="ir-footer-actions">
          <button onClick={() => navigate('/intern')} className="ir-back-btn">
            ← Back to Internship Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default InternResults;
