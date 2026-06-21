"""
Head Pose Estimation Module — Production Level (v3 — Fixed)
============================================================
Uses MediaPipe Face Mesh + solvePnP for 3-D pose estimation with:
  - cv2.RQDecomp3x3 for CORRECT Euler angle extraction
    (previous arctan2 formula extracted Z-roll, not yaw — BUG FIXED)
  - Moving-average smoothing (5-frame window)
  - 3-frame debounce before accepting state change (was 5, now faster)
  - Counts increment ONLY on genuine direction transitions
  - Thresholds: LEFT yaw<-15, RIGHT yaw>15, UP pitch<-10, DOWN pitch>10
  - Debug nose-direction arrow drawn on frame
"""

import cv2
import numpy as np
import mediapipe as mp
from collections import deque
from dataclasses import dataclass, field
from typing import Tuple, Optional, Dict


@dataclass
class HeadPose:
    """Smoothed head pose angles in degrees."""
    yaw:   float = 0.0   # + = right,  - = left
    pitch: float = 0.0   # + = down,   - = up
    roll:  float = 0.0   # tilt


class PoseEstimator:
    """
    3-D head pose estimator.

    Landmarks used for solvePnP (MediaPipe Face Mesh indices):
        1   → Nose tip
        152 → Chin
        33  → Left eye outer corner
        263 → Right eye outer corner
        61  → Left mouth corner
        291 → Right mouth corner

    Thresholds (degrees):
        LEFT:  yaw  < -15
        RIGHT: yaw  >  15
        UP:    pitch < -10
        DOWN:  pitch >  10

    FIX v3:
        Previous code used arctan2(rmat[1,0], rmat[0,0]) for yaw which is
        actually the Z-rotation angle (roll). Fixed to use cv2.RQDecomp3x3
        which correctly decomposes the rotation matrix into RQ form and
        returns (pitch_x, yaw_y, roll_z) in degrees.
    """

    # solvePnP 3-D model points (generic head, mm-scale)
    _MODEL_POINTS = np.array([
        [   0.0,    0.0,    0.0],   # Nose tip     (1)
        [   0.0, -330.0,  -65.0],   # Chin         (152)
        [-225.0,  170.0, -135.0],   # Left eye     (33)
        [ 225.0,  170.0, -135.0],   # Right eye    (263)
        [-150.0, -150.0, -125.0],   # Left mouth   (61)
        [ 150.0, -150.0, -125.0],   # Right mouth  (291)
    ], dtype=np.float64)

    _LM_INDICES = [1, 152, 33, 263, 61, 291]

    # Angle thresholds (degrees)
    YAW_LEFT   = -15.0
    YAW_RIGHT  =  15.0
    PITCH_UP   = -10.0
    PITCH_DOWN =  10.0

    # Smoothing / debounce
    SMOOTH_WINDOW   = 5   # was 7; reduced for faster response
    DEBOUNCE_FRAMES = 3   # was 5; reduced for quicker detection

    # ──────────────────────────────────────────────────────────────────────────

    def __init__(self):
        mp_fm = mp.solutions.face_mesh
        self._face_mesh = mp_fm.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,        # needed for iris indices in GazeTracker
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Smoothing buffers
        self._yaw_buf:   deque = deque(maxlen=self.SMOOTH_WINDOW)
        self._pitch_buf: deque = deque(maxlen=self.SMOOTH_WINDOW)
        self._roll_buf:  deque = deque(maxlen=self.SMOOTH_WINDOW)

        # Smoothed current values
        self.yaw:   float = 0.0
        self.pitch: float = 0.0
        self.roll:  float = 0.0

        # Last rvec / tvec for nose-direction arrow
        self._rvec = None
        self._tvec = None
        self._cam_mx = None

        # Debounce state machine
        self._candidate_dir:   str = 'CENTER'
        self._candidate_count: int = 0
        self._confirmed_dir:   str = 'CENTER'

        # Cumulative counts
        self.head_left_count:  int = 0
        self.head_right_count: int = 0
        self.head_up_count:    int = 0
        self.head_down_count:  int = 0

    # ── Public API ─────────────────────────────────────────────────────────────

    def estimate(self, image: np.ndarray) -> Tuple[Optional[np.ndarray], HeadPose]:
        """
        Estimate head pose from a BGR frame.

        Returns:
            (landmarks_array, HeadPose)
            landmarks_array is shape (478, 3) in pixel coords, or None if no face.
        """
        h, w = image.shape[:2]
        rgb  = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        res  = self._face_mesh.process(rgb)

        if not res.multi_face_landmarks:
            return None, HeadPose(self.yaw, self.pitch, self.roll)

        lm   = res.multi_face_landmarks[0]
        lm_arr = np.array(
            [[p.x * w, p.y * h, p.z] for p in lm.landmark],
            dtype=np.float64
        )  # shape (478, 3)

        raw_yaw, raw_pitch, raw_roll, rvec, tvec, cam_mx = (
            self._solve_pnp(lm_arr, w, h)
        )
        if raw_yaw is None:
            return lm_arr, HeadPose(self.yaw, self.pitch, self.roll)

        # Store for nose-direction arrow drawing
        self._rvec   = rvec
        self._tvec   = tvec
        self._cam_mx = cam_mx

        # Smooth
        self._yaw_buf.append(raw_yaw)
        self._pitch_buf.append(raw_pitch)
        self._roll_buf.append(raw_roll)

        self.yaw   = float(np.mean(self._yaw_buf))
        self.pitch = float(np.mean(self._pitch_buf))
        self.roll  = float(np.mean(self._roll_buf))

        # State machine
        direction = self._classify(self.yaw, self.pitch)
        self._update_state(direction)

        # Draw nose direction arrow on frame (optional debug aid)
        self._draw_nose_arrow(image, lm_arr, w, h)

        return lm_arr, HeadPose(self.yaw, self.pitch, self.roll)

    def get_counts(self) -> Dict:
        """Return current head-pose state and cumulative transition counts."""
        return {
            'head_direction':   self._confirmed_dir,
            'head_left_count':  self.head_left_count,
            'head_right_count': self.head_right_count,
            'head_up_count':    self.head_up_count,
            'head_down_count':  self.head_down_count,
        }

    def reset(self):
        """Full reset — call between interview sessions."""
        self._yaw_buf.clear()
        self._pitch_buf.clear()
        self._roll_buf.clear()
        self.yaw = self.pitch = self.roll = 0.0
        self._rvec = self._tvec = self._cam_mx = None
        self._candidate_dir   = 'CENTER'
        self._candidate_count = 0
        self._confirmed_dir   = 'CENTER'
        self.head_left_count  = 0
        self.head_right_count = 0
        self.head_up_count    = 0
        self.head_down_count  = 0

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _solve_pnp(
        self, lm_arr: np.ndarray, w: int, h: int
    ) -> Tuple:
        """
        Run solvePnP and return (yaw, pitch, roll, rvec, tvec, cam_mx) in degrees.

        FIX v3:
            Uses cv2.RQDecomp3x3 to correctly decompose the rotation matrix.
            RQDecomp3x3 returns Euler angles [Rx, Ry, Rz] where:
                Rx = rotation around X-axis = pitch (head looking up/down)
                Ry = rotation around Y-axis = yaw   (head turning left/right)
                Rz = rotation around Z-axis = roll  (head tilting)

            Previous code extracted: arctan2(rmat[1,0], rmat[0,0]) = Z-rotation
            which is the in-plane tilt (roll), not yaw. This caused yaw ≈ 0
            always, meaning head left/right was never detected.
        """
        try:
            img_pts = np.array(
                [lm_arr[idx, :2] for idx in self._LM_INDICES],
                dtype=np.float64
            )
            focal  = float(w)
            cam_mx = np.array(
                [[focal, 0, w / 2.0],
                 [0, focal, h / 2.0],
                 [0,     0,     1.0]],
                dtype=np.float64
            )
            dist = np.zeros((4, 1), dtype=np.float64)

            ok, rvec, tvec = cv2.solvePnP(
                self._MODEL_POINTS, img_pts, cam_mx, dist,
                flags=cv2.SOLVEPNP_ITERATIVE
            )
            if not ok:
                return None, None, None, None, None, None

            rmat, _ = cv2.Rodrigues(rvec)

            # ── FIXED: Use RQDecomp3x3 for correct Euler angle extraction ──
            # angles = [Rx (pitch), Ry (yaw), Rz (roll)] in degrees
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)

            pitch = float(angles[0])   # up/down rotation
            yaw   = float(angles[1])   # left/right rotation
            roll  = float(angles[2])   # tilt rotation

            # Scale correction: RQDecomp3x3 returns values in degrees but
            # sometimes requires scaling by 360 depending on OpenCV version.
            # Values should be in [-90, 90] range for normal head movement.
            # If angles are very large (> 180), scale down.
            if abs(yaw) > 90 or abs(pitch) > 90:
                # Try rvec-based decomposition as fallback
                yaw, pitch, roll = self._rvec_to_euler(rvec)

            # Clamp to realistic human range
            yaw   = float(np.clip(yaw,   -90.0, 90.0))
            pitch = float(np.clip(pitch, -90.0, 90.0))
            roll  = float(np.clip(roll,  -90.0, 90.0))

            return yaw, pitch, roll, rvec, tvec, cam_mx

        except Exception as e:
            return None, None, None, None, None, None

    @staticmethod
    def _rvec_to_euler(rvec: np.ndarray) -> Tuple[float, float, float]:
        """
        Fallback Euler angle extraction from rotation vector.
        Uses robust ZXY decomposition formula.
        """
        rmat, _ = cv2.Rodrigues(rvec)

        # ZXY Euler decomposition — robust for frontal face ± 90°
        sy = np.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2)
        singular = sy < 1e-6

        if not singular:
            pitch = np.degrees(np.arctan2( rmat[2, 1], rmat[2, 2]))
            yaw   = np.degrees(np.arctan2(-rmat[2, 0], sy))
            roll  = np.degrees(np.arctan2( rmat[1, 0], rmat[0, 0]))
        else:
            pitch = np.degrees(np.arctan2(-rmat[1, 2], rmat[1, 1]))
            yaw   = np.degrees(np.arctan2(-rmat[2, 0], sy))
            roll  = 0.0

        return float(yaw), float(pitch), float(roll)

    def _classify(self, yaw: float, pitch: float) -> str:
        """
        Classify head direction.
        Yaw (left/right) takes priority over pitch (up/down).
        """
        if yaw < self.YAW_LEFT:
            return 'LEFT'
        if yaw > self.YAW_RIGHT:
            return 'RIGHT'
        if pitch < self.PITCH_UP:
            return 'UP'
        if pitch > self.PITCH_DOWN:
            return 'DOWN'
        return 'CENTER'

    def _update_state(self, direction: str):
        """
        Debounce + state-change counting.
        Count is incremented only on confirmed direction transitions.

        FIX v3: Reset candidate_count to 0 after a state commit to prevent
        stale accumulation blocking future detections.
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
                self._candidate_count = 0  # FIX: reset after commit

                if direction == 'LEFT':
                    self.head_left_count += 1
                    print(
                        f"[HEAD] {prev:>6} → LEFT   "
                        f"(yaw={self.yaw:+.1f}°  total={self.head_left_count})"
                    )
                elif direction == 'RIGHT':
                    self.head_right_count += 1
                    print(
                        f"[HEAD] {prev:>6} → RIGHT  "
                        f"(yaw={self.yaw:+.1f}°  total={self.head_right_count})"
                    )
                elif direction == 'UP':
                    self.head_up_count += 1
                    print(
                        f"[HEAD] {prev:>6} → UP     "
                        f"(pitch={self.pitch:+.1f}°  total={self.head_up_count})"
                    )
                elif direction == 'DOWN':
                    self.head_down_count += 1
                    print(
                        f"[HEAD] {prev:>6} → DOWN   "
                        f"(pitch={self.pitch:+.1f}°  total={self.head_down_count})"
                    )
                else:
                    print(
                        f"[HEAD] {prev:>6} → CENTER "
                        f"(yaw={self.yaw:+.1f}°  pitch={self.pitch:+.1f}°)"
                    )

    def _draw_nose_arrow(
        self, frame: np.ndarray, lm_arr: np.ndarray, w: int, h: int
    ):
        """
        Draw a direction arrow from the nose tip to show 3-D head orientation.
        Helps visually verify yaw/pitch are being computed correctly.
        """
        if self._rvec is None or self._tvec is None:
            return

        try:
            # Nose tip in image space
            nose_tip = tuple(lm_arr[1, :2].astype(int))

            # Project a point 100mm in front of the nose tip
            nose_end_3d = np.array([[0.0, 0.0, -100.0]], dtype=np.float64)
            dist = np.zeros((4, 1), dtype=np.float64)
            nose_end_2d, _ = cv2.projectPoints(
                nose_end_3d, self._rvec, self._tvec, self._cam_mx, dist
            )
            nose_end = tuple(nose_end_2d[0][0].astype(int))

            # Color based on direction
            col = (80, 230, 80) if self._confirmed_dir == 'CENTER' else (30, 40, 220)
            cv2.arrowedLine(frame, nose_tip, nose_end, col, 2, tipLength=0.3)
        except Exception:
            pass
