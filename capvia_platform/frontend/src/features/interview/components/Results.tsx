import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { loadAnswers, evaluateAll, EvaluationReport, QuestionEvalResult } from '../services/speechEvaluationService';
import { SessionPersistenceService } from '../services/sessionPersistenceService';
import { applicationApi, recruitmentApi } from '../../../services/api';
import { 
  FileText, Brain, ShieldAlert, Award, Video, Download, RefreshCw, 
  ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, ArrowUpRight,
  TrendingUp, Activity, Check, HelpCircle, Loader2
} from 'lucide-react';
import clsx from 'clsx';

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
  'Correct':           { color: 'text-[#10B981]', bg: 'bg-[#10B981]/10 border-[#10B981]/20', icon: '✅' },
  'Partially Correct': { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20', icon: '🟡' },
  'Incorrect':         { color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20', icon: '❌' },
  'No Answer':         { color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-150',          icon: '⬜' },
};

const DIFF_CONFIG: Record<string, { label: string; cls: string }> = {
  easy:   { label: 'Easy',     cls: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/25' },
  medium: { label: 'Moderate', cls: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25' },
  hard:   { label: 'Hard',     cls: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25' },
};

const RECO_CONFIG: Record<string, { cls: string; icon: string }> = {
  'Strong Hire':      { cls: 'bg-[#10B981] text-white shadow-sm', icon: '🌟' },
  'Consider':         { cls: 'bg-[#0D47A1] text-white shadow-sm', icon: '👍' },
  'Review Required':  { cls: 'bg-[#F59E0B] text-white shadow-sm', icon: '🔍' },
  'Not Recommended':  { cls: 'bg-[#EF4444] text-white shadow-sm', icon: '⚠️' },
};

const ScoreBar = ({ value, max = 100 }: { value: number; max?: number }) => {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 75 ? 'bg-[#10B981]' : pct >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100">
      <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const Results: React.FC = () => {
  const router = useRouter();
  const currentSession = typeof window !== 'undefined' ? SessionPersistenceService.getCurrentSession() : null;
  const data = (currentSession ? {
    videoRecording: currentSession.videoBase64 || '',
    detectionData: currentSession.detectionData
  } : null) as DetectionData | null;
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedQ, setSelectedQ] = useState(0);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  // Load and evaluate answers from sessionStorage
  const evalReport = useMemo<EvaluationReport>(() => {
    const answers = loadAnswers();
    return evaluateAll(answers);
  }, []);

  useEffect(() => {
    const autoSubmit = async () => {
      setSubmitStatus('submitting');
      try {
        const appsRes = await applicationApi.getMyApplications();
        const apps = (appsRes as any)?.items || (appsRes as any)?.data || appsRes || [];
        
        // Find application in interview stage
        const interviewApp = apps.find((a: any) => 
          ['interview_invited', 'interview_in_progress'].includes(a.status)
        );

        if (interviewApp) {
          await recruitmentApi.triggerWebhook(interviewApp.id, 'INTERVIEW_EVALUATED');
          setSubmitStatus('done');
        } else {
          setSubmitStatus('done');
        }
      } catch (err) {
        console.error('Error submitting interview telemetry:', err);
        setSubmitStatus('error');
      }
    };

    autoSubmit();
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
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans text-slate-800">
        <div className="text-5xl mb-4 bg-slate-100 p-5 rounded-full">📋</div>
        <h2 className="text-xl font-bold text-slate-800">No Assessment Data Found</h2>
        <p className="text-slate-400 text-sm max-w-sm mt-1 mb-6 leading-relaxed">
          Please complete your AI proctored webcam interview first to review evaluations.
        </p>
        <button 
          onClick={() => router.push('/candidate/interview')}
          className="bg-[#0D47A1] hover:bg-[#0b3c8a] text-white px-6 py-3 rounded-xl font-bold text-xs shadow-sm transition"
        >
          Start AI Interview
        </button>
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
      case 'CRITICAL': return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20';
      case 'HIGH':     return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20';
      case 'MEDIUM':   return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20';
      case 'LOW':      return 'text-[#0D47A1] bg-[#0D47A1]/10 border-[#0D47A1]/20';
      default:         return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20';
    }
  };

  const selectedResult: QuestionEvalResult | undefined = evalReport.questionResults[selectedQ];

  return (
    <div className="font-sans text-slate-800 space-y-6">

      {/* Action Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-outfit tracking-tight flex items-center gap-2">
            <Award className="h-5 w-5 text-[#0D47A1]" />
            Interview Evaluation Lab
          </h2>
          <p className="text-xs text-slate-450 mt-1">Review speech transcripts, cheat probability, and verified capability matrices.</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button 
            onClick={handleDownloadReport}
            className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs transition shadow-sm"
          >
            📄 Export Report
          </button>
          <button 
            onClick={() => router.push('/candidate/interview')}
            className="bg-[#0D47A1] hover:bg-[#0b3c8a] text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-sm"
          >
            🔄 New Session
          </button>
        </div>
      </div>

      {/* Telemetry Submission Status Banner */}
      {submitStatus === 'submitting' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-[#0D47A1] font-bold">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Submitting interview telemetry & generating DNA Profile...</span>
        </div>
      )}
      {submitStatus === 'done' && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-xs text-emerald-700 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>DNA Profile Generated Successfully! Your application is fully submitted.</span>
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Interview complete. Telemetry could not be auto-submitted. Please return to your dashboard.</span>
        </div>
      )}

      {/* Score Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Technical Score Ring */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="text-center shrink-0">
            <div className={clsx(
              "w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 shadow-sm",
              evalReport.percentage >= 75 ? 'border-emerald-200 text-emerald-600 bg-emerald-50/20' :
              evalReport.percentage >= 50 ? 'border-amber-200 text-amber-600 bg-amber-50/20' : 'border-rose-200 text-rose-600 bg-rose-50/20'
            )}>
              <span className="text-3xl font-black leading-none">{evalReport.percentage}%</span>
              <span className="text-[10px] font-bold text-slate-400 mt-1">Answer Score</span>
            </div>
            <p className="text-2xs text-slate-400 mt-2 font-bold">{evalReport.totalScore} / {evalReport.maxScore} points</p>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Status:</span>
              <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", recoConf.cls)}>
                {recoConf.icon} {evalReport.recommendation}
              </span>
            </div>
            <ScoreBar value={evalReport.percentage} />
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              {evalReport.strengths.slice(0, 2).map((s, i) => (
                <div key={i} className="text-2xs text-emerald-700 bg-emerald-50 border border-emerald-100/50 rounded-lg px-2.5 py-1.5 font-bold">
                  ✓ {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Integrity Risk Summary */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proctor Integrity</span>
            <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", getRiskColor(overall.riskLevel))}>
              {overall.riskLevel} RISK
            </span>
          </div>
          
          <div className="my-4">
            <h4 className="text-3xl font-bold tracking-tight text-slate-800 font-outfit">
              {overall.integrityScore} <span className="text-sm font-medium text-slate-450">/ 100</span>
            </h4>
            <p className="text-2xs text-slate-400 mt-1 font-bold">
              Cheating Probability Index: <span className={overall.cheatingProbability > 50 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>{overall.cheatingProbability}%</span>
            </p>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-50 pt-3 font-semibold">
            <span>Duration: {overall.sessionDuration ? `${Math.floor(overall.sessionDuration/60)}m ${overall.sessionDuration%60}s` : 'N/A'}</span>
            <span>Local warnings: {Object.values(data?.detectionData?.overall?.violations || []).length} flagged</span>
          </div>
        </div>

      </div>

      {/* Main Grid Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Answer Breakdown & Spoken Transcripts */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-[#0D47A1]" />
                Interactive Transcript Lab
              </h3>
              <p className="text-2xs text-slate-400 mt-0.5">Select a question tab to view AI semantic rewrite recommendations.</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
              {evalReport.questionResults.length} Questions
            </span>
          </div>

          {evalReport.questionResults.length === 0 ? (
            <div className="py-12 text-center text-slate-405 text-xs italic">
              No verbal answers captured.
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Question selector tabs */}
              <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                {evalReport.questionResults.map((r, i) => {
                  const vc = VERDICT_CONFIG[r.verdict] || VERDICT_CONFIG['No Answer'];
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedQ(i)}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5",
                        selectedQ === i 
                          ? 'bg-[#0D47A1] text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                      )}
                    >
                      <span>{vc.icon}</span>
                      <span>Q{i + 1}</span>
                      <span className={clsx("text-[10px] font-black", selectedQ === i ? 'text-white/90' : 'text-slate-400')}>
                        {r.score}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Question Box */}
              {selectedResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-2.5">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase", DIFF_CONFIG[selectedResult.difficulty]?.cls || 'bg-slate-100')}>
                      {DIFF_CONFIG[selectedResult.difficulty]?.label || 'Easy'}
                    </span>
                    <p className="text-slate-800 text-xs font-bold leading-relaxed">
                      {selectedResult.questionText}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs w-fit", VERDICT_CONFIG[selectedResult.verdict]?.bg)}>
                      <span>{VERDICT_CONFIG[selectedResult.verdict]?.icon}</span>
                      <span className={VERDICT_CONFIG[selectedResult.verdict]?.color}>{selectedResult.verdict}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>Accuracy Fit</span>
                        <span>{selectedResult.score}%</span>
                      </div>
                      <ScoreBar value={selectedResult.score} />
                    </div>
                  </div>

                  {/* Transcript */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Speech Transcript (Audio Output)</span>
                    <p className={clsx(
                      "text-xs leading-relaxed font-medium",
                      selectedResult.transcript && selectedResult.transcript.trim() ? 'text-slate-700 italic' : 'text-slate-405 italic'
                    )}>
                      {selectedResult.transcript && selectedResult.transcript.trim() 
                        ? `"${selectedResult.transcript}"` 
                        : 'No vocal answers captured during speech.'}
                    </p>
                  </div>

                  {/* AI Feedback */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-2">AI Diagnostic Evaluation</span>
                    <p className="text-xs leading-relaxed font-medium text-slate-650">
                      {selectedResult.feedback}
                    </p>
                  </div>

                  {/* Keywords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedResult.keywords.length > 0 && (
                      <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-3.5">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-2">Matched Signals</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedResult.keywords.map(k => (
                            <span key={k} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-lg font-bold">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedResult.missingKeywords.length > 0 && (
                      <div className="bg-amber-50/20 border border-amber-100/50 rounded-2xl p-3.5">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-2">Improvement Signals</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedResult.missingKeywords.map(k => (
                            <span key={k} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-lg font-bold">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Video Player, Proctor logs, Area of improvement */}
        <div className="space-y-6">
          
          {/* Webcam Recording */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                <Video size={16} className="text-[#0D47A1]" />
                Session Recording
              </h3>
              {videoUrl && (
                <button 
                  onClick={handleDownloadVideo}
                  className="text-xs text-[#0D47A1] hover:text-[#0b3c8a] font-bold flex items-center gap-0.5"
                >
                  Download
                  <Download size={12} className="ml-0.5" />
                </button>
              )}
            </div>
            {videoUrl ? (
              <div className="rounded-2xl overflow-hidden border border-slate-100">
                <video src={videoUrl} controls className="w-full h-auto" />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl py-8 text-center text-slate-400 text-xs italic">
                No webcam recording available.
              </div>
            )}
          </div>

          {/* Area of improvement */}
          {evalReport.improvements.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-850 font-outfit tracking-tight flex items-center gap-2">
                <HelpCircle size={16} className="text-amber-500" />
                Core Improvement Items
              </h3>
              <ul className="space-y-2">
                {evalReport.improvements.map((imp, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 font-semibold leading-relaxed">
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detected violations list */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-outfit tracking-tight flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-500" />
              Proctor violation warnings
            </h3>
            {(overall.violations || []).length === 0 ? (
              <p className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                No integrity warnings flagged. Excellent session.
              </p>
            ) : (
              <div className="space-y-2.5">
                {(overall.violations || []).map((v: any, i: number) => (
                  <div key={i} className={clsx(
                    "p-3 rounded-xl border border-l-4 text-xs font-semibold leading-relaxed",
                    v.severity === 'CRITICAL' ? 'bg-rose-50/50 border-rose-100 border-l-rose-500 text-rose-700' :
                    v.severity === 'HIGH' ? 'bg-orange-50/50 border-orange-100 border-l-orange-500 text-orange-700' :
                    'bg-amber-50/50 border-amber-100 border-l-amber-550 text-amber-700'
                  )}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-[10px] tracking-wider uppercase">{v.severity} ALERT</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{v.type}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{v.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};