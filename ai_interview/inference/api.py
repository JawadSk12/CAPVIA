"""
FastAPI Server — Complete Multi-Model Interview Proctoring API
Extends the original cheating detection API with:
  - /analyze_confidence  (face image → confidence score)
  - /analyze_cheating    (frame → cheating risk)
  - /detect_phone        (frame → phone detected + bbox)
  - /evaluate_skill      (text → skill score)
  - /full_analyze        (frame + text → unified JSON)

Original endpoints retained:
  - GET  /                   (health check)
  - POST /set_reference      (register face)
  - POST /analyze            (original cheating detection)
  - POST /reset              (reset engine)
  - GET  /status             (engine status)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import sys
from pathlib import Path
from typing import Optional, List
import json

# Add project root to path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from ml_pipeline.modules.detection_engine import CheatingDetectionEngine
from inference.fusion_engine import get_fusion_engine

# ── App Initialization ────────────────────────────────────────────────────────
app = FastAPI(
    title       = "IntellInterview AI Proctoring API",
    description = "Multi-model AI system: Confidence + Cheating + Phone + Skill evaluation",
    version     = "2.0.0",
    docs_url    = "/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Global Engines ─────────────────────────────────────────────────────────────
# Original cheating engine (kept for backward compatibility)
legacy_engine = CheatingDetectionEngine(use_gpu=False)

# New unified fusion engine (lazy-loads all 4 models)
fusion = get_fusion_engine(device='cpu')


# ── Response Models ────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    engine_ready: bool
    reference_set: bool
    api_version: str

class ReferenceResponse(BaseModel):
    success: bool
    message: str

class AnalysisResponse(BaseModel):
    success: bool
    face_count: int
    gaze_direction: Optional[str]
    phone_visible: bool
    head_pose: dict
    cheating_score: float
    violations: list
    is_cheating: bool
    integrity_score: float

class ConfidenceResponse(BaseModel):
    success: bool
    confidence_score: float
    face_class: str
    message: str

class CheatingResponse(BaseModel):
    success: bool
    cheating_risk: float
    rule_based_score: float
    lstm_risk: Optional[float]
    violations: list
    is_cheating: bool
    integrity_score: float

class PhoneResponse(BaseModel):
    success: bool
    phone_detected: bool
    detections: list
    phone_duration_sec: float
    message: str

class SkillResponse(BaseModel):
    success: bool
    skill_score: float
    relevance: float
    keywords_matched: list
    feedback: str
    domain: str

class FullAnalysisResponse(BaseModel):
    success: bool
    confidence_score: float
    cheating_risk: float
    phone_detected: bool
    skill_score: float
    final_score: float
    violations: list
    integrity_score: float
    timestamp: str
    details: dict

class ResetResponse(BaseModel):
    success: bool
    message: str


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _decode_image(file: UploadFile) -> np.ndarray:
    """Decode uploaded image file to BGR numpy array."""
    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    img      = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return img


def _auto_crop_face(image: np.ndarray) -> Optional[np.ndarray]:
    """Use OpenCV to auto-detect and crop the largest face."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    cascade = cv2.CascadeClassifier(cascade_path)
    faces   = cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
    if len(faces) == 0:
        return None
    # Pick largest face
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    pad = 20
    x1  = max(0, x - pad)
    y1  = max(0, y - pad)
    x2  = min(image.shape[1], x + w + pad)
    y2  = min(image.shape[0], y + h + pad)
    return image[y1:y2, x1:x2]


# ── Original Endpoints (backward compatible) ───────────────────────────────────

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check — API status and version."""
    return {
        "status":        "ok",
        "engine_ready":  True,
        "reference_set": legacy_engine.reference_set,
        "api_version":   "2.0.0",
    }


@app.post("/set_reference", response_model=ReferenceResponse)
async def set_reference(file: UploadFile = File(...)):
    """Register reference face from first frame."""
    try:
        img     = await _decode_image(file)
        success = legacy_engine.set_reference(img)
        fusion._cheat_engine.set_reference(img) if fusion._cheat_engine else None
        return {
            "success": success,
            "message": "Reference face set." if success else "Could not detect single face.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_frame_legacy(file: UploadFile = File(...)):
    """[Legacy] Analyze frame for cheating (original response schema)."""
    try:
        img    = await _decode_image(file)
        result = legacy_engine.process_frame(img)
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset", response_model=ResetResponse)
async def reset_engine():
    """Reset all detection engines."""
    try:
        global legacy_engine
        legacy_engine = CheatingDetectionEngine(use_gpu=False)
        fusion.reset()
        return {"success": True, "message": "All engines reset."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def get_status():
    """Get current engine status."""
    return {
        "reference_set": legacy_engine.reference_set,
        "weights":       legacy_engine.weights,
        "ready":         True,
        "api_version":   "2.0.0",
        "models": {
            "confidence":  fusion._confidence_model is not None,
            "cheating_lstm": fusion._cheating_model is not None,
            "phone_v2":    fusion._phone_detector is not None,
            "skill":       fusion._skill_evaluator is not None,
        },
    }


# ── NEW: Model-Specific Endpoints ──────────────────────────────────────────────

@app.post("/analyze_confidence", response_model=ConfidenceResponse)
async def analyze_confidence(file: UploadFile = File(...)):
    """
    Confidence Detection — EfficientNet face analysis.

    Upload a video frame. The largest face is auto-cropped and analyzed.
    Returns confidence score 0-1 (1=very confident, 0=nervous).
    """
    try:
        img       = await _decode_image(file)
        face_crop = _auto_crop_face(img) or img  # fallback to full frame
        result    = fusion.predict_confidence(face_crop)
        return {
            "success":          True,
            "confidence_score": result["confidence_score"],
            "face_class":       result["face_class"],
            "message":          f"Face detected as '{result['face_class']}' with score {result['confidence_score']:.4f}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze_cheating", response_model=CheatingResponse)
async def analyze_cheating_full(file: UploadFile = File(...)):
    """
    Cheating Risk Analysis — Rule-based + BiLSTM hybrid.

    Analyzes gaze direction, head pose, face count, and temporal patterns.
    LSTM risk accumulates over 30 frames for temporal reasoning.
    """
    try:
        img        = await _decode_image(file)
        rule_result = legacy_engine.process_frame(img)
        lstm_risk   = fusion.predict_cheating_lstm(rule_result)

        rule_score = rule_result.get("cheating_score", 0.0)
        blended    = (0.6 * rule_score + 0.4 * lstm_risk
                      if len(fusion._feature_buffer) >= fusion._LSTM_SEQ_LEN
                      else rule_score)

        return {
            "success":          True,
            "cheating_risk":    round(blended, 4),
            "rule_based_score": round(rule_score, 4),
            "lstm_risk":        round(lstm_risk, 4),
            "violations":       rule_result.get("violations", []),
            "is_cheating":      blended > 0.7,
            "integrity_score":  round((1 - blended) * 100, 1),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect_phone", response_model=PhoneResponse)
async def detect_phone(file: UploadFile = File(...)):
    """
    Phone Detection — YOLOv8 (fine-tuned or pretrained).

    Detects mobile phones in the frame. Returns bounding boxes and
    duration phone has been visible in recent frames.
    """
    try:
        img    = await _decode_image(file)
        result = fusion.predict_phone(img)
        return {
            "success":           True,
            "phone_detected":    result["phone_detected"],
            "detections":        result["phone_detections"],
            "phone_duration_sec": result["phone_duration_sec"],
            "message":           ("⚠️ Phone detected!" if result["phone_detected"]
                                  else "✅ No phone detected."),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate_skill", response_model=SkillResponse)
async def evaluate_skill(
    question:         str = Form(...),
    candidate_answer: str = Form(...),
    reference_answer: str = Form(default=''),
    domain:           str = Form(default='general'),
):
    """
    Skill Evaluation — Sentence-BERT answer scorer.

    Evaluates candidate answer semantic similarity and keyword overlap
    against the reference answer. Returns a score 0-10.

    - question: The interview question asked
    - candidate_answer: What the candidate said
    - reference_answer: Ideal/expected answer (optional)
    - domain: Topic area (python, sql, algorithms, behavioral, etc.)
    """
    try:
        result = fusion.evaluate_skill(question, candidate_answer,
                                       reference_answer, domain)
        return {
            "success":          True,
            "skill_score":      result["skill_score"],
            "relevance":        result["relevance"],
            "keywords_matched": result["keywords_matched"],
            "feedback":         result["feedback"],
            "domain":           domain,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/full_analyze", response_model=FullAnalysisResponse)
async def full_analyze(
    frame:            UploadFile = File(default=None),
    question:         str        = Form(default=''),
    candidate_answer: str        = Form(default=''),
    reference_answer: str        = Form(default=''),
    domain:           str        = Form(default='general'),
):
    """
    Full Analysis — All 4 models unified.

    Accepts:
    - frame (optional): Video frame image for computer vision models
    - question: Interview question
    - candidate_answer: Candidate's spoken/typed answer
    - reference_answer: Ideal answer for skill scoring

    Returns unified JSON:
    {
      confidence_score, cheating_risk, phone_detected,
      skill_score, final_score, violations, integrity_score
    }
    """
    try:
        img       = None
        face_crop = None

        if frame is not None:
            img       = await _decode_image(frame)
            face_crop = _auto_crop_face(img)

        result = fusion.full_analyze(
            frame            = img,
            face_crop        = face_crop,
            question         = question,
            candidate_answer = candidate_answer,
            reference_answer = reference_answer,
            domain           = domain,
        )

        return {"success": True, **result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Training Trigger Endpoints (Dev-Only) ─────────────────────────────────────

@app.post("/admin/train_all")
async def trigger_training(
    synthetic_samples: int = Form(default=2000),
    epochs_confidence: int = Form(default=30),
    epochs_cheating:   int = Form(default=50),
    epochs_skill:      int = Form(default=10),
):
    """
    [Admin] Trigger training of all 4 models with synthetic data.
    Long-running — check /status for completion.
    Returns training script invocation details.
    """
    import subprocess
    scripts = {
        'confidence': str(ROOT / 'ai_models' / 'confidence' / 'train_confidence.py'),
        'cheating':   str(ROOT / 'ai_models' / 'cheating'   / 'train_cheating.py'),
        'skill':      str(ROOT / 'ai_models' / 'skill'      / 'train_skill.py'),
    }
    return {
        "message":       "Training scripts available. Run them directly for full control.",
        "scripts":       scripts,
        "instructions": {
            "confidence": f"python {scripts['confidence']} --epochs {epochs_confidence}",
            "cheating":   f"python {scripts['cheating']}   --epochs {epochs_cheating}",
            "skill":      f"python {scripts['skill']}       --epochs {epochs_skill}",
        }
    }


# ── Server Entry Point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    print("=" * 70)
    print("🎓 INTELLINTERVIEW AI PROCTORING API v2.0")
    print("=" * 70)
    print("📌 Endpoints:")
    print("   GET  /                  → Health check")
    print("   POST /set_reference     → Register reference face")
    print("   POST /analyze           → [Legacy] Cheating detection")
    print("   POST /analyze_confidence → Confidence score from face")
    print("   POST /analyze_cheating  → Cheating risk (rule + LSTM)")
    print("   POST /detect_phone      → YOLOv8 phone detection")
    print("   POST /evaluate_skill    → Skill score from answer text")
    print("   POST /full_analyze      → All models unified JSON")
    print("=" * 70)
    print("📖 Swagger UI: http://localhost:5001/docs")
    print("=" * 70)

    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")