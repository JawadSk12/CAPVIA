import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { deepEvaluate, DeepEvalResult } from '../services/deepEvaluationService';

// ── Sub-components ─────────────────────────────────────────────────────────────

const GRADE_STYLE: Record<string, string> = {
  'A+': 'text-emerald-400 border-emerald-400 shadow-emerald-400/30',
  'A':  'text-emerald-400 border-emerald-400 shadow-emerald-400/30',
  'B+': 'text-blue-400 border-blue-400 shadow-blue-400/30',
  'B':  'text-blue-400 border-blue-400 shadow-blue-400/30',
  'C':  'text-amber-400 border-amber-400 shadow-amber-400/30',
  'D':  'text-orange-400 border-orange-400 shadow-orange-400/30',
  'F':  'text-red-400 border-red-400 shadow-red-400/30',
};

const TYPE_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  'Deep':      { bg: 'bg-emerald-900/40 border-emerald-500', text: 'text-emerald-300', icon: '🧠' },
  'Adequate':  { bg: 'bg-blue-900/40 border-blue-500',       text: 'text-blue-300',    icon: '✅' },
  'Surface':   { bg: 'bg-amber-900/40 border-amber-500',     text: 'text-amber-300',   icon: '🟡' },
  'Memorized': { bg: 'bg-purple-900/40 border-purple-500',   text: 'text-purple-300',  icon: '📖' },
  'Vague':     { bg: 'bg-orange-900/40 border-orange-500',   text: 'text-orange-300',  icon: '💭' },
  'Empty':     { bg: 'bg-red-900/40 border-red-500',         text: 'text-red-300',     icon: '⬜' },
};

const DIM_ICONS: Record<string, string> = {
  'Technical Correctness':       '⚙️',
  'Depth of Understanding':      '🔬',
  'Logical Reasoning & Depth':   '🧩',
  'Clarity & Structure':         '📐',
  'Communication Quality':       '💬',
  'Confidence & Delivery':       '🎯',
  'Problem Explanation Ability': '📊',
};

function ScoreRing({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const color = score >= 75 ? '#34d399' : score >= 55 ? '#60a5fa' : score >= 35 ? '#fbbf24' : '#f87171';
  const r = size === 'lg' ? 44 : 28;
  const circ = 2 * Math.PI * r;
  const dash = circ - (circ * score) / 100;
  const dim = size === 'lg' ? 112 : 72;

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="rotate-[-90deg]">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={size === 'lg' ? 8 : 6} />
        <circle
          cx={dim / 2} cy={dim / 2} r={r} fill="none"
          stroke={color} strokeWidth={size === 'lg' ? 8 : 6}
          strokeDasharray={circ} strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-extrabold leading-none" style={{ fontSize: size === 'lg' ? 22 : 14, color }}>{score}</div>
        {size === 'lg' && <div className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">/ 100</div>}
      </div>
    </div>
  );
}

function DimensionBar({ dim }: { dim: { name: string; score: number; label: string; detail: string } }) {
  const color = dim.score >= 75 ? 'bg-emerald-500' : dim.score >= 55 ? 'bg-blue-500' : dim.score >= 35 ? 'bg-amber-500' : 'bg-red-500';
  const icon = DIM_ICONS[dim.name] ?? '📌';
  return (
    <div className="group p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-500 transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-slate-200">{dim.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{dim.label}</span>
          <span className={`text-sm font-extrabold ${dim.score >= 70 ? 'text-emerald-400' : dim.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {dim.score}
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden mb-2">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-700`}
          style={{ width: `${dim.score}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{dim.detail}</p>
    </div>
  );
}

// ── Sample Q&A pairs ──────────────────────────────────────────────────────────

const SAMPLES = [
  {
    q: 'Explain what machine learning is and how it differs from traditional programming.',
    a: 'Machine learning is a subset of AI where systems learn patterns from data rather than following explicit rules. In traditional programming, a developer writes specific instructions for every scenario. In machine learning, however, we feed training data and expected outputs to an algorithm, and the model learns the underlying patterns automatically. For example, instead of writing rules to detect spam, we train a classifier on thousands of labeled emails. This means ML is especially powerful for problems where rules are too complex or unknown.',
  },
  {
    q: 'What is overfitting and how do you prevent it?',
    a: 'I think overfitting is when the model is too complex. Maybe you can use regularization. I guess cross-validation also helps. Not really sure about the details.',
  },
  {
    q: 'Describe the difference between supervised and unsupervised learning.',
    a: 'Supervised learning uses labeled data. Unsupervised does not have labels.',
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export const EvaluationLab: React.FC = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DeepEvalResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'dimensions' | 'analysis'>('overview');

  const handleEvaluate = useCallback(() => {
    if (!question.trim() || !answer.trim()) return;
    setIsEvaluating(true);
    setResult(null);
    // Small delay for animation effect
    setTimeout(() => {
      const r = deepEvaluate(question, answer);
      setResult(r);
      setIsEvaluating(false);
      setActiveTab('overview');
    }, 900);
  }, [question, answer]);

  const handleSample = (s: typeof SAMPLES[0]) => {
    setQuestion(s.q);
    setAnswer(s.a);
    setResult(null);
  };

  const gradeStyle = result ? (GRADE_STYLE[result.overallGrade] ?? GRADE_STYLE['F']) : '';
  const typeConf   = result ? (TYPE_STYLE[result.answerType] ?? TYPE_STYLE['Vague']) : null;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #11131f 50%, #0d1117 100%)' }}>
      {/* ── Header ── */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm transition-colors">
              ← Back
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <div>
                <h1 className="text-white font-bold text-base leading-tight">AI Evaluation Lab</h1>
                <p className="text-slate-400 text-xs">7-Dimension Deep NLP Analysis</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
              ⚡ Real-time · Client-side NLP
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Input Panel ── */}
        <div className="space-y-4">
          {/* Sample Presets */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">📂 Load Sample</div>
            <div className="flex flex-col gap-2">
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSample(s)}
                  className="text-left px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-violet-500 hover:bg-slate-700/80 transition-all group"
                >
                  <div className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors leading-snug line-clamp-1">
                    Sample {i + 1}: {s.q.slice(0, 60)}…
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Input */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-2">
              💬 Interview Question
            </label>
            <textarea
              id="eval-question-input"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500
                resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all leading-relaxed"
              rows={4}
              placeholder="Enter the interview question asked to the candidate…"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>

          {/* Answer Input */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-2">
              🎤 Candidate Answer
            </label>
            <textarea
              id="eval-answer-input"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500
                resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all leading-relaxed"
              rows={7}
              placeholder="Paste or type the candidate's verbatim answer here…"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
            />
            {answer.trim() && (
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span>{answer.trim().split(/\s+/).length} words</span>
                <span>·</span>
                <span>{answer.trim().split(/[.!?]+/).filter(Boolean).length} sentences</span>
              </div>
            )}
          </div>

          {/* Evaluate Button */}
          <button
            id="btn-run-evaluation"
            onClick={handleEvaluate}
            disabled={!question.trim() || !answer.trim() || isEvaluating}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 relative overflow-hidden
              disabled:opacity-40 disabled:cursor-not-allowed
              enabled:bg-gradient-to-r enabled:from-violet-600 enabled:via-purple-600 enabled:to-blue-600
              enabled:hover:from-violet-500 enabled:hover:via-purple-500 enabled:hover:to-blue-500
              enabled:shadow-lg enabled:hover:shadow-violet-500/25 enabled:text-white"
          >
            {isEvaluating ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Deep Analysis…</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🧠 <span>Run AI Evaluation</span>
              </span>
            )}
          </button>

          {/* Info note */}
          <p className="text-center text-xs text-slate-600">
            Evaluates across 7 expert dimensions · No API required · 100% client-side
          </p>
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <div>
          {!result && !isEvaluating && (
            <div className="h-full flex items-center justify-center bg-slate-900/50 border border-slate-800 rounded-2xl p-10">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-20">🧠</div>
                <p className="text-slate-500 text-sm">Your evaluation report will appear here.</p>
                <p className="text-slate-600 text-xs mt-1">Enter a question and answer, then click Evaluate.</p>
              </div>
            </div>
          )}

          {isEvaluating && (
            <div className="h-full flex items-center justify-center bg-slate-900/50 border border-slate-800 rounded-2xl p-10">
              <div className="text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="w-16 h-16 border-4 border-violet-800 border-t-violet-400 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
                </div>
                <div>
                  <p className="text-white font-bold">Analyzing Response…</p>
                  <p className="text-slate-400 text-xs mt-1">Running 7-dimension NLP pipeline</p>
                </div>
                <div className="flex justify-center gap-1">
                  {['Technical', 'Depth', 'Logic', 'Clarity', 'Comm.', 'Confidence', 'Explanation'].map((l, i) => (
                    <div key={l} className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-[fadeIn_0.4s_ease]">

              {/* Score Header Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  {/* Ring score */}
                  <ScoreRing score={result.overallScore} size="lg" />

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* Grade */}
                      <div className={`text-3xl font-black border-2 rounded-xl px-3 py-1 shadow-lg ${gradeStyle}`}>
                        {result.overallGrade}
                      </div>
                      {/* Answer type */}
                      {typeConf && (
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${typeConf.bg} ${typeConf.text}`}>
                          <span>{typeConf.icon}</span> {result.answerType} Answer
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>📝 {result.wordCount} words</span>
                      <span>·</span>
                      <span>🔑 {result.meaningfulWordCount} meaningful</span>
                      <span>·</span>
                      <span>✅ {result.detectedConcepts.length} concepts hit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Nav */}
              <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
                {(['overview', 'dimensions', 'analysis'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all
                      ${activeTab === tab
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'}`}
                  >
                    {tab === 'overview' ? '📋 Overview' : tab === 'dimensions' ? '📊 Dimensions' : '🔍 Analysis'}
                  </button>
                ))}
              </div>

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="bg-slate-900 border border-violet-800/40 rounded-2xl p-4">
                    <div className="text-xs text-violet-400 uppercase tracking-wide mb-2">🧠 Overall Evaluation</div>
                    <p className="text-sm text-slate-200 leading-relaxed">{result.overallSummary}</p>
                  </div>

                  {/* Radar mini — dimension score chips */}
                  <div className="grid grid-cols-2 gap-2">
                    {result.dimensions.map((d, i) => (
                      <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                        <ScoreRing score={d.score} size="sm" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-300 leading-tight truncate">{d.name}</div>
                          <div className={`text-[10px] mt-0.5 ${d.score >= 70 ? 'text-emerald-400' : d.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {d.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths */}
                  <div className="bg-slate-900 border border-emerald-800/40 rounded-2xl p-4">
                    <div className="text-xs text-emerald-400 uppercase tracking-wide mb-2">💪 Strengths</div>
                    <ul className="space-y-1.5">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                          <span className="leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="bg-slate-900 border border-amber-800/40 rounded-2xl p-4">
                    <div className="text-xs text-amber-400 uppercase tracking-wide mb-2">⚡ Areas for Improvement</div>
                    <ul className="space-y-1.5">
                      {result.areasForImprovement.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                          <span className="leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Concepts */}
                  {(result.detectedConcepts.length > 0 || result.missingConcepts.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {result.detectedConcepts.length > 0 && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                          <div className="text-[10px] text-emerald-400 uppercase tracking-wide mb-2">✅ Concepts Covered</div>
                          <div className="flex flex-wrap gap-1">
                            {result.detectedConcepts.slice(0, 8).map(c => (
                              <span key={c} className="text-[10px] bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.missingConcepts.length > 0 && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                          <div className="text-[10px] text-red-400 uppercase tracking-wide mb-2">❌ Missing Concepts</div>
                          <div className="flex flex-wrap gap-1">
                            {result.missingConcepts.slice(0, 8).map(c => (
                              <span key={c} className="text-[10px] bg-red-900/40 text-red-300 border border-red-700/50 px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── DIMENSIONS TAB ── */}
              {activeTab === 'dimensions' && (
                <div className="space-y-2">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 mb-1">
                    <p className="text-xs text-slate-500">Weighted scoring — Technical (25%) · Depth (20%) · Logic (18%) · Clarity (12%) · Communication (10%) · Confidence (8%) · Explanation (7%)</p>
                  </div>
                  {result.dimensions.map((d, i) => (
                    <DimensionBar key={i} dim={d} />
                  ))}
                </div>
              )}

              {/* ── ANALYSIS TAB ── */}
              {activeTab === 'analysis' && (
                <div className="space-y-3">
                  {[
                    { title: '⚙️ Technical Understanding', content: result.technicalUnderstanding, border: 'border-blue-800/40', head: 'text-blue-400' },
                    { title: '🧩 Logical Thinking & Depth', content: result.logicalThinking, border: 'border-purple-800/40', head: 'text-purple-400' },
                    { title: '💬 Communication & Clarity', content: result.communicationClarity, border: 'border-teal-800/40', head: 'text-teal-400' },
                    { title: '🎯 Confidence & Delivery', content: result.confidenceDelivery, border: 'border-amber-800/40', head: 'text-amber-400' },
                  ].map(({ title, content, border, head }) => (
                    <div key={title} className={`bg-slate-900 border ${border} rounded-2xl p-4`}>
                      <div className={`text-xs ${head} uppercase tracking-wide mb-2`}>{title}</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{content}</p>
                    </div>
                  ))}

                  {/* Meta stats */}
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">📈 Answer Statistics</div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: 'Total Words', value: result.wordCount },
                        { label: 'Meaningful', value: result.meaningfulWordCount },
                        { label: 'Concepts Hit', value: result.detectedConcepts.length },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-800 rounded-xl p-3">
                          <div className="text-xl font-extrabold text-white">{value}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default EvaluationLab;
