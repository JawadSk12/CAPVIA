import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInterviewFlow } from '../hooks/useInterviewFlow';
import { useBrowserFaceDetection } from '../hooks/useBrowserFaceDetection';
import { useBrowserSecurity } from '@/hooks/useBrowserSecurity';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
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
import { Card } from '../components/UI/Card';
import { 
  ShieldAlert, Mic, MicOff, Maximize, HelpCircle, AlertCircle, Play, 
  Search, CheckCircle, Clock, Award, Video, Monitor, AlertTriangle 
} from 'lucide-react';

// Thresholds for proctoring — must match useBrowserFaceDetection.ts
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
    case 'CRITICAL': return 'text-[#EF4444] bg-red-50 border-red-200';
    case 'HIGH':     return 'text-[#F59E0B] bg-amber-50 border-amber-200';
    case 'MEDIUM':   return 'text-[#F59E0B] bg-amber-50 border-amber-200';
    default:         return 'text-[#10B981] bg-emerald-50 border-emerald-250';
  }
};

const GAZE_COLOR = (dir: string | null) => {
  if (dir === 'CENTER') return 'text-[#10B981]';
  if (dir === 'LEFT' || dir === 'RIGHT') return 'text-[#EF4444]';
  if (dir === 'DOWN') return 'text-[#F59E0B]';
  if (dir === 'UP') return 'text-[#F59E0B]';
  return 'text-slate-400';
};

const DIFF_LABEL: Record<string, { label: string; color: string }> = {
  easy:   { label: 'Easy',     color: 'bg-emerald-55 border-emerald-200 text-[#10B981]' },
  medium: { label: 'Moderate', color: 'bg-amber-50 border-amber-200 text-[#F59E0B]' },
  hard:   { label: 'Hard',     color: 'bg-red-50 border-red-200 text-[#EF4444]' },
};

const Interview: React.FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<VideoRecordingService | null>(null);

  // ── Browser kiosk security hook ────────────────────────────────────────────
  const {
    isDisplayBlocked, displayCount, isCameraLost,
    lastViolation, notifyInterviewStarted, notifyInterviewEnded,
    isBypassed, bypassSecurity
  } = useBrowserSecurity();

  const [isAdminUnlockOpen, setIsAdminUnlockOpen] = useState(false);
  const [toastViolation, setToastViolation] = useState<ToastViolation | null>(null);

  // Secret Hotkey to trigger Supervisor Unlock (Shift + Ctrl + Alt + X)
  useEffect(() => {
    const handleGlobalHotKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.ctrlKey && e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        e.stopPropagation();
        setIsAdminUnlockOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalHotKey, true);
    return () => window.removeEventListener('keydown', handleGlobalHotKey, true);
  }, []);

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
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const [aiPhase, setAiPhase] = useState<'idle' | 'speaking' | 'listening' | 'done'>('idle');
  const [micMuted, setMicMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // ── Interview Flow (5 questions) ───────────────────────────────────────
  const {
    interviewState, currentQuestion, isLoadingQuestions, questionsError,
    startInterview, skipQuestion, completeInterview, isAISpeaking,
  } = useInterviewFlow(5);

  // ── Speech Recognition ─────────────────────────────────────────────────
  const {
    isListening, isSupported: sttSupported, transcript, finalTranscript,
    error: sttError, startListening, stopListening, resetTranscript,
  } = useSpeechRecognition();

  const [textAnswer, setTextAnswer] = useState('');
  const activeAnswer = sttSupported ? transcript : textAnswer;

  // ── Browser face detection ────────────────────────────────────────────
  const {
    state: detection, initialize: initDetection,
    startMonitoring, stopMonitoring, reset: resetDetection,
  } = useBrowserFaceDetection();

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
        alert('Camera and microphone access are required for this interview.');
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

  // ── Overall Elapsed Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (interviewState.status !== 'in_progress') return;
    startTimeRef.current = Date.now();
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [interviewState.status]);

  // ── Question Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (interviewState.status !== 'in_progress') return;
    setQuestionSeconds(0);
    const id = setInterval(() => {
      setQuestionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [interviewState.status, interviewState.currentQuestionIndex]);

  // ── When AI finishes speaking → start listening ────────────────────────
  useEffect(() => {
    if (interviewState.status !== 'in_progress') return;
    if (!isAISpeaking && currentQuestion) {
      setAiPhase('listening');
      resetTranscript();
      if (sttSupported && !micMuted) {
        setTimeout(() => startListening(), 300);
      }
    }
    if (isAISpeaking) {
      setAiPhase('speaking');
      if (isListening) stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAISpeaking, currentQuestion, micMuted]);

  // ── Browser violation listeners (Local log) ────────────────────────────
  useEffect(() => {
    if (isBypassed) return;
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
  }, [interviewState.status, isBypassed]);

  // ── Start Interview ────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    TTSService.unlock();
    if (!mediaStream || !videoRef.current) {
      alert('Please enable camera access first.');
      return;
    }
    try {
      clearAnswers();
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

  // ── Submit Answer & Next ────────────────────────────────────────────────
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

    router.push('/candidate/interview/results');
  }, [detection, localViolations, elapsedSeconds, router, stopListening, stopMonitoring, completeInterview]);

  // Auto-complete when all questions done
  useEffect(() => {
    if (interviewState.status === 'completed') handleEndInterview();
  }, [interviewState.status, handleEndInterview]);

  const toggleMic = () => {
    if (micMuted) {
      setMicMuted(false);
      if (aiPhase === 'listening' && sttSupported) startListening();
    } else {
      setMicMuted(true);
      if (isListening) stopListening();
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  const isRecording = interviewState.status === 'in_progress';
  const result = detection.currentResult;
  const intScore = detection.integrityScore;
  const risk = RISK_FROM_SCORE(intScore);
  const totalLocalViolations = Object.values(localViolations).reduce((a, b) => a + b, 0);
  const securityBlocked = isCameraLost || isDisplayBlocked;

  const formatElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const diffInfo = currentQuestion?.difficulty ? DIFF_LABEL[currentQuestion.difficulty] ?? DIFF_LABEL.easy : null;

  // Retrieve previous Q&A transcripts for live transcript search feed
  const previousAnswers = loadAnswers();
  const transcriptTimeline = [
    ...previousAnswers.map(ans => ({ speaker: 'Candidate', text: ans.transcript, timestamp: ans.timestamp })),
    ...(activeAnswer ? [{ speaker: 'Candidate (Live)', text: activeAnswer, timestamp: new Date().toISOString() }] : []),
  ];

  const filteredTranscript = transcriptTimeline.filter(item => 
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans text-slate-800 antialiased">
      
      {/* ── Proctoring Kiosk Overlays & PIN Modals ── */}
      <KioskOverlay 
        isDisplayBlocked={isDisplayBlocked} 
        displayCount={displayCount} 
        isCameraLost={isCameraLost} 
        onOpenUnlock={() => setIsAdminUnlockOpen(true)}
      />
      <ViolationToast violation={toastViolation} />
      <AdminUnlockModal 
        isOpen={isAdminUnlockOpen} 
        onClose={() => setIsAdminUnlockOpen(false)}
        onUnlockSuccess={() => {
          bypassSecurity('9999');
          setIsAdminUnlockOpen(false);
        }}
      />

      {/* ── AI Loading Setup Overlay ── */}
      {isLoadingQuestions && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#0D47A1] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-1 font-outfit">Preparing Assessment Matrix</h2>
          <p className="text-slate-500 text-xs font-semibold">Generating questions based on selected role progression…</p>
        </div>
      )}

      {/* ── Header Bar ── */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0D47A1] flex items-center justify-center text-white font-black text-sm">
            C
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 font-outfit tracking-tight leading-none">CAPVIA Voice Terminal</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Autonomous Assessment Environment</p>
          </div>
        </div>
        
        {isRecording && (
          <div className="flex items-center gap-4">
            {/* Status indicators */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider">Telemetry Secure</span>
            </div>
            {/* Connection stats */}
            <div className="text-right text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
              WebRTC Connection Status: <span className="text-[#10B981]">100% Secure</span>
            </div>
          </div>
        )}
      </header>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* Not Started State */}
        {!isRecording && interviewState.status === 'not_started' && (
          <div className="max-w-xl mx-auto py-12">
            <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center shadow-sm space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#0D47A1]/5 text-[#0D47A1] flex items-center justify-center mx-auto text-3xl">
                🎙️
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 font-outfit">Ready to start the Interview?</h2>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                  The AI voice engine will present 5 technical and capability questions. Respond verbally to each question. Your answers are captured in real-time.
                </p>
              </div>

              {/* progressive rounds description */}
              <div className="grid grid-cols-5 gap-1.5 max-w-sm mx-auto py-2">
                {['Easy', 'Easy', 'Mod', 'Mod', 'Hard'].map((d, i) => (
                  <div key={i} className="flex flex-col items-center bg-[#F8FAFC] border border-slate-100 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold">Q{i+1}</span>
                    <span className={`text-[9px] font-black mt-1 ${d === 'Hard' ? 'text-[#EF4444]' : d === 'Mod' ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>{d}</span>
                  </div>
                ))}
              </div>

              <button
                id="btn-start-interview"
                onClick={handleStartInterview}
                disabled={!mediaStream}
                className="w-full sm:w-auto px-10 py-4 bg-[#0D47A1] text-white hover:bg-[#0b3c8a] rounded-xl font-bold text-sm shadow hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Assessment Session
              </button>
            </div>
          </div>
        )}

        {/* Active Interview Split Grid Layout */}
        {isRecording && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* === LEFT COLUMN: Video & Telemetry (5 cols) === */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Camera view container */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#0D47A1]" /> Camera Preview
                  </h3>
                  {isRecordingVideo && (
                    <div className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                      REC {formatElapsed(elapsedSeconds)}
                    </div>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video border border-slate-200/50 shadow-inner">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  
                  {/* Overlaid Webcam telemetry badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border ${
                      result && result.faceCount === 1 
                        ? 'bg-emerald-500/85 text-white border-emerald-400/40' 
                        : 'bg-rose-500/85 text-white border-rose-400/40'
                    }`}>
                      {result && result.faceCount === 1 ? '✓ FACE DETECTED' : '✗ FACE ABSENT'}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border ${
                      micMuted 
                        ? 'bg-rose-500/85 text-white border-rose-400/40' 
                        : 'bg-emerald-500/85 text-white border-emerald-400/40'
                    }`}>
                      {micMuted ? '🎤 MIC MUTED' : '🎤 MIC ACTIVE'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                    PROCTOR VERIFIED
                  </div>
                </div>
              </div>

              {/* Proctor Telemetry Dashboard */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#0D47A1]" /> Proctoring Analytics
                  </h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 border rounded-full uppercase tracking-wider ${RISK_COLOR(risk)}`}>
                    {risk} Risk Index
                  </span>
                </div>

                {/* Score bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Telemetry Integrity Index</span>
                    <span className="text-slate-800">{intScore.toFixed(0)}/100</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        intScore >= 80 ? 'bg-[#10B981]' : intScore >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                      }`}
                      style={{ width: `${intScore}%` }}
                    />
                  </div>
                </div>

                {/* Live indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2 text-center">
                    <div className="text-[9px] text-slate-450 font-bold uppercase">Eye Gaze</div>
                    <div className={`text-xs font-extrabold mt-1 uppercase ${GAZE_COLOR(result?.gazeDirection ?? 'CENTER')}`}>
                      {result?.gazeDirection ?? 'CENTER'}
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2 text-center">
                    <div className="text-[9px] text-slate-450 font-bold uppercase">Head Stability</div>
                    <div className="text-xs font-extrabold text-[#0D47A1] mt-1">
                      {result ? `${Math.max(0, 100 - Math.abs(result.headYaw) * 2).toFixed(0)}%` : '100%'}
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-2 text-center col-span-2 sm:col-span-1">
                    <div className="text-[9px] text-slate-450 font-bold uppercase">Tab switches</div>
                    <div className={`text-xs font-extrabold mt-1 ${localViolations.tabSwitches > 0 ? 'text-[#EF4444]' : 'text-slate-400'}`}>
                      {localViolations.tabSwitches} switches
                    </div>
                  </div>
                </div>

                {/* Real-time Warnings log */}
                {totalLocalViolations > 0 && (
                  <div className="bg-red-50/50 border border-red-150 rounded-xl p-3.5 text-xs text-[#EF4444] space-y-1.5">
                    <div className="font-extrabold flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5" /> Telemetry Warnings Flagged
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 font-semibold">
                      {localViolations.tabSwitches > 0 && <li>Tab shifted out of frame {localViolations.tabSwitches}x</li>}
                      {localViolations.copyPastes > 0 && <li>Keyboard copy-paste shortcut blocked {localViolations.copyPastes}x</li>}
                      {localViolations.rightClicks > 0 && <li>Mouse context-menu click blocked {localViolations.rightClicks}x</li>}
                    </ul>
                  </div>
                )}
              </div>

            </div>

            {/* === RIGHT COLUMN: Interactive Panel (7 cols) === */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Circular Timers and Progress timeline */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Progress navigation */}
                <div className="space-y-3.5 w-full md:w-auto">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assessment Timeline</h4>
                  <div className="flex items-center gap-1 bg-[#F8FAFC] border border-slate-100 p-1.5 rounded-xl w-fit">
                    {[0, 1, 2, 3, 4].map(idx => {
                      const isCurrent = interviewState.currentQuestionIndex === idx;
                      const isAnswered = previousAnswers.some(ans => ans.questionId === `q_${idx + 1}` || idx < interviewState.currentQuestionIndex);
                      
                      return (
                        <div
                          key={idx}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all duration-200 ${
                            isCurrent 
                              ? 'bg-[#0D47A1] border-[#0D47A1] text-white font-extrabold shadow-sm' 
                              : isAnswered 
                                ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]' 
                                : 'bg-white border-slate-200 text-slate-400'
                          }`}
                          title={`Question ${idx + 1}`}
                        >
                          {idx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Circular timer widgets */}
                <div className="flex items-center gap-6">
                  
                  {/* Question Timer */}
                  <div className="text-center">
                    <div className="relative w-14 h-14 flex items-center justify-center bg-[#F8FAFC] rounded-full border border-slate-100">
                      <svg className="absolute w-full h-full -rotate-90">
                        <circle 
                          cx="28" cy="28" r="23" 
                          fill="none" stroke="#E2E8F0" strokeWidth="2.5" 
                        />
                        <circle 
                          cx="28" cy="28" r="23" 
                          fill="none" stroke="#0D47A1" strokeWidth="2.5" 
                          strokeDasharray={144}
                          strokeDashoffset={144 - (Math.min(questionSeconds, 60) / 60) * 144}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-xs font-black text-slate-800 tracking-tighter">{questionSeconds}s</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1.5">Question Timer</span>
                  </div>

                  {/* Overall Timer */}
                  <div className="text-center">
                    <div className="relative w-14 h-14 flex items-center justify-center bg-[#F8FAFC] rounded-full border border-slate-100">
                      <svg className="absolute w-full h-full -rotate-90">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="#E2E8F0" strokeWidth="2.5" />
                        <circle 
                          cx="28" cy="28" r="23" 
                          fill="none" stroke="#42A5F5" strokeWidth="2.5" 
                          strokeDasharray={144}
                          strokeDashoffset={144 - (Math.min(elapsedSeconds, 1800) / 1800) * 144}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-[10px] font-black text-slate-700">{formatElapsed(elapsedSeconds)}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1.5">Overall Timer</span>
                  </div>

                </div>

              </div>

              {/* Question Card */}
              {currentQuestion && (
                <Card className="border border-slate-200/80 shadow-sm bg-white rounded-[24px] overflow-hidden">
                  <div className="bg-[#F8FAFC] border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                        Question {interviewState.currentQuestionIndex + 1} of {interviewState.totalQuestions}
                      </span>
                      {diffInfo && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${diffInfo.color}`}>
                          {diffInfo.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {aiPhase === 'speaking' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#0D47A1] bg-[#0D47A1]/5 border border-[#0D47A1]/10 px-2 py-0.5 rounded-full uppercase animate-pulse">
                          AI Speaking
                        </span>
                      )}
                      {aiPhase === 'listening' && isListening && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#10B981] bg-[#10B981]/5 border border-[#10B981]/10 px-2 py-0.5 rounded-full uppercase animate-pulse">
                          Mic Listening
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-base font-extrabold text-slate-800 leading-relaxed font-outfit">
                      {currentQuestion.text}
                    </h3>
                  </div>
                </Card>
              )}

              {/* Interactive Speech Recognition / Fallback Feed */}
              {currentQuestion && (
                <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Transcript Feed</span>
                    </div>
                    {/* Search Bar inside Transcript */}
                    <div className="relative w-44">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search transcript..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D47A1] font-medium"
                      />
                    </div>
                  </div>

                  {/* Transcript Feed Items */}
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                    {filteredTranscript.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No speech captured yet. Speak now...</p>
                    ) : (
                      filteredTranscript.map((item, idx) => (
                        <div key={idx} className="text-xs bg-[#F8FAFC] border border-slate-100 rounded-xl p-3.5">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            <span>{item.speaker}</span>
                            <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed italic">"{item.text}"</p>
                        </div>
                      ))
                    )}
                  </div>

                  {sttError && (
                    <div className="text-[11px] text-[#EF4444] bg-red-50 border border-red-100 p-2.5 rounded-lg font-bold">
                      ⚠️ {sttError}
                    </div>
                  )}

                  {/* Text area fallback if speech is not supported */}
                  {!sttSupported && (
                    <textarea
                      placeholder="Type your answer here..."
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-700 bg-white min-h-[90px] focus:border-[#0D47A1] focus:outline-none"
                    />
                  )}

                  {/* Submit / Next Button */}
                  <button
                    id="btn-submit-answer"
                    onClick={handleSubmitAnswer}
                    disabled={isAISpeaking || securityBlocked}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 ${
                      isAISpeaking || securityBlocked
                        ? 'bg-slate-105 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-[#0D47A1] text-white hover:bg-[#0b3c8a] shadow'
                    }`}
                  >
                    <span>
                      {interviewState.currentQuestionIndex + 1 >= interviewState.totalQuestions
                        ? '✅ Finalize & Compile Assessment'
                        : '➡️ Submit Answer & Proceed'}
                    </span>
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* ── Help Modal Overlay ── */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <h3 className="text-base font-extrabold text-slate-900 font-outfit">Interview Helpdesk</h3>
            <ul className="text-xs text-slate-650 space-y-2 font-medium">
              <li>• Speak clearly directly into the camera to register your microphone level.</li>
              <li>• Secondary monitors must remain disconnected to bypass display locks.</li>
              <li>• If your browser locks up, ask your supervisor to press <span className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">Shift+Ctrl+Alt+X</span>.</li>
            </ul>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROL BAR ── */}
      <footer className="bg-white border-t border-slate-250/80 px-6 py-4 flex items-center justify-between z-30">
        <div className="flex gap-2">
          {/* Mute Mic toggle */}
          <button
            onClick={toggleMic}
            disabled={!isRecording}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
              micMuted 
                ? 'bg-rose-50 border-rose-250 text-[#EF4444] hover:bg-rose-100' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50`}
            title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
          
          {/* Help trigger */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center"
            title="Help Desk"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {isRecording && (
          <button
            id="btn-end-interview"
            onClick={handleEndInterview}
            disabled={securityBlocked}
            className="px-5 py-2.5 border border-slate-250 text-slate-500 hover:text-[#EF4444] hover:border-red-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            🏁 Quit Session
          </button>
        )}
      </footer>

    </div>
  );
};

export default Interview;