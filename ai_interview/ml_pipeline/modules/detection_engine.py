"""
Main Cheating Detection Engine
Integrates all detection modules with weighted scoring
"""

from .face_detection import FaceDetector, IdentityVerifier
from .pose_estimation import PoseEstimator
from .gaze_tracking import GazeTracker
from .phone_detection import PhoneDetector
from .behavior_analysis import BehaviorAnalyzer
import numpy as np
from typing import Dict, List


class CheatingDetectionEngine:
    """
    Main detection engine with weighted scoring system
    
    Weights:
    - Phone: 45% (highest priority)
    - Multiple faces: 25%
    - Gaze deviation: 20%
    - Head pose: 10%
    """
    
    def __init__(self, use_gpu: bool = False):
        # Initialize all detection modules
        self.face_detector = FaceDetector(min_confidence=0.7)
        self.identity_verifier = IdentityVerifier(use_gpu=False)
        self.pose_estimator = PoseEstimator()
        # Use a short window (10 frames) so stats are responsive
        self.gaze_tracker = GazeTracker(window_size=10)
        self.phone_detector = PhoneDetector(confidence=0.75)
        # window_size=10 frames; at ~1.25 fps polling rate this is ~8 seconds
        self.behavior = BehaviorAnalyzer(window_size=10)

        # Weighted scoring system
        self.weights = {
            'phone': 0.45,
            'multi_face': 0.25,
            'gaze': 0.20,
            'head_pose': 0.10,
            'looking_down': 0.80
        }

        # Effective polling fps (800ms interval → 1.25fps)
        self.POLL_FPS = 1.25

        self.reference_set = False
    
    def set_reference(self, image: np.ndarray) -> bool:
        """
        Set reference face from first frame
        
        Args:
            image: BGR image with single face
        
        Returns:
            True if reference set successfully
        """
        success = self.identity_verifier.set_reference(image)
        if success:
            self.reference_set = True
        return success
    
    def process_frame(self, image: np.ndarray) -> Dict:
        """
        Process single frame and detect cheating
        
        Args:
            image: BGR image from camera
        
        Returns:
            Dict with detection results
        """
        # 1. Face detection and verification
        face_count, verifications = self.identity_verifier.verify(image)
        
        # 2. Head pose estimation
        landmarks, pose = self.pose_estimator.estimate(image)
        
        # 3. Gaze tracking
        gaze = None
        if landmarks is not None:
            gaze = self.gaze_tracker.track(landmarks)
        
        # 4. Phone detection
        phone_visible = self.phone_detector.detect(image)
        
        # 5. Update behavior analyzer
        self.behavior.update(
            gaze_direction=gaze['direction'] if gaze else None,
            head_pose={'yaw': pose.yaw, 'pitch': pose.pitch, 'roll': pose.roll},
            phone_visible=phone_visible,
            face_count=face_count
        )
        
        # 6. Calculate cheating score
        score = self.calculate_score()
        
        # 7. Detect violations
        violations = self.detect_violations()
        
        # 8. Determine if cheating
        is_cheating = self.should_flag_cheating(score, violations)
        
        return {
            'face_count': face_count,
            'identity_verified': verifications,
            'gaze_direction': gaze['direction'] if gaze else None,
            'gaze_ratio': gaze['ratio'] if gaze else None,
            'phone_visible': phone_visible,
            'head_pose': {
                'yaw': pose.yaw,
                'pitch': pose.pitch,
                'roll': pose.roll
            },
            'cheating_score': round(score, 3),
            'violations': violations,
            'is_cheating': is_cheating,
            'integrity_score': round((1 - score) * 100, 1)
        }
    
    def calculate_score(self) -> float:
        """
        Calculate weighted cheating score (0.0 to 1.0)
        
        Returns:
            Score where 0.0 = honest, 1.0 = definitely cheating
        """
        scores = {}
        
        # Phone score (0-1)
        phone_duration = self.behavior.get_phone_duration()
        scores['phone'] = min(1.0, phone_duration / 3.0)  # Max at 3 seconds
        
        # Multi-face score (0-1)
        multi_face_pct = self.behavior.get_multi_face_percentage()
        scores['multi_face'] = multi_face_pct
        
        # Gaze score (0-1)
        gaze_deviation = self.behavior.get_gaze_deviation()
        # Only penalize if > 20% baseline
        scores['gaze'] = max(0.0, (gaze_deviation - 0.2) / 0.3)
        
        # Head pose score (0-1)
        head_stability = self.behavior.get_head_stability()
        scores['head_pose'] = min(1.0, head_stability / 30.0)  # Max at 30° std dev
        
        # Override score if explicitly looking down for a sustained period
        # This guarantees 100% precision response if looking_down trigger is met.
        if self.behavior.detect_sustained_anomaly('looking_down', duration_threshold=3.0, fps=self.POLL_FPS):
            return 1.0

        # Weighted sum
        total_score = sum(
            scores[key] * self.weights[key]
            for key in scores
        )
        
        return total_score
    
    def detect_violations(self) -> list:
        violations = []

        # CRITICAL: Phone – fire after 1 second sustained (1.25 frames at our fps)
        if self.behavior.detect_sustained_anomaly('phone', duration_threshold=1.0, fps=self.POLL_FPS):
            violations.append({'type': 'PHONE_DETECTED', 'severity': 'CRITICAL',
                               'message': 'Phone visible', 'weight': 0.45})

        # CRITICAL: Multiple faces – lower threshold to 5% of window
        multi_face_pct = self.behavior.get_multi_face_percentage()
        if multi_face_pct > 0.05:
            violations.append({'type': 'MULTIPLE_FACES', 'severity': 'CRITICAL',
                               'message': f'Multiple people detected ({multi_face_pct*100:.0f}% of time)',
                               'weight': 0.25})

        # HIGH: Gaze deviation – lower threshold to 30%
        gaze_dev = self.behavior.get_gaze_deviation()
        if gaze_dev > 0.30:
            violations.append({'type': 'GAZE_DEVIATION', 'severity': 'HIGH',
                               'message': f'Looking away ({gaze_dev*100:.0f}% of window)',
                               'weight': 0.20})

        # CRITICAL: Looking Down > 3 seconds (assuming ~1.25 fps, 3.0 duration threshold is about 3-4 frames)
        if self.behavior.detect_sustained_anomaly('looking_down', duration_threshold=3.0, fps=self.POLL_FPS):
            violations.append({'type': 'LOOKING_DOWN', 'severity': 'CRITICAL',
                               'message': 'Looking down at material for >3s', 'weight': 0.80})

        # MEDIUM: Head turned – sustained >1s
        if self.behavior.detect_sustained_anomaly('head', duration_threshold=1.0, fps=self.POLL_FPS):
            violations.append({'type': 'HEAD_TURNED', 'severity': 'MEDIUM',
                               'message': 'Head turned away', 'weight': 0.10})

        return violations
    
    def should_flag_cheating(self, score: float, violations: List[Dict]) -> bool:
        """
        Conservative flagging: requires BOTH high score AND sustained anomaly
        
        Args:
            score: Cheating score (0-1)
            violations: List of violations
        
        Returns:
            True if should flag as cheating
        """
        # Check for high severity violations
        has_critical_violation = any(
            v['severity'] in ['CRITICAL', 'HIGH']
            for v in violations
        )
        
        # Require BOTH conditions:
        # 1. Score > 0.7 (70%)
        # 2. At least one critical/high severity violation
        return score > 0.7 and has_critical_violation
    
    def reset(self):
        """Reset all detectors"""
        self.behavior.reset()
        self.reference_set = False
