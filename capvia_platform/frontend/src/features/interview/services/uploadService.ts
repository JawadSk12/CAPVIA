import { InterviewResponse } from '../types/interview';

export class UploadService {
  static async uploadResponse(response: InterviewResponse): Promise<boolean> {
    try {
      console.log('📤 Uploading response:', response.questionId);

      // In production, this would upload to S3 or backend
      // For now, we'll simulate upload and store in localStorage
      
      const storedResponses = this.getStoredResponses();
      storedResponses.push({
        ...response,
        // Don't store blob in localStorage (too large)
        videoBlob: undefined,
      });

      localStorage.setItem('interview_responses', JSON.stringify(storedResponses));

      // Simulate network delay
      await this.sleep(500);

      console.log('✅ Response uploaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      return false;
    }
  }

  static async uploadVideoBlob(questionId: string, blob: Blob): Promise<string> {
    try {
      console.log('📤 Uploading video blob for question:', questionId);
      console.log('📦 Blob size:', blob.size, 'bytes');

      // In production: Upload to S3/backend and return URL
      // For now: Create object URL for local playback
      const url = URL.createObjectURL(blob);

      // Store reference
      const videoRefs = this.getVideoReferences();
      videoRefs[questionId] = url;
      sessionStorage.setItem('video_refs', JSON.stringify(videoRefs));

      console.log('✅ Video blob stored with URL:', url);
      return url;
    } catch (error) {
      console.error('❌ Video upload failed:', error);
      throw error;
    }
  }

  static getStoredResponses(): any[] {
    try {
      const stored = localStorage.getItem('interview_responses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static getVideoReferences(): Record<string, string> {
    try {
      const stored = sessionStorage.getItem('video_refs');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  static clearStoredData(): void {
    localStorage.removeItem('interview_responses');
    sessionStorage.removeItem('video_refs');
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}