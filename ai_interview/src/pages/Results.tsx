import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { loadAnswers, evaluateAll, EvaluationReport, QuestionEvalResult } from '../services/speechEvaluationService';

interface DetectionData {
  videoRecording: string;
  detectionData: {
    eyeGaze: any;
    headPose: any;
    faceValidity: any;
    maskDetection: any;
    phoneDetection: any;
    overall: any;
  };
}

const VERDICT_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  'Correct':           { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300', icon: '✅' },
  'Partially Correct': { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-300',     icon: '🟡' },
  'Incorrect':         { color: 'text-red-700',     bg: 'bg-red-50 border-red-300',         icon: '❌' },
  'No Answer':         { color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-300',     icon: '⬜' },
};

const DIFF_CONFIG: Record<string, { label: string; cls: string }> = {
  easy:   { label: 'Easy',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  medium: { label: 'Moderate', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  hard:   { label: 'Hard',     cls: 'bg-red-100 text-red-700 border-red-300' },
};

const RECO_CONFIG: Record<string, { cls: string; icon: string }> = {
  'Strong Hire':      { cls: 'bg-emerald-600 text-white', icon: '🌟' },
  'Consider':         { cls: 'bg-blue-600 text-white',    icon: '👍' },
  'Review Required':  { cls: 'bg-amber-500 text-white',   icon: '🔍' },
  'Not Recommended':  { cls: 'bg-red-600 text-white',     icon: '⚠️' },
};

const ScoreBar = ({ value, max = 100 }: { value: number; max?: number }) => {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div className={`${color} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state as DetectionData;
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedQ, setSelectedQ] = useState(0);

  // Load and evaluate answers from sessionStorage
  const evalReport = useMemo<EvaluationReport>(() => {
    const answers = loadAnswers();
    return evaluateAll(answers);
  }, []);

  useEffect(() => {
    if (!data?.videoRecording) return;
    try {
      const base64 = data.videoRecording.includes(',')
        ? data.videoRecording.split(',')[1]
        : data.videoRecording;
      const byteChars = atob(base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Video conversion error:', e);
    }
  }, [data]);

  if (!data || !data.detectionData?.overall) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl text-white mb-4">No Interview Data</h1>
          <p className="text-gray-400 mb-6">Please complete an interview first.</p>
          <button onClick={() => navigate('/interview')}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-semibold">
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  const { detectionData } = data;
  const overall = detectionData.overall ?? {};
  const recoConf = RECO_CONFIG[evalReport.recommendation] ?? RECO_CONFIG['Review Required'];

  const handleDownloadVideo = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `interview-${Date.now()}.webm`;
    a.click();
  };

  const handleDownloadReport = () => {
    const reportData = {
      integrityData: detectionData,
      answerEvaluation: evalReport,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intellirecruit-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-red-500 bg-red-900/20 border-red-500';
      case 'HIGH':     return 'text-orange-500 bg-orange-900/20 border-orange-500';
      case 'MEDIUM':   return 'text-yellow-500 bg-yellow-900/20 border-yellow-500';
      case 'LOW':      return 'text-blue-500 bg-blue-900/20 border-blue-500';
      default:         return 'text-green-500 bg-green-900/20 border-green-500';
    }
  };

  const selectedResult: QuestionEvalResult | undefined = evalReport.questionResults[selectedQ];

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Interview Results</h1>
            <p className="text-gray-400">Comprehensive Analysis · AI Answer Evaluation · Video Recording</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleDownloadReport}
              className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition">
              📄 Full Report
            </button>
            <button onClick={() => navigate('/evaluation')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition">
              🧠 Evaluation Lab
            </button>
            <button onClick={() => navigate('/interview')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition">
              🔄 New Interview
            </button>
          </div>
        </div>

        {/* ── TOP ROW: Combined Score Banner ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Answer Score */}
          <div className="md:col-span-2 bg-gray-800 rounded-2xl border border-gray-700 p-6 flex items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className={`text-5xl font-extrabold mb-1
                ${evalReport.percentage >= 75 ? 'text-emerald-400' :
                  evalReport.percentage >= 55 ? 'text-amber-400' : 'text-red-400'}`}>
                {evalReport.percentage}%
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Answer Score</div>
              <div className="text-xs text-gray-500 mt-1">{evalReport.totalScore}/{evalReport.maxScore} pts</div>
            </div>
            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm mb-3 ${recoConf.cls}`}>
                {recoConf.icon} {evalReport.recommendation}
              </div>
              <ScoreBar value={evalReport.percentage} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {evalReport.strengths.slice(0, 2).map((s, i) => (
                  <div key={i} className="text-xs text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-1.5">
                    ✅ {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Integrity Score */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 text-center">
            <div className={`text-5xl font-extrabold mb-1
              ${overall.integrityScore >= 80 ? 'text-blue-400' :
                overall.integrityScore >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
              {overall.integrityScore}
            </div>
            <div className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Integrity Score</div>
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold border inline-block ${getRiskColor(overall.riskLevel)}`}>
              {overall.riskLevel} RISK
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Cheating Probability: <span className={overall.cheatingProbability > 50 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                {overall.cheatingProbability}%
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Duration: {overall.sessionDuration ? `${Math.floor(overall.sessionDuration/60)}m ${overall.sessionDuration%60}s` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ══ AI ANSWER EVALUATION ══ */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">🧠 AI Answer Evaluation</h2>
                <span className="text-xs text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                  {evalReport.questionResults.length} questions evaluated
                </span>
              </div>

              {evalReport.questionResults.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">🎤</div>
                  <p className="text-gray-400">No spoken answers were captured. Make sure to speak your answers during the interview.</p>
                </div>
              ) : (
                <>
                  {/* Question selector tabs */}
                  <div className="px-6 pt-4 flex flex-wrap gap-2">
                    {evalReport.questionResults.map((r, i) => {
                      const vc = VERDICT_CONFIG[r.verdict];
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedQ(i)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
                            ${selectedQ === i
                              ? 'bg-violet-600 text-white border-violet-500 shadow-lg'
                              : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-violet-500'}`}
                        >
                          {vc.icon} Q{i + 1}
                          <span className={`ml-1.5 text-xs font-bold
                            ${selectedQ === i ? 'text-white/80' :
                              r.score >= 75 ? 'text-emerald-400' : r.score >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                            {r.score}%
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected question detail */}
                  {selectedResult && (
                    <div className="p-6 space-y-4">
                      {/* Question text + difficulty */}
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0
                          ${DIFF_CONFIG[selectedResult.difficulty]?.cls ?? DIFF_CONFIG.easy.cls}`}>
                          {DIFF_CONFIG[selectedResult.difficulty]?.label ?? 'Easy'}
                        </span>
                        <p className="text-white font-medium text-sm leading-relaxed">
                          {selectedResult.questionText}
                        </p>
                      </div>

                      {/* Verdict + Score */}
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm
                          ${VERDICT_CONFIG[selectedResult.verdict]?.bg ?? ''}`}>
                          <span>{VERDICT_CONFIG[selectedResult.verdict]?.icon}</span>
                          <span className={VERDICT_CONFIG[selectedResult.verdict]?.color}>
                            {selectedResult.verdict}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Score</span>
                            <span className="font-bold text-white">{selectedResult.score}/100</span>
                          </div>
                          <ScoreBar value={selectedResult.score} />
                        </div>
                      </div>

                      {/* Transcript */}
                      <div className="bg-gray-900 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Your Answer (Transcript)</div>
                        <p className={`text-sm leading-relaxed
                          ${selectedResult.transcript && selectedResult.transcript.trim()
                            ? 'text-gray-200' : 'text-gray-500 italic'}`}>
                          {selectedResult.transcript && selectedResult.transcript.trim()
                            ? `"${selectedResult.transcript}"`
                            : 'No spoken answer captured'}
                        </p>
                      </div>

                      {/* AI feedback */}
                      <div className="bg-violet-900/20 border border-violet-700 rounded-xl p-4">
                        <div className="text-xs text-violet-400 uppercase tracking-wide mb-2">AI Feedback</div>
                        <p className="text-sm text-gray-300">{selectedResult.feedback}</p>
                      </div>

                      {/* Keywords */}
                      <div className="grid grid-cols-2 gap-4">
                        {selectedResult.keywords.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-500 mb-2">✅ Keywords Used</div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedResult.keywords.map(k => (
                                <span key={k} className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedResult.missingKeywords.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-500 mb-2">💡 Could Have Mentioned</div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedResult.missingKeywords.map(k => (
                                <span key={k} className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full">
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Score overview grid */}
                  <div className="border-t border-gray-700 px-6 py-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">All Questions Overview</div>
                    <div className="grid grid-cols-5 gap-2">
                      {evalReport.questionResults.map((r, i) => {
                        const vc = VERDICT_CONFIG[r.verdict];
                        const dc = DIFF_CONFIG[r.difficulty];
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedQ(i)}
                            className={`rounded-xl p-3 text-center transition-all border
                              ${selectedQ === i ? 'border-violet-500 bg-violet-900/30' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}
                          >
                            <div className="text-lg mb-1">{vc.icon}</div>
                            <div className={`text-xs font-bold mb-0.5
                              ${r.score >= 75 ? 'text-emerald-400' : r.score >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                              {r.score}%
                            </div>
                            <div className={`text-[9px] font-semibold ${dc?.cls ?? ''} px-1 py-0.5 rounded`}>
                              {dc?.label ?? 'Easy'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ══ VIDEO ══ */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Interview Recording</h2>
                {videoUrl && (
                  <button onClick={handleDownloadVideo}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    ⬇️ Download
                  </button>
                )}
              </div>
              {videoUrl ? (
                <video src={videoUrl} controls className="w-full rounded-xl" style={{ maxHeight: 400 }} />
              ) : (
                <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
                  No video recording available
                </div>
              )}
            </div>

            {/* ══ VIOLATIONS ══ */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Detected Violations</h2>
              {(overall.violations ?? []).length === 0 ? (
                <p className="text-emerald-400">✅ No violations detected. Excellent performance!</p>
              ) : (
                <div className="space-y-3">
                  {(overall.violations ?? []).map((v: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-xl border-l-4
                      ${v.severity === 'CRITICAL' ? 'bg-red-900/20 border-red-500' :
                        v.severity === 'HIGH'     ? 'bg-orange-900/20 border-orange-500' :
                        v.severity === 'MEDIUM'   ? 'bg-yellow-900/20 border-yellow-500' :
                        'bg-blue-900/20 border-blue-500'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-semibold text-sm ${
                            v.severity === 'CRITICAL' ? 'text-red-400' :
                            v.severity === 'HIGH'     ? 'text-orange-400' :
                            v.severity === 'MEDIUM'   ? 'text-yellow-400' : 'text-blue-400'
                          }`}>{v.severity}</span>
                          <p className="text-white mt-1 text-sm">{v.message}</p>
                        </div>
                        <span className="text-xs text-gray-400">{v.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="space-y-4">

            {/* Improvements */}
            {evalReport.improvements.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <h3 className="font-bold text-white mb-3">💡 Areas to Improve</h3>
                <ul className="space-y-2">
                  {evalReport.improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-amber-300 bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2">
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Stats */}
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h3 className="font-bold text-white mb-4">Detection Details</h3>
              <div className="space-y-3">
                <div className="bg-gray-900 p-3 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1.5">Eye Gaze</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Focus</span>
                    <span className="text-emerald-400 font-bold">{detectionData.eyeGaze?.focusPercentage ?? 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Look-aways</span>
                    <span className="text-yellow-400 font-bold">{detectionData.eyeGaze?.lookAwayCount ?? 0}</span>
                  </div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1.5">Head Pose</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Stability</span>
                    <span className="text-emerald-400 font-bold">{typeof detectionData.headPose?.stability === 'number' ? detectionData.headPose.stability.toFixed(0) + '%' : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Movements</span>
                    <span className="text-yellow-400 font-bold">{detectionData.headPose?.movementCount ?? 0}</span>
                  </div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1.5">Face Presence</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Visibility</span>
                    <span className="text-emerald-400 font-bold">{detectionData.faceValidity?.visibilityPercentage ?? 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Absences</span>
                    <span className={`font-bold ${(detectionData.faceValidity?.absenceCount ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {detectionData.faceValidity?.absenceCount ?? 0}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1.5">📱 Phone Detection</div>
                  <span className={`text-sm font-bold ${detectionData.phoneDetection?.phoneDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                    {detectionData.phoneDetection?.phoneDetected ? '⚠️ Phone Detected' : '✅ No phone'}
                  </span>
                  {detectionData.phoneDetection?.detectionCount > 0 && (
                    <div className="text-xs text-red-400 mt-1">{detectionData.phoneDetection.detectionCount} detection events</div>
                  )}
                </div>
              </div>
            </div>

            {/* HR Recommendation */}
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h3 className="font-bold text-white mb-3">HR Recommendation</h3>
              <div className={`px-4 py-3 rounded-xl font-bold text-center mb-3 ${recoConf.cls}`}>
                {recoConf.icon} {evalReport.recommendation}
              </div>
              <p className="text-sm text-gray-300">
                {overall.riskLevel === 'CRITICAL' || overall.riskLevel === 'HIGH'
                  ? '⚠️ Manual review required — multiple integrity violations detected.'
                  : overall.riskLevel === 'MEDIUM'
                  ? '⚡ Review recommended — some integrity concerns identified.'
                  : evalReport.percentage >= 70
                  ? '✅ Candidate performed well in both integrity and technical assessment.'
                  : '📋 Candidate showed effort but technical answers need further review.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};