import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewFlow } from '../hooks/useInterviewFlow';
import { useBrowserFaceDetection } from '../hooks/useBrowserFaceDetection';
import { useElectronSecurity } from '../hooks/useElectronSecurity';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { VideoRecorder } from '../components/Interview/VideoRecorder';
import { InterviewHeader } from '../components/Interview/InterviewHeader';
import { InterviewProgress } from '../components/Interview/InterviewProgress';
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
const PITCH_THRESHOLD = 15;

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

const RISK_COLOR = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return 'text-red-700 bg-red-50 border-red-300';
    case 'HIGH':     return 'text-orange-700 bg-orange-50 border-orange-300';
    case 'MEDIUM':   return 'text-yellow-700 bg-yellow-50 border-yellow-300';
    default:         return 'text-green-700 bg-green-50 border-green-300';
  }
};

const GAZE_COLOR = (dir: string | null) => {
  if (dir === 'CENTER') return 'text-green-600';
  if (dir === 'LEFT' || dir === 'RIGHT') return 'text-red-600';
  if (dir === 'DOWN') return 'text-orange-600';
  if (dir === 'UP') return 'text-yellow-600';
  return 'text-slate-400';
};

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

  // ── Electron kiosk security ────────────────────────────────────────────
  const {
    isElectron, isDisplayBlocked, displayCount, isCameraLost,
    lastViolation, notifyInterviewStarted, notifyInterviewEnded, requestAdminUnlock,
  } = useElectronSecurity();

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
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
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
  }, [detection, localViolations, elapsedSeconds, navigate, stopListening, stopMonitoring, completeInterview]);


  // Auto-complete when all questions done
  useEffect(() => {
    if (interviewState.status === 'completed') handleEndInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewState.status]);

  const isRecording = interviewState.status === 'in_progress';
  const result = detection.currentResult;
  const intScore = detection.integrityScore;
  const risk = RISK_FROM_SCORE(intScore);
  const totalLocalViolations = Object.values(localViolations).reduce((a, b) => a + b, 0);
  const securityBlocked = isCameraLost || isDisplayBlocked;

  const formatElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const diffInfo = currentQuestion?.difficulty ? DIFF_LABEL[currentQuestion.difficulty] ?? DIFF_LABEL.easy : null;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg, #eef2ff 0%, #f0f9ff 40%, #fdf4ff 100%)' }}>

      {/* ── Kiosk overlays ── */}
      <KioskOverlay isDisplayBlocked={isDisplayBlocked} displayCount={displayCount} isCameraLost={isCameraLost} />
      <ViolationToast violation={toastViolation} />
      {isElectron && <AdminUnlockModal onRequestUnlock={requestAdminUnlock} />}

      {/* ── AI Loading Overlay ── */}
      {isLoadingQuestions && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(240,244,255,0.97)' }}>
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">AI is Preparing Your Questions</h2>
          <p className="text-slate-500 text-sm">Generating 5 questions — Easy → Easy → Moderate → Moderate → Hard…</p>
          <div className="flex gap-1 mt-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Fallback notice ── */}
      {questionsError && !isLoadingQuestions && (
        <div className="bg-violet-50 border-b border-violet-200 px-4 py-2 flex items-center gap-3">
          <span className="text-violet-700 text-xs flex-1">🧠 Using smart fallback questions — install Ollama for full AI generation.</span>
        </div>
      )}

      <InterviewHeader isRecording={isRecording} isPaused={false} />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── LEFT: Interview Area ─── */}
          <div className="lg:col-span-2 space-y-5">

            <VideoRecorder videoRef={videoRef} isRecording={isRecording} isPaused={false} />

            {/* ── Question Card ── */}
            {currentQuestion && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-violet-50 to-blue-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Question {interviewState.currentQuestionIndex + 1} of {interviewState.totalQuestions}
                    </span>
                    {diffInfo && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${diffInfo.color}`}>
                        {diffInfo.label}
                      </span>
                    )}
                  </div>
                  {/* Phase badge */}
                  {isRecording && (
                    <div className="flex items-center gap-2">
                      {aiPhase === 'speaking' && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          AI Speaking…
                        </span>
                      )}
                      {aiPhase === 'listening' && isListening && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          Listening to you…
                        </span>
                      )}
                      {aiPhase === 'listening' && !isListening && sttSupported && (
                        <span className="text-xs text-slate-400">Mic ready</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question text */}
                <div className="px-6 py-5">
                  <p className="text-lg font-semibold text-slate-800 leading-relaxed">
                    {currentQuestion.text}
                  </p>
                </div>
              </div>
            )}

            {/* ── Voice Answer Panel ── */}
            {isRecording && currentQuestion && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all
                    ${isListening ? 'bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse' : 'bg-slate-200'}`}>
                    🎤
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">
                      {isAISpeaking ? 'AI is speaking — listen carefully' :
                       isListening  ? 'Listening to your answer…' :
                                      'Your Answer'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {sttSupported
                        ? 'Speak clearly — your answer is captured automatically'
                        : 'Speech recognition not available — type below'}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-4">
                  {/* Live transcript / text area */}
                  {sttSupported ? (
                    <div className={`min-h-[80px] rounded-xl border-2 p-4 text-sm transition-all
                      ${isListening
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-200 bg-slate-50'}`}>
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
                      className="w-full min-h-[100px] rounded-xl border-2 border-slate-200 p-4 text-sm
                        text-slate-800 resize-none focus:outline-none focus:border-violet-400 bg-white"
                      placeholder="Type your answer here…"
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                    />
                  )}

                  {sttError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      ⚠️ {sttError}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    {/* Submit & Next */}
                    <button
                      id="btn-submit-answer"
                      onClick={handleSubmitAnswer}
                      disabled={isAISpeaking || securityBlocked}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                        transition-all duration-200
                        ${isAISpeaking || securityBlocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 shadow-md hover:shadow-lg'}`}
                    >
                      <span>
                        {interviewState.currentQuestionIndex + 1 >= interviewState.totalQuestions
                          ? '✅ Finish Interview'
                          : '➡️ Submit & Next Question'}
                      </span>
                    </button>

                    {/* Manual mic toggle (fallback) */}
                    {sttSupported && !isAISpeaking && (
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-3 rounded-xl border-2 font-bold text-sm transition-all
                          ${isListening
                            ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-violet-400'}`}
                        title={isListening ? 'Stop listening' : 'Start listening'}
                      >
                        {isListening ? '⏹ Stop' : '🎤 Mic'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Progress ── */}
            <InterviewProgress
              currentQuestion={interviewState.currentQuestionIndex + 1}
              totalQuestions={interviewState.totalQuestions}
              progress={((interviewState.currentQuestionIndex + 1) / interviewState.totalQuestions) * 100}
            />

            {/* ── Start button (pre-interview) ── */}
            {!isRecording && interviewState.status === 'not_started' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <div className="text-5xl mb-4">🎙️</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to Begin?</h2>
                <p className="text-slate-500 text-sm mb-6">
                  The AI will speak each question aloud. Respond verbally — your voice is captured automatically.
                </p>
                <div className="flex justify-center gap-3 mb-6 flex-wrap">
                  {['Easy', 'Easy', 'Moderate', 'Moderate', 'Hard'].map((d, i) => (
                    <span key={i} className={`text-xs font-bold px-3 py-1 rounded-full border
                      ${d === 'Hard' ? 'bg-red-50 text-red-700 border-red-300' :
                        d === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                        'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                      Q{i+1}: {d}
                    </span>
                  ))}
                </div>
                <button
                  id="btn-start-interview"
                  onClick={handleStartInterview}
                  disabled={!mediaStream}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4
                    rounded-xl font-bold text-base hover:from-violet-700 hover:to-blue-700
                    shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-200"
                >
                  🚀 Start Interview
                </button>
              </div>
            )}

            {/* ── End Interview button (during session) ── */}
            {isRecording && (
              <div className="flex justify-end">
                <button
                  id="btn-end-interview"
                  onClick={handleEndInterview}
                  disabled={securityBlocked}
                  className="bg-slate-100 text-slate-600 border border-slate-300 px-5 py-2.5
                    rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600
                    hover:border-red-300 transition-all disabled:opacity-50"
                >
                  🏁 End Interview Early
                </button>
              </div>
            )}

            {/* Recording indicator */}
            {isRecordingVideo && (
              <div className="fixed bottom-20 right-6 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-semibold">REC {formatElapsed(elapsedSeconds)}</span>
              </div>
            )}

            {/* Cheating alert banner */}
            {(result?.isLookingAway || result?.isHeadTurned || result?.phoneVisible ||
              result?.isMultipleFaces || (result !== null && result.faceCount === 0)) && (
              <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-red-600 border border-red-400 text-white px-6 py-4 rounded-xl shadow-2xl z-50 max-w-lg w-full mx-4">
                <div className="font-bold text-base mb-1">⚠️ Integrity Warning</div>
                <p className="text-sm opacity-90">
                  {result?.faceCount === 0 && '🚫 Face not visible! '}
                  {result?.isLookingAway && 'Eyes not on screen. '}
                  {result?.isHeadTurned && 'Head turned away. '}
                  {result?.phoneVisible && '📱 Phone detected! '}
                  {result?.isMultipleFaces && '👥 Multiple people detected!'}
                </p>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Detection Dashboard ─── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-3">

              {/* === Integrity Score === */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-600 tracking-wide uppercase">🛡️ Integrity Monitor</h2>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${detection.isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-semibold ${detection.isRunning ? 'text-green-600' : 'text-slate-400'}`}>
                      {detection.isRunning ? 'ML Active' : isRecording ? 'Browser Only' : 'Standby'}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className={`text-4xl font-extrabold ${intScore >= 80 ? 'text-green-600' : intScore >= 60 ? 'text-yellow-600' : intScore >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                      {intScore.toFixed(0)}
                    </div>
                    <div className="text-xs text-slate-400">Integrity Score</div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${RISK_COLOR(risk)}`}>
                    {risk} RISK
                  </div>
                </div>
                <BAR value={intScore} color={intScore >= 80 ? 'bg-green-500' : intScore >= 60 ? 'bg-yellow-500' : intScore >= 40 ? 'bg-orange-500' : 'bg-red-500'} />

                {result && (
                  <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                    {[
                      { label: 'Yaw', value: result.headYaw, threshold: YAW_THRESHOLD },
                      { label: 'Pitch', value: result.headPitch, threshold: PITCH_THRESHOLD },
                      { label: 'Iris', value: result.gazeRatio, isRatio: true },
                    ].map(({ label, value, threshold, isRatio }) => (
                      <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                        <div className="text-[10px] text-slate-400">{label}</div>
                        <div className={`text-xs font-bold ${
                          isRatio ? 'text-blue-600' :
                          Math.abs(value) > (threshold ?? 999) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isRatio ? value.toFixed(2) : `${value > 0 ? '+' : ''}${value.toFixed(1)}°`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isRecording && (
                  <div className="mt-2 text-xs text-slate-400 text-right">
                    Session: {formatElapsed(elapsedSeconds)}
                  </div>
                )}
              </div>

              {/* === Eye Gaze === */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">👁️ Eye Gaze</h3>
                  {result && (
                    <span className={`text-sm font-bold ${GAZE_COLOR(result.gazeDirection)}`}>
                      {result.gazeDirection ?? 'N/A'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {(['LEFT','CENTER','RIGHT','DOWN','UP'] as const).map(dir => {
                    const active = result?.gazeDirection === dir;
                    const bgCls = active
                      ? dir === 'CENTER' ? 'bg-green-100 border-green-400 text-green-800'
                        : dir === 'DOWN' ? 'bg-orange-100 border-orange-400 text-orange-800'
                        : 'bg-red-100 border-red-400 text-red-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400';
                    const label = dir === 'LEFT' ? '← L' : dir === 'RIGHT' ? 'R →' : dir === 'DOWN' ? '↓ D' : dir === 'UP' ? '↑ U' : '● CTR';
                    return (
                      <div key={dir} className={`py-2 rounded-lg text-center text-xs font-semibold transition-all border ${bgCls}`}>
                        {label}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="text-slate-400">Total look-aways</span>
                  <span className={`font-bold ${detection.counters.totalLookAways > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {detection.counters.totalLookAways}
                  </span>
                </div>
              </div>

              {/* === Face Detection === */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">👤 Face Detection</h3>
                {result ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Faces visible</span>
                      <span className={`text-sm font-bold ${result.faceCount === 1 ? 'text-green-600' : result.faceCount === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {result.faceCount === 0 ? '❌ None' : result.faceCount === 1 ? '✅ 1' : `⚠️ ${result.faceCount}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: 'Disappearances', value: detection.counters.faceAbsenceCount, color: 'red' },
                        { label: 'Multi-face', value: detection.counters.multiFaceCount, color: 'orange' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`rounded-lg p-2 text-center border ${value > 0 ? `bg-${color}-50 border-${color}-200` : 'bg-slate-50 border-slate-200'}`}>
                          <div className={`text-lg font-extrabold ${value > 0 ? `text-${color}-600` : 'text-slate-300'}`}>{value}</div>
                          <div className="text-[10px] text-slate-400">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">Waiting for data…</p>
                )}
              </div>

              {/* === Phone Detection === */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📱 Phone Detection</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Phone Visible</span>
                    <span className={`text-sm font-bold ${result?.phoneVisible ? 'text-red-600' : 'text-green-600'}`}>
                      {result?.phoneVisible ? '⚠️ YES' : '✅ No'}
                    </span>
                  </div>
                  <div className={`rounded-lg p-2 text-center border ${detection.counters.phoneDetectedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-lg font-extrabold ${detection.counters.phoneDetectedCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{detection.counters.phoneDetectedCount}</div>
                    <div className="text-[10px] text-slate-400">Phone Events</div>
                  </div>
                </div>
              </div>

              {/* === Browser Events === */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">🌐 Browser Events</h3>
                  {totalLocalViolations > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                      {totalLocalViolations} events
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Tab switches',       key: 'tabSwitches'    as keyof LocalViolations, icon: '🔀' },
                    { label: 'Window focus lost',  key: 'windowBlurs'    as keyof LocalViolations, icon: '👁️' },
                    { label: 'Right-click blocked',key: 'rightClicks'    as keyof LocalViolations, icon: '🖱️' },
                    { label: 'Copy/paste blocked', key: 'copyPastes'     as keyof LocalViolations, icon: '📋' },
                    { label: 'Suspicious hotkeys', key: 'suspiciousKeys' as keyof LocalViolations, icon: '⌨️' },
                  ].map(({ label, key, icon }) => {
                    const count = localViolations[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{icon} {label}</span>
                        <span className={`font-bold ${count > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Violations log */}
              {totalLocalViolations > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">⚠️ Session Events</h3>
                  <div className="space-y-1.5">
                    {localViolations.tabSwitches > 0 && (
                      <div className="flex items-start gap-2 text-xs">
                        <SeverityBadge severity="HIGH" />
                        <span className="text-slate-600">Tab switched {localViolations.tabSwitches}×</span>
                      </div>
                    )}
                    {localViolations.copyPastes > 0 && (
                      <div className="flex items-start gap-2 text-xs">
                        <SeverityBadge severity="MEDIUM" />
                        <span className="text-slate-600">Copy/paste blocked {localViolations.copyPastes}×</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!detection.isRunning && isRecording && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  ⚠️ <strong>MediaPipe loading</strong> — ensure internet access for CDN.
                </div>
              )}
              {!isRecording && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                  Detection will activate when the interview starts.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Global ML badge */}
      {detection.isRunning && (
        <div className="fixed top-4 right-4 bg-green-600 border border-green-400 text-white text-xs px-4 py-2 rounded-full shadow-lg z-40 flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          ML Detection Active
        </div>
      )}
    </div>
  );
};

export default Interview;