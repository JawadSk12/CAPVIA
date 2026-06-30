export interface MediaDeviceInfo {
  deviceId: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  label: string;
  groupId: string;
}

export interface DeviceCapabilities {
  camera: {
    available: boolean;
    deviceId?: string;
    label?: string;
    resolution?: {
      width: number;
      height: number;
    };
    frameRate?: number;
  };
  microphone: {
    available: boolean;
    deviceId?: string;
    label?: string;
    sampleRate?: number;
  };
  speaker: {
    available: boolean;
    deviceId?: string;
    label?: string;
  };
}

export interface AudioMetrics {
  rms: number; // Root Mean Square (volume level)
  snr: number; // Signal-to-Noise Ratio
  clipping: boolean;
  noiseFloor: number;
  clarity: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface EchoTestResult {
  echoDetected: boolean;
  echoCancellationActive: boolean;
  latency: number; // milliseconds
}

export interface DeviceQualityMetadata {
  timestamp: string;
  sessionId: string;
  deviceFingerprint: string;
  camera: {
    resolution: string;
    frameRate: number;
    facing?: string;
  };
  microphone: {
    snr: number;
    clarity: string;
    backgroundNoise: number;
  };
  speaker: {
    confirmed: boolean;
  };
  echo: EchoTestResult;
  network: {
    bandwidth: number;
    latency: number;
  };
}