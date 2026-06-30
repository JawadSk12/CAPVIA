import { RecordingOptions } from '../types/recording';

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  async startRecording(stream: MediaStream, options: RecordingOptions): Promise<void> {
    this.recordedChunks = [];

    const mimeType = this.getSupportedMimeType();
    console.log('🎥 Using MIME type:', mimeType);

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
      audioBitsPerSecond: options.audioBitsPerSecond || 128000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
        console.log('📦 Chunk received:', event.data.size, 'bytes');
      }
    };

    this.mediaRecorder.onstop = () => {
      console.log('🎥 Recording stopped, total chunks:', this.recordedChunks.length);
    };

    this.mediaRecorder.onerror = (event: any) => {
      console.error('🎥 Recording error:', event.error);
    };

    this.mediaRecorder.start(1000); // Collect data every second
    console.log('🎥 Recording started');
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getSupportedMimeType();
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        console.log('🎥 Recording complete, blob size:', blob.size, 'bytes');
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      console.log('⏸️ Recording paused');
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      console.log('▶️ Recording resumed');
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  getRecordedBlob(): Blob | null {
    if (this.recordedChunks.length === 0) return null;
    const mimeType = this.getSupportedMimeType();
    return new Blob(this.recordedChunks, { type: mimeType });
  }

  reset(): void {
    this.recordedChunks = [];
    this.mediaRecorder = null;
  }
}