"""
Phone Detection Module — Production Level (v3 — Fixed)
=======================================================
Wraps PhoneDetectorV2 (YOLOv8) with:
  - Confidence threshold = 0.35 (was 0.40 — reduced for better sensitivity)
  - 2 consecutive detections before incrementing phone_count (was 3)
  - Cooldown reduced to 1.5 s (was 3.0 s — too long)
  - Progress logging every consecutive frame for debugging
  - Bounding box list returned for HUD drawing
"""

import time
import numpy as np
from collections import deque
from pathlib import Path
from typing import List, Dict

import sys
ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

try:
    from ai_models.phone.phone_detector_v2 import PhoneDetectorV2
    _V2_AVAILABLE = True
except ImportError:
    _V2_AVAILABLE = False


# ── Constants ─────────────────────────────────────────────────────────────────
CONFIDENCE_THR   = 0.35   # was 0.40 — lowered for better recall
CONSECUTIVE_THR  = 2      # was 3 — 2 consecutive frames is sufficient
COUNT_COOLDOWN   = 1.5    # was 3.0 s — reduced so repeated events are counted


class PhoneDetector:
    """
    Production phone detector.

    Uses PhoneDetectorV2 (YOLOv8n pretrained, class 67 = cell phone)
    with confidence=0.35.

    Counting logic:
        - Track consecutive frames where phone is detected.
        - Print [PHONE] progress each consecutive frame.
        - When consecutive count reaches CONSECUTIVE_THR AND the cooldown
          has elapsed → increment phone_count and reset consecutive counter.
        - Reset consecutive counter whenever no phone is visible.
    """

    def __init__(self,
                 model_path: str = None,
                 confidence: float = CONFIDENCE_THR):

        self._confidence   = confidence
        self._inner: object = None

        if _V2_AVAILABLE:
            self._inner = PhoneDetectorV2(
                model_path=model_path,
                confidence=confidence,
                verbose=True,
            )
            if self._inner.is_active:
                print(
                    f"✅ PhoneDetector: YOLOv8 ready  "
                    f"(conf={confidence}  consec≥{CONSECUTIVE_THR}  "
                    f"cooldown={COUNT_COOLDOWN}s)"
                )
            else:
                print("⚠️  PhoneDetector: YOLOv8 not active — detection disabled")
        else:
            print("⚠️  PhoneDetector: PhoneDetectorV2 import failed — stub mode")

        # Consecutive-frame counter
        self._consec_count: int      = 0
        self._last_count_time: float = 0.0

        # Cumulative count
        self.phone_count: int = 0

        # Temporal history for get_phone_duration compatibility
        self.history: deque = deque(maxlen=120)

    # ── Public API ─────────────────────────────────────────────────────────────

    @property
    def is_active(self) -> bool:
        return self._inner is not None and self._inner.is_active

    def detect(self, image: np.ndarray) -> bool:
        """Quick boolean detection (no counting)."""
        dets = self.get_detections(image)
        return len(dets) > 0

    def get_detections(self, image: np.ndarray) -> List[Dict]:
        """Return list of detection dicts with bbox + confidence."""
        if self._inner is None or not self._inner.is_active:
            return []
        return self._inner.get_detections(image)

    def process_frame(self, image: np.ndarray) -> Dict:
        """
        Full per-frame processing.
        Increments phone_count after CONSECUTIVE_THR consecutive detections
        (subject to cooldown).

        FIX v3:
          - Prints consecutive progress so user can see accumulation in terminal
          - Consecutive counter reset after confirmed count (not just when missing)
          - Cooldown reduced to 1.5 s

        Returns:
            {phone_detected, phone_detections, phone_count,
             consecutive, just_counted}
        """
        detections = self.get_detections(image)
        detected   = len(detections) > 0

        # Update history
        self.history.append(detected)

        just_counted = False

        if detected:
            self._consec_count += 1
            # Print progress every frame while accumulating
            print(
                f"[PHONE] Consecutive = {self._consec_count}/{CONSECUTIVE_THR}  "
                f"conf={detections[0]['confidence']:.3f}"
            ) if self._consec_count <= CONSECUTIVE_THR else None

            if self._consec_count >= CONSECUTIVE_THR:
                now = time.time()
                if (now - self._last_count_time) >= COUNT_COOLDOWN:
                    self.phone_count      += 1
                    self._last_count_time  = now
                    self._consec_count     = 0    # reset after confirmed count
                    just_counted           = True
                    print(
                        f"[PHONE] ⚠️  Confirmed ({CONSECUTIVE_THR} consec frames) → "
                        f"phone_count={self.phone_count}"
                    )
        else:
            if self._consec_count > 0:
                print(f"[PHONE] Lost — resetting consecutive from {self._consec_count}")
            self._consec_count = 0

        return {
            'phone_detected':   detected,
            'phone_detections': detections,
            'phone_count':      self.phone_count,
            'consecutive':      self._consec_count,
            'just_counted':     just_counted,
        }

    def get_phone_duration(self, fps: float = 30.0) -> float:
        if not self.history:
            return 0.0
        return sum(self.history) / fps

    def sustained_detection(self, duration_sec: float = 1.0, fps: float = 30.0) -> bool:
        req = max(1, int(duration_sec * fps))
        if len(self.history) < req:
            return False
        recent = list(self.history)[-req:]
        return sum(recent) >= req * 0.8

    def reset(self):
        self._consec_count    = 0
        self._last_count_time = 0.0
        self.phone_count      = 0
        self.history.clear()
        if self._inner is not None:
            self._inner.reset()