"""
Fusion Engine — Combines all 4 AI model outputs into final JSON
Handles model lazy-loading and graceful degradation (stub fallback).
"""

import sys
import json
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


# ── Weight Configuration ──────────────────────────────────────────────────────
FINAL_SCORE_WEIGHTS = {
    'skill':       0.50,   # 50% — most important: did they answer correctly?
    'confidence':  0.20,   # 20% — did they seem confident?
    'integrity':   0.20,   # 20% — no cheating detected?
    'phone_free':  0.10,   # 10% — no phone present?
}


def compute_final_score(confidence_score: float,
                         cheating_risk:    float,
                         phone_detected:   bool,
                         skill_score:      float) -> float:
    """
    Compute final candidate score (0-100).

    Args:
        confidence_score: 0-1  (from confidence model)
        cheating_risk:    0-1  (from cheating LSTM)
        phone_detected:   bool (phone visible in frame)
        skill_score:      0-10 (from skill evaluator)

    Returns:
        final_score: 0-100
    """
    skill_100     = (skill_score / 10.0) * 100.0
    confidence_100 = confidence_score * 100.0
    integrity_100  = (1.0 - cheating_risk) * 100.0
    phone_100      = 0.0 if phone_detected else 100.0

    final = (
        FINAL_SCORE_WEIGHTS['skill']       * skill_100     +
        FINAL_SCORE_WEIGHTS['confidence']  * confidence_100 +
        FINAL_SCORE_WEIGHTS['integrity']   * integrity_100  +
        FINAL_SCORE_WEIGHTS['phone_free']  * phone_100
    )
    return round(max(0.0, min(100.0, final)), 1)


class AIFusionEngine:
    """
    Lazy-loading orchestrator for all 4 AI models.

    Models are loaded on first use to minimize startup time.
    Each model degrades gracefully if weights not found.
    """

    def __init__(self, device: str = 'cpu'):
        self.device = device

        # Lazy-loaded models
        self._confidence_model = None
        self._voice_model      = None
        self._cheating_model   = None
        self._phone_detector   = None
        self._skill_evaluator  = None

        # Cheating feature buffer (30 frames for LSTM)
        self._feature_buffer = []
        self._LSTM_SEQ_LEN   = 30

        # Load existing cheating detection engine
        try:
            from ml_pipeline.modules.detection_engine import CheatingDetectionEngine
            self._cheat_engine = CheatingDetectionEngine(use_gpu=False)
        except Exception as e:
            print(f"⚠️  CheatingDetectionEngine unavailable: {e}")
            self._cheat_engine = None

        print("✅ AIFusionEngine initialized")

    # ── Model Loaders ────────────────────────────────────────────────────────

    def _load_confidence_model(self):
        if self._confidence_model is not None:
            return
        try:
            import torch
            from ai_models.confidence.confidence_model import get_model
            path = ROOT / 'ai_models' / 'confidence' / 'weights' / 'confidence_model.pth'
            m = get_model('efficientnet', pretrained=False)
            if path.exists():
                m.load_state_dict(torch.load(str(path), map_location=self.device))
                print(f"✅ Confidence model loaded: {path}")
            else:
                print(f"⚠️  No confidence weights at {path} — using random init (train first)")
            m.eval()
            self._confidence_model = m
        except Exception as e:
            print(f"⚠️  Confidence model unavailable: {e}")

    def _load_cheating_lstm(self):
        if self._cheating_model is not None:
            return
        try:
            import torch
            from ai_models.cheating.cheating_lstm import CheatingLSTM
            path = ROOT / 'ai_models' / 'cheating' / 'weights' / 'cheating_lstm.pth'
            m = CheatingLSTM()
            if path.exists():
                m.load_state_dict(torch.load(str(path), map_location=self.device))
                print(f"✅ Cheating LSTM loaded: {path}")
            else:
                print(f"⚠️  No LSTM weights at {path} — using rule-based fallback")
            m.eval()
            self._cheating_model = m
        except Exception as e:
            print(f"⚠️  Cheating LSTM unavailable: {e}")

    def _load_phone_detector(self):
        if self._phone_detector is not None:
            return
        try:
            from ai_models.phone.phone_detector_v2 import PhoneDetectorV2
            self._phone_detector = PhoneDetectorV2(verbose=True)
        except Exception as e:
            print(f"⚠️  PhoneDetectorV2 unavailable: {e}")

    def _load_skill_evaluator(self):
        if self._skill_evaluator is not None:
            return
        try:
            from ai_models.skill.skill_model import SkillEvaluator
            self._skill_evaluator = SkillEvaluator(device=self.device)
        except Exception as e:
            print(f"⚠️  SkillEvaluator unavailable: {e}")

    # ── Individual Predictors ─────────────────────────────────────────────────

    def predict_confidence(self, face_image_bgr: np.ndarray) -> Dict:
        """
        Predict confidence from a face crop (BGR numpy array).
        Returns: {confidence_score, face_class}
        """
        import torch
        from torchvision import transforms
        from PIL import Image

        self._load_confidence_model()

        if self._confidence_model is None:
            return {'confidence_score': 0.5, 'face_class': 'unknown'}

        # Preprocess
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                  [0.229, 0.224, 0.225]),
        ])
        import cv2
        rgb = cv2.cvtColor(face_image_bgr, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(rgb)
        t   = transform(pil).unsqueeze(0)  # (1, 3, 224, 224)

        with torch.no_grad():
            score = float(self._confidence_model.predict_confidence_score(t).item())

        classes    = ['confident', 'nervous', 'neutral']
        logits     = self._confidence_model(t)
        face_class = classes[int(logits.argmax().item())]

        return {'confidence_score': round(score, 4), 'face_class': face_class}

    def predict_cheating_lstm(self, frame_features: Dict) -> float:
        """
        Accumulate temporal features and predict cheating risk (LSTM).

        Args:
            frame_features: dict from existing detection engine result
        Returns:
            cheating_risk 0.0-1.0
        """
        # Extract 6-dim feature vector from frame
        head = frame_features.get('head_pose', {})
        gaze = frame_features.get('gaze_ratio', 0.5) or 0.5
        fc   = frame_features.get('face_count', 1)

        yaw   = float(head.get('yaw',   0)) / 90.0
        pitch = float(head.get('pitch', 0)) / 90.0
        roll  = float(head.get('roll',  0)) / 45.0
        gx    = float(gaze) if isinstance(gaze, float) else 0.5
        gy    = 0.5  # pitch approximation
        fc_n  = min(float(fc), 3.0) / 3.0

        feat = [
            np.clip(yaw,   -1, 1),
            np.clip(pitch, -1, 1),
            np.clip(roll,  -1, 1),
            np.clip(gx,     0, 1),
            np.clip(gy,     0, 1),
            fc_n,
        ]
        self._feature_buffer.append(feat)
        if len(self._feature_buffer) > self._LSTM_SEQ_LEN:
            self._feature_buffer = self._feature_buffer[-self._LSTM_SEQ_LEN:]

        if len(self._feature_buffer) < self._LSTM_SEQ_LEN:
            # Not enough history → use rule-based fallback score
            return float(frame_features.get('cheating_score', 0.0))

        self._load_cheating_lstm()
        if self._cheating_model is None:
            return float(frame_features.get('cheating_score', 0.0))

        import torch
        seq = torch.tensor([self._feature_buffer], dtype=torch.float32)  # (1, 30, 6)
        prob = float(self._cheating_model.predict_probability(seq).item())
        return round(prob, 4)

    def predict_phone(self, image: np.ndarray) -> Dict:
        """Detect phone in frame."""
        self._load_phone_detector()

        if self._phone_detector is None or not self._phone_detector.is_active:
            # Fallback: rule-based (legacy phone_detection.py stub)
            return {
                'phone_detected': False,
                'phone_detections': [],
                'phone_duration_sec': 0.0,
            }

        detections = self._phone_detector.get_detections(image)
        found      = len(detections) > 0
        self._phone_detector.history.append(found)
        duration   = self._phone_detector.get_phone_duration()

        return {
            'phone_detected':    found,
            'phone_detections':  detections,
            'phone_duration_sec': round(duration, 2),
        }

    def evaluate_skill(self, question: str, candidate_answer: str,
                       reference_answer: str = '', domain: str = 'general') -> Dict:
        """Evaluate candidate answer quality."""
        self._load_skill_evaluator()

        if self._skill_evaluator is None:
            # Keyword fallback (no SBERT)
            from ai_models.skill.skill_model import keyword_overlap_score
            kw_score, matched = keyword_overlap_score(candidate_answer, reference_answer)
            score = round(kw_score * 10, 2)
            return {
                'skill_score': score,
                'relevance':   round(kw_score, 4),
                'keywords_matched': matched,
                'feedback': 'Keyword-only scoring (SBERT unavailable)',
            }

        result = self._skill_evaluator.evaluate(
            question  = question,
            candidate = candidate_answer,
            reference = reference_answer,
            domain    = domain,
        )
        return {
            'skill_score':       result['score'],
            'relevance':         result['relevance'],
            'keywords_matched':  result['keywords_matched'],
            'feedback':          result['feedback'],
        }

    def full_analyze(self,
                     frame:            Optional[np.ndarray] = None,
                     face_crop:        Optional[np.ndarray] = None,
                     question:         str = '',
                     candidate_answer: str = '',
                     reference_answer: str = '',
                     domain:           str = 'general') -> Dict:
        """
        Run all models and return unified JSON result.

        Args:
            frame:            Full frame (for phone detection + existing cheating pipeline)
            face_crop:        Cropped face region (for confidence model)
            question:         Interview question
            candidate_answer: Candidate's text answer
            reference_answer: Reference/ideal answer

        Returns:
            Full analysis JSON matching the spec:
            {confidence_score, cheating_risk, phone_detected, skill_score, final_score}
        """
        result = {
            'confidence_score': 0.5,
            'cheating_risk':    0.0,
            'phone_detected':   False,
            'skill_score':      0.0,
            'final_score':      0.0,
            'violations':       [],
            'integrity_score':  100.0,
            'timestamp':        datetime.now(timezone.utc).isoformat(),
            'details':          {}
        }

        # ── 1. Existing pipeline (gaze, pose, face, legacy phone) ─────────────
        cheat_frame_data = {}
        if frame is not None and self._cheat_engine is not None:
            try:
                cheat_frame_data = self._cheat_engine.process_frame(frame)
                result['cheating_risk']   = float(cheat_frame_data.get('cheating_score', 0.0))
                result['integrity_score'] = float(cheat_frame_data.get('integrity_score', 100.0))
                result['violations']      = cheat_frame_data.get('violations', [])
                result['details']['gaze']  = cheat_frame_data.get('gaze_direction')
                result['details']['faces'] = cheat_frame_data.get('face_count', 1)
                result['details']['pose']  = cheat_frame_data.get('head_pose', {})
            except Exception as e:
                result['details']['cheat_engine_error'] = str(e)

        # ── 2. Confidence (if face crop provided) ─────────────────────────────
        if face_crop is not None:
            try:
                conf_result = self.predict_confidence(face_crop)
                result['confidence_score']     = conf_result['confidence_score']
                result['details']['face_class'] = conf_result['face_class']
            except Exception as e:
                result['details']['confidence_error'] = str(e)

        # ── 3. LSTM cheating risk (override rule-based if buffer full) ─────────
        if frame is not None and cheat_frame_data:
            try:
                lstm_risk = self.predict_cheating_lstm(cheat_frame_data)
                # Blend: 40% LSTM, 60% rule-based when both available
                rule_risk = result['cheating_risk']
                if len(self._feature_buffer) == self._LSTM_SEQ_LEN:
                    result['cheating_risk']            = round(0.6 * rule_risk + 0.4 * lstm_risk, 4)
                    result['details']['lstm_cheat_risk'] = lstm_risk
                    result['details']['rule_cheat_risk'] = rule_risk
            except Exception as e:
                result['details']['lstm_error'] = str(e)

        # ── 4. Phone detection (YOLOv8 v2) ────────────────────────────────────
        if frame is not None:
            try:
                phone_result = self.predict_phone(frame)
                result['phone_detected']             = phone_result['phone_detected']
                result['details']['phone_detections'] = phone_result['phone_detections']
                result['details']['phone_duration']   = phone_result['phone_duration_sec']
            except Exception as e:
                result['details']['phone_error'] = str(e)

        # ── 5. Skill evaluation ────────────────────────────────────────────────
        if candidate_answer.strip():
            try:
                skill_result = self.evaluate_skill(question, candidate_answer,
                                                   reference_answer, domain)
                result['skill_score']                  = skill_result['skill_score']
                result['details']['skill_relevance']   = skill_result['relevance']
                result['details']['keywords_matched']  = skill_result['keywords_matched']
                result['details']['skill_feedback']    = skill_result['feedback']
            except Exception as e:
                result['details']['skill_error'] = str(e)

        # ── 6. Final score fusion ──────────────────────────────────────────────
        result['final_score'] = compute_final_score(
            confidence_score = result['confidence_score'],
            cheating_risk    = result['cheating_risk'],
            phone_detected   = result['phone_detected'],
            skill_score      = result['skill_score'],
        )

        return result

    def reset(self):
        """Reset all temporal buffers and the cheating engine."""
        self._feature_buffer = []
        if self._cheat_engine is not None:
            self._cheat_engine.reset()
        if self._phone_detector is not None:
            self._phone_detector.reset()
        print("✅ AIFusionEngine reset.")


# ── Singleton ────────────────────────────────────────────────────────────────
_global_engine: Optional[AIFusionEngine] = None


def get_fusion_engine(device: str = 'cpu') -> AIFusionEngine:
    """Get or create the global fusion engine (singleton)."""
    global _global_engine
    if _global_engine is None:
        _global_engine = AIFusionEngine(device=device)
    return _global_engine


if __name__ == '__main__':
    engine = get_fusion_engine()

    # Demo: skill evaluation only
    result = engine.full_analyze(
        question         = 'What is a Python decorator?',
        candidate_answer = 'A decorator wraps a function to add functionality using @ syntax and closures.',
        reference_answer = 'A decorator is a function that wraps another function to extend its behavior '
                           'without modifying it directly. Uses @syntax and closures.',
    )
    print(json.dumps({k: v for k, v in result.items() if k != 'details'}, indent=2))
