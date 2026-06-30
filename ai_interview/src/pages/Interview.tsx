import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewFlow } from '../hooks/useInterviewFlow';
import { useBrowserFaceDetection } from '../hooks/useBrowserFaceDetection';
import { useBrowserSecurity } from '../hooks/useBrowserSecurity';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
// import { InterviewHeader } from '../components/Interview/InterviewHeader';
import { InterviewProgress } from '../components/Interview/InterviewProgress';
import { VideoRecorder } from '../components/Interview/VideoRecorder';
import { VideoRecordingService, blobToBase64 } from '../services/videoRecordingService';
import { TTSService } from '../services/ttsService';
import { KioskOverlay } from '../components/Security/KioskOverlay';
import { ViolationToast, ToastViolation } from '../components/Security/ViolationToast';
import { AdminUnlockModal } from '../components/Security/AdminUnlockModal';
import { saveAnswer, clearAnswers, loadAnswers, evaluateAll } from '../services/speechEvaluationService';
import { deepEvaluate } from '../services/deepEvaluationService';
import { SessionPersistenceService } from '../services/sessionPersistenceService';
import { AuthService } from '../services/authService';
import { loadInterviewConfig } from '../data/questions';

// Thresholds — must match useBrowserFaceDetection.ts
const YAW_THRESHOLD   = 18;
// const PITCH_THRESHOLD = 15;

interface LocalViolations {
  tabSwitches: number;
  windowBlurs: number;
  rightClicks: number;
  copyPastes: number;
  suspiciousKeys: number;
}

const RISK_FROM_SCORE = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  if (score >= 80) return 'LOW';
  if (score >= 55) return 'MEDIUM';
  if (score >= 30) return 'HIGH';
  return 'CRITICAL';
};

/*
const RISK_COLOR = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return 'text-red-700 bg-red-50 border-red-300';
    case 'HIGH':     return 'text-orange-700 bg-orange-50 border-orange-300';
    case 'MEDIUM':   return 'text-yellow-700 bg-yellow-50 border-yellow-300';
    default:         return 'text-green-700 bg-green-50 border-green-300';
  }
};
*/

const GAZE_COLOR = (dir: string | null) => {
  if (dir === 'CENTER') return 'text-green-600';
  if (dir === 'LEFT' || dir === 'RIGHT') return 'text-red-600';
  if (dir === 'DOWN') return 'text-orange-600';
  if (dir === 'UP') return 'text-yellow-600';
  return 'text-slate-400';
};

/*
const BAR = ({ value, max = 100, color = 'bg-blue-500' }: { value: number; max?: number; color?: string }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
    <div
      className={`${color} h-2 rounded-full transition-all duration-300`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

const SeverityBadge = ({ severity }: { severity: string }) => {
  const cls =
    severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
      severity === 'HIGH'   ? 'bg-orange-100 text-orange-700 border border-orange-200' :
        severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
          'bg-blue-100 text-blue-700 border border-blue-200';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cls}`}>{severity}</span>;
};
*/

const DIFF_LABEL: Record<string, { label: string; color: string }> = {
  easy:   { label: 'Easy',     color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  medium: { label: 'Moderate', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  hard:   { label: 'Hard',     color: 'bg-red-100 text-red-700 border-red-300' },
};

// ─── Main Component ────────────────────────────────────────────────────────────

const Interview: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<VideoRecordingService | null>(null);

  // ── Browser security hook (replaces Electron kiosk)
  const {
    isElectron, isDisplayBlocked, displayCount, isCameraLost,
    lastViolation, notifyInterviewStarted, notifyInterviewEnded, requestAdminUnlock,
  } = useBrowserSecurity();

  const [toastViolation, setToastViolation] = useState<ToastViolation | null>(null);

  useEffect(() => {
    if (!lastViolation) return;
    setToastViolation({
      id:        `${lastViolation.type}_${lastViolation.timestamp}`,
      type:      lastViolation.type,
      reason:    lastViolation.reason,
      severity:  lastViolation.severity,
      timestamp: lastViolation.timestamp,
    });
  }, [lastViolation]);

  // ── State ──────────────────────────────────────────────────────────────
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [, setIsRecordingVideo] = useState(false);
  const [localViolations, setLocalViolations] = useState<LocalViolations>({
    tabSwitches: 0, windowBlurs: 0, rightClicks: 0, copyPastes: 0, suspiciousKeys: 0,
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const [aiPhase, setAiPhase] = useState<'idle' | 'speaking' | 'listening' | 'done'>('idle');

  // ── Interview Flow (5 questions: E-E-M-M-H) ───────────────────────────
  const {
    interviewState, currentQuestion, isLoadingQuestions, questionsError,
    startInterview, skipQuestion, completeInterview, isAISpeaking,
  } = useInterviewFlow(5);

  // ── Speech Recognition ─────────────────────────────────────────────────
  const {
    isListening, isSupported: sttSupported, transcript, finalTranscript,
    error: sttError, startListening, stopListening, resetTranscript,
  } = useSpeechRecognition();

  // Track current answer text (live typed or spoken)
  const [textAnswer, setTextAnswer] = useState('');

  // Use spoken transcript when available, text fallback otherwise
  const activeAnswer = sttSupported ? transcript : textAnswer;

  // ── Browser face detection ────────────────────────────────────────────
  const {
    state: detection, initialize: initDetection,
    startMonitoring, stopMonitoring, reset: resetDetection,
  } = useBrowserFaceDetection();

  // ── Camera watchdog (Electron) ─────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    const interval = setInterval(() => {
      const track = mediaStream?.getVideoTracks()[0];
      const online = !!track && track.readyState === 'live' && !track.muted;
      window.dispatchEvent(new CustomEvent('camera:stateReport', { detail: { online } }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isElectron, mediaStream]);

  // ── Camera Init ────────────────────────────────────────────────────────
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        alert('Camera and microphone access are required for the interview');
      }
    };
    initCamera();
    return () => {
      mediaStream?.getTracks().forEach(t => t.stop());
      videoRecorderRef.current?.destroy();
      stopMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Elapsed Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (interviewState.status !== 'in_progress') return;
    startTimeRef.current = Date.now();
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [interviewState.status]);

  // ── When AI finishes speaking → start listening ────────────────────────
  useEffect(() => {
    if (interviewState.status !== 'in_progress') return;
    if (!isAISpeaking && currentQuestion) {
      // AI just finished speaking — start listening
      setAiPhase('listening');
      resetTranscript();
      if (sttSupported) {
        setTimeout(() => startListening(), 300);
      }
    }
    if (isAISpeaking) {
      setAiPhase('speaking');
      if (isListening) stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAISpeaking, currentQuestion]);

  // ── Browser violation listeners ────────────────────────────────────────
  useEffect(() => {
    const inc = (key: keyof LocalViolations) =>
      setLocalViolations(p => ({ ...p, [key]: p[key] + 1 }));

    const onVisibilityChange = () => {
      if (document.hidden && interviewState.status === 'in_progress') inc('tabSwitches');
    };
    const onBlur = () => { if (interviewState.status === 'in_progress') inc('windowBlurs'); };
    const onContextMenu = (e: MouseEvent) => {
      if (interviewState.status === 'in_progress') { e.preventDefault(); inc('rightClicks'); }
    };
    const onCopy = (e: ClipboardEvent) => {
      if (interviewState.status === 'in_progress') { e.preventDefault(); inc('copyPastes'); }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (interviewState.status !== 'in_progress') return;
      const suspect =
        (e.altKey && e.key === 'Tab') || (e.metaKey && e.key === 'Tab') ||
        e.key === 'PrintScreen' || (e.ctrlKey && ['c','v','a'].includes(e.key.toLowerCase()));
      if (suspect) { e.preventDefault(); inc('suspiciousKeys'); }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [interviewState.status]);

  // ── Start Interview ────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    TTSService.unlock();
    if (!mediaStream || !videoRef.current) {
      alert('Please enable camera access first');
      return;
    }
    try {
      clearAnswers(); // reset any previous session's answers
      resetDetection();
      const detectionReady = await initDetection();

      videoRecorderRef.current = new VideoRecordingService();
      await videoRecorderRef.current.startRecording(videoRef.current);
      setIsRecordingVideo(true);

      setAiPhase('speaking');
      await startInterview();

      notifyInterviewStarted();

      if (detectionReady && videoRef.current) {
        setTimeout(() => startMonitoring(videoRef.current!, 250), 1500);
      }
    } catch {
      alert('Failed to start interview. Please try again.');
    }
  };

  // ── Submit Answer & Go to Next Question ──────────────────────────────────────
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion) return;

    stopListening();

    const answerText = (sttSupported ? finalTranscript || transcript : textAnswer).trim();
    saveAnswer({
      questionId:   currentQuestion.id,
      questionText: currentQuestion.text,
      difficulty:   currentQuestion.difficulty,
      transcript:   answerText,
      timestamp:    new Date().toISOString(),
    });

    setTextAnswer('');
    resetTranscript();
    setAiPhase('speaking');

    await skipQuestion();
  }, [currentQuestion, sttSupported, finalTranscript, transcript, textAnswer,
      stopListening, resetTranscript, skipQuestion]);

  // ── End Interview ─────────────────────────────────────────────────────
  const handleEndInterview = useCallback(async () => {
    stopListening();
    stopMonitoring();
    notifyInterviewEnded();

    let videoBase64: string | null = null;
    if (videoRecorderRef.current) {
      const blob = await videoRecorderRef.current.stopRecording();
      videoBase64 = await blobToBase64(blob);
      setIsRecordingVideo(false);
    }

    completeInterview();

    const r = detection.currentResult;
    const c = detection.counters;

    const lookAwayPen  = c.totalLookAways <= 2 ? 0 : Math.min(30, (c.totalLookAways - 2) * 3);
    const headTurnPen  = c.totalHeadTurns <= 3 ? 0 : Math.min(20, (c.totalHeadTurns - 3) * 2);
    const absencePen   = Math.min(40, c.faceAbsenceCount * 8);
    const multiFacePen = Math.min(36, c.multiFaceCount * 12);
    const phonePen     = c.phoneDetectedCount === 0 ? 0 : Math.min(50, 20 + (c.phoneDetectedCount - 1) * 10);
    const downPen      = Math.min(45, c.lookDownViolations * 15);
    const score        = Math.max(0, Math.round(100 - lookAwayPen - headTurnPen - absencePen - multiFacePen - phonePen - downPen));
    const risk         = RISK_FROM_SCORE(score);
    const localPenalty = localViolations.tabSwitches * 5 + localViolations.copyPastes * 5 +
      localViolations.rightClicks * 3 + localViolations.suspiciousKeys * 4;
    const cheatingProb = Math.min(100, (100 - score) + localPenalty);

    const detectionData = {
      eyeGaze: {
        direction: r?.gazeDirection ?? 'UNKNOWN',
        focusPercentage: score,
        lookAwayCount: c.totalLookAways,
      },
      headPose: {
        yaw: r?.headYaw ?? 0, pitch: r?.headPitch ?? 0, roll: r?.headRoll ?? 0,
        stability: Math.max(0, 100 - Math.abs(r?.headYaw ?? 0) * 2),
        movementCount: c.totalHeadTurns,
      },
      faceValidity: {
        faceCount: r?.faceCount ?? 1,
        visibilityPercentage: r?.faceCount === 1 ? 100 : r?.faceCount === 0 ? 0 : 60,
        absenceCount: c.faceAbsenceCount, occlusionCount: c.faceAbsenceCount,
      },
      maskDetection: {
        status: c.faceAbsenceCount > 0 ? 'COVERED' : 'CLEAR',
        identityVerified: c.faceAbsenceCount === 0,
        occlusionEvents: c.faceAbsenceCount,
      },
      phoneDetection: {
        phoneDetected: c.phoneDetectedCount > 0,
        detectionCount: c.phoneDetectedCount,
      },
      overall: {
        integrityScore: Math.max(0, score - Math.round(localPenalty * 0.5)),
        riskLevel: risk,
        cheatingProbability: cheatingProb,
        sessionDuration: elapsedSeconds,
        violations: [
          ...(c.lookDownViolations > 0 ? [{ type: 'LOOKING_DOWN', severity: 'CRITICAL', message: `Looked down for 3s (${c.lookDownViolations} times)` }] : []),
          ...(c.totalLookAways > 0 ? [{ type: 'GAZE_DEVIATION', severity: 'HIGH', message: `Looked away ${c.totalLookAways} times` }] : []),
          ...(c.totalHeadTurns > 0 ? [{ type: 'HEAD_TURNED', severity: 'MEDIUM', message: `Head turned ${c.totalHeadTurns} times` }] : []),
          ...(c.faceAbsenceCount > 0 ? [{ type: 'FACE_COVERED', severity: 'CRITICAL', message: `Face blocked ${c.faceAbsenceCount} times` }] : []),
          ...(c.phoneDetectedCount > 0 ? [{ type: 'PHONE_DETECTED', severity: 'CRITICAL', message: `Phone detected ${c.phoneDetectedCount} times` }] : []),
          ...(localViolations.tabSwitches > 0 ? [{ type: 'TAB_SWITCH', severity: 'HIGH', message: `Tab switched ${localViolations.tabSwitches}x` }] : []),
          ...(localViolations.copyPastes > 0 ? [{ type: 'COPY_PASTE', severity: 'MEDIUM', message: `Copy/paste attempted ${localViolations.copyPastes}x` }] : []),
        ],
      },
    };

    // ── Run evaluation & deep eval, then save full session ──
    const answers = loadAnswers();
    const evalReport = evaluateAll(answers);
    const deepEvalResults = answers.map(a => deepEvaluate(a.questionText, a.transcript));

    const authSession = AuthService.getSession();
    const interviewConfig = loadInterviewConfig();
    const sessionId = `session_${Date.now()}`;

    SessionPersistenceService.saveSession({
      id:              sessionId,
      candidateName:   authSession?.name ?? 'Candidate',
      internshipRole:  interviewConfig?.role ?? 'Unknown Role',
      company:         interviewConfig?.company ?? 'Unknown Company',
      timestamp:       new Date().toISOString(),
      videoBase64,
      evalReport,
      detectionData,
      deepEvalResults,
      localViolations,
    });

    navigate('/intern/results');
  }, [detection, localViolations, elapsedSeconds, navigate, stopListening, stopMonitoring, completeInterview, notifyInterviewEnded]);


  // Auto-complete when all questions done
  useEffect(() => {
    if (interviewState.status === 'completed') handleEndInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewState.status]);

  const isRecording = interviewState.status === 'in_progress';
  const result = detection.currentResult;
  const intScore = detection.integrityScore;
  // const risk = RISK_FROM_SCORE(intScore);
  const totalLocalViolations = Object.values(localViolations).reduce((a, b) => a + b, 0);
  const securityBlocked = isCameraLost || isDisplayBlocked;

  const formatElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const diffInfo = currentQuestion?.difficulty ? DIFF_LABEL[currentQuestion.difficulty] ?? DIFF_LABEL.easy : null;

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Security overlays (logic unchanged) ── */}
      <KioskOverlay isDisplayBlocked={isDisplayBlocked} displayCount={displayCount} isCameraLost={isCameraLost} />
      <ViolationToast violation={toastViolation} />
      {<AdminUnlockModal onRequestUnlock={requestAdminUnlock} />}

      {/* ── AI Loading Overlay ── */}
      {isLoadingQuestions && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(8px)' }}>
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-slate-200 animate-spin" style={{ borderTopColor: '#0D47A1' }} />
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ fontSize: 28 }}>🧠</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">AI is Preparing Your Questions</h2>
          <p className="text-slate-500 text-sm">Generating 5 questions — Easy → Easy → Moderate → Moderate → Hard…</p>
          <div className="flex gap-1.5 mt-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#0D47A1', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Fallback notice ── */}
      {questionsError && !isLoadingQuestions && (
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: 'rgba(13,71,161,0.05)', borderBottom: '1px solid rgba(13,71,161,0.12)' }}>
          <span className="text-xs" style={{ color: '#0D47A1' }}>🧠 Using smart fallback questions — install Ollama for full AI generation.</span>
        </div>
      )}

      {/* ── CAPVIA Interview Header ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm" style={{ minHeight: 56 }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D47A1, #1565C0)' }}>
            <span className="text-white text-xs font-black">C</span>
          </div>
          <span className="font-black text-slate-900 tracking-tight" style={{ fontSize: 16 }}>CAPVIA</span>
          <span className="text-slate-300 text-xs">|</span>
          <span className="text-slate-500 text-xs font-semibold">AI Interview</span>
        </div>

        {/* Center: progress */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span className="rec-dot" />
              REC
            </div>
          )}
          <span className="text-xs text-slate-500 font-semibold">
            Q{interviewState.currentQuestionIndex + 1} / {interviewState.totalQuestions}
          </span>
          <span className="text-xs font-mono font-bold" style={{ color: '#0D47A1' }}>
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        {/* Right: status indicators */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            result?.faceCount === 1 ? 'text-[#10B981] bg-emerald-50 border-emerald-200' : 'text-[#EF4444] bg-red-50 border-red-200'
          }`}>
            <span>👤</span>
            {result?.faceCount === 1 ? 'Face OK' : result?.faceCount === 0 ? 'No Face' : 'Multi-Face'}
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            GAZE_COLOR(result?.gazeDirection ?? null).replace('text-', 'text-').includes('green')
              ? 'text-[#10B981] bg-emerald-50 border-emerald-200'
              : 'text-[#F59E0B] bg-amber-50 border-amber-200'
          }`}>
            👁 {result?.gazeDirection ?? '—'}
          </div>
        </div>
      </header>

      {/* ── Interview Content ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px - 64px)' }}>

        {/* ─── LEFT PANEL (60%) — Video + Proctoring ─── */}
        <div className="flex flex-col" style={{ width: '60%', borderRight: '1px solid #E2E8F0', background: '#F8FAFC' }}>

          {/* Camera Preview */}
          <div className="flex-1 relative p-4">
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg bg-slate-900" style={{ minHeight: 320 }}>
              <VideoRecorder videoRef={videoRef} isRecording={isRecording} isPaused={false} />

              {/* Recording badge */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold" style={{ background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(4px)' }}>
                  <span className="rec-dot" />
                  RECORDING
                </div>
              )}

              {/* AI speaking indicator */}
              {aiPhase === 'speaking' && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold" style={{ background: 'rgba(13,71,161,0.9)', backdropFilter: 'blur(4px)' }}>
                  <div className="ai-wave flex gap-0.5 items-center" style={{ height: 16 }}>
                    <span /><span /><span /><span />
                  </div>
                  AI Speaking
                </div>
              )}

              {/* Face detection badge */}
              <div className={`absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                result?.faceCount === 1
                  ? 'text-white'
                  : 'text-white'
              }`} style={{ background: result?.faceCount === 1 ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)', backdropFilter: 'blur(4px)' }}>
                {result?.faceCount === 1 ? '✓ Face Detected' : result?.faceCount === 0 ? '✗ Face Not Detected' : '⚠ Multi-Face'}
              </div>

              {/* Mic indicator */}
              {isListening && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold" style={{ background: 'rgba(16,185,129,0.9)', backdropFilter: 'blur(4px)' }}>
                  🎤 Listening
                </div>
              )}
            </div>
          </div>

          {/* Proctoring status bar */}
          <div className="px-4 pb-3">
            <div className="rounded-xl p-3 border border-slate-200 bg-white">
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: 'Integrity',
                    value: `${intScore}%`,
                    color: intScore >= 80 ? '#10B981' : intScore >= 55 ? '#F59E0B' : '#EF4444',
                    bg: intScore >= 80 ? 'rgba(16,185,129,0.08)' : intScore >= 55 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                  },
                  {
                    label: 'Gaze',
                    value: result?.gazeDirection ?? '—',
                    color: result?.gazeDirection === 'CENTER' ? '#10B981' : '#F59E0B',
                    bg: result?.gazeDirection === 'CENTER' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                  },
                  {
                    label: 'Head Pose',
                    value: Math.abs(result?.headYaw ?? 0) < YAW_THRESHOLD ? 'Centered' : 'Turned',
                    color: Math.abs(result?.headYaw ?? 0) < YAW_THRESHOLD ? '#10B981' : '#F59E0B',
                    bg: Math.abs(result?.headYaw ?? 0) < YAW_THRESHOLD ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                  },
                  {
                    label: 'Violations',
                    value: `${totalLocalViolations}`,
                    color: totalLocalViolations === 0 ? '#10B981' : '#EF4444',
                    bg: totalLocalViolations === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="flex flex-col items-center p-2 rounded-lg" style={{ background: bg }}>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{label}</span>
                    <span className="text-sm font-bold mt-0.5" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL (40%) — Question + Answer ─── */}
        <div className="flex flex-col overflow-y-auto" style={{ width: '40%', background: '#fff' }}>
          <div className="flex-1 p-5 space-y-4">

            {/* Progress timeline */}
            <InterviewProgress
              currentQuestion={interviewState.currentQuestionIndex + 1}
              totalQuestions={interviewState.totalQuestions}
              progress={((interviewState.currentQuestionIndex + 1) / interviewState.totalQuestions) * 100}
            />

            {/* Question Card */}
            {currentQuestion ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100" style={{ background: '#F8FAFC' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Question {interviewState.currentQuestionIndex + 1} of {interviewState.totalQuestions}
                    </span>
                    {diffInfo && (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${diffInfo.color}`}>
                        {diffInfo.label}
                      </span>
                    )}
                  </div>
                  {/* AI phase badge */}
                  {isRecording && (
                    <div className="flex items-center gap-1.5">
                      {aiPhase === 'speaking' && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(13,71,161,0.08)', color: '#0D47A1', border: '1px solid rgba(13,71,161,0.2)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0D47A1] animate-pulse" />
                          AI Speaking
                        </span>
                      )}
                      {aiPhase === 'listening' && isListening && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                          Listening
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question text */}
                <div className="px-5 py-5 bg-white">
                  <p className="text-base font-semibold text-slate-800 leading-relaxed">{currentQuestion.text}</p>
                  {currentQuestion.category && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(13,71,161,0.06)', color: '#0D47A1' }}>
                        {currentQuestion.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No question yet — start prompt */
              !isRecording && interviewState.status === 'not_started' && (
                <div className="rounded-2xl border border-slate-200 p-8 text-center bg-white shadow-sm slide-up">
                  <div className="text-5xl mb-4">🎙️</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Begin?</h3>
                  <p className="text-sm text-slate-500 mb-6">Your AI interviewer will ask 5 progressive questions. Take a deep breath — you've got this!</p>
                  <button
                    id="btn-start-interview"
                    onClick={handleStartInterview}
                    className="px-10 py-4 rounded-2xl text-white font-bold text-base transition-all"
                    style={{ background: 'linear-gradient(135deg, #0D47A1, #1565C0)', boxShadow: '0 4px 20px rgba(13,71,161,0.35)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                  >
                    🚀 Start Interview
                  </button>
                </div>
              )
            )}

            {/* Voice Answer Panel */}
            {isRecording && currentQuestion && (
              <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100" style={{ background: isListening ? 'rgba(16,185,129,0.04)' : '#F8FAFC' }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                    isListening ? 'shadow-lg animate-pulse' : ''
                  }`} style={{ background: isListening ? '#10B981' : '#E2E8F0' }}>
                    🎤
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">
                      {isAISpeaking ? 'AI is speaking — listen carefully'
                       : isListening  ? 'Listening to your answer…'
                                      : 'Your Answer'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {sttSupported ? 'Speak clearly — captured automatically' : 'Speech recognition unavailable — type below'}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Live transcript */}
                  {sttSupported ? (
                    <div className={`min-h-[80px] rounded-xl border-2 p-4 text-sm transition-all ${
                      isListening ? 'border-[#10B981] bg-emerald-50/40' : 'border-slate-200 bg-slate-50'
                    }`}>
                      {activeAnswer ? (
                        <p className="text-slate-800 leading-relaxed">{activeAnswer}</p>
                      ) : (
                        <p className="text-slate-400 italic">
                          {isListening ? 'Start speaking…' : 'Your spoken answer will appear here.'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      className="w-full min-h-[100px] rounded-xl border-2 border-slate-200 p-4 text-sm text-slate-800 resize-none focus:outline-none bg-white"
                      style={{ focusBorderColor: '#0D47A1' } as any}
                      placeholder="Type your answer here…"
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                    />
                  )}

                  {sttError && (
                    <p className="text-xs text-[#EF4444] rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      ⚠️ {sttError}
                    </p>
                  )}

                  {/* Submit button */}
                  <div className="flex items-center gap-3">
                    <button
                      id="btn-submit-answer"
                      onClick={handleSubmitAnswer}
                      disabled={isAISpeaking || securityBlocked}
                      className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: (isAISpeaking || securityBlocked) ? '#E2E8F0' : 'linear-gradient(135deg, #0D47A1, #1565C0)',
                        color: (isAISpeaking || securityBlocked) ? '#94A3B8' : '#fff',
                        boxShadow: (isAISpeaking || securityBlocked) ? 'none' : '0 3px 12px rgba(13,71,161,0.3)',
                        cursor: (isAISpeaking || securityBlocked) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {interviewState.currentQuestionIndex + 1 >= interviewState.totalQuestions
                        ? '✅ Finish Interview'
                        : '➡️ Submit & Next Question'}
                    </button>

                    {sttSupported && !isAISpeaking && (
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className="p-3 rounded-xl border-2 font-bold text-sm transition-all"
                        style={{
                          background: isListening ? 'rgba(239,68,68,0.08)' : '#fff',
                          borderColor: isListening ? '#EF4444' : '#E2E8F0',
                          color: isListening ? '#EF4444' : '#64748B',
                        }}
                        title={isListening ? 'Stop listening' : 'Start listening'}
                      >
                        {isListening ? '⏹ Stop' : '🎤 Mic'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CONTROLS BAR ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-100 shadow-sm" style={{ height: 64 }}>
        {/* Left: connection + session */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
            Connected
          </div>
          <div className="text-xs text-slate-400 font-mono">{formatElapsed(elapsedSeconds)}</div>
        </div>

        {/* Center: key controls */}
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 bg-white transition-all"
            onClick={() => {
              const track = (videoRef.current?.srcObject as MediaStream)?.getAudioTracks()[0];
              if (track) track.enabled = !track.enabled;
            }}
            title="Toggle microphone"
          >
            🎤 Mute
          </button>

          {/* Fullscreen */}
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 bg-white transition-all"
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen();
              else document.exitFullscreen();
            }}
            title="Toggle fullscreen"
          >
            ⛶ Fullscreen
          </button>

          {/* Help */}
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 bg-white transition-all"
            title="Help"
          >
            ? Help
          </button>
        </div>

        {/* Right: End interview */}
        {isRecording && (
          <button
            onClick={handleEndInterview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all"
            style={{ background: '#EF4444', boxShadow: '0 2px 10px rgba(239,68,68,0.3)' }}
          >
            ⏹ End Interview
          </button>
        )}
        {!isRecording && (
          <div className="text-xs text-slate-400">Session not active</div>
        )}
      </div>
    </div>
  );
};

export default Interview;

