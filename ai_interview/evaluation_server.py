"""
evaluation_server.py
====================
FastAPI server that exposes the AI evaluation pipeline as a REST API.
The React app calls this after all 5 answers are collected.

Endpoints:
  POST /evaluate   → evaluate all Q&A pairs, return full scored report
  GET  /health     → server health check

Start with:
  python3 evaluation_server.py
  (runs on http://localhost:8765)
"""

import sys
import os
import logging

# Add the ai_interview_engine folder to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai_interview_engine'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from answer_evaluator import evaluate_all, compute_final_score
from feedback_generator import generate_final_report

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Interview Evaluation API",
    description="Semantic answer evaluation using SentenceTransformers + KeyBERT",
    version="1.0.0",
)

# Allow requests from the React dev server and Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tightened in production
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Request / Response models ─────────────────────────────────────────────────

class QAPair(BaseModel):
    question: str
    answer:   str

class EvaluationRequest(BaseModel):
    role:     str              # e.g. "Data Scientist"
    topic:    str              # e.g. "Machine Learning"
    qa_pairs: List[QAPair]    # exactly 5 question-answer pairs

class QuestionResult(BaseModel):
    question:       str
    user_answer:    str
    keyword_score:  float
    semantic_score: float
    concept_score:  float
    final_score:    float
    score_pct:      str
    tier:           str
    color:          str
    correct:        str
    missing:        str
    suggestion:     str
    covered:        List[str]
    missing_concepts: List[str]

class EvaluationResponse(BaseModel):
    final_score_pct: str
    final_score_raw: float
    tier:            str
    color:           str
    strengths:       str
    weaknesses:      str
    suggestions:     str
    per_question:    List[QuestionResult]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check — used by the React app to detect if evaluator is running."""
    return {"status": "ok", "service": "AI Interview Evaluator", "version": "1.0.0"}


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(req: EvaluationRequest):
    """
    Evaluate all Q&A pairs after the interview is complete.

    Accepts: { role, topic, qa_pairs: [{question, answer}, ...] }
    Returns: Full scored report with per-question breakdown and feedback.
    """
    if len(req.qa_pairs) == 0:
        raise HTTPException(status_code=400, detail="No Q&A pairs provided.")
    if len(req.qa_pairs) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 Q&A pairs supported.")

    questions = [p.question for p in req.qa_pairs]
    answers   = [p.answer   for p in req.qa_pairs]

    logger.info(f"Evaluating {len(questions)} answers for role='{req.role}' topic='{req.topic}'")

    try:
        evaluations  = evaluate_all(questions, answers, req.role, req.topic)
        final_score  = compute_final_score(evaluations)
        report       = generate_final_report(evaluations, final_score, req.role, req.topic)
    except Exception as e:
        logger.exception("Evaluation pipeline failed")
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")

    # Build per-question results
    per_q: List[QuestionResult] = []
    for q_fb in report["per_question"]:
        per_q.append(QuestionResult(
            question       = q_fb["question"],
            user_answer    = q_fb["user_answer"],
            keyword_score  = q_fb["kw_score"],
            semantic_score = q_fb["sem_score"],
            concept_score  = q_fb["con_score"],
            final_score    = q_fb["score"],
            score_pct      = q_fb["score_pct"],
            tier           = q_fb["tier"],
            color          = q_fb["color"],
            correct        = q_fb["correct"],
            missing        = q_fb["missing"],
            suggestion     = q_fb["suggestion"],
            covered        = [],   # concept details are in evaluation object
            missing_concepts = [],
        ))

    return EvaluationResponse(
        final_score_pct = report["final_score_pct"],
        final_score_raw = final_score,
        tier            = report["tier"],
        color           = report["color"],
        strengths       = report["strengths"],
        weaknesses      = report["weaknesses"],
        suggestions     = report["suggestions"],
        per_question    = per_q,
    )


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting AI Interview Evaluation Server on http://localhost:8765")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")
