/**
 * Cheating Detection Service
 * Communicates with Python FastAPI backend for ML-based cheating detection
 */

export interface HeadPose {
    yaw: number;
    pitch: number;
    roll: number;
}

export interface Violation {
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    weight: number;
}

export interface DetectionResult {
    success: boolean;
    face_count: number;
    identity_verified?: boolean[];
    gaze_direction: string | null;
    gaze_ratio?: number;
    phone_visible: boolean;
    head_pose: HeadPose;
    cheating_score: number;
    violations: Violation[];
    is_cheating: boolean;
    integrity_score: number;
}

export interface ReferenceResponse {
    success: boolean;
    message: string;
}

export interface HealthResponse {
    status: string;
    engine_ready: boolean;
    reference_set: boolean;
}

export class CheatingDetectionService {
    private baseUrl: string;
    private referenceSet: boolean = false;

    constructor(baseUrl: string = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
    }

    /**
     * Check if API is healthy
     */
    async healthCheck(): Promise<HealthResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/`);
            if (!response.ok) {
                throw new Error('API not responding');
            }
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw new Error('Cannot connect to detection API');
        }
    }

    /**
     * Set reference face from first frame
     * @param imageBlob - Blob containing face image
     */
    async setReference(imageBlob: Blob): Promise<ReferenceResponse> {
        try {
            const formData = new FormData();
            formData.append('file', imageBlob, 'reference.jpg');

            const response = await fetch(`${this.baseUrl}/set_reference`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to set reference');
            }

            const result: ReferenceResponse = await response.json();
            this.referenceSet = result.success;
            return result;
        } catch (error) {
            console.error('Set reference failed:', error);
            throw error;
        }
    }

    /**
     * Analyze frame for cheating detection
     * @param imageBlob - Blob containing video frame
     */
    async analyzeFrame(imageBlob: Blob): Promise<DetectionResult> {
        try {
            const formData = new FormData();
            formData.append('file', imageBlob, 'frame.jpg');

            const response = await fetch(`${this.baseUrl}/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Frame analysis failed:', error);
            throw error;
        }
    }

    /**
     * Reset detection engine
     */
    async reset(): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/reset`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Reset failed');
            }

            this.referenceSet = false;
        } catch (error) {
            console.error('Reset failed:', error);
            throw error;
        }
    }

    /**
     * Get current status
     */
    async getStatus() {
        const response = await fetch(`${this.baseUrl}/status`);
        return await response.json();
    }

    /**
     * Check if reference is set
     */
    isReferenceSet(): boolean {
        return this.referenceSet;
    }
}

// Singleton instance
export const cheatingDetectionService = new CheatingDetectionService();