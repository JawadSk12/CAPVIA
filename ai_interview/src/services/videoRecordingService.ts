/**
 * videoRecordingService.ts
 * Records video during interview with audio
 * Save to: src/services/videoRecordingService.ts
 */

export class VideoRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Start recording from video element
   */
  async startRecording(videoElement: HTMLVideoElement): Promise<void> {
    try {
      // Get the stream from video element
      this.stream = videoElement.srcObject as MediaStream;
      
      if (!this.stream) {
        throw new Error('No media stream available');
      }

      // Create MediaRecorder with high quality settings
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      };

      // Fallback if VP9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.recordedChunks = [];

      // Collect data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Start recording with 1 second chunks
      this.mediaRecorder.start(1000);

      console.log('🎥 Video recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return video blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: 'video/webm',
        });
        
        console.log(`🎥 Recording stopped. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      console.log('⏸️ Recording paused');
    }
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      console.log('▶️ Recording resumed');
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
  }
}

/**
 * Convert blob to base64 for storage
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download video file
 */
export function downloadVideo(blob: Blob, filename: string = 'interview-recording.webm'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`📥 Downloaded: ${filename}`);
}