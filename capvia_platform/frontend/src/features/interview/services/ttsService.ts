/**
 * TTSService v3 — OpenAI TTS API (primary) + Web Speech API (fallback)
 *
 * OpenAI TTS is used when REACT_APP_OPENAI_API_KEY is set.
 * It returns an MP3 blob played via HTMLAudioElement — no browser
 * autoplay restrictions, no Chrome 15s cutoff, no voice loading race.
 *
 * Web Speech API is used as fallback when the key is absent.
 */

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

// Keep a reference to stop audio mid-play
let currentAudio: HTMLAudioElement | null = null;

export class TTSService {
  private static voices: SpeechSynthesisVoice[] = [];
  private static initialized = false;
  private static keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  // ── Initialize (Web Speech fallback voice loading) ─────────────────────────
  static initialize(): Promise<void> {
    return new Promise(resolve => {
      const tryLoad = () => {
        const v = window.speechSynthesis?.getVoices?.() ?? [];
        if (v.length > 0) {
          TTSService.voices = v;
          TTSService.initialized = true;
          resolve();
        }
      };
      tryLoad();
      if (!TTSService.initialized) {
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = () => tryLoad();
        }
        setTimeout(() => {
          TTSService.initialized = true;
          resolve();
        }, 3000);
      }
    });
  }

  // ── Unlock Chrome Web Speech (call synchronously in click handler) ─────────
  static unlock(): void {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis?.speak(u);
    } catch (_) {}
  }

  // ── Stop any current speech ────────────────────────────────────────────────
  static stop(): void {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    TTSService.stopKeepAlive();
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }

  // ── Main speak ─────────────────────────────────────────────────────────────
  static async speak(text: string, opts?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
    TTSService.stop();

    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    const hasKey = apiKey && apiKey !== 'sk-your-openai-key-here';

    if (hasKey) {
      return TTSService.speakOpenAI(text, apiKey!);
    } else {
      return TTSService.speakWebSpeech(text, opts);
    }
  }

  // ── OpenAI TTS (primary) ───────────────────────────────────────────────────
  private static async speakOpenAI(text: string, apiKey: string): Promise<void> {
    console.log('🔊 OpenAI TTS speaking:', text.slice(0, 60));
    try {
      const response = await fetch(OPENAI_TTS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',   // natural, clear voice  
          speed: 0.95,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenAI TTS ${response.status}: ${(err as any)?.error?.message ?? response.statusText}`);
      }

      const blob      = await response.blob();
      const url       = URL.createObjectURL(blob);
      const audio     = new Audio(url);
      currentAudio    = audio;
      audio.volume    = 1.0;

      console.log('🔊 OpenAI TTS: playing audio');

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          console.log('🔊 OpenAI TTS: done');
          resolve();
        };
        audio.onerror = (e) => {
          console.error('🔊 OpenAI TTS audio error:', e);
          URL.revokeObjectURL(url);
          currentAudio = null;
          resolve(); // don't block interview
        };
        audio.play().catch(e => {
          console.error('🔊 audio.play() failed:', e);
          resolve();
        });
      });
    } catch (err) {
      console.error('🔊 OpenAI TTS error:', err);
      // Fallback to Web Speech if OpenAI TTS fails
      return TTSService.speakWebSpeech(text);
    }
  }

  // ── Web Speech API (fallback) ──────────────────────────────────────────────
  private static speakWebSpeech(text: string, opts?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
    return new Promise(async (resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) { resolve(); return; }

      synth.cancel();
      await new Promise(r => setTimeout(r, 80));

      // Refresh voices
      const allVoices = synth.getVoices();
      if (allVoices.length > 0) TTSService.voices = allVoices;

      const utter    = new SpeechSynthesisUtterance(text);
      utter.rate     = opts?.rate   ?? 0.9;
      utter.pitch    = opts?.pitch  ?? 1.0;
      utter.volume   = opts?.volume ?? 1.0;
      utter.lang     = 'en-US';

      const voice =
        TTSService.voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ??
        TTSService.voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ??
        TTSService.voices.find(v => v.lang === 'en-US') ??
        TTSService.voices[0] ?? null;

      if (voice) { utter.voice = voice; utter.lang = voice.lang; }

      let done = false;
      const finish = () => { if (!done) { done = true; TTSService.stopKeepAlive(); resolve(); } };

      utter.onstart = () => TTSService.startKeepAlive();
      utter.onend   = finish;
      utter.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') console.error('🔊 WebSpeech error:', e.error);
        finish();
      };

      synth.speak(utter);
      console.log('🔊 WebSpeech speak() called');

      // Safety: resolve after 3s if browser never speaks
      setTimeout(() => { if (!done) { console.warn('🔊 WebSpeech timeout — resolving'); finish(); } }, 3000);
    });
  }

  // ── Chrome 15s keepalive ───────────────────────────────────────────────────
  private static startKeepAlive() {
    TTSService.stopKeepAlive();
    TTSService.keepAliveTimer = setInterval(() => {
      const s = window.speechSynthesis;
      if (s?.speaking && !s?.paused) { s.pause(); s.resume(); }
    }, 9000);
  }
  private static stopKeepAlive() {
    if (TTSService.keepAliveTimer) { clearInterval(TTSService.keepAliveTimer); TTSService.keepAliveTimer = null; }
  }

  // ── Misc ───────────────────────────────────────────────────────────────────
  static pause()      { currentAudio?.pause(); try { window.speechSynthesis?.pause(); } catch (_) {} }
  static resume()     { currentAudio?.play();  try { window.speechSynthesis?.resume(); } catch (_) {} }
  static isSpeaking() { return !!currentAudio || window.speechSynthesis?.speaking; }
  static getVoices()  { return TTSService.voices; }
}