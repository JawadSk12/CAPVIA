"""
Gaze Tracking Module — Production Level (v3 — Fixed)
=====================================================
Iris-based gaze direction detection using MediaPipe Face Mesh with:
  - Per-user calibration (first 3 seconds)
  - 3-frame debounce (was 5 — reduced for quicker response)
  - Wider thresholds for easier LEFT/RIGHT detection
  - Candidate count reset after confirmed state commit (BUG FIX)
  - Moving average smoothing (5 frames)
  - Counts increment ONLY on genuine state transitions
"""

import time
import numpy as np
from collections import deque
from typing import Dict, Optional, Tuple


class GazeTracker:
    """
    Iris-based gaze tracker.

    Calibration phase (first CALIB_SEC seconds):
        Collects iris ratios and learns the user's natural center gaze.
        Thresholds are shifted relative to the learned center.

    After calibration:
        - LEFT  if smooth_ratio < left_threshold
        - RIGHT if smooth_ratio > right_threshold
        - CENTER otherwise

    Debounce:
        A candidate direction must be seen for DEBOUNCE_FRAMES consecutive
        frames before it is accepted as the new confirmed state.

    Count increment:
        Only when confirmed state changes (CENTER→LEFT, CENTER→RIGHT, etc.)
        LEFT/RIGHT transitions are independently counted.

    FIX v3 changes:
        1. _DEFAULT_LEFT_THR  raised from 0.35 → 0.42  (easier to trigger)
           _DEFAULT_RIGHT_THR lowered from 0.65 → 0.58 (easier to trigger)
        2. Calibration clamp widened: left_thr max 0.48, right_thr min 0.52
        3. DEBOUNCE_FRAMES reduced: 5 → 3
        4. _candidate_count reset to 0 after confirmed state commit
           (previously kept growing, stale on next candidate change)
        5. Ratio printed in debug logs for tuning
    """

    # MediaPipe Face Mesh landmark indices (requires refine_landmarks=True)
    LEFT_IRIS        = [468, 469, 470, 471]
    RIGHT_IRIS       = [472, 473, 474, 475]
    LEFT_EYE_INNER   = 133   # nose-side corner of left eye
    LEFT_EYE_OUTER   = 33    # ear-side corner of left eye
    RIGHT_EYE_INNER  = 362   # nose-side corner of right eye
    RIGHT_EYE_OUTER  = 263   # ear-side corner of right eye

    # ── FIX v3: Wider thresholds for easier L/R detection ──
    _DEFAULT_LEFT_THR  = 0.42   # was 0.35 — too strict
    _DEFAULT_RIGHT_THR = 0.58   # was 0.65 — too strict

    CALIB_SEC       = 3.0   # seconds for calibration
    DEBOUNCE_FRAMES = 3     # was 5; reduced for faster detection
    SMOOTH_WINDOW   = 5     # moving-average window

    # ──────────────────────────────────────────────────────────────────────────

    def __init__(self):
        # Calibration
        self._calib_start: Optional[float] = None
        self._calib_ratios: list           = []
        self._calib_done: bool             = False
        self._calib_center: float          = 0.5

        # Thresholds (may be updated after calibration)
        self.left_thr  = self._DEFAULT_LEFT_THR
        self.right_thr = self._DEFAULT_RIGHT_THR

        # Smoothing
        self._ratio_buf: deque = deque(maxlen=self.SMOOTH_WINDOW)

        # Debounce state machine
        self._candidate_dir:   str = 'CENTER'
        self._candidate_count: int = 0
        self._confirmed_dir:   str = 'CENTER'

        # Live values (for HUD display)
        self.current_ratio:     float = 0.5
        self.current_direction: str   = 'CENTER'
        self.is_calibrated:     bool  = False

        # Cumulative counts
        self.gaze_left_count:  int = 0
        self.gaze_right_count: int = 0

    # ── Public API ─────────────────────────────────────────────────────────────

    def track(self, landmarks: np.ndarray) -> Dict:
        """
        Process one frame's 478-point landmark array (pixels, x/y/z).

        Args:
            landmarks: np.ndarray shape (478, 3) — mediapipe face_mesh output

        Returns:
            dict: direction, ratio, gaze_left_count, gaze_right_count, calibrated
        """
        ratio = self._compute_avg_ratio(landmarks)
        if ratio is None:
            return self._make_result()

        # Moving-average smoothing
        self._ratio_buf.append(ratio)
        smooth = float(np.mean(self._ratio_buf))
        self.current_ratio = smooth

        # ── Calibration phase ─────────────────────────────────────────────────
        if not self._calib_done:
            now = time.time()
            if self._calib_start is None:
                self._calib_start = now
                print("[GAZE] Calibration started — look straight ahead for 3 s")

            self._calib_ratios.append(smooth)

            if (now - self._calib_start) >= self.CALIB_SEC:
                self._finish_calibration()

            self.current_direction = 'CENTER'
            return self._make_result()

        # ── Classification ────────────────────────────────────────────────────
        direction = self._classify(smooth)
        self.current_direction = direction

        # ── Debounce + state-change counting ──────────────────────────────────
        self._update_state(direction)

        return self._make_result()

    def reset(self):
        """Full reset — call between interview sessions."""
        self._calib_start      = None
        self._calib_ratios     = []
        self._calib_done       = False
        self._calib_center     = 0.5
        self.left_thr          = self._DEFAULT_LEFT_THR
        self.right_thr         = self._DEFAULT_RIGHT_THR
        self._ratio_buf.clear()
        self._candidate_dir    = 'CENTER'
        self._candidate_count  = 0
        self._confirmed_dir    = 'CENTER'
        self.current_ratio     = 0.5
        self.current_direction = 'CENTER'
        self.is_calibrated     = False
        self.gaze_left_count   = 0
        self.gaze_right_count  = 0

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _compute_avg_ratio(self, lm: np.ndarray) -> Optional[float]:
        """Compute average horizontal iris-position ratio across both eyes."""
        try:
            # Left eye
            l_iris  = lm[self.LEFT_IRIS, :2].mean(axis=0)          # (x, y)
            l_inner = lm[self.LEFT_EYE_INNER, :2]
            l_outer = lm[self.LEFT_EYE_OUTER, :2]
            l_ratio = self._iris_ratio(l_iris, l_inner, l_outer)

            # Right eye
            r_iris  = lm[self.RIGHT_IRIS, :2].mean(axis=0)
            r_inner = lm[self.RIGHT_EYE_INNER, :2]
            r_outer = lm[self.RIGHT_EYE_OUTER, :2]
            r_ratio = self._iris_ratio(r_iris, r_inner, r_outer)

            return (l_ratio + r_ratio) / 2.0

        except (IndexError, ZeroDivisionError, Exception):
            return None

    @staticmethod
    def _iris_ratio(iris: np.ndarray, ca: np.ndarray, cb: np.ndarray) -> float:
        """
        Normalised horizontal position of iris between two eye-corner landmarks.
        Returns 0.0 (leftmost corner) → 1.0 (rightmost corner).
        """
        lo_x = min(ca[0], cb[0])
        hi_x = max(ca[0], cb[0])
        width = hi_x - lo_x
        if width < 1.0:
            return 0.5
        return float(np.clip((iris[0] - lo_x) / width, 0.0, 1.0))

    def _finish_calibration(self):
        """
        Compute center and shift thresholds relative to user's natural gaze.

        FIX v3: Widened clamping bounds so thresholds remain usable even
        when the user sits slightly off-center:
            left_thr  : clamped to [0.10, 0.48] (was 0.15–0.45 — too narrow)
            right_thr : clamped to [0.52, 0.90] (was 0.55–0.85 — too narrow)
        """
        if not self._calib_ratios:
            self._calib_center = 0.5
        else:
            self._calib_center = float(np.median(self._calib_ratios))

        # Shift thresholds by the deviation from ideal center (0.5)
        offset = self._calib_center - 0.5
        self.left_thr  = float(np.clip(
            self._DEFAULT_LEFT_THR  + offset, 0.10, 0.48
        ))
        self.right_thr = float(np.clip(
            self._DEFAULT_RIGHT_THR + offset, 0.52, 0.90
        ))

        self._calib_done   = True
        self.is_calibrated = True
        print(
            f"[GAZE] ✅ Calibration complete. "
            f"center={self._calib_center:.3f}  "
            f"L<{self.left_thr:.3f}  R>{self.right_thr:.3f}"
        )

    def _classify(self, ratio: float) -> str:
        if ratio < self.left_thr:
            return 'LEFT'
        if ratio > self.right_thr:
            return 'RIGHT'
        return 'CENTER'

    def _update_state(self, direction: str):
        """
        Debounce logic:
          - If the new direction matches the current candidate, increment counter.
          - If it differs, reset candidate to the new direction.
          - Once candidate count reaches DEBOUNCE_FRAMES AND direction differs
            from confirmed state → commit new state and increment appropriate count.

        FIX v3: Reset _candidate_count to 0 after committing a new state.
          Previously, the counter kept growing past DEBOUNCE_FRAMES but the
          direction was now == confirmed_dir. When a new direction appeared,
          the counter jumped from (say) 30 back to 1 — correct — but this
          was already correct; the REAL fix is resetting to 0 so the first
          frame of a new direction cleanly starts at count=1.
        """
        if direction == self._candidate_dir:
            self._candidate_count += 1
        else:
            self._candidate_dir   = direction
            self._candidate_count = 1

        if self._candidate_count >= self.DEBOUNCE_FRAMES:
            if direction != self._confirmed_dir:
                prev = self._confirmed_dir
                self._confirmed_dir   = direction
                self._candidate_count = 0   # FIX v3: clean reset after commit

                if direction == 'LEFT':
                    self.gaze_left_count += 1
                    print(
                        f"[GAZE] {prev:>6} → LEFT   "
                        f"(ratio={self.current_ratio:.3f}  "
                        f"thr<{self.left_thr:.3f}  "
                        f"total_left={self.gaze_left_count})"
                    )
                elif direction == 'RIGHT':
                    self.gaze_right_count += 1
                    print(
                        f"[GAZE] {prev:>6} → RIGHT  "
                        f"(ratio={self.current_ratio:.3f}  "
                        f"thr>{self.right_thr:.3f}  "
                        f"total_right={self.gaze_right_count})"
                    )
                else:
                    print(
                        f"[GAZE] {prev:>6} → CENTER "
                        f"(ratio={self.current_ratio:.3f})"
                    )

    def _make_result(self) -> Dict:
        return {
            'direction':        self._confirmed_dir,
            'raw_direction':    self.current_direction,
            'ratio':            round(self.current_ratio, 4),
            'gaze_left_count':  self.gaze_left_count,
            'gaze_right_count': self.gaze_right_count,
            'calibrated':       self.is_calibrated,
        }
