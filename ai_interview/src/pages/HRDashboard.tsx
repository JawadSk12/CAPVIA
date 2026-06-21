import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { SessionPersistenceService, CompletedSession } from '../services/sessionPersistenceService';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const riskColor = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return 'hr-risk-critical';
    case 'HIGH':     return 'hr-risk-high';
    case 'MEDIUM':   return 'hr-risk-medium';
    default:         return 'hr-risk-low';
  }
};

const recoColor = (r: string) => {
  switch (r) {
    case 'Strong Hire':     return 'hr-badge-strong';
    case 'Consider':        return 'hr-badge-consider';
    case 'Review Required': return 'hr-badge-review';
    default:                return 'hr-badge-weak';
  }
};

const ScoreBar = ({ value, color = '#8b5cf6' }: { value: number; color?: string }) => (
  <div className="hr-score-bar-wrap">
    <div className="hr-score-bar-track">
      <div className="hr-score-bar-fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
    <span className="hr-score-bar-val">{value}</span>
  </div>
);

const DimColor = (score: number) =>
  score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// ─── Detail Panel ────────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{ session: CompletedSession; onClose: () => void }> = ({ session, onClose }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'eval'|'deep'|'cheat'>('eval');
  const [selectedQ, setSelectedQ] = useState(0);
  const { evalReport, detectionData, deepEvalResults, localViolations } = session;
  const overall = detectionData.overall;

  useEffect(() => {
    if (!session.videoBase64) return;
    try {
      const b64 = session.videoBase64.includes(',') ? session.videoBase64.split(',')[1] : session.videoBase64;
      const bytes = new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
      const blob = new Blob([bytes], { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch { /* no video */ }
  }, [session]);

  const handleDownloadReport = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `report-${session.candidateName}-${Date.now()}.json`; a.click();
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a'); a.href = videoUrl;
    a.download = `interview-${session.candidateName}-${Date.now()}.webm`; a.click();
  };

  const VERDICT_ICON: Record<string, string> = {
    'Correct': '✅', 'Partially Correct': '🟡', 'Incorrect': '❌', 'No Answer': '⬜',
  };

  const selQ = evalReport.questionResults[selectedQ];
  const selDeep = deepEvalResults[selectedQ];

  return (
    <div className="hr-detail-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hr-detail-panel">

        {/* Panel Header */}
        <div className="hr-detail-header">
          <div>
            <h2 className="hr-detail-name">{session.candidateName}</h2>
            <p className="hr-detail-meta">{session.internshipRole} · {session.company} · {formatDate(session.timestamp)}</p>
          </div>
          <div className="hr-detail-header-actions">
            <button onClick={handleDownloadReport} className="hr-dl-btn">📄 Report</button>
            {videoUrl && <button onClick={handleDownloadVideo} className="hr-dl-btn">⬇️ Video</button>}
            <button onClick={onClose} className="hr-close-btn">✕</button>
          </div>
        </div>

        {/* Score Banner */}
        <div className="hr-score-banner">
          <div className="hr-score-banner-item">
            <div className={`hr-big-score ${evalReport.percentage >= 75 ? 'hr-score-green' : evalReport.percentage >= 55 ? 'hr-score-amber' : 'hr-score-red'}`}>
              {evalReport.percentage}
            </div>
            <div className="hr-big-label">Answer Score</div>
            <div className={`hr-reco-badge ${recoColor(evalReport.recommendation)}`}>
              {evalReport.recommendation}
            </div>
          </div>
          <div className="hr-score-banner-item">
            <div className={`hr-big-score ${overall.integrityScore >= 80 ? 'hr-score-green' : overall.integrityScore >= 55 ? 'hr-score-amber' : 'hr-score-red'}`}>
              {overall.integrityScore}
            </div>
            <div className="hr-big-label">Integrity Score</div>
            <div className={`hr-risk-badge ${riskColor(overall.riskLevel)}`}>
              {overall.riskLevel} RISK
            </div>
          </div>
          <div className="hr-score-banner-item">
            <div className={`hr-big-score ${overall.cheatingProbability <= 30 ? 'hr-score-green' : overall.cheatingProbability <= 60 ? 'hr-score-amber' : 'hr-score-red'}`}>
              {overall.cheatingProbability}%
            </div>
            <div className="hr-big-label">Cheat Probability</div>
          </div>
          <div className="hr-score-banner-item">
            <div className="hr-big-score hr-score-neutral">
              {Math.floor(overall.sessionDuration / 60)}m {overall.sessionDuration % 60}s
            </div>
            <div className="hr-big-label">Duration</div>
          </div>
        </div>

        {/* Video */}
        <div className="hr-video-section">
          {videoUrl
            ? <video src={videoUrl} controls className="hr-video" />
            : <div className="hr-no-video">No video recording available</div>}
        </div>

        {/* Tabs */}
        <div className="hr-tabs">
          {(['eval','deep','cheat'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`hr-tab ${activeTab === t ? 'hr-tab-active' : ''}`}>
              {t === 'eval' ? '📊 AI Evaluation' : t === 'deep' ? '🧠 Deep Analysis' : '🛡️ Cheating Report'}
            </button>
          ))}
        </div>

        {/* ── Tab: AI Evaluation ── */}
        {activeTab === 'eval' && (
          <div className="hr-tab-content">
            {/* Question selector */}
            <div className="hr-q-tabs">
              {evalReport.questionResults.map((q, i) => (
                <button key={i} onClick={() => setSelectedQ(i)}
                  className={`hr-q-tab ${selectedQ === i ? 'hr-q-tab-active' : ''}`}>
                  {VERDICT_ICON[q.verdict]} Q{i+1}
                  <span className={`hr-q-score ${q.score >= 70 ? 'text-emerald-400' : q.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {q.score}%
                  </span>
                </button>
              ))}
            </div>

            {selQ && (
              <div className="hr-q-detail">
                {/* Question */}
                <div className="hr-q-text">
                  <span className={`hr-diff-badge ${selQ.difficulty === 'hard' ? 'diff-hard' : selQ.difficulty === 'medium' ? 'diff-med' : 'diff-easy'}`}>
                    {selQ.difficulty}
                  </span>
                  <p>{selQ.questionText}</p>
                </div>
                {/* Verdict + score */}
                <div className="hr-verdict-row">
                  <span className="hr-verdict">{VERDICT_ICON[selQ.verdict]} {selQ.verdict}</span>
                  <ScoreBar value={selQ.score} />
                </div>
                {/* Transcript */}
                <div className="hr-transcript">
                  <div className="hr-section-label">Transcript</div>
                  <p>{selQ.transcript || <em>No spoken answer captured</em>}</p>
                </div>
                {/* Feedback */}
                <div className="hr-feedback">
                  <div className="hr-section-label">AI Feedback</div>
                  <p>{selQ.feedback}</p>
                </div>
                {/* Keywords */}
                <div className="hr-keywords-row">
                  {selQ.keywords.length > 0 && (
                    <div>
                      <div className="hr-section-label">✅ Keywords Used</div>
                      <div className="hr-kw-chips">
                        {selQ.keywords.map(k => <span key={k} className="hr-kw-found">{k}</span>)}
                      </div>
                    </div>
                  )}
                  {selQ.missingKeywords.length > 0 && (
                    <div>
                      <div className="hr-section-label">💡 Missing Keywords</div>
                      <div className="hr-kw-chips">
                        {selQ.missingKeywords.map(k => <span key={k} className="hr-kw-miss">{k}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="hr-si-grid">
              <div className="hr-si-card hr-si-strength">
                <h4>✅ Strengths</h4>
                <ul>{evalReport.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="hr-si-card hr-si-improve">
                <h4>💡 Areas for Improvement</h4>
                <ul>{evalReport.improvements.map((s,i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Deep Analysis ── */}
        {activeTab === 'deep' && (
          <div className="hr-tab-content">
            {/* Q selector */}
            <div className="hr-q-tabs">
              {deepEvalResults.map((d, i) => (
                <button key={i} onClick={() => setSelectedQ(i)}
                  className={`hr-q-tab ${selectedQ === i ? 'hr-q-tab-active' : ''}`}>
                  Q{i+1} <span className="hr-q-score" style={{ color: DimColor(d.overallScore) }}>{d.overallScore}</span>
                </button>
              ))}
            </div>

            {selDeep && (
              <div className="hr-deep-detail">
                {/* Overall summary */}
                <div className="hr-deep-summary">
                  <div className="hr-deep-grade">{selDeep.overallGrade}</div>
                  <div className="hr-deep-score">{selDeep.overallScore}/100</div>
                  <div className="hr-deep-type">{selDeep.answerType}</div>
                </div>
                <div className="hr-deep-para">
                  <div className="hr-section-label">Overall Evaluation</div>
                  <p>{selDeep.overallSummary}</p>
                </div>

                {/* 7 Dimensions */}
                <div className="hr-dims-grid">
                  {selDeep.dimensions.map(dim => (
                    <div key={dim.name} className="hr-dim-card">
                      <div className="hr-dim-header">
                        <span className="hr-dim-name">{dim.name}</span>
                        <span className="hr-dim-label" style={{ color: DimColor(dim.score) }}>{dim.label}</span>
                      </div>
                      <ScoreBar value={dim.score} color={DimColor(dim.score)} />
                      <p className="hr-dim-detail">{dim.detail}</p>
                    </div>
                  ))}
                </div>

                {/* Paragraph analyses */}
                <div className="hr-para-analyses">
                  {[
                    { label: '🔧 Technical Understanding',    text: selDeep.technicalUnderstanding },
                    { label: '🧩 Logical Thinking & Depth',   text: selDeep.logicalThinking },
                    { label: '💬 Communication & Clarity',    text: selDeep.communicationClarity },
                    { label: '💪 Confidence & Delivery',      text: selDeep.confidenceDelivery },
                  ].map(({ label, text }) => (
                    <div key={label} className="hr-para-item">
                      <div className="hr-section-label">{label}</div>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>

                {/* Strengths & Improvements */}
                <div className="hr-si-grid">
                  <div className="hr-si-card hr-si-strength">
                    <h4>✅ Strengths</h4>
                    <ul>{selDeep.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div className="hr-si-card hr-si-improve">
                    <h4>💡 Areas for Improvement</h4>
                    <ul>{selDeep.areasForImprovement.map((s,i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Cheating Report ── */}
        {activeTab === 'cheat' && (
          <div className="hr-tab-content">
            {/* Risk banner */}
            <div className={`hr-risk-banner ${riskColor(overall.riskLevel)}`}>
              <span className="hr-risk-big">{overall.riskLevel} RISK</span>
              <span>Integrity: {overall.integrityScore}/100 · Cheating Probability: {overall.cheatingProbability}%</span>
            </div>

            {/* Detection stats */}
            <div className="hr-cheat-stats">
              {[
                { label: '👁️ Focus %',        val: `${detectionData.eyeGaze.focusPercentage}%` },
                { label: '👀 Look-aways',      val: detectionData.eyeGaze.lookAwayCount },
                { label: '🏠 Head Stability',  val: `${detectionData.headPose.stability.toFixed(0)}%` },
                { label: '🔄 Head Movements',  val: detectionData.headPose.movementCount },
                { label: '👤 Face Absences',   val: detectionData.faceValidity.absenceCount },
                { label: '👥 Multi-face',      val: detectionData.faceValidity.occlusionCount },
                { label: '📱 Phone Events',    val: detectionData.phoneDetection.detectionCount },
                { label: '🔀 Tab Switches',    val: localViolations.tabSwitches },
                { label: '📋 Copy/Paste',      val: localViolations.copyPastes },
                { label: '⌨️ Suspicious Keys', val: localViolations.suspiciousKeys },
              ].map(({ label, val }) => (
                <div key={label} className="hr-cheat-stat-card">
                  <div className="hr-cheat-stat-label">{label}</div>
                  <div className="hr-cheat-stat-val">{val}</div>
                </div>
              ))}
            </div>

            {/* Violations list */}
            <div className="hr-violations">
              <div className="hr-section-label">Detected Violations</div>
              {overall.violations.length === 0 ? (
                <p className="hr-no-violations">✅ No violations detected — clean session</p>
              ) : (
                <div className="hr-violation-list">
                  {overall.violations.map((v, i) => (
                    <div key={i} className={`hr-violation-item hr-viol-${v.severity.toLowerCase()}`}>
                      <div className="hr-viol-header">
                        <span className="hr-viol-type">{v.type.replace(/_/g, ' ')}</span>
                        <span className="hr-viol-sev">{v.severity}</span>
                      </div>
                      <p className="hr-viol-msg">{v.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Candidate Card ──────────────────────────────────────────────────────────────

const CandidateCard: React.FC<{ session: CompletedSession; onClick: () => void }> = ({ session, onClick }) => {
  const { evalReport, detectionData } = session;
  return (
    <div className="hr-candidate-card" onClick={onClick}>
      <div className="hr-cand-top">
        <div className="hr-cand-avatar">{session.candidateName.charAt(0).toUpperCase()}</div>
        <div>
          <div className="hr-cand-name">{session.candidateName}</div>
          <div className="hr-cand-role">{session.internshipRole} · {session.company}</div>
        </div>
        <div className="hr-cand-date">{formatDate(session.timestamp)}</div>
      </div>
      <div className="hr-cand-scores">
        <div className="hr-cand-score-item">
          <span className="hr-cand-score-lbl">Score</span>
          <span className={`hr-cand-score-val ${evalReport.percentage >= 75 ? 'text-emerald-400' : evalReport.percentage >= 55 ? 'text-amber-400' : 'text-red-400'}`}>
            {evalReport.percentage}%
          </span>
        </div>
        <div className="hr-cand-score-item">
          <span className="hr-cand-score-lbl">Integrity</span>
          <span className={`hr-cand-score-val ${detectionData.overall.integrityScore >= 80 ? 'text-emerald-400' : detectionData.overall.integrityScore >= 55 ? 'text-amber-400' : 'text-red-400'}`}>
            {detectionData.overall.integrityScore}
          </span>
        </div>
        <div className="hr-cand-score-item">
          <span className="hr-cand-score-lbl">Risk</span>
          <span className={`hr-cand-score-val ${riskColor(detectionData.overall.riskLevel)}-text`}>{detectionData.overall.riskLevel}</span>
        </div>
      </div>
      <div className="hr-cand-bottom">
        <span className={`hr-reco-badge ${recoColor(evalReport.recommendation)}`}>{evalReport.recommendation}</span>
        <span className="hr-cand-arrow">View Full Report →</span>
      </div>
    </div>
  );
};

// ─── HR Dashboard ────────────────────────────────────────────────────────────────

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [selected, setSelected] = useState<CompletedSession | null>(null);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');

  const session = AuthService.getSession();

  useEffect(() => {
    setSessions(SessionPersistenceService.loadAllSessions().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login', { replace: true });
  };

  const handleClearAll = () => {
    if (window.confirm('Delete ALL candidate sessions? This cannot be undone.')) {
      SessionPersistenceService.clearAllSessions();
      setSessions([]);
    }
  };

  const filtered = useMemo(() => sessions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.candidateName.toLowerCase().includes(q) ||
      s.internshipRole.toLowerCase().includes(q) || s.company.toLowerCase().includes(q);
    const matchRisk = filterRisk === 'All' || s.detectionData.overall.riskLevel === filterRisk;
    return matchSearch && matchRisk;
  }), [sessions, search, filterRisk]);

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.evalReport.percentage, 0) / sessions.length)
    : 0;
  const flagged = sessions.filter(s => ['HIGH', 'CRITICAL'].includes(s.detectionData.overall.riskLevel)).length;
  const strongHires = sessions.filter(s => s.evalReport.recommendation === 'Strong Hire').length;

  return (
    <div className="hr-root">
      {/* Blobs */}
      <div className="hr-blob hr-blob-1" />
      <div className="hr-blob hr-blob-2" />

      {/* Nav */}
      <nav className="hr-nav">
        <div className="hr-nav-inner">
          <div className="hr-nav-brand">
            <span className="hr-nav-logo">🎯</span>
            <span className="hr-nav-title">IntelliRecruit</span>
            <span className="hr-nav-tag">HR Portal</span>
          </div>
          <div className="hr-nav-right">
            <span className="hr-nav-user">👔 {session?.name ?? 'HR Manager'}</span>
            <button onClick={handleLogout} className="hr-logout-btn" id="hr-logout">Logout</button>
          </div>
        </div>
      </nav>

      <div className="hr-main">

        {/* Page header */}
        <div className="hr-page-header">
          <div>
            <h1 className="hr-page-title">Candidate Review Dashboard</h1>
            <p className="hr-page-sub">Review AI interview results, cheating analysis, and candidate evaluations</p>
          </div>
          {sessions.length > 0 && (
            <button onClick={handleClearAll} className="hr-clear-btn">🗑️ Clear All Sessions</button>
          )}
        </div>

        {/* Stats */}
        <div className="hr-stats-row">
          {[
            { label: 'Total Candidates', val: sessions.length, icon: '👥', cls: 'hr-stat-blue' },
            { label: 'Avg Score',        val: `${avgScore}%`,  icon: '📊', cls: 'hr-stat-purple' },
            { label: 'Strong Hires',     val: strongHires,     icon: '🌟', cls: 'hr-stat-green' },
            { label: 'Flagged (Risk)',    val: flagged,         icon: '⚠️', cls: flagged > 0 ? 'hr-stat-red' : 'hr-stat-green' },
          ].map(({ label, val, icon, cls }) => (
            <div key={label} className={`hr-stat-card ${cls}`}>
              <div className="hr-stat-icon">{icon}</div>
              <div className="hr-stat-val">{val}</div>
              <div className="hr-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="hr-filter-bar">
          <div className="hr-search-wrap">
            <span className="hr-search-icon">🔍</span>
            <input
              className="hr-search-input"
              placeholder="Search by name, role, or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="hr-search"
            />
          </div>
          <div className="hr-risk-filters">
            {['All','LOW','MEDIUM','HIGH','CRITICAL'].map(r => (
              <button key={r} onClick={() => setFilterRisk(r)}
                className={`hr-risk-filter-btn ${filterRisk === r ? 'hr-risk-filter-active' : ''}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates */}
        {sessions.length === 0 ? (
          <div className="hr-empty">
            <div className="hr-empty-icon">📭</div>
            <h2>No Candidates Yet</h2>
            <p>Interview results will appear here after interns complete their AI interviews.</p>
            <div className="hr-empty-hint">
              <strong>Intern credentials:</strong> intern / intern123
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="hr-empty">
            <div className="hr-empty-icon">🔭</div>
            <h2>No results match your filter</h2>
            <button className="hr-clear-filter-btn" onClick={() => { setSearch(''); setFilterRisk('All'); }}>Clear Filters</button>
          </div>
        ) : (
          <div className="hr-candidates-grid">
            {filtered.map(s => (
              <CandidateCard key={s.id} session={s} onClick={() => setSelected(s)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && <DetailPanel session={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default HRDashboard;
