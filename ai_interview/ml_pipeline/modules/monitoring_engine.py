"""
Production AI Interview Monitoring Engine
==========================================
Integrates all detection modules into one unified pipeline:
  - Eye Gaze (MediaPipe iris, calibrated, debounced)
  - Head Pose (solvePnP, smoothed, debounced)
  - Phone Detection (YOLOv8, 3-consecutive-frame confirmation)
  - Hand-on-Face Cheating (MediaPipe overlap, cooldown)
  - State Management
  - Risk Score Calculation
  - Rich Debug HUD

Usage:
    monitor = InterviewMonitor()
    result  = monitor.process_frame(bgr_frame)   # call every frame
    final   = monitor.get_final_json()           # call at session end
"""

import cv2
import sys
import json
import time
import numpy as np
from pathlib import Path
from typing import Dict, Optional

# ── Path setup ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

from ml_pipeline.modules.gaze_tracking      import GazeTracker
from ml_pipeline.modules.pose_estimation    import PoseEstimator
from ml_pipeline.modules.phone_detection    import PhoneDetector
from ml_pipeline.modules.hand_face_detection import HandFaceDetector
from ml_pipeline.modules.state_manager      import StateManager


# ── Risk Score Configuration ───────────────────────────────────────────────────
#
#   risk_score = (
#       gaze_off_count   * 2  +
#       head_move_count  * 2  +
#       phone_count      * 10 +
#       cheating_count   * 8
#   )  normalised to 0–100
#
# The denominator is the raw score that maps to 100 %. Adjust freely.
_RISK_DENOM = 80.0          # raw score → 100 %
_MIN_RISK_PHONE    = 40     # if phone is currently visible
_MIN_RISK_CHEATING = 30     # if cheating is currently detected

_W_GAZE   = 2
_W_HEAD   = 2
_W_PHONE  = 10
_W_CHEAT  = 8


def _compute_risk(
    gaze_left:    int,
    gaze_right:   int,
    head_left:    int,
    head_right:   int,
    head_up:      int,
    head_down:    int,
    phone_count:  int,
    cheat_count:  int,
    phone_now:    bool,
    cheat_now:    bool,
) -> int:
    gaze_off  = gaze_left  + gaze_right
    head_move = head_left  + head_right + head_up + head_down

    raw = (
        gaze_off  * _W_GAZE  +
        head_move * _W_HEAD  +
        phone_count  * _W_PHONE +
        cheat_count  * _W_CHEAT
    )

    score = int(round(min(100.0, (raw / _RISK_DENOM) * 100.0)))

    # Floor guarantees
    if phone_now:
        score = max(score, _MIN_RISK_PHONE)
    if cheat_now:
        score = max(score, _MIN_RISK_CHEATING)

    return score


# ── HUD Colours ───────────────────────────────────────────────────────────────
_CLR_ACCENT  = (0,  215, 255)   # cyan-gold title
_CLR_OK      = (80, 230,  80)   # green  — good state
_CLR_WARN    = (30, 130, 255)   # orange — moderate
_CLR_ALERT   = (30,  40, 220)   # red    — bad
_CLR_DIM     = (130, 130, 130)  # grey   — secondary text
_CLR_WHITE   = (240, 240, 240)


# ─────────────────────────────────────────────────────────────────────────────
class InterviewMonitor:
    """
    Main monitoring engine.

    Typical usage:
        monitor = InterviewMonitor()
        cap = cv2.VideoCapture(0)
        while True:
            ret, frame = cap.read()
            result = monitor.process_frame(frame)
            cv2.imshow('Monitor', frame)
            if cv2.waitKey(1) == ord('q'):
                break
        print(monitor.get_final_json())
    """

    def __init__(self):
        print("🔄  Initialising AI Interview Monitor …")
        self.gaze    = GazeTracker()
        self.pose    = PoseEstimator()
        self.phone   = PhoneDetector()
        self.cheat   = HandFaceDetector()
        self.state   = StateManager()

        self._frame_idx: int   = 0
        self._t0:        float = time.time()
        print("✅  InterviewMonitor ready.\n")

    # ── Main processing ────────────────────────────────────────────────────────

    def process_frame(self, frame: np.ndarray) -> Dict:
        """
        Process one BGR frame. Draws debug HUD in-place.

        Returns:
            Full per-frame analysis dict.
        """
        self._frame_idx += 1

        # 1. Head pose + face mesh landmarks
        lm_arr, head_pose = self.pose.estimate(frame)
        head_info         = self.pose.get_counts()

        # 2. Eye gaze (needs face mesh landmarks from step 1)
        if lm_arr is not None:
            gaze_info = self.gaze.track(lm_arr)
        else:
            gaze_info = {
                'direction': 'CENTER', 'raw_direction': 'CENTER',
                'ratio': 0.5, 'gaze_left_count': self.gaze.gaze_left_count,
                'gaze_right_count': self.gaze.gaze_right_count,
                'calibrated': self.gaze.is_calibrated,
            }

        # 3. Phone detection
        phone_info = self.phone.process_frame(frame)

        # 4. Hand-on-face cheating
        cheat_info = self.cheat.process_frame(frame)

        # 5. State manager
        self.state.update_gaze(gaze_info['direction'])
        self.state.update_head(head_info['head_direction'])

        # 6. Risk score
        risk = _compute_risk(
            gaze_left   = gaze_info['gaze_left_count'],
            gaze_right  = gaze_info['gaze_right_count'],
            head_left   = head_info['head_left_count'],
            head_right  = head_info['head_right_count'],
            head_up     = head_info['head_up_count'],
            head_down   = head_info['head_down_count'],
            phone_count = phone_info['phone_count'],
            cheat_count = cheat_info['cheating_count'],
            phone_now   = phone_info['phone_detected'],
            cheat_now   = cheat_info['cheating_detected'],
        )

        result = {
            'frame':             self._frame_idx,
            'elapsed_sec':       round(time.time() - self._t0, 1),
            # Gaze
            'gaze_direction':    gaze_info['direction'],
            'gaze_ratio':        gaze_info['ratio'],
            'gaze_left_count':   gaze_info['gaze_left_count'],
            'gaze_right_count':  gaze_info['gaze_right_count'],
            'gaze_calibrated':   gaze_info['calibrated'],
            # Head
            'head_direction':    head_info['head_direction'],
            'head_yaw':          round(self.pose.yaw,   1),
            'head_pitch':        round(self.pose.pitch, 1),
            'head_left_count':   head_info['head_left_count'],
            'head_right_count':  head_info['head_right_count'],
            'head_up_count':     head_info['head_up_count'],
            'head_down_count':   head_info['head_down_count'],
            # Phone
            'phone_detected':    phone_info['phone_detected'],
            'phone_count':       phone_info['phone_count'],
            'phone_consecutive': phone_info['consecutive'],
            # Cheating
            'cheating_detected': cheat_info['cheating_detected'],
            'cheating_count':    cheat_info['cheating_count'],
            'cheating_overlap':  cheat_info['overlap_ratio'],
            # Score
            'risk_score':        risk,
        }

        # 7. Draw HUD
        self._draw_hud(frame, result, phone_info, cheat_info)

        return result

    def get_final_json(self) -> Dict:
        """
        Return the complete session-end summary JSON.

        Format matches spec:
            gaze_left_count, gaze_right_count,
            head_left_count, head_right_count, head_up_count, head_down_count,
            phone_count, cheating_count, risk_score
        """
        risk = _compute_risk(
            gaze_left   = self.gaze.gaze_left_count,
            gaze_right  = self.gaze.gaze_right_count,
            head_left   = self.pose.head_left_count,
            head_right  = self.pose.head_right_count,
            head_up     = self.pose.head_up_count,
            head_down   = self.pose.head_down_count,
            phone_count = self.phone.phone_count,
            cheat_count = self.cheat.cheating_count,
            phone_now   = False,
            cheat_now   = False,
        )
        return {
            'gaze_left_count':  self.gaze.gaze_left_count,
            'gaze_right_count': self.gaze.gaze_right_count,
            'head_left_count':  self.pose.head_left_count,
            'head_right_count': self.pose.head_right_count,
            'head_up_count':    self.pose.head_up_count,
            'head_down_count':  self.pose.head_down_count,
            'phone_count':      self.phone.phone_count,
            'cheating_count':   self.cheat.cheating_count,
            'risk_score':       risk,
            'session_seconds':  round(time.time() - self._t0, 1),
            'total_frames':     self._frame_idx,
        }

    def reset(self):
        """Reset all detectors and counters for a new session."""
        self.gaze.reset()
        self.pose.reset()
        self.phone.reset()
        self.cheat.reset()
        self.state.reset()
        self._frame_idx = 0
        self._t0        = time.time()
        print("✅  InterviewMonitor reset.")

    # ── HUD Drawing ────────────────────────────────────────────────────────────

    def _draw_hud(
        self,
        frame: np.ndarray,
        r: Dict,
        phone_info: Dict,
        cheat_info: Dict,
    ):
        """Draw a rich translucent debug overlay on the frame."""
        h, w = frame.shape[:2]

        # ── Left sidebar panel (360 px wide) ──────────────────────────────────
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (365, h), (10, 10, 10), -1)
        cv2.addWeighted(overlay, 0.60, frame, 0.40, 0, frame)

        y = 0   # running y cursor

        # Title
        y += 28
        self._txt(frame, "🎯 AI INTERVIEW MONITOR", (10, y), 0.62, _CLR_ACCENT, bold=True)
        y += 20
        self._txt(
            frame,
            f"Frame {r['frame']}   {r['elapsed_sec']}s elapsed",
            (10, y), 0.38, _CLR_DIM
        )

        # ── GAZE ──────────────────────────────────────────────────────────────
        y += 22
        self._divider(frame, "GAZE", y)
        y += 18
        gd     = r['gaze_direction']
        gc     = _CLR_OK if gd == 'CENTER' else _CLR_ALERT
        label  = f"{'⌛ CALIBRATING...' if not r['gaze_calibrated'] else gd}"
        self._txt(frame, f"Direction : {label}", (14, y), 0.50, gc)
        y += 17
        self._txt(frame, f"Ratio     : {r['gaze_ratio']:.3f}", (14, y), 0.44, _CLR_DIM)
        y += 17
        self._txt(frame, f"Left cnt  : {r['gaze_left_count']:>4}", (14, y), 0.46, _CLR_WARN)
        y += 17
        self._txt(frame, f"Right cnt : {r['gaze_right_count']:>4}", (14, y), 0.46, _CLR_WARN)

        # ── HEAD POSE ─────────────────────────────────────────────────────────
        y += 22
        self._divider(frame, "HEAD POSE", y)
        y += 18
        hd   = r['head_direction']
        hc   = _CLR_OK if hd == 'CENTER' else _CLR_ALERT
        self._txt(frame, f"Direction : {hd}", (14, y), 0.50, hc)
        y += 17
        self._txt(
            frame,
            f"Yaw={r['head_yaw']:+6.1f}°  Pitch={r['head_pitch']:+6.1f}°",
            (14, y), 0.42, _CLR_DIM
        )
        y += 17
        self._txt(
            frame,
            f"L:{r['head_left_count']}  R:{r['head_right_count']}  "
            f"U:{r['head_up_count']}  D:{r['head_down_count']}",
            (14, y), 0.46, _CLR_WARN
        )

        # ── PHONE ─────────────────────────────────────────────────────────────
        y += 22
        self._divider(frame, "PHONE", y)
        y += 18
        pd   = r['phone_detected']
        pc   = _CLR_ALERT if pd else _CLR_OK
        self._txt(frame, f"Detected  : {'⚠ YES' if pd else 'NO'}", (14, y), 0.50, pc)
        y += 17
        self._txt(frame, f"Count     : {r['phone_count']:>4}", (14, y), 0.46, _CLR_WARN)
        y += 17
        self._txt(frame,
                  f"Consecutive: {r['phone_consecutive']}/{3}",
                  (14, y), 0.42, _CLR_DIM)

        # Draw phone bounding boxes on the frame
        for det in phone_info.get('phone_detections', []):
            x1, y1b, x2, y2b = det['bbox']
            cv2.rectangle(frame, (x1, y1b), (x2, y2b), _CLR_ALERT, 2)
            cv2.putText(
                frame,
                f"PHONE {det['confidence']:.2f}",
                (x1, max(y1b - 8, 10)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                _CLR_ALERT, 2, cv2.LINE_AA
            )

        # ── CHEATING ──────────────────────────────────────────────────────────
        y += 22
        self._divider(frame, "HAND ON FACE", y)
        y += 18
        cd   = r['cheating_detected']
        cc   = _CLR_ALERT if cd else _CLR_OK
        self._txt(frame, f"Detected  : {'⚠ YES' if cd else 'NO'}", (14, y), 0.50, cc)
        y += 17
        self._txt(frame, f"Count     : {r['cheating_count']:>4}", (14, y), 0.46, _CLR_WARN)
        y += 17
        self._txt(frame,
                  f"Overlap   : {r['cheating_overlap']:.0%}",
                  (14, y), 0.42, _CLR_DIM)

        # Draw face bbox (green)
        if cheat_info.get('face_bbox'):
            x1, y1b, x2, y2b = cheat_info['face_bbox']
            cv2.rectangle(frame, (x1, y1b), (x2, y2b), (0, 200, 120), 1)

        # Draw hand bboxes
        for hb in cheat_info.get('hand_bboxes', []):
            hx1, hy1, hx2, hy2 = hb
            col = _CLR_ALERT if cd else _CLR_OK
            cv2.rectangle(frame, (hx1, hy1), (hx2, hy2), col, 2)

        # ── RISK SCORE ────────────────────────────────────────────────────────
        y += 28
        self._divider(frame, "RISK SCORE", y)
        y += 20
        risk  = r['risk_score']
        r_col = _CLR_OK if risk < 30 else (_CLR_WARN if risk < 60 else _CLR_ALERT)

        # Bar background
        bar_x, bar_y, bar_w, bar_h = 14, y, 332, 22
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h),
                      (45, 45, 45), -1)
        # Filled portion
        filled = int(bar_w * risk / 100)
        if filled > 0:
            cv2.rectangle(frame, (bar_x, bar_y),
                          (bar_x + filled, bar_y + bar_h), r_col, -1)

        # Percentage label centred on the bar
        lbl = f"{risk}%"
        (lw, lh), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        lx = bar_x + (bar_w - lw) // 2
        ly = bar_y + (bar_h + lh) // 2
        cv2.putText(frame, lbl, (lx, ly),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, _CLR_WHITE, 2, cv2.LINE_AA)

        # Risk label under the bar
        y += bar_h + 16
        risk_lbl = "LOW RISK" if risk < 30 else ("MODERATE" if risk < 60 else "HIGH RISK")
        self._txt(frame, risk_lbl, (14, y), 0.48, r_col, bold=True)

    # ── Drawing helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _divider(frame: np.ndarray, label: str, y: int):
        cv2.line(frame, (8, y), (356, y), (55, 55, 55), 1)
        cv2.putText(frame, label, (10, y + 13),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (100, 100, 100),
                    1, cv2.LINE_AA)

    @staticmethod
    def _txt(frame: np.ndarray, text: str, pos, scale: float,
             color, bold: bool = False):
        cv2.putText(frame, text, pos,
                    cv2.FONT_HERSHEY_SIMPLEX, scale, color,
                    2 if bold else 1, cv2.LINE_AA)
