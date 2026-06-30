export type ValidationStep = 
  | 'welcome'
  | 'camera'
  | 'microphone'
  | 'speaker'
  | 'echo'
  | 'clarity'
  | 'complete';

export interface EchoTestResult {
  echoDetected: boolean;
  echoCancellationActive: boolean;
  latency: number;
}

export interface AudioMetrics {
  clarity: 'excellent' | 'good' | 'fair' | 'poor';
  snr: number;
  noiseFloor: number;
}

export interface ValidationState {
  currentStep: ValidationStep;
  completedSteps: ValidationStep[];
  camera: {
    passed: boolean;
    error?: string;
    metadata?: any;
  };
  microphone: {
    passed: boolean;
    error?: string;
    metadata?: any;
  };
  speaker: {
    passed: boolean;
    error?: string;
  };
  echo: {
    passed: boolean;
    result?: EchoTestResult;
  };
  clarity: {
    passed: boolean;
    metrics?: AudioMetrics;
  };
  overallPassed: boolean;
}

export interface ValidationError {
  step: ValidationStep;
  code: string;
  message: string;
  recoverable: boolean;
  guidance: string;
}