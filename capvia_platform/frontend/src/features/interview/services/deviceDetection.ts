import { DeviceCapabilities } from '../types/devices';
import { VALIDATION_THRESHOLDS } from '../utils/constants';

export class DeviceDetectionService {
  
  /**
   * Detect all available media devices
   */
  static async detectDevices(): Promise<DeviceCapabilities> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const cameras = devices.filter(d => d.kind === 'videoinput');
      const microphones = devices.filter(d => d.kind === 'audioinput');
      const speakers = devices.filter(d => d.kind === 'audiooutput');

      return {
        camera: {
          available: cameras.length > 0,
          deviceId: cameras[0]?.deviceId,
          label: cameras[0]?.label,
        },
        microphone: {
          available: microphones.length > 0,
          deviceId: microphones[0]?.deviceId,
          label: microphones[0]?.label,
        },
        speaker: {
          available: speakers.length > 0,
          deviceId: speakers[0]?.deviceId,
          label: speakers[0]?.label,
        },
      };
    } catch (error) {
      console.error('Device detection failed:', error);
      throw new Error('Failed to detect media devices');
    }
  }

  /**
   * Request camera access and get stream
   */
  static async requestCameraAccess(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('CAMERA_PERMISSION_DENIED');
      } else if (error.name === 'NotFoundError') {
        throw new Error('CAMERA_NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Request microphone access and get stream
   */
  static async requestMicrophoneAccess(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
        },
      });

      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('MIC_PERMISSION_DENIED');
      } else if (error.name === 'NotFoundError') {
        throw new Error('MIC_NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Get camera stream settings
   */
  static getCameraSettings(stream: MediaStream) {
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    
    return {
      resolution: {
        width: settings.width || 0,
        height: settings.height || 0,
      },
      frameRate: settings.frameRate || 0,
      facing: settings.facingMode,
    };
  }

  /**
   * Get microphone settings
   */
  static getMicrophoneSettings(stream: MediaStream) {
    const audioTrack = stream.getAudioTracks()[0];
    const settings = audioTrack.getSettings();
    
    return {
      sampleRate: settings.sampleRate || 0,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
    };
  }

  /**
   * Validate camera quality
   */
  static validateCameraQuality(stream: MediaStream): boolean {
    const settings = this.getCameraSettings(stream);
    
    return (
      settings.resolution.width >= VALIDATION_THRESHOLDS.CAMERA.MIN_RESOLUTION_WIDTH &&
      settings.resolution.height >= VALIDATION_THRESHOLDS.CAMERA.MIN_RESOLUTION_HEIGHT &&
      settings.frameRate >= VALIDATION_THRESHOLDS.CAMERA.MIN_FRAME_RATE
    );
  }
}