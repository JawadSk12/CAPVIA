"""
Phone Detector v2 — Production-Ready YOLOv8 Phone Detector
Replaces the stub ml_pipeline/modules/phone_detection.py.
Supports: fine-tuned weights OR pretrained yolov8n with phone class filtering.

Phone class in COCO (pretrained yolov8n): class_id = 67
Phone class in fine-tuned model:          class_id = 0
"""

import sys
import numpy as np
from pathlib import Path
from collections import deque
from typing import List, Dict, Optional, Tuple

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class PhoneDetectorV2:
    """
    Production phone detector using YOLOv8.

    Priority:
      1. Fine-tuned phone model (phone_yolov8_finetuned.pt) — class 0
      2. Pretrained yolov8n.pt — class 67 (cell phone)
      3. Fallback stub (no detection, warns user)

    Includes temporal smoothing via rolling history buffer.
    """

    PRETRAINED_PHONE_CLASS_ID  = 67   # COCO index for 'cell phone'
    FINETUNED_PHONE_CLASS_ID   = 0    # our single-class fine-tuned model

    def __init__(self,
                 model_path:   Optional[str] = None,
                 confidence:   float         = 0.55,
                 history_size: int           = 60,
                 verbose:      bool          = False):
        """
        Args:
            model_path:   Path to .pt weights (fine-tuned or pretrained).
                          If None, auto-discovers in project.
            confidence:   Minimum detection confidence threshold.
            history_size: Frames to keep in temporal history buffer.
            verbose:      Print loaded model path.
        """
        self.confidence   = confidence
        self.history      = deque(maxlen=history_size)
        self.verbose      = verbose
        self.model        = None
        self.class_id     = self.PRETRAINED_PHONE_CLASS_ID
        self.model_type   = 'unavailable'

        if not YOLO_AVAILABLE:
            print("⚠️  ultralytics not installed. Phone detection disabled.")
            print("    Install with: pip install ultralytics")
            return

        # Auto-discover model
        if model_path is None:
            finetuned = ROOT / 'ai_models' / 'phone' / 'weights' / 'phone_yolov8_finetuned.pt'
            pretrained = ROOT / 'inference' / 'yolov8n.pt'
            if finetuned.exists():
                model_path = str(finetuned)
                self.class_id   = self.FINETUNED_PHONE_CLASS_ID
                self.model_type = 'finetuned'
            elif pretrained.exists():
                model_path = str(pretrained)
                self.class_id   = self.PRETRAINED_PHONE_CLASS_ID
                self.model_type = 'pretrained'
            else:
                print("⚠️  No YOLOv8 weights found. Phone detection disabled.")
                return

        try:
            self.model = YOLO(model_path)
            self.model.fuse()  # fuse conv+bn layers for faster inference
            if verbose:
                print(f"✅ PhoneDetectorV2 loaded [{self.model_type}]: {model_path}")
        except Exception as e:
            print(f"⚠️  Failed to load YOLO model: {e}")
            self.model = None

    @property
    def is_active(self) -> bool:
        return self.model is not None

    def detect(self, image: np.ndarray) -> bool:
        """
        Detect if phone is present in the frame.

        Args:
            image: BGR numpy array (H, W, 3)
        Returns:
            True if phone detected above confidence threshold
        """
        if not self.is_active:
            self.history.append(False)
            return False

        detections = self.get_detections(image)
        found = len(detections) > 0
        self.history.append(found)
        return found

    def get_detections(self, image: np.ndarray) -> List[Dict]:
        """
        Get all phone detections with bounding boxes.

        Returns:
            List of dicts: {bbox, confidence, class_name}
        """
        if not self.is_active:
            return []

        try:
            results = self.model(
                image,
                conf=self.confidence,
                classes=[self.class_id],
                verbose=False,
                stream=False,
            )[0]
        except Exception as e:
            if self.verbose:
                print(f"⚠️  YOLO inference error: {e}")
            return []

        detections = []
        for box in results.boxes:
            cls_id = int(box.cls.item())
            if cls_id != self.class_id:
                continue
            conf = float(box.conf.item())
            xyxy = box.xyxy[0].tolist()
            detections.append({
                'bbox':       [int(v) for v in xyxy],   # [x1, y1, x2, y2]
                'confidence': round(conf, 4),
                'class_name': 'cell_phone',
                'class_id':   cls_id,
            })

        return detections

    def sustained_detection(self, duration_sec: float = 1.0, fps: float = 1.25) -> bool:
        """
        Check if phone was sustained for minimum duration in history.

        Args:
            duration_sec: Minimum sustained duration in seconds
            fps:          Frame polling rate
        Returns:
            True if phone sustained for duration
        """
        required_frames = max(1, int(duration_sec * fps))
        if len(self.history) < required_frames:
            return False
        recent = list(self.history)[-required_frames:]
        return sum(recent) >= required_frames * 0.8  # 80% of frames

    def get_phone_duration(self, fps: float = 1.25) -> float:
        """
        Calculate total phone-visible duration in seconds within history.

        Returns:
            Duration in seconds
        """
        if not self.history:
            return 0.0
        return sum(self.history) / fps

    def reset(self):
        """Clear detection history."""
        self.history.clear()

    def __repr__(self):
        return (f"PhoneDetectorV2(active={self.is_active}, "
                f"type={self.model_type}, conf={self.confidence})")


# ── Standalone Test ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import argparse, cv2

    parser = argparse.ArgumentParser()
    parser.add_argument('--image',      type=str, default=None, help='Test image path')
    parser.add_argument('--webcam',     action='store_true',     help='Test on webcam feed')
    parser.add_argument('--model-path', type=str, default=None)
    parser.add_argument('--conf',       type=float, default=0.5)
    args = parser.parse_args()

    detector = PhoneDetectorV2(
        model_path=args.model_path,
        confidence=args.conf,
        verbose=True,
    )
    print(f"Detector: {detector}")

    if args.image:
        img = cv2.imread(args.image)
        if img is None:
            print(f"❌ Could not read {args.image}")
        else:
            found      = detector.detect(img)
            detections = detector.get_detections(img)
            print(f"\n🔍 Phone detected: {found}")
            for d in detections:
                print(f"   bbox={d['bbox']}  confidence={d['confidence']}")

            # Draw boxes
            for d in detections:
                x1, y1, x2, y2 = d['bbox']
                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(img, f"Phone {d['confidence']:.2f}",
                            (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            out = Path(args.image).with_name('phone_detection_result.jpg')
            cv2.imwrite(str(out), img)
            print(f"   Result saved → {out}")

    elif args.webcam:
        cap = cv2.VideoCapture(0)
        print("📷 Webcam test — press Q to quit")
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            dets = detector.get_detections(frame)
            for d in dets:
                x1, y1, x2, y2 = d['bbox']
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame, f"PHONE {d['confidence']:.2f}",
                            (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            label = f"{'PHONE DETECTED!' if dets else 'No phone'}"
            color = (0, 0, 255) if dets else (0, 255, 0)
            cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
            cv2.imshow('Phone Detector v2', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        cap.release()
        cv2.destroyAllWindows()
    else:
        print("Usage: python phone_detector_v2.py --image path.jpg")
        print("       python phone_detector_v2.py --webcam")
