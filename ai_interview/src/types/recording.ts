export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  videoBlob: Blob | null;
  audioBlob: Blob | null;
  error: string | null;
}

export interface RecordingOptions {
  video: boolean;
  audio: boolean;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export interface VideoConstraints {
  width: { ideal: number };
  height: { ideal: number };
  frameRate: { ideal: number };
  facingMode: string;
}

export interface AudioConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: { ideal: number };
}