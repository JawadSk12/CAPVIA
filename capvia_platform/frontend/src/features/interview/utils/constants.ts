export const VALIDATION_THRESHOLDS = {
  CAMERA: {
    MIN_RESOLUTION_WIDTH: 640,
    MIN_RESOLUTION_HEIGHT: 480,
    MIN_FRAME_RATE: 15,
  },
  AUDIO: {
    MIN_SNR: 15, // dB
    MAX_NOISE_FLOOR: -50, // dB
    MIN_RMS: 0.01,
    MAX_CLIPPING_PERCENTAGE: 5,
  },
  ECHO: {
    MAX_ACCEPTABLE_ECHO: 0.3, // correlation coefficient
    MAX_LATENCY: 150, // ms
  },
};

export const ERROR_MESSAGES = {
  CAMERA_NOT_FOUND: 'No camera detected. Please connect a camera and refresh.',
  CAMERA_PERMISSION_DENIED: 'Camera access denied. Please allow camera permissions in your browser settings.',
  MIC_NOT_FOUND: 'No microphone detected. Please connect a microphone and refresh.',
  MIC_PERMISSION_DENIED: 'Microphone access denied. Please allow microphone permissions.',
  SPEAKER_NOT_DETECTED: 'Cannot detect speakers. Please ensure your audio output is working.',
  POOR_AUDIO_QUALITY: 'Audio quality is too poor. Please reduce background noise.',
  HIGH_ECHO_DETECTED: 'Echo detected. Please use headphones for best results.',
};

export const STORAGE_KEYS = {
  SESSION_ID: 'intellirecruit_session_id',
  DEVICE_METADATA: 'intellirecruit_device_metadata',
  VALIDATION_STATE: 'intellirecruit_validation_state',
};