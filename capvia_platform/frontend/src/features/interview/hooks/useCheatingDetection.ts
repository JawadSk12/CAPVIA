import { useState, useCallback, useEffect, useRef } from 'react';
import { cheatingDetectionService } from '../services/cheatingDetectionService';
import { CheatingState, DetectionResult, ZERO_COUNTERS } from '../types/cheating';

// Thresholds for "event" detection
const YAW_THRESHOLD = 15;    // degrees left/right
const PITCH_THRESHOLD = 12;  // degrees up/down

const INITIAL_STATE: CheatingState = {
    isMonitoring: false,
    referenceSet: false,
    currentResult: null,
    violationHistory: [],
    averageIntegrityScore: 100,
    counters: { ...ZERO_COUNTERS },
};

export const useCheatingDetection = () => {
    const [state, setState] = useState<CheatingState>(INITIAL_STATE);

    const intervalRef = useRef<number | null>(null);

    // Track previous values so we fire counters only on state CHANGE (edge detection)
    const prevGaze = useRef<string | null>(null);
    const prevFaceCount = useRef<number>(1);
    const prevPhoneVisible = useRef<boolean>(false);
    // For head pose: track whether we were already "turned"
    const wasYawLeft = useRef(false);
    const wasYawRight = useRef(false);
    const wasPitchUp = useRef(false);
    const wasPitchDown = useRef(false);

    // ── Initialize detection ─────────────────────────────────────────
    const initialize = useCallback(async () => {
        try {
            const health = await cheatingDetectionService.healthCheck();
            console.log('Detection API health:', health);
            return health.engine_ready;
        } catch (error) {
            console.error('Failed to initialize detection:', error);
            return false;
        }
    }, []);

    // ── Set reference face ───────────────────────────────────────────
    const setReference = useCallback(async (videoElement: HTMLVideoElement) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoElement, 0, 0);

            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
            });

            const result = await cheatingDetectionService.setReference(blob);
            setState((prev) => ({ ...prev, referenceSet: result.success }));
            return result.success;
        } catch (error) {
            console.error('Failed to set reference:', error);
            return false;
        }
    }, []);

    // ── Analyze a frame and update all counters precisely ────────────
    const analyzeFrame = useCallback(async (videoElement: HTMLVideoElement) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoElement, 0, 0);

            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8);
            });

            const result = await cheatingDetectionService.analyzeFrame(blob) as DetectionResult;

            setState((prev) => {
                // ── Append ALL violations (no dedup by type — they repeat per detection window)
                // Add a timestamp so the log shows when each occurred
                const newViolations = result.violations.map(v => ({
                    ...v,
                    message: `[${new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${v.message}`,
                }));
                // Keep rolling log of last 100 violations
                const allViolations = [...prev.violationHistory, ...newViolations].slice(-100);

                // ── Running score average ──────────────────────────
                const frameCount = prev.counters.totalFrames + 1;
                const prevTotal = prev.averageIntegrityScore * prev.counters.totalFrames;
                const newAvg = (prevTotal + result.integrity_score) / frameCount;

                // ── Edge-detect counters ───────────────────────────
                const c = { ...prev.counters };
                c.totalFrames = frameCount;
                if (result.is_cheating) c.framesCheating += 1;

                // Gaze: only count each NEW look-away (edge on state change)
                const gaze = result.gaze_direction;
                if (gaze !== prevGaze.current) {
                    if (gaze === 'LEFT') { c.gazeLeftCount += 1; c.totalLookAways += 1; }
                    if (gaze === 'RIGHT') { c.gazeRightCount += 1; c.totalLookAways += 1; }
                    prevGaze.current = gaze;
                }

                // Head pose: count each NEW turn (edge — only when threshold first crossed)
                const yaw = result.head_pose?.yaw ?? 0;
                const pitch = result.head_pose?.pitch ?? 0;

                const isYawLeft = yaw < -YAW_THRESHOLD;
                const isYawRight = yaw > YAW_THRESHOLD;
                const isPitchUp = pitch > PITCH_THRESHOLD;
                const isPitchDown = pitch < -PITCH_THRESHOLD;

                if (isYawLeft && !wasYawLeft.current) { c.headYawLeftCount += 1; c.totalHeadTurns += 1; }
                if (isYawRight && !wasYawRight.current) { c.headYawRightCount += 1; c.totalHeadTurns += 1; }
                if (isPitchUp && !wasPitchUp.current) { c.headPitchUpCount += 1; }
                if (isPitchDown && !wasPitchDown.current) { c.headPitchDownCount += 1; }

                wasYawLeft.current = isYawLeft;
                wasYawRight.current = isYawRight;
                wasPitchUp.current = isPitchUp;
                wasPitchDown.current = isPitchDown;

                // Face: count each NEW disappearance / extra face
                const fc = result.face_count;
                if (fc === 0 && prevFaceCount.current > 0) c.faceAbsenceCount += 1;
                if (fc > 1 && prevFaceCount.current <= 1) c.multiFaceCount += 1;
                prevFaceCount.current = fc;

                // Phone: count each NEW detection
                if (result.phone_visible && !prevPhoneVisible.current) c.phoneDetectedCount += 1;
                prevPhoneVisible.current = result.phone_visible;

                return {
                    ...prev,
                    currentResult: result,
                    violationHistory: allViolations,
                    averageIntegrityScore: Math.round(newAvg * 10) / 10,
                    counters: c,
                };
            });

            return result;
        } catch (error) {
            console.error('Frame analysis failed:', error);
            return null;
        }
    }, []);

    // ── Start monitoring ─────────────────────────────────────────────
    const startMonitoring = useCallback(
        (videoElement: HTMLVideoElement, intervalMs: number = 800) => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setState((prev) => ({ ...prev, isMonitoring: true }));
            intervalRef.current = window.setInterval(() => {
                analyzeFrame(videoElement);
            }, intervalMs);
        },
        [analyzeFrame]
    );

    // ── Stop monitoring ──────────────────────────────────────────────
    const stopMonitoring = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setState((prev) => ({ ...prev, isMonitoring: false }));
    }, []);

    // ── Full reset ───────────────────────────────────────────────────
    const reset = useCallback(async () => {
        await cheatingDetectionService.reset();
        prevGaze.current = null;
        prevFaceCount.current = 1;
        prevPhoneVisible.current = false;
        wasYawLeft.current = false;
        wasYawRight.current = false;
        wasPitchUp.current = false;
        wasPitchDown.current = false;
        setState({ ...INITIAL_STATE, counters: { ...ZERO_COUNTERS } });
    }, []);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return {
        state,
        initialize,
        setReference,
        analyzeFrame,
        startMonitoring,
        stopMonitoring,
        reset,
    };
};