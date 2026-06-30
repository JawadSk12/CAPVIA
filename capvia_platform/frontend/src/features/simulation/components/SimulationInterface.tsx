import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { attemptsApi, internshipsApi } from '../services/api';

const AUTO_SAVE_INTERVAL = 30000; // 30s

const CodeEditor = ({ value, onChange, language }: { value: string; onChange: (v: string) => void; language?: string }) => (
  <div className="rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-xl shadow-indigo-900/5 bg-slate-900 group transition-all duration-300 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
    <div className="flex items-center px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
      </div>
      <div className="ml-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest">{language || 'Code'}</div>
    </div>
    <textarea value={value} onChange={e => onChange(e.target.value)}
      spellCheck={false}
      className="w-full h-64 bg-transparent px-5 py-4 text-slate-300 font-mono text-sm focus:outline-none resize-none leading-relaxed"
      placeholder={`// Write your ${language || 'code'} here...\n`} />
  </div>
);

const WrittenAnswer = ({ value, onChange, placeholder }: any) => (
  <div className="relative group">
    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-300 to-fuchsia-300 rounded-[1.5rem] blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
    <textarea value={value} onChange={e => onChange(e.target.value)}
      rows={6}
      className="relative w-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl shadow-indigo-900/5 rounded-[1.5rem] px-6 py-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all text-sm resize-none leading-relaxed"
      placeholder={placeholder || 'Write your detailed answer here...'} />
  </div>
);

export const SimulationInterface: React.FC = () => {
  const params = useParams();
  const attemptId = params?.attemptId as string;
  const router = useRouter();
  const [attempt, setAttempt] = useState<any>(null);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [code, setCode] = useState<Record<string, Record<string, string>>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const behaviorBuffer = useRef<any[]>([]);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();

  // Anti-cheat tracking
  const logEvent = useCallback((type: string, data?: any) => {
    const ev = { event_type: type, timestamp: new Date().toISOString(), round_number: currentRound, event_data: data, severity: ['tab_switch', 'copy_paste'].includes(type) ? 'warning' : 'info' };
    behaviorBuffer.current.push(ev);
    if (behaviorBuffer.current.length >= 5) {
      attemptsApi.logEvents(parseInt(attemptId!), behaviorBuffer.current).catch(() => {});
      behaviorBuffer.current = [];
    }
  }, [attemptId, currentRound]);

  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) logEvent('tab_switch'); };
    const handleBlur = () => logEvent('focus_lost');
    const handleFocus = () => logEvent('focus_gained');
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [logEvent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await attemptsApi.get(parseInt(attemptId!));
        if (cancelled) return;
        const a = r.data;
        setAttempt(a);
        setCurrentRound(a.current_round || 1);
        setAnswers(a.answers || {});
        setCode(a.code_submissions || {});
        if (a.expires_at) {
          const diff = new Date(a.expires_at).getTime() - Date.now();
          setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
        }
        // Fetch blueprint in same async chain — loading stays true until done
        if (a.internship_id) {
          try {
            const bpRes = await internshipsApi.getBlueprint(a.internship_id);
            if (!cancelled && bpRes.data?.rounds) setBlueprint(bpRes.data);
          } catch { /* ignore */ }
        }
      } catch {
        if (!cancelled) router.push('/dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(t); handleSubmit(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // Auto-save
  const autoSave = useCallback(async () => {
    if (!attempt || submitting) return;
    setSaving(true);
    const rk = `round_${currentRound}`;
    const currentTask = getRound()?.tasks?.[currentTaskIdx];
    if (currentTask) {
      const tId = currentTask.task_id || currentTask.id;
      await attemptsApi.submitAnswer(parseInt(attemptId!), {
        round_number: currentRound,
        task_id: tId,
        answer: answers[rk]?.[tId],
        code: code[rk]?.[tId],
      }).catch(() => {});
    }
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  }, [attempt, currentRound, currentTaskIdx, answers, code, attemptId, submitting]);

  useEffect(() => {
    autoSaveRef.current = setInterval(autoSave, AUTO_SAVE_INTERVAL);
    return () => clearInterval(autoSaveRef.current);
  }, [autoSave]);

  const getRound = () => blueprint?.rounds?.find((r: any) => r.round_number === currentRound);
  const getTask = () => getRound()?.tasks?.[currentTaskIdx];

  const setAnswer = (val: string) => {
    const rk = `round_${currentRound}`;
    const task = getTask();
    if (!task) return;
    const tId = task.task_id || task.id;
    setAnswers(prev => ({ ...prev, [rk]: { ...(prev[rk] || {}), [tId]: val } }));
  };

  const setCodeVal = (val: string) => {
    const rk = `round_${currentRound}`;
    const task = getTask();
    if (!task) return;
    const tId = task.task_id || task.id;
    setCode(prev => ({ ...prev, [rk]: { ...(prev[rk] || {}), [tId]: val } }));
  };

  const getCurrentAnswer = () => {
    const task = getTask();
    if (!task) return '';
    const tId = task.task_id || task.id;
    return answers[`round_${currentRound}`]?.[tId] || '';
  };
  const getCurrentCode = () => {
    const task = getTask();
    if (!task) return '';
    const tId = task.task_id || task.id;
    return code[`round_${currentRound}`]?.[tId] || '';
  };

  const saveAndAdvance = async () => {
    await autoSave();
    const round = getRound();
    if (currentTaskIdx < (round?.tasks?.length || 1) - 1) {
      setCurrentTaskIdx(t => t + 1);
    } else if (currentRound < 5) {
      await attemptsApi.completeRound(parseInt(attemptId!), currentRound).catch(() => {});
      setCurrentRound(r => r + 1);
      setCurrentTaskIdx(0);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!window.confirm('Are you sure you want to submit your simulation? This cannot be undone.')) return;
    setSubmitting(true);
    await autoSave();
    if (behaviorBuffer.current.length > 0) {
      await attemptsApi.logEvents(parseInt(attemptId!), behaviorBuffer.current).catch(() => {});
    }
    try {
      await attemptsApi.submit(parseInt(attemptId!));
      router.push(`/candidate/simulation/${attemptId}/complete`);
    } catch { setSubmitting(false); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading || !blueprint) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-900 font-semibold">Preparing your simulation...</p>
      <p className="text-slate-400 text-sm">Loading AI-generated tasks for your role</p>
      {!loading && !blueprint && (
        <button onClick={() => router.push('/dashboard')} className="mt-2 text-indigo-600 text-sm hover:text-indigo-500">
          ← Back to Dashboard
        </button>
      )}
    </div>
  );

  const round = getRound();
  const task = getTask();
  const totalTasks = round?.tasks?.length || 1;

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col font-sans selection:bg-indigo-200 selection:text-indigo-900 overflow-hidden relative">
      {/* Animated Mesh Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] mix-blend-multiply animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      {/* Top Bar */}
      <div className="bg-white/60 backdrop-blur-2xl border-b border-white shadow-[0_4px_30px_rgb(0,0,0,0.02)] px-8 py-4 flex items-center justify-between flex-shrink-0 z-20 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="text-slate-900 font-extrabold tracking-tight text-lg">CAPVIA</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/5 p-1 rounded-2xl">
            {[1, 2, 3, 4, 5].map(r => (
              <div key={r} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${r === currentRound ? 'bg-white text-indigo-600 shadow-sm' : r < currentRound ? 'text-slate-500 hover:bg-white/50' : 'text-slate-400'}`}>
                {r < currentRound ? <span className="text-emerald-500">✓</span> : null}
                <span>R{r}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          {savedAt && <span className="text-xs font-medium text-slate-400 bg-white/50 px-3 py-1.5 rounded-full border border-white">Saved {savedAt}</span>}
          {saving && <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full animate-pulse">Saving...</span>}
          <div className={`text-sm font-mono font-black px-4 py-2 rounded-2xl border ${timeLeft < 600 ? 'text-rose-600 border-rose-200 bg-rose-50/80 shadow-inner shadow-rose-100' : 'text-slate-700 border-white bg-white/80 shadow-sm'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="group relative px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-bold transition-all disabled:opacity-50 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            <span className="relative z-10">{submitting ? 'Submitting...' : 'Submit All →'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10 px-4 py-6 gap-6 max-w-[1600px] w-full mx-auto">
        {/* Left Panel — Round Info */}
        <div className="w-72 bg-white/60 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] flex flex-col flex-shrink-0 overflow-hidden relative">
          <div className="p-6 border-b border-white/50 bg-gradient-to-b from-white/80 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-600 bg-fuchsia-50 px-3 py-1 rounded-full ring-1 ring-fuchsia-200/50 shadow-sm">Round {currentRound}/5</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">{round?.name}</p>
            <p className="text-xs text-slate-500 mt-2 font-semibold bg-slate-100/50 inline-block px-2.5 py-1 rounded-lg">{round?.duration_minutes} min · {totalTasks} tasks</p>
          </div>
          <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            {(round?.tasks || []).map((t: any, i: number) => {
              const tId = t.task_id || t.id;
              const hasAnswer = answers[`round_${currentRound}`]?.[tId] || code[`round_${currentRound}`]?.[tId];
              return (
              <button key={tId} onClick={() => setCurrentTaskIdx(i)}
                className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-300 text-sm font-semibold relative overflow-hidden group ${i === currentTaskIdx ? 'bg-white text-indigo-700 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-indigo-100' : 'text-slate-500 hover:bg-white/80 hover:text-slate-900'}`}>
                {i === currentTaskIdx && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-fuchsia-500 rounded-r-full" />}
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-3 text-center text-[10px] font-black transition-colors ${hasAnswer ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/20' : i === currentTaskIdx ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200/70 text-slate-400 group-hover:bg-slate-300'}`}>
                  {hasAnswer ? '✓' : i + 1}
                </span>
                {t.title || `Task ${i + 1}`}
              </button>
            )})}
          </div>
          <div className="p-5 border-t border-white bg-white/40 backdrop-blur-md">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</p>
              <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{Math.round(((currentRound - 1) / 5) * 100)}%</p>
            </div>
            <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${((currentRound - 1) / 5) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Main Task Area */}
        <div className="flex-1 overflow-auto bg-white/60 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-8 lg:p-12 relative">
          {task ? (
            <div className="max-w-3xl mx-auto">
              <div className="mb-5">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="text-xs text-indigo-600 font-bold bg-indigo-50/80 px-3 py-1 rounded-lg border border-indigo-100">Task {currentTaskIdx + 1} of {totalTasks}</span>
                  <span className="text-xs font-bold text-fuchsia-600 uppercase tracking-widest bg-fuchsia-50/80 px-3 py-1 rounded-lg border border-fuchsia-100">{task.type}</span>
                  {task.language && <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-white font-mono shadow-sm">{task.language}</span>}
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-8 tracking-tight leading-tight">{task.title || `Task ${currentTaskIdx + 1}`}</h2>
                
                {round?.scenario && currentTaskIdx === 0 && (
                  <div className="relative bg-gradient-to-br from-indigo-600/5 via-fuchsia-600/5 to-blue-600/5 border border-white shadow-xl shadow-indigo-900/5 rounded-[2rem] p-8 mb-8 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-indigo-900 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
                      <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.2H4.8L12 5.8z"/></svg>
                    </div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900">Mission Briefing</h3>
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed font-medium relative z-10 whitespace-pre-wrap pl-[3.25rem]">{round.scenario}</p>
                  </div>
                )}

                {(task.prompt || task.description) && (
                  <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-[2rem] p-8 mb-8 relative">
                    <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-indigo-500 rounded-r-full opacity-20" />
                    <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{task.prompt || task.description}</p>
                  </div>
                )}
                {task.buggy_code && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-8 mb-8 shadow-inner shadow-rose-100/50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">!</span>
                      <p className="text-sm text-rose-700 font-bold uppercase tracking-widest">Buggy Code to Fix</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-6 overflow-auto shadow-lg shadow-rose-900/10">
                      <pre className="text-sm text-slate-300 font-mono leading-relaxed">{task.buggy_code}</pre>
                    </div>
                  </div>
                )}
                {task.options && (
                  <div className="grid gap-4 mb-8">
                    {task.options.map((opt: any) => (
                      <label key={opt.id} className={`flex items-start gap-4 p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${getCurrentAnswer() === opt.id ? 'border-indigo-500 bg-indigo-50/30 shadow-lg shadow-indigo-500/10' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md'}`}>
                        <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${getCurrentAnswer() === opt.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                          {getCurrentAnswer() === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">{opt.id}. {opt.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{opt.description}</p>
                          {opt.pros?.length > 0 && <p className="text-xs font-semibold text-emerald-600 mt-2 tracking-wide uppercase">Pros: {opt.pros.join(' · ')}</p>}
                          {opt.cons?.length > 0 && <p className="text-xs font-semibold text-rose-600 tracking-wide uppercase">Cons: {opt.cons.join(' · ')}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Answer Area */}
              <div className="space-y-6">
                {(task.type === 'code' || task.type === 'debugging') && (
                  <div className="relative">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        Your Implementation
                      </label>
                      {task.starter_code && !getCurrentCode() && (
                        <button onClick={() => setCodeVal(task.starter_code)} className="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-4 py-1.5 rounded-xl transition-all shadow-sm">Load Starter Code</button>
                      )}
                    </div>
                    <CodeEditor value={getCurrentCode()} onChange={setCodeVal} language={task.language} />
                  </div>
                )}

                {(task.type === 'written' || task.type === 'multiple_choice') && (
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4 px-2">
                      <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      {task.type === 'multiple_choice' ? 'Justification (Optional)' : 'Your Response'}
                    </label>
                    <WrittenAnswer value={getCurrentAnswer()} onChange={setAnswer}
                      placeholder={task.type === 'multiple_choice' ? 'Explain the reasoning behind your choice...' : 'Structure your answer clearly...'} />
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100">
                <button onClick={() => currentTaskIdx > 0 ? setCurrentTaskIdx(t => t - 1) : (currentRound > 1 && setCurrentRound(r => r - 1))}
                  disabled={currentRound === 1 && currentTaskIdx === 0}
                  className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm font-bold disabled:opacity-30 disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed">
                  ← Previous
                </button>
                {currentRound === 5 && currentTaskIdx === totalTasks - 1 ? (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black transition-all disabled:opacity-50 shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:-translate-y-0.5 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10">🚀 Submit Simulation</span>
                  </button>
                ) : (
                  <button onClick={saveAndAdvance}
                    className="group px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-600/20 hover:shadow-2xl hover:shadow-indigo-600/30 hover:-translate-y-0.5 text-sm font-black transition-all relative overflow-hidden">
                    <span className="relative z-10">{currentTaskIdx < totalTasks - 1 ? 'Next Task' : 'Next Round'} →</span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">No task selected</div>
          )}
        </div>
      </div>
    </div>
  );
};
