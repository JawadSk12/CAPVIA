import { AudioMetrics, EchoTestResult } from '../types/devices';
import { VALIDATION_THRESHOLDS } from '../utils/constants';

export class AudioAnalyzerService {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private source?: MediaStreamAudioSourceNode;
  private isClosed: boolean = false;

  constructor() {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /**
   * Connect audio stream to analyzer
   */
  connectStream(stream: MediaStream): void {
    if (!this.isClosed) {
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
    }
  }

  /**
   * Calculate RMS (Root Mean Square) - volume level
   */
  getRMS(): number {
    if (this.isClosed) return 0;
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    
    return Math.sqrt(sum / this.dataArray.length);
  }

  /**
   * Calculate Signal-to-Noise Ratio
   */
  async calculateSNR(durationMs: number = 3000): Promise<number> {
    if (this.isClosed) return 0;

    const samples: number[] = [];
    const sampleInterval = 100;
    const numSamples = durationMs / sampleInterval;

    for (let i = 0; i < numSamples; i++) {
      await this.sleep(sampleInterval);
      if (this.isClosed) break;
      samples.push(this.getRMS());
    }

    if (samples.length === 0) return 0;

    const signal = Math.max(...samples);
    const noise = Math.min(...samples.filter(s => s > 0.001));

    if (noise === 0) return 100;
    
    const snr = 20 * Math.log10(signal / noise);
    return Math.max(0, snr);
  }

  /**
   * Detect audio clipping
   */
  detectClipping(): boolean {
    if (this.isClosed) return false;

    this.analyser.getByteTimeDomainData(this.dataArray);
    
    let clippedSamples = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] === 0 || this.dataArray[i] === 255) {
        clippedSamples++;
      }
    }
    
    const clippingPercentage = (clippedSamples / this.dataArray.length) * 100;
    return clippingPercentage > VALIDATION_THRESHOLDS.AUDIO.MAX_CLIPPING_PERCENTAGE;
  }

  /**
   * Get noise floor (background noise level)
   */
  async getNoiseFloor(durationMs: number = 2000): Promise<number> {
    if (this.isClosed) return 0;

    const samples: number[] = [];
    const sampleInterval = 100;
    const numSamples = durationMs / sampleInterval;

    for (let i = 0; i < numSamples; i++) {
      await this.sleep(sampleInterval);
      if (this.isClosed) break;
      samples.push(this.getRMS());
    }

    if (samples.length === 0) return 0;

    const sorted = samples.sort((a, b) => a - b);
    const noiseFloor = sorted.slice(0, Math.floor(sorted.length / 4))
      .reduce((a, b) => a + b, 0) / (sorted.length / 4);

    return 20 * Math.log10(noiseFloor || 0.0001);
  }

  /**
   * Perform comprehensive audio quality analysis
   */
  async analyzeAudioQuality(): Promise<AudioMetrics> {
    if (this.isClosed) {
      return {
        rms: 0,
        snr: 0,
        clipping: false,
        noiseFloor: 0,
        clarity: 'poor',
      };
    }

    const rms = this.getRMS();
    const snr = await this.calculateSNR();
    const clipping = this.detectClipping();
    const noiseFloor = await this.getNoiseFloor();

    let clarity: AudioMetrics['clarity'];
    if (snr > 30 && !clipping && noiseFloor < -45) {
      clarity = 'excellent';
    } else if (snr > 20 && !clipping && noiseFloor < -40) {
      clarity = 'good';
    } else if (snr > 15 && noiseFloor < -35) {
      clarity = 'fair';
    } else {
      clarity = 'poor';
    }

    return { rms, snr, clipping, noiseFloor, clarity };
  }

  /**
   * Perform echo test
   */
  async performEchoTest(_stream: MediaStream): Promise<EchoTestResult> {
    if (this.isClosed) {
      return {
        echoDetected: false,
        echoCancellationActive: false,
        latency: 0,
      };
    }

    const startTime = Date.now();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 1000;
    gainNode.gain.value = 0.1;
    
    const beforeRMS = this.getRMS();
    
    oscillator.start();
    await this.sleep(500);
    
    const duringRMS = this.isClosed ? 0 : this.getRMS();
    oscillator.stop();
    
    await this.sleep(500);
    
    const latency = Date.now() - startTime;
    
    const echoDetected = duringRMS > beforeRMS * 2;
    const echoCancellationActive = !echoDetected;

    return {
      echoDetected,
      echoCancellationActive,
      latency,
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (!this.isClosed) {
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (err) {
          console.log('Source disconnect error (safe to ignore):', err);
        }
      }
      try {
        this.analyser.disconnect();
      } catch (err) {
        console.log('Analyser disconnect error (safe to ignore):', err);
      }
    }
  }

  /**
   * Close audio context
   */
  async close(): Promise<void> {
    if (!this.isClosed && this.audioContext.state !== 'closed') {
      this.isClosed = true;
      try {
        await this.audioContext.close();
      } catch (err) {
        console.log('AudioContext close error (safe to ignore):', err);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
