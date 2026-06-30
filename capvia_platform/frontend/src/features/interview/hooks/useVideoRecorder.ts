import { useState, useCallback, useRef } from 'react';
import { RecordingState } from '../types/recording';
import { RecordingService } from '../services/recordingService';

export const useVideoRecorder = (stream: MediaStream | null) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    videoBlob: null,
    audioBlob: null,
    error: null,
  });

  const recorderRef = useRef<RecordingService>(new RecordingService());
  const durationIntervalRef = useRef<NodeJS.Timeout>();

  const startRecording = useCallback(async () => {
    if (!stream) {
      setRecordingState(prev => ({
        ...prev,
        error: 'No media stream available',
      }));
      return;
    }

    try {
      await recorderRef.current.startRecording(stream, {
        video: true,
        audio: true,
      });

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      }));

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      console.log('🎥 Recording started via hook');
    } catch (error: any) {
      console.error('🎥 Failed to start recording:', error);
      setRecordingState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  }, [stream]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    try {
      const blob = await recorderRef.current.stopRecording();

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        videoBlob: blob,
      }));

      console.log('🎥 Recording stopped via hook, blob size:', blob.size);
      return blob;
    } catch (error: any) {
      console.error('🎥 Failed to stop recording:', error);
      setRecordingState(prev => ({
        ...prev,
        error: error.message,
        isRecording: false,
      }));
      return null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    recorderRef.current.pauseRecording();
    setRecordingState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current.resumeRecording();
    setRecordingState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const resetRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    recorderRef.current.reset();
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      videoBlob: null,
      audioBlob: null,
      error: null,
    });
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
};