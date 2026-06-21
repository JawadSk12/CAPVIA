/**
 * Cheating Detection Types
 */

export interface HeadPose {
    yaw: number;
    pitch: number;
    roll: number;
}

export interface Violation {
    type: 'PHONE_DETECTED' | 'MULTIPLE_FACES' | 'GAZE_DEVIATION' | 'HEAD_TURNED';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    weight: number;
}

export interface DetectionResult {
    success: boolean;
    face_count: number;
    identity_verified?: boolean[];
    gaze_direction: 'LEFT' | 'CENTER' | 'RIGHT' | null;
    gaze_ratio?: number;
    phone_visible: boolean;
    head_pose: HeadPose;
    cheating_score: number;
    violations: Violation[];
    is_cheating: boolean;
    integrity_score: number;
}

/** Precise per-event counters for the whole session */
export interface DetectionCounters {
    gazeLeftCount: number;       // times gaze went LEFT
    gazeRightCount: number;      // times gaze went RIGHT
    totalLookAways: number;      // gazeLeft + gazeRight
    headYawLeftCount: number;    // times yaw < -threshold
    headYawRightCount: number;   // times yaw > threshold
    headPitchUpCount: number;    // times pitch > threshold
    headPitchDownCount: number;  // times pitch < -threshold
    totalHeadTurns: number;
    faceAbsenceCount: number;    // times face_count became 0
    multiFaceCount: number;      // times face_count > 1
    phoneDetectedCount: number;  // times phone appeared
    totalFrames: number;
    framesCheating: number;
}

export const ZERO_COUNTERS: DetectionCounters = {
    gazeLeftCount: 0, gazeRightCount: 0, totalLookAways: 0,
    headYawLeftCount: 0, headYawRightCount: 0,
    headPitchUpCount: 0, headPitchDownCount: 0, totalHeadTurns: 0,
    faceAbsenceCount: 0, multiFaceCount: 0,
    phoneDetectedCount: 0, totalFrames: 0, framesCheating: 0,
};

export interface CheatingState {
    isMonitoring: boolean;
    referenceSet: boolean;
    currentResult: DetectionResult | null;
    violationHistory: Violation[];
    averageIntegrityScore: number;
    counters: DetectionCounters;
}