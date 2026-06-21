"""Production ML modules for interview monitoring"""

# ── Production monitoring modules (v2) — primary system ──────────────────────
from .gaze_tracking       import GazeTracker
from .pose_estimation     import PoseEstimator
from .phone_detection     import PhoneDetector
from .hand_face_detection import HandFaceDetector
from .state_manager       import StateManager
from .monitoring_engine   import InterviewMonitor

# ── Legacy detection pipeline — optional (requires insightface) ───────────────
try:
    from .face_detection   import FaceDetector, IdentityVerifier
    from .behavior_analysis import BehaviorAnalyzer
    from .detection_engine  import CheatingDetectionEngine
    _LEGACY_AVAILABLE = True
except ImportError:
    _LEGACY_AVAILABLE = False
    # Create stubs so downstream code that references these names doesn't crash
    class FaceDetector:            # type: ignore
        def __init__(self, *a, **kw): raise ImportError("insightface not installed")
    class IdentityVerifier:        # type: ignore
        def __init__(self, *a, **kw): raise ImportError("insightface not installed")
    class BehaviorAnalyzer:        # type: ignore
        def __init__(self, *a, **kw): raise ImportError("insightface not installed")
    class CheatingDetectionEngine: # type: ignore
        def __init__(self, *a, **kw): raise ImportError("insightface not installed")

__all__ = [
    # Production v2 (always available)
    'GazeTracker',
    'PoseEstimator',
    'PhoneDetector',
    'HandFaceDetector',
    'StateManager',
    'InterviewMonitor',
    # Legacy (requires insightface)
    'FaceDetector',
    'IdentityVerifier',
    'BehaviorAnalyzer',
    'CheatingDetectionEngine',
]