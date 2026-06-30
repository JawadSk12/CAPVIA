import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

const STEP_CONFIG: Record<Step, { icon: string; label: string; desc: string; color: string; badge: string }> = {
  camera:     { icon: '📷', label: 'Camera',      desc: 'Verifying video feed quality',         color: 'from-[#0D47A1] to-[#42A5F5]',   badge: '#0D47A1' },
  microphone: { icon: '🎤', label: 'Microphone',  desc: 'Detecting audio input levels',         color: 'from-[#7C3AED] to-[#A78BFA]',   badge: '#7C3AED' },
  speaker:    { icon: '🔊', label: 'Speaker',     desc: 'Confirming audio playback',            color: 'from-[#F59E0B] to-[#FCD34D]',   badge: '#F59E0B' },
  system:     { icon: '⚡', label: 'System',      desc: 'Checking browser & connection',        color: 'from-[#10B981] to-[#34D399]',   badge: '#10B981' },
  complete:   { icon: '🎯', label: 'Complete',    desc: 'All systems ready!',                   color: 'from-[#10B981] to-[#059669]',   badge: '#10B981' },
};

// ─── Animated Mic Bars Helper ─────────────────────────────────────────────────

const MicBars: React.FC<{ volume: number }> = ({ volume }) => {
  const bars = 24;
  return (
    <div className="flex items-end justify-center gap-[2px] h-16">
      {Array.from({ length: bars }).map((_, i) => {
        const center = bars / 2;
        const dist = Math.abs(i - center) / center;
        const base = 8 + (1 - dist) * 24;
        const animated = volume > 2 ? base + (volume / 100) * 32 * (0.5 + Math.random() * 0.5) : base;
        const height = Math.min(64, Math.max(6, animated));
        const active = volume > 5;
        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              active
                ? volume > 60 ? 'bg-green-400' : volume > 30 ? 'bg-purple-400' : 'bg-purple-500/60'
                : 'bg-gray-700'
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
  <div className="relative flex items-center justify-center w-24 h-24">
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className={`absolute rounded-full border-2 transition-all ${
          active
            ? 'border-orange-400 animate-ping opacity-30'
            : 'border-gray-700 opacity-20'
        }`}
        style={{
          width: `${i * 30 + 20}px`,
          height: `${i * 30 + 20}px`,
          animationDelay: `${i * 0.25}s`,
          animationDuration: '1.5s',
        }}
      />
    ))}
    <div className="relative z-10 text-4xl">🔊</div>
  </div>
);

// ─── Camera Overlay ───────────────────────────────────────────────────────────

const CameraOverlay: React.FC<{ status: StepStatus }> = ({ status }) => {
  if (status === 'testing') return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-12 h-12 rounded-full border-4 border-blue-400 border-t-transparent animate-spin mb-3" />
      <span className="text-blue-200 text-sm font-medium">Accessing camera…</span>
    </div>
  );
  if (status === 'passed') return (
    <>
      {/* Corner brackets */}
      {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-6 h-6 border-green-400 ${
          i < 2 ? 'border-t-2' : 'border-b-2'} ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'
        }`} />
      ))}
      {/* Face guide circle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-40 h-52 rounded-full border-2 border-dashed border-green-400/50 animate-pulse" />
      </div>
      {/* Live badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        LIVE
      </div>
      {/* Resolution badge */}
      <div className="absolute bottom-3 right-3 bg-black/60 text-gray-300 text-[10px] px-2 py-1 rounded-md backdrop-blur-sm font-mono">
        HD 720p
      </div>
    </>
  );
  if (status === 'failed') return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/70 backdrop-blur-sm">
      <div className="text-5xl mb-2">🚫</div>
      <span className="text-red-300 text-sm font-medium">Camera blocked</span>
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
  <div className="flex items-center justify-center gap-0 mb-10">
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
            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-500 ${
              isPassed  ? `bg-gradient-to-br ${cfg.color} shadow-lg scale-105` :
              isFailed  ? 'bg-red-600 shadow-lg scale-105' :
              isTesting ? `bg-gradient-to-br ${cfg.color} opacity-70 animate-pulse` :
              isActive  ? `bg-gradient-to-br ${cfg.color} opacity-80` :
                          'bg-gray-800 border border-gray-700'
            }`}>
              {isPassed  ? <span className="text-white text-base">✓</span> :
               isFailed  ? <span className="text-white text-base">✗</span> :
               isTesting ? <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" /> :
                           <span className={isActive ? 'text-white' : 'text-gray-500'}>{cfg.icon}</span>}
              {/* Glow ring when active */}
              {(isActive || isTesting) && (
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${cfg.color} opacity-30 animate-ping`} />
              )}
            </div>
            <span className={`text-xs mt-1.5 font-semibold transition-colors ${
              isPassed ? 'text-green-400' : isFailed ? 'text-red-400' : isActive ? 'text-white' : 'text-gray-600'
            }`}>{cfg.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-12 h-0.5 mb-4 transition-all duration-700 rounded-full ${
              stepStates[steps[idx + 1]].status !== 'idle' || currentStep === steps[idx + 1]
                ? `bg-gradient-to-r ${cfg.color}` : 'bg-gray-800'
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
      <span>{icon}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-700 font-semibold">{value}</span>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white`}
        style={{ background: ok ? '#10B981' : '#EF4444' }}>
        {ok ? '✓' : '✗'}
      </span>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const DeviceValidation: React.FC<{ onComplete?: () => void; onBack?: () => void }> = ({ onComplete, onBack }) => {
  const navigate = useNavigate();
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
  const [transition,       setTransition]       = useState(false);  // card fade

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
      const res = settings.width && settings.height ? `${settings.width}×${settings.height}` : 'HD';
      setStatus('camera', 'passed', undefined, res);
    } catch (err: any) {
      setStatus('camera', 'failed', err?.message?.includes('denied') ? 'Camera access denied — check browser permissions' : (err?.message || 'Camera not found'));
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
      setStatus('microphone', 'failed', err?.message?.includes('denied') ? 'Microphone access denied' : 'Microphone not found');
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
      // Play a pleasant two-note chime
      const playNote = (freq: number, start: number, dur: number) => {
        const osc  = ctx.createOscillator();
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
      playNote(880, 0, 0.5);
      playNote(1108, 0.3, 0.6);
      setTimeout(() => setSpeakerPlayed(true), 900);
    } catch {
      setStatus('speaker', 'failed', 'Could not play audio — check browser audio permissions');
    }
  }, []);

  const confirmSpeaker = (heard: boolean) => {
    setSpeakerConfirmed(heard);
    if (heard) setStatus('speaker', 'passed', undefined, 'Audio confirmed');
    else       setStatus('speaker', 'failed', 'No audio detected — check speaker/headphone connection');
  };

  // ── System Check ──────────────────────────────────────────────────────────────

  const runSystemCheck = useCallback(async () => {
    setStatus('system', 'testing');
    const ua      = navigator.userAgent;
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
    const os      = ua.includes('Mac') ? 'macOS' : ua.includes('Win') ? 'Windows' : ua.includes('Linux') ? 'Linux' : 'Unknown OS';
    const res     = `${window.screen.width}×${window.screen.height}`;

    // Ping test
    const t0 = performance.now();
    try { await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-cache' }); } catch {}
    const latency = Math.round(performance.now() - t0);

    await new Promise(r => setTimeout(r, 600)); // brief artificial pause for UX
    setSysInfo({ browser, os, latency, resolution: res });
    setStatus('system', 'passed', undefined, `${latency}ms latency`);
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

  const handleContinue = () => { cleanup(); if (onComplete) onComplete(); else navigate('/validation-complete'); };
  const handleBack     = () => { cleanup(); if (onBack) onBack(); else navigate('/'); };

  const curState    = stepStates[currentStep];
  const cfg         = STEP_CONFIG[currentStep];
  const passedCount = STEPS.filter(s => stepStates[s].status === 'passed').length;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #EEF4FF 50%, #F0F9FF 100%)' }}>

      {/* Background decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #42A5F5, transparent)' }} />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFC107, transparent)' }} />

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
          style={{ background: 'rgba(13,71,161,0.08)', border: '1px solid rgba(13,71,161,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-[#0D47A1] animate-pulse" />
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#0D47A1' }}>Device Check</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          System Diagnostics
        </h1>
        <p className="text-slate-500 text-base max-w-md mx-auto">
          Let's make sure your devices are ready. This takes about 30 seconds.
        </p>
      </div>

      {/* Overall progress mini-bar */}
      <div className="w-full max-w-xl mb-6 z-10">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-medium">{passedCount} of {STEPS.length} checks passed</span>
          <span className="font-bold" style={{ color: '#0D47A1' }}>{Math.round((passedCount / STEPS.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(passedCount / STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #0D47A1, #42A5F5, #10B981)' }}
          />
        </div>
      </div>

      {/* Step progress dots */}
      <div className="z-10 w-full max-w-xl">
        <StepProgress steps={STEPS} stepStates={stepStates} currentStep={currentStep} />
      </div>

      {/* Main Card */}
      <div
        className={`w-full max-w-xl z-10 transition-all duration-200 ${transition ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      >
        <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">

          {/* Gradient top bar */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.color}`} />

          {/* Step Header */}
          <div className="px-7 pt-6 pb-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>
              {cfg.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{cfg.label}</h2>
              <p className="text-slate-500 text-sm">{cfg.desc}</p>
            </div>
            {curState.status === 'passed' && (
              <div className="ml-auto flex-shrink-0 rounded-lg px-3 py-1.5"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <span className="text-[#10B981] text-xs font-bold">✓ PASSED</span>
              </div>
            )}
            {curState.status === 'failed' && (
              <div className="ml-auto flex-shrink-0 rounded-lg px-3 py-1.5"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <span className="text-[#EF4444] text-xs font-bold">✗ FAILED</span>
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
                <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <CameraOverlay status={curState.status} />
                </div>

                {curState.status === 'passed' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: '📐', label: 'Resolution', value: curState.detail || 'HD' },
                      { icon: '🎨', label: 'Color space', value: 'sRGB' },
                      { icon: '⚡', label: 'Frame rate',  value: '30fps' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="bg-[#F8FAFC] rounded-xl p-3 text-center border border-slate-200">
                        <div className="text-base">{icon}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{label}</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {curState.error && (
                  <div className="flex items-start gap-3 rounded-xl p-3.5"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-[#EF4444] text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-[#EF4444] text-sm font-semibold">{curState.error}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Open browser settings → Privacy → Camera → Allow</p>
                    </div>
                  </div>
                )}
                {curState.status === 'failed' && (
                  <button onClick={testCamera}
                    className="w-full py-2.5 text-white rounded-xl font-bold text-sm transition-all"
                    style={{ background: '#0D47A1' }}>
                    🔄 Retry Camera
                  </button>
                )}
              </div>
            )}

            {/* ── MICROPHONE ── */}
            {currentStep === 'microphone' && (
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-slate-700 text-sm font-medium">Speak clearly into your microphone</p>
                    <p className="text-slate-400 text-xs mt-1">Say something like "Hello, testing 1-2-3"</p>
                  </div>
                  <MicBars volume={micVolume} />

                  {/* Volume meter */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Input Level</span>
                      <span className={`font-mono font-semibold ${
                        micVolume > 60 ? 'text-green-400' : micVolume > 20 ? 'text-purple-400' : 'text-gray-500'
                      }`}>{micVolume.toFixed(0)}%</span>
                    </div>
                    <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                      {/* Threshold markers */}
                      <div className="absolute inset-y-0 left-[12%] w-px bg-gray-500/50" />
                      <div className="absolute inset-y-0 left-[60%] w-px bg-gray-500/50" />
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          micVolume > 60 ? 'bg-gradient-to-r from-purple-500 to-green-400' :
                          micVolume > 20 ? 'bg-gradient-to-r from-purple-600 to-purple-400' :
                                          'bg-purple-700'
                        }`}
                        style={{ width: `${micVolume}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                      <span>Silence</span><span>Good</span><span>Loud</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {micVolume > 12 ? (
                      <span className="text-green-400 text-sm font-semibold animate-pulse">✅ Voice detected!</span>
                    ) : (
                      <span className="text-gray-500 text-sm">
                        {curState.status === 'testing' ? 'Listening for voice…' : 'Start speaking'}
                      </span>
                    )}
                  </div>
                </div>

                {curState.error && (
                  <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-lg p-3">
                    <span className="text-red-400 flex-shrink-0">⚠️</span>
                    <p className="text-red-300 text-sm">{curState.error}</p>
                  </div>
                )}
                {curState.status === 'failed' && (
                  <button onClick={testMicrophone} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-sm transition-all">
                    🔄 Retry Microphone
                  </button>
                )}
              </div>
            )}

            {/* ── SPEAKER ── */}
            {currentStep === 'speaker' && (
              <div className="space-y-4">
                <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-6 flex flex-col items-center gap-5">
                  <SoundWaves active={!speakerPlayed && curState.status === 'testing'} />

                  <div className="text-center">
                    <p className="text-gray-200 font-medium">
                      {speakerPlayed ? 'Did you hear the chime?' : 'Playing audio chime…'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {speakerPlayed ? 'Click Yes or No below' : 'Listen carefully for a two-note sound'}
                    </p>
                  </div>

                  <button
                    onClick={playSpeakerBeep}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-semibold transition-all border border-gray-600"
                  >
                    🔁 Play Again
                  </button>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={() => confirmSpeaker(true)}
                      className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all duration-200 ${
                        speakerConfirmed === true
                          ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/30 scale-[1.02]'
                          : 'border-gray-600 text-gray-300 hover:border-green-500 hover:bg-green-950/30 hover:text-green-300'
                      }`}
                    >
                      ✅ Yes, I heard it
                    </button>
                    <button
                      onClick={() => confirmSpeaker(false)}
                      className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all duration-200 ${
                        speakerConfirmed === false
                          ? 'bg-red-700 border-red-500 text-white shadow-lg shadow-red-900/30 scale-[1.02]'
                          : 'border-gray-600 text-gray-300 hover:border-red-500 hover:bg-red-950/30 hover:text-red-300'
                      }`}
                    >
                      ❌ No sound
                    </button>
                  </div>
                </div>

                {curState.error && (
                  <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-lg p-3">
                    <span className="text-red-400 flex-shrink-0">⚠️</span>
                    <p className="text-red-300 text-sm">{curState.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SYSTEM ── */}
            {currentStep === 'system' && (
              <div className="space-y-3">
                {curState.status === 'testing' ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-200 animate-spin"
                        style={{ borderTopColor: '#0D47A1' }} />
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-700 font-semibold">Running system checks…</p>
                      <p className="text-slate-400 text-xs mt-1">Checking browser, OS, and network</p>
                    </div>
                  </div>
                ) : sysInfo ? (
                  <div className="space-y-2">
                    <SystemRow icon="🌐" label="Browser"    value={sysInfo.browser}    ok={true} />
                    <SystemRow icon="💻" label="OS"         value={sysInfo.os}         ok={true} />
                    <SystemRow icon="📡" label="Network"     value={`${sysInfo.latency}ms`}  ok={sysInfo.latency < 500} />
                    <SystemRow icon="🖥️" label="Resolution" value={sysInfo.resolution} ok={true} />
                    <SystemRow icon="🔒" label="HTTPS"      value={window.location.protocol === 'https:' ? 'Secure' : 'Local Dev'} ok={true} />
                    <SystemRow icon="📷" label="Camera API" value="WebRTC"             ok={true} />
                  </div>
                ) : null}
              </div>
            )}

            {/* ── COMPLETE ── */}
            {currentStep === 'complete' && (
              <div className="flex flex-col items-center gap-6 py-2">
                {/* Animated checkmark */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    <span className="text-3xl text-white font-bold">✓</span>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-[#10B981] opacity-20 animate-ping" />
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-1">All Systems Ready! 🚀</h3>
                  <p className="text-slate-500 text-sm">Your setup is verified and ready for the interview.</p>
                </div>

                {/* Summary cards */}
                <div className="w-full grid grid-cols-2 gap-2.5">
                  {STEPS.map(step => {
                    const c = STEP_CONFIG[step];
                    const s = stepStates[step];
                    return (
                      <div key={step} className="rounded-xl p-3 flex items-center gap-3"
                        style={{
                          background: s.status === 'passed' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                          border: s.status === 'passed' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
                        }}>
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-base flex-shrink-0`}>
                          {c.icon}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${s.status === 'passed' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {c.label}
                          </div>
                          <div className={`text-[10px] ${s.status === 'passed' ? 'text-emerald-500' : 'text-red-400'}`}>
                            {s.status === 'passed' ? s.detail || 'Passed' : 'Failed'}
                          </div>
                        </div>
                        <span className={`ml-auto font-bold text-base ${s.status === 'passed' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
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
              className="px-5 py-3 border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 rounded-xl font-semibold text-sm transition-all bg-white"
            >
              ← Back
            </button>

            {currentStep !== 'complete' && (
              <button
                onClick={goNext}
                disabled={curState.status !== 'passed'}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: curState.status === 'passed' ? '#0D47A1' : '#E2E8F0',
                  color: curState.status === 'passed' ? '#fff' : '#94A3B8',
                  cursor: curState.status !== 'passed' ? 'not-allowed' : 'pointer',
                  boxShadow: curState.status === 'passed' ? '0 4px 14px rgba(13,71,161,0.3)' : 'none',
                }}
              >
                {curState.status === 'passed' ? (
                  <>
                    {STEPS.indexOf(currentStep as any) < STEPS.length - 1 ? 'Next Check' : 'View Summary'}
                    <span>→</span>
                  </>
                ) : curState.status === 'testing' ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                    Running check…
                  </>
                ) : 'Fix issue to continue'}
              </button>
            )}

            {currentStep === 'complete' && (
              <button
                onClick={handleContinue}
                className="flex-1 py-3 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
              >
                Proceed to Interview 🎯
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom tips */}
      <div className="mt-6 flex gap-4 text-xs text-slate-400 z-10">
        <span>🔒 Your video is private</span>
        <span>•</span>
        <span>💡 Use a quiet environment</span>
        <span>•</span>
        <span>☀️ Good lighting helps detection</span>
      </div>
    </div>
  );
};

export default DeviceValidation;
