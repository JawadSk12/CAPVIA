"""
Hand-on-Face Cheating Detection Module — Production Level (v3 — Fixed)
=======================================================================
Uses MediaPipe Hands + (optionally) Face Mesh landmarks to compute the
bounding-box overlap between detected hand(s) and the user's face.

Key FIX v3 changes:
  1. OVERLAP_THR lowered 0.20 → 0.15 (face bbox fully covered 20%+ was too strict)
  2. COOLDOWN_SEC reduced  2.0 → 1.5 s
  3. Face bbox derived from Face Mesh landmarks (passed in from PoseEstimator)
     instead of running a SECOND FaceDetection model in parallel.
     The separate FaceDetection model failed in low-light / partial occlusion
     (precisely when a hand is on the face) → cheating_detected was always False.
  4. Proximity fallback: if a hand centroid is within 1.5× of face bbox width/height,
     still flag as "near face" (overlap might be partial but still suspicious).
  5. Hand detection confidence reduced 0.5 → 0.4 for earlier detection.
"""

import time
import numpy as np
import cv2
import mediapipe as mp
from typing import Dict, List, Optional, Tuple


# ── Constants ─────────────────────────────────────────────────────────────────
OVERLAP_THR     = 0.15   # fraction of face bbox area; was 0.20 — too strict
PROXIMITY_THR   = 1.5    # hand centroid within 1.5× face bbox dimension
COOLDOWN_SEC    = 1.5    # was 2.0 s
MIN_HAND_CONF   = 0.4    # was 0.5


class HandFaceDetector:
    """
    Detects hand-on-face events using bounding-box overlap.

    Face bbox source (priority order):
        1. Face Mesh landmarks passed from PoseEstimator (preferred — already computed)
        2. MediaPipe FaceDetection fallback (kept for robustness when landmarks unavailable)

    Hand bboxes — from MediaPipe Hands landmark bounding boxes.

    Overlap fraction  = intersection_area / face_bbox_area
    Proximity check   = hand_centroid within 1.5× face bbox size
    """

    # Face Mesh landmark indices that define the face boundary
    # (outer perimeter — used to derive a tight face bounding box)
    _FACE_OVAL_LM = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58,  132,  93, 234,  127, 162,  21, 54,  103, 67,  109,
    ]

    def __init__(self):
        # MediaPipe Hands
        _mp_hands = mp.solutions.hands
        self._hands = _mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=MIN_HAND_CONF,
            min_tracking_confidence=0.5,
        )

        # MediaPipe FaceDetection (fallback only — model 0 = short range ≤ 2 m)
        _mp_fd = mp.solutions.face_detection
        self._face_det = _mp_fd.FaceDetection(
            model_selection=0,
            min_detection_confidence=0.5,
        )

        # State
        self._was_cheating: bool     = False
        self._last_count_time: float = 0.0

        # Cumulative count
        self.cheating_count: int = 0

    # ── Public API ─────────────────────────────────────────────────────────────

    def process_frame(
        self,
        image: np.ndarray,
        face_mesh_landmarks: Optional[np.ndarray] = None,   # shape (478, 3) px coords
    ) -> Dict:
        """
        Analyse one BGR frame for hand-on-face cheating.

        Args:
            image:               BGR frame
            face_mesh_landmarks: Optional landmark array from PoseEstimator.
                                 When provided, face bbox is derived from these
                                 landmarks (more reliable than running a 2nd model).

        Returns:
            {cheating_detected, cheating_count, overlap_ratio,
             face_bbox, hand_bboxes, proximity_flag, just_counted}
        """
        h, w = image.shape[:2]
        rgb  = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # ── Step 1: get face bounding box ─────────────────────────────────────
        face_bbox = None

        if face_mesh_landmarks is not None:
            # Preferred path — use already-computed Face Mesh landmarks
            face_bbox = self._face_bbox_from_landmarks(face_mesh_landmarks, w, h)

        if face_bbox is None:
            # Fallback — run MediaPipe FaceDetection separately
            face_bbox = self._detect_face_fallback(rgb, w, h)

        # ── Step 2: get hand bounding boxes ───────────────────────────────────
        hand_bboxes = self._detect_hands(rgb, w, h)

        # ── Step 3: compute overlap and proximity ─────────────────────────────
        max_overlap     = 0.0
        proximity_flag  = False

        if face_bbox and hand_bboxes:
            fx1, fy1, fx2, fy2 = face_bbox
            face_w = max(1, fx2 - fx1)
            face_h = max(1, fy2 - fy1)
            face_cx = (fx1 + fx2) / 2.0
            face_cy = (fy1 + fy2) / 2.0

            for hb in hand_bboxes:
                # Overlap fraction
                ov = self._overlap_fraction(face_bbox, hb)
                if ov > max_overlap:
                    max_overlap = ov

                # Proximity check (hand centroid near face center)
                hx1, hy1, hx2, hy2 = hb
                hand_cx = (hx1 + hx2) / 2.0
                hand_cy = (hy1 + hy2) / 2.0
                dist_x  = abs(hand_cx - face_cx) / face_w
                dist_y  = abs(hand_cy - face_cy) / face_h
                if dist_x < PROXIMITY_THR and dist_y < PROXIMITY_THR:
                    proximity_flag = True

        # Cheating if overlap OR hand very close to face
        cheating_now = (max_overlap >= OVERLAP_THR) or (
            proximity_flag and max_overlap > 0.05
        )
        just_counted = False

        if cheating_now and not self._was_cheating:
            now = time.time()
            if (now - self._last_count_time) >= COOLDOWN_SEC:
                self.cheating_count  += 1
                self._last_count_time = now
                just_counted          = True
                print(
                    f"[CHEAT] ⚠️  Hand-on-face! "
                    f"overlap={max_overlap:.1%}  "
                    f"proximity={proximity_flag}  "
                    f"cheating_count={self.cheating_count}"
                )

        self._was_cheating = cheating_now

        return {
            'cheating_detected': cheating_now,
            'cheating_count':    self.cheating_count,
            'overlap_ratio':     round(max_overlap, 3),
            'face_bbox':         face_bbox,
            'hand_bboxes':       hand_bboxes,
            'proximity_flag':    proximity_flag,
            'just_counted':      just_counted,
        }

    def reset(self):
        self._was_cheating    = False
        self._last_count_time = 0.0
        self.cheating_count   = 0

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _face_bbox_from_landmarks(
        self,
        lm_arr: np.ndarray,
        w: int,
        h: int,
    ) -> Optional[Tuple[int, int, int, int]]:
        """
        Derive face bounding box from Face Mesh landmark pixels.
        Uses the face-oval landmark indices for a tight boundary.

        FIX v3: This replaces running a second FaceDetection model which
        was unreliable when a hand was occluding the face.
        """
        try:
            oval_pts = lm_arr[self._FACE_OVAL_LM, :2]
            x1 = int(max(0,     oval_pts[:, 0].min()))
            y1 = int(max(0,     oval_pts[:, 1].min()))
            x2 = int(min(w - 1, oval_pts[:, 0].max()))
            y2 = int(min(h - 1, oval_pts[:, 1].max()))
            if (x2 - x1) < 20 or (y2 - y1) < 20:   # degenerate box
                return None
            # Add a small padding (5% each side)
            pad_x = int((x2 - x1) * 0.05)
            pad_y = int((y2 - y1) * 0.05)
            x1 = max(0,     x1 - pad_x)
            y1 = max(0,     y1 - pad_y)
            x2 = min(w - 1, x2 + pad_x)
            y2 = min(h - 1, y2 + pad_y)
            return (x1, y1, x2, y2)
        except Exception:
            return None

    def _detect_face_fallback(
        self, rgb: np.ndarray, w: int, h: int
    ) -> Optional[Tuple[int, int, int, int]]:
        """Fallback: MediaPipe FaceDetection when no landmarks are available."""
        try:
            res = self._face_det.process(rgb)
            if not res.detections:
                return None
            bb  = res.detections[0].location_data.relative_bounding_box
            x1 = max(0, int(bb.xmin * w))
            y1 = max(0, int(bb.ymin * h))
            x2 = min(w, int((bb.xmin + bb.width)  * w))
            y2 = min(h, int((bb.ymin + bb.height) * h))
            return (x1, y1, x2, y2)
        except Exception:
            return None

    def _detect_hands(
        self, rgb: np.ndarray, w: int, h: int
    ) -> List[Tuple[int, int, int, int]]:
        """Return list of (x1, y1, x2, y2) bounding boxes for each hand."""
        try:
            res = self._hands.process(rgb)
            if not res.multi_hand_landmarks:
                return []

            bboxes = []
            for hand_lm in res.multi_hand_landmarks:
                xs = [p.x * w for p in hand_lm.landmark]
                ys = [p.y * h for p in hand_lm.landmark]
                x1, y1 = int(min(xs)), int(min(ys))
                x2, y2 = int(max(xs)), int(max(ys))
                bboxes.append((x1, y1, x2, y2))
            return bboxes
        except Exception:
            return []

    @staticmethod
    def _overlap_fraction(
        face: Tuple[int, int, int, int],
        hand: Tuple[int, int, int, int],
    ) -> float:
        """
        Fraction of the face bounding box area covered by the hand bbox.
        Returns 0.0 if there is no intersection.
        """
        fx1, fy1, fx2, fy2 = face
        hx1, hy1, hx2, hy2 = hand

        ix1 = max(fx1, hx1)
        iy1 = max(fy1, hy1)
        ix2 = min(fx2, hx2)
        iy2 = min(fy2, hy2)

        if ix2 <= ix1 or iy2 <= iy1:
            return 0.0

        inter_area = (ix2 - ix1) * (iy2 - iy1)
        face_area  = max(1, (fx2 - fx1) * (fy2 - fy1))
        return inter_area / face_area
