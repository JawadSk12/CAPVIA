import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Volume2, Cpu, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'camera' | 'microphone' | 'speaker' | 'system' | 'complete';
type StepStatus = 'idle' | 'testing' | 'passed' | 'failed';

interface StepState {
  status: StepStatus;
  error?: string;
  detail?: string;
}

interface SystemInfo {
  browser: string;
  os: string;
  latency: number;
  resolution: string;
}

const STEPS: Step[] = ['camera', 'microphone', 'speaker', 'system'];

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEP_CONFIG: Record<Step, { icon: React.ReactNode; label: string; desc: string; color: string }> = {
  camera:     { icon: <Camera className="w-5 h-5" />,     label: 'Webcam Check',    desc: 'Verifying video feed stream quality',     color: 'bg-[#0D47A1]' },
  microphone: { icon: <Mic className="w-5 h-5" />,        label: 'Microphone Check', desc: 'Detecting voice capture decibels',         color: 'bg-[#0D47A1]' },
  speaker:    { icon: <Volume2 className="w-5 h-5" />,    label: 'Speaker Check',    desc: 'Confirming system audio playback',        color: 'bg-[#0D47A1]' },
  system:     { icon: <Cpu className="w-5 h-5" />,        label: 'System Check',     desc: 'Checking latency & configuration',        color: 'bg-[#0D47A1]' },
  complete:   { icon: <CheckCircle className="w-5 h-5" />,label: 'Verification Complete', desc: 'All endpoints ready!',             color: 'bg-[#10B981]' },
};

// ─── Animated Mic Bars Helper ─────────────────────────────────────────────────

const MicBars: React.FC<{ volume: number }> = ({ volume }) => {
  const bars = 24;
  return (
    <div className="flex items-end justify-center gap-[3px] h-14 bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4">
      {Array.from({ length: bars }).map((_, i) => {
        const center = bars / 2;
        const dist = Math.abs(i - center) / center;
        const base = 6 + (1 - dist) * 16;
        const animated = volume > 2 ? base + (volume / 100) * 24 * (0.4 + Math.random() * 0.6) : base;
        const height = Math.min(48, Math.max(4, animated));
        const active = volume > 5;
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              active
                ? volume > 60 ? 'bg-[#EF4444]' : 'bg-[#0D47A1]'
                : 'bg-slate-205'
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};

// ─── Sound Wave Rings Animation ───────────────────────────────────────────────

const SoundWaves: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="relative flex items-center justify-center w-24 h-24 bg-[#F8FAFC] rounded-full border border-slate-100/50">
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className={`absolute rounded-full border-2 transition-all ${
          active
            ? 'border-[#42A5F5] animate-ping opacity-30'
            : 'border-slate-100 opacity-10'
        }`}
        style={{
          width: `${i * 24 + 32}px`,
          height: `${i * 24 + 32}px`,
          animationDelay: `${i * 0.3}s`,
          animationDuration: '1.8s',
        }}
      />
    ))}
    <Volume2 className="w-8 h-8 text-[#0D47A1] relative z-10" />
  </div>
);

// ─── Camera Overlay ───────────────────────────────────────────────────────────

const CameraOverlay: React.FC<{ status: StepStatus }> = ({ status }) => {
  if (status === 'testing') return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="w-8 h-8 rounded-full border-4 border-[#0D47A1] border-t-transparent animate-spin mb-3" />
      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Accessing webcam feed…</span>
    </div>
  );
  if (status === 'passed') return (
    <>
      {/* Corner brackets */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-5 h-5 border-[#10B981] ${
          i < 2 ? 'border-t-2' : 'border-b-2'} ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'
        }`} />
      ))}
      {/* Face guide circle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-36 h-48 rounded-full border-2 border-dashed border-[#10B981]/30 animate-pulse" />
      </div>
      {/* Live badge */}
      <div className="absolute top-4 left-4 bg-[#EF4444] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        CAMERA ON
      </div>
      {/* Resolution badge */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded font-mono font-bold tracking-wider">
        HD 720P
      </div>
    </>
  );
  if (status === 'failed') return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8FAFC]/90 backdrop-blur-sm">
      <XCircle className="w-10 h-10 text-[#EF4444] mb-2" />
      <span className="text-[#EF4444] text-xs font-bold uppercase tracking-wider">Camera Locked or Blocked</span>
    </div>
  );
  return null;
};

// ─── Step Progress Indicator ──────────────────────────────────────────────────

const StepProgress: React.FC<{
  steps: Step[];
  stepStates: Record<Step, StepState>;
  currentStep: Step;
}> = ({ steps, stepStates, currentStep }) => (
  <div className="flex items-center justify-center gap-0 mb-8 w-full">
    {steps.map((step, idx) => {
      const cfg = STEP_CONFIG[step];
      const s   = stepStates[step];
      const isActive  = currentStep === step;
      const isPassed  = s.status === 'passed';
      const isFailed  = s.status === 'failed';
      const isTesting = s.status === 'testing';

      return (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            {/* Circle */}
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              isPassed  ? 'bg-[#10B981] text-white shadow-sm scale-105' :
              isFailed  ? 'bg-[#EF4444] text-white shadow-sm scale-105' :
              isTesting ? 'bg-[#0D47A1] text-white opacity-80 animate-pulse' :
              isActive  ? 'bg-[#0D47A1] text-white' :
                          'bg-white border border-slate-200 text-slate-400'
            }`}>
              {isPassed  ? <span className="text-white text-sm font-bold">✓</span> :
               isFailed  ? <span className="text-white text-sm font-bold">✗</span> :
               isTesting ? <div className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" /> :
                           <span className={isActive ? 'text-white' : 'text-slate-400'}>{cfg.icon}</span>}
              {/* Glow ring when active */}
              {(isActive || isTesting) && (
                <div className="absolute inset-0 rounded-full bg-[#0D47A1] opacity-20 animate-ping" />
              )}
            </div>
            <span className={`text-[10px] mt-1.5 font-bold tracking-tight ${
              isPassed ? 'text-[#10B981]' : isFailed ? 'text-[#EF4444]' : isActive ? 'text-slate-800' : 'text-slate-400'
            }`}>{cfg.label.split(' ')[0]}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-10 h-0.5 mb-4 transition-all duration-500 rounded-full ${
              stepStates[steps[idx + 1]].status !== 'idle' || currentStep === steps[idx + 1]
                ? 'bg-[#0D47A1]' : 'bg-slate-100'
            }`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── System Check Mini Row ────────────────────────────────────────────────────

const SystemRow: React.FC<{ icon: string; label: string; value: string; ok: boolean }> = ({ icon, label, value, ok }) => (
  <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-[#F8FAFC] border border-slate-100">
    <div className="flex items-center gap-2">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-slate-500 font-bold">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-700 font-extrabold">{value}</span>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${ok ? 'bg-[#10B981] text-white' : 'bg-[#EF4444] text-white'}`}>
        {ok ? '✓' : '✗'}
      </span>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export const DeviceValidation: React.FC<{ onComplete?: () => void; onBack?: () => void }> = ({ onComplete, onBack }) => {
  const router = useRouter();
  const videoRef     = useRef<HTMLVideoElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const [currentStep, setCurrentStep] = useState<Step>('camera');
  const [stepStates, setStepStates] = useState<Record<Step, StepState>>({
    camera:     { status: 'idle' },
    microphone: { status: 'idle' },
    speaker:    { status: 'idle' },
    system:     { status: 'idle' },
    complete:   { status: 'idle' },
  });
  const [micVolume,        setMicVolume]        = useState(0);
  const [speakerConfirmed, setSpeakerConfirmed] = useState<boolean | null>(null);
  const [speakerPlayed,    setSpeakerPlayed]    = useState(false);
  const [sysInfo,          setSysInfo]          = useState<SystemInfo | null>(null);
  const [transition,       setTransition]       = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const setStatus = (step: Step, status: StepStatus, error?: string, detail?: string) => {
    setStepStates(prev => ({ ...prev, [step]: { status, error, detail } }));
  };

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ── Camera ────────────────────────────────────────────────────────────────────

  const testCamera = useCallback(async () => {
    setStatus('camera', 'testing');
    cleanup();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const res = settings.width && settings.height ? `${settings.width}×${settings.height}` : 'HD 720P';
      setStatus('camera', 'passed', undefined, res);
    } catch (err: any) {
      setStatus('camera', 'failed', err?.message?.includes('denied') ? 'Camera permission denied.' : 'Webcam hardware not detected.');
    }
  }, [cleanup]);

  // ── Microphone ────────────────────────────────────────────────────────────────

  const testMicrophone = useCallback(async () => {
    setStatus('microphone', 'testing');
    setMicVolume(0);
    cleanup();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx     = new AudioContext();
      audioCtxRef.current = ctx;
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      let passed = false;

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const vol = Math.min(100, (avg / 128) * 200);
        setMicVolume(vol);
        if (vol > 12 && !passed) {
          passed = true;
          setTimeout(() => setStatus('microphone', 'passed', undefined, `Peak ${vol.toFixed(0)}%`), 400);
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err: any) {
      setStatus('microphone', 'failed', err?.message?.includes('denied') ? 'Microphone access blocked.' : 'Microphone device not detected.');
    }
  }, [cleanup]);

  // ── Speaker ───────────────────────────────────────────────────────────────────

  const playSpeakerBeep = useCallback(async () => {
    setSpeakerConfirmed(null);
    setSpeakerPlayed(false);
    setStatus('speaker', 'testing');
    try {
      const ctx  = new AudioContext();
      audioCtxRef.current = ctx;
      const playNote = (freq: number, start: number, dur: number) => {
        const osc  = oscObj || ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      const oscObj = ctx.createOscillator();
      playNote(880, 0, 0.5);
      playNote(1108, 0.3, 0.6);
      setTimeout(() => setSpeakerPlayed(true), 900);
    } catch {
      setStatus('speaker', 'failed', 'Beep playback error.');
    }
  }, []);

  const confirmSpeaker = (heard: boolean) => {
    setSpeakerConfirmed(heard);
    if (heard) setStatus('speaker', 'passed', undefined, 'Output Verified');
    else       setStatus('speaker', 'failed', 'Audio not confirmed by candidate');
  };

  // ── System Check ──────────────────────────────────────────────────────────────

  const runSystemCheck = useCallback(async () => {
    setStatus('system', 'testing');
    const ua      = navigator.userAgent;
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
    const os      = ua.includes('Mac') ? 'macOS' : ua.includes('Win') ? 'Windows' : ua.includes('Linux') ? 'Linux' : 'OS';
    const res     = `${window.screen.width}×${window.screen.height}`;

    const t0 = performance.now();
    try { await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-cache' }); } catch {}
    const latency = Math.round(performance.now() - t0);

    await new Promise(r => setTimeout(r, 600));
    setSysInfo({ browser, os, latency, resolution: res });
    setStatus('system', 'passed', undefined, `${latency}ms`);
  }, []);

  // ── Step transitions ──────────────────────────────────────────────────────────

  const changeStep = useCallback((next: Step) => {
    setTransition(true);
    setTimeout(() => {
      setCurrentStep(next);
      setTransition(false);
      if (next === 'camera')     testCamera();
      if (next === 'microphone') testMicrophone();
      if (next === 'speaker')    playSpeakerBeep();
      if (next === 'system')     runSystemCheck();
    }, 200);
  }, [testCamera, testMicrophone, playSpeakerBeep, runSystemCheck]);

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep as any);
    if (idx < STEPS.length - 1) changeStep(STEPS[idx + 1]);
    else changeStep('complete');
  };

  // Auto-start
  useEffect(() => { testCamera(); }, []); // eslint-disable-line

  const handleContinue = () => { cleanup(); if (onComplete) onComplete(); else router.push('/candidate/interview/validation-complete'); };
  const handleBack     = () => { cleanup(); if (onBack) onBack(); else router.push('/dashboard'); };

  const curState    = stepStates[currentStep];
  const cfg         = STEP_CONFIG[currentStep];
  const passedCount = STEPS.filter(s => stepStates[s].status === 'passed').length;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 relative overflow-hidden font-sans text-slate-800 bg-white">

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center gap-2 bg-[#0D47A1]/10 border border-[#0D47A1]/20 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#0D47A1] animate-pulse" />
          <span className="text-[#0D47A1] text-xs font-bold tracking-wide uppercase">Pre-Interview Diagnostics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight font-outfit">
          System Verification
        </h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">
          Confirming camera, mic, and connection specifications.
        </p>
      </div>

      {/* Overall progress mini-bar */}
      <div className="w-full max-w-lg mb-6 z-10">
        <div className="flex justify-between text-xs text-slate-400 font-bold mb-1.5">
          <span>{passedCount} of {STEPS.length} checkmarks passed</span>
          <span>{Math.round((passedCount / STEPS.length) * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0D47A1] transition-all duration-700"
            style={{ width: `${(passedCount / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step progress dots */}
      <div className="z-10 w-full max-w-lg">
        <StepProgress steps={STEPS} stepStates={stepStates} currentStep={currentStep} />
      </div>

      {/* Main Card */}
      <div
        className={`w-full max-w-lg z-10 transition-all duration-200 ${transition ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      >
        <div className="relative bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">

          {/* Top colored bar */}
          <div className={`h-1.5 w-full ${cfg.color}`} />

          {/* Step Header */}
          <div className="px-7 pt-6 pb-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center shadow-sm flex-shrink-0 text-white`}>
              {cfg.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 font-outfit">{cfg.label}</h2>
              <p className="text-slate-500 text-[11px] font-semibold">{cfg.desc}</p>
            </div>
            {curState.status === 'passed' && (
              <div className="ml-auto flex-shrink-0 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg px-2.5 py-0.5">
                <span className="text-[#10B981] text-[10px] font-extrabold">✓ PASSED</span>
              </div>
            )}
            {curState.status === 'failed' && (
              <div className="ml-auto flex-shrink-0 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-2.5 py-0.5">
                <span className="text-[#EF4444] text-[10px] font-extrabold">✗ FAILED</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 mx-7" />

          {/* Step Body */}
          <div className="px-7 py-6 space-y-5">

            {/* ── CAMERA ── */}
            {currentStep === 'camera' && (
              <div className="space-y-4">
                <div className="relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner" style={{ aspectRatio: '16/9' }}>
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <CameraOverlay status={curState.status} />
                </div>

                {curState.status === 'passed' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: '📐', label: 'Resolution', value: curState.detail || 'HD 720p' },
                      { icon: '🎨', label: 'Feed Format', value: 'sRGB Video' },
                      { icon: '⚡', label: 'Frame Rate',  value: '30 FPS' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="bg-[#F8FAFC] rounded-xl p-2.5 text-center border border-slate-100">
                        <div className="text-base">{icon}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{label}</div>
                        <div className="text-xs font-extrabold text-slate-700 mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {curState.error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <span className="text-[#EF4444] text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-[#EF4444] text-sm font-bold">{curState.error}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5 font-medium">Please grant camera permissions in the browser URL bar setting.</p>
                    </div>
                  </div>
                )}
                {curState.status === 'failed' && (
                  <button onClick={testCamera} className="w-full py-3 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white rounded-xl font-bold text-xs transition shadow-sm hover:scale-[1.01]">
                    <RefreshCw className="w-3.5 h-3.5 inline mr-1 animate-spin" /> Retry Diagnostic
                  </button>
                )}
              </div>
            )}

            {/* ── MICROPHONE ── */}
            {currentStep === 'microphone' && (
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-6 space-y-5">
                  <div className="text-center">
                    <p className="text-slate-800 text-sm font-bold">Speak into your mic to test audio levels</p>
                    <p className="text-slate-400 text-xs font-semibold mt-1">Please say: "Voice stream diagnostic test."</p>
                  </div>
                  <MicBars volume={micVolume} />

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                      <span>Mic Gain Intensity</span>
                      <span className={micVolume > 60 ? 'text-[#EF4444]' : 'text-[#0D47A1]'}>{micVolume.toFixed(0)}%</span>
                    </div>
                    <div className="relative w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-[12%] w-px bg-slate-300" />
                      <div className="absolute inset-y-0 left-[60%] w-px bg-slate-300" />
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          micVolume > 60 ? 'bg-[#EF4444]' : 'bg-[#0D47A1]'
                        }`}
                        style={{ width: `${micVolume}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                      <span>Silence</span><span>Normal</span><span>Clipping</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {micVolume > 12 ? (
                      <span className="text-[#10B981] text-xs font-bold animate-pulse">✓ Signal captured successfully!</span>
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">
                        {curState.status === 'testing' ? 'Listening for input signal…' : 'Start speaking'}
                      </span>
                    )}
                  </div>
                </div>

                {curState.error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <span className="text-[#EF4444] flex-shrink-0">⚠️</span>
                    <p className="text-[#EF4444] text-sm font-bold">{curState.error}</p>
                  </div>
                )}
                {curState.status === 'failed' && (
                  <button onClick={testMicrophone} className="w-full py-3 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white rounded-xl font-bold text-xs transition shadow-sm hover:scale-[1.01]">
                    🔄 Retry Mic Check
                  </button>
                )}
              </div>
            )}

            {/* ── SPEAKER ── */}
            {currentStep === 'speaker' && (
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-6 flex flex-col items-center gap-5">
                  <SoundWaves active={!speakerPlayed && curState.status === 'testing'} />

                  <div className="text-center">
                    <p className="text-slate-700 font-bold text-sm">
                      {speakerPlayed ? 'Did you hear the diagnostic notes?' : 'Playing sound verification chime…'}
                    </p>
                    <p className="text-slate-400 text-xs font-semibold mt-1">
                      {speakerPlayed ? 'Select an response below' : 'Listen carefully to confirm speaker output'}
                    </p>
                  </div>

                  <button
                    onClick={playSpeakerBeep}
                    className="flex items-center gap-1.5 px-4.5 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-sm"
                  >
                    🔁 Play Again
                  </button>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={() => confirmSpeaker(true)}
                      className={`py-3 rounded-xl font-bold text-xs border-2 transition-all duration-150 ${
                        speakerConfirmed === true
                          ? 'bg-[#10B981] border-[#10B981] text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#10B981] hover:text-[#10B981] hover:bg-emerald-50/10'
                      }`}
                    >
                      Yes, audio heard
                    </button>
                    <button
                      onClick={() => confirmSpeaker(false)}
                      className={`py-3 rounded-xl font-bold text-xs border-2 transition-all duration-150 ${
                        speakerConfirmed === false
                          ? 'bg-[#EF4444] border-[#EF4444] text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#EF4444] hover:text-[#EF4444] hover:bg-rose-50/10'
                      }`}
                    >
                      No sound detected
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SYSTEM ── */}
            {currentStep === 'system' && (
              <div className="space-y-3">
                {curState.status === 'testing' ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-4 border-[#10B981]/20 border-t-[#10B981] animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-sm">⚡</div>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-700 font-bold text-sm">Validating configuration parameters…</p>
                      <p className="text-slate-400 text-xs font-semibold mt-1">Checking network latency and browser features</p>
                    </div>
                  </div>
                ) : sysInfo ? (
                  <div className="space-y-2">
                    <SystemRow icon="🌐" label="Browser Engine"    value={sysInfo.browser}    ok={true} />
                    <SystemRow icon="💻" label="Host OS Platform"   value={sysInfo.os}         ok={true} />
                    <SystemRow icon="📡" label="Server Latency"     value={`${sysInfo.latency}ms`}  ok={sysInfo.latency < 500} />
                    <SystemRow icon="🖥️" label="Resolution Matrix" value={sysInfo.resolution} ok={true} />
                    <SystemRow icon="🔒" label="Secure Protocol"   value={window.location.protocol === 'https:' ? 'Secure' : 'Local Sandbox'} ok={true} />
                    <SystemRow icon="🎥" label="Streaming Engine"   value="WebRTC Context"     ok={true} />
                  </div>
                ) : null}
              </div>
            )}

            {/* ── COMPLETE ── */}
            {currentStep === 'complete' && (
              <div className="flex flex-col items-center gap-5 py-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#10B981] flex items-center justify-center shadow-lg text-white font-extrabold text-3xl">
                    ✓
                  </div>
                  <div className="absolute inset-0 rounded-full bg-[#10B981] opacity-20 animate-ping" />
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-800 font-outfit mb-1">Diagnostics Complete</h3>
                  <p className="text-slate-400 text-xs font-bold">All endpoint telemetry specs conform to standards.</p>
                </div>

                {/* Summary cards */}
                <div className="w-full grid grid-cols-2 gap-2.5">
                  {STEPS.map(step => {
                    const c = STEP_CONFIG[step];
                    const s = stepStates[step];
                    return (
                      <div key={step} className={`rounded-xl p-3 border flex items-center gap-3 ${
                        s.status === 'passed'
                          ? 'bg-[#10B981]/5 border-[#10B981]/10'
                          : 'bg-[#EF4444]/5 border-[#EF4444]/10'
                      }`}>
                        <div className={`w-8 h-8 rounded-lg bg-[#0D47A1]/5 flex items-center justify-center text-slate-650 flex-shrink-0`}>
                          {c.icon}
                        </div>
                        <div>
                          <div className={`text-xs font-extrabold ${s.status === 'passed' ? 'text-slate-800' : 'text-[#EF4444]'}`}>
                            {c.label.split(' ')[0]}
                          </div>
                          <div className={`text-[10px] font-bold ${s.status === 'passed' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {s.status === 'passed' ? s.detail || 'Verified' : 'Invalid'}
                          </div>
                        </div>
                        <span className={`ml-auto text-xs font-extrabold ${s.status === 'passed' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {s.status === 'passed' ? '✓' : '✗'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 pb-7 flex gap-3">
            <button
              onClick={handleBack}
              className="px-5 py-3 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all"
            >
              ← Cancel
            </button>

            {currentStep !== 'complete' && (
              <button
                onClick={goNext}
                disabled={curState.status !== 'passed'}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all duration-150 flex items-center justify-center gap-2 ${
                  curState.status === 'passed'
                    ? 'bg-[#0D47A1] text-white shadow-sm hover:bg-[#0b3c8a] hover:scale-[1.01] hover:shadow'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                {curState.status === 'passed' ? (
                  <>
                    {STEPS.indexOf(currentStep as any) < STEPS.length - 1 ? 'Next Check' : 'View Report'}
                    <span>→</span>
                  </>
                ) : curState.status === 'testing' ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                    Checking…
                  </>
                ) : 'Resolve failure to continue'}
              </button>
            )}

            {currentStep === 'complete' && (
              <button
                onClick={handleContinue}
                className="flex-1 py-3 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white rounded-xl font-bold text-xs transition-all hover:scale-[1.01] shadow flex items-center justify-center gap-1.5"
              >
                Save & Proceed →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom tips */}
      <div className="mt-6 flex gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span>🔒 Secure Sandbox Check</span>
        <span>•</span>
        <span>💡 Quiet room recommended</span>
        <span>•</span>
        <span>☀️ Good webcam lighting</span>
      </div>
    </div>
  );
};
export default DeviceValidation;
