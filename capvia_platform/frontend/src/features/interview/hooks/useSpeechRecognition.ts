/**
 * useSpeechRecognition
 *
 * Wraps the Web Speech API (SpeechRecognition) for use in React.
 * - Auto-starts after the AI finishes speaking a question
 * - Provides live transcript as user speaks
 * - isSupported flag for graceful fallback
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Type definitions for Web Speech API (not in all TS libs)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

function getSpeechRecognition(): ISpeechRecognitionConstructor | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;        // live (interim + final)
  finalTranscript: string;   // committed final text only
  error: string | null;
}

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isSupported: typeof window !== 'undefined' && !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    ),
    transcript: '',
    finalTranscript: '',
    error: null,
  });

  const recognizerRef = useRef<ISpeechRecognition | null>(null);
  const finalRef = useRef('');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_LISTEN_MS = 90_000;
  const SILENCE_MS = 4_000;

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearStopTimer();
    try { recognizerRef.current?.stop(); } catch (_) {}
    setState(prev => ({ ...prev, isListening: false }));
    console.log('[STT] Stopped. Final:', finalRef.current.slice(0, 80));
  }, [clearStopTimer]);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setState(prev => ({
        ...prev, error: 'Speech recognition not supported in this browser.',
      }));
      return;
    }

    try { recognizerRef.current?.abort(); } catch (_) {}

    finalRef.current = '';
    const rec = new SR();
    recognizerRef.current = rec;

    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    const maxTimer = setTimeout(() => stopListening(), MAX_LISTEN_MS);

    rec.onstart = () => {
      console.log('[STT] Listening started');
      setState(prev => ({
        ...prev, isListening: true, transcript: '', finalTranscript: '', error: null,
      }));
    };

    rec.onresult = (event: any) => {
      clearStopTimer();

      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      const combined = (finalRef.current + interim).trim();
      setState(prev => ({
        ...prev,
        transcript: combined,
        finalTranscript: finalRef.current.trim(),
      }));

      // Auto-stop after SILENCE_MS of no new speech
      stopTimerRef.current = setTimeout(() => {
        console.log('[STT] Silence detected — auto stopping');
        stopListening();
      }, SILENCE_MS);
    };

    rec.onerror = (event: any) => {
      clearTimeout(maxTimer);
      clearStopTimer();
      const ignorable = ['aborted', 'no-speech'];
      if (!ignorable.includes(event.error)) {
        console.error('[STT] Error:', event.error);
        setState(prev => ({ ...prev, error: `Recognition error: ${event.error}`, isListening: false }));
      } else {
        setState(prev => ({ ...prev, isListening: false }));
      }
    };

    rec.onend = () => {
      clearTimeout(maxTimer);
      clearStopTimer();
      setState(prev => ({ ...prev, isListening: false, finalTranscript: finalRef.current.trim() }));
      console.log('[STT] Recognition ended');
    };

    try {
      rec.start();
    } catch (e) {
      clearTimeout(maxTimer);
      console.error('[STT] Failed to start:', e);
      setState(prev => ({ ...prev, error: 'Could not start speech recognition.', isListening: false }));
    }
  }, [clearStopTimer, stopListening]);

  const resetTranscript = useCallback(() => {
    finalRef.current = '';
    setState(prev => ({ ...prev, transcript: '', finalTranscript: '', error: null }));
  }, []);

  useEffect(() => {
    return () => {
      clearStopTimer();
      try { recognizerRef.current?.abort(); } catch (_) {}
    };
  }, [clearStopTimer]);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
}
