import { useState, useCallback } from 'react';
import { TTSService } from '../services/ttsService';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await TTSService.speak(text);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    TTSService.stop();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    TTSService.pause();
  }, []);

  const resume = useCallback(() => {
    TTSService.resume();
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume,
  };
};