"""
answer_evaluator.py
===================
Handles answer evaluation using SentenceTransformers (SBERT) and NLP heuristics.
"""

import os
import re
import sys
from typing import List, Dict, Optional, Tuple

import numpy as np

# Add parent directory of this file to sys.path so we can import ai_models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_models.skill.skill_model import SkillEvaluator

# ── Noise word set: fillers + stop words + question-prompt verbs ──────────────
NOISE_WORDS = {
    'ok', 'okay', 'so', 'um', 'uh', 'yeah', 'yep', 'nope', 'hmm', 'ah', 'oh',
    'well', 'like', 'right', 'sure', 'fine', 'good', 'yes', 'no', 'maybe',
    'just', 'sort', 'kind', 'stuff', 'thing', 'things', 'know', 'mean',
    'basically', 'actually', 'literally', 'honestly', 'totally', 'definitely',
    'hi', 'hello', 'hey', 'bye', 'thanks', 'thank', 'please', 'sorry', 'wait',
    'let', 'get', 'got', 'make', 'put', 'say', 'tell', 'see', 'think', 'go',
    'come', 'give', 'take', 'use', 'want', 'need', 'have', 'try',
    # Question prompt words — repeating them earns no credit
    'walk', 'explain', 'describe', 'list', 'name', 'define', 'compare',
    'discuss', 'elaborate', 'mention', 'show', 'provide', 'identify',
    'outline', 'summarize', 'write', 'consider', 'evaluate', 'analyze',
    # Standard stop words
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can',
    'what', 'which', 'who', 'where', 'when', 'why', 'how',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    'in', 'on', 'at', 'by', 'for', 'with', 'about', 'between', 'into',
    'through', 'before', 'after', 'to', 'from', 'up', 'down', 'out', 'off',
    'or', 'and', 'but', 'nor', 'yet', 'not', 'very', 'really', 'too', 'also',
    'one', 'two', 'three', 'four', 'five', 'first', 'second', 'main', 'most',
    'more', 'less', 'many', 'much', 'some', 'any', 'all', 'each', 'every',
    'of', 'as', 'than', 'such', 'only', 'however', 'even', 'then', 'here', 'there',
    'if', 'both', 'either', 'neither', 'same', 'different', 'new', 'old',
}

# Singleton Evaluator Instance
_evaluator: Optional[SkillEvaluator] = None

def get_evaluator() -> SkillEvaluator:
    global _evaluator
    if _evaluator is None:
        # Load SkillEvaluator using 'all-MiniLM-L6-v2' (or fallback)
        _evaluator = SkillEvaluator(device='cpu')
    return _evaluator

def meaningful_words(text: str) -> List[str]:
    """Extract clean words contributing to technical/substantive answer meaning."""
    text_clean = text.lower().replace("'", "")
    words = re.findall(r'\b[a-z0-9][a-z0-9\-_]{2,}\b', text_clean)
    return [w for w in words if w not in NOISE_WORDS]

def extract_keywords_from_question(q: str) -> List[str]:
    """Get unique expected technical terms from the question prompt."""
    return list(set(meaningful_words(q)))

def evaluate_single(question: str, answer: str) -> Dict:
    """
    Evaluates a single Q&A pair and returns detailed scoring and feedback dict.
    Returns keys matching evaluation_server.py mapping requirement.
    """
    q_clean = question.strip()
    a_clean = answer.strip()
    expected_kws = extract_keywords_from_question(q_clean)

    # 1. Handle empty / default stub answer
    if not a_clean or a_clean == "[No answer provided]" or len(a_clean) < 2:
        return {
            "question": question,
            "user_answer": answer,
            "kw_score": 0.0,
            "sem_score": 0.0,
            "con_score": 0.0,
            "score": 0.0,
            "score_pct": "0.0%",
            "tier": "Poor",
            "color": "#EF4444",
            "correct": "No answer was recorded.",
            "missing": f"Missed all key concepts: {', '.join(expected_kws[:4]) or 'technical concepts'}.",
            "suggestion": "Please attempt to answer the question verbally next time."
        }

    mw = meaningful_words(a_clean)

    # 2. Filler-only answers
    if not mw:
        return {
            "question": question,
            "user_answer": answer,
            "kw_score": 0.0,
            "sem_score": 0.0,
            "con_score": 0.0,
            "score": 0.05,
            "score_pct": "5.0%",
            "tier": "Poor",
            "color": "#EF4444",
            "correct": "Spoke filler words.",
            "missing": "Lacks substantive technical explanation.",
            "suggestion": "Avoid filler phrases and construct a meaningful answer."
        }

    # 3. Too short answer
    if len(mw) < 3:
        short_score = min(0.10, len(mw) * 0.03)
        return {
            "question": question,
            "user_answer": answer,
            "kw_score": 0.0,
            "sem_score": 0.0,
            "con_score": 0.0,
            "score": short_score,
            "score_pct": f"{short_score * 100:.1f}%",
            "tier": "Poor",
            "color": "#EF4444",
            "correct": "Answer captured but extremely short.",
            "missing": f"Requires much more detail. Missed: {', '.join(expected_kws[:3])}.",
            "suggestion": "Elaborate on the definition and give examples."
        }

    # 4. Keyword Overlap Component
    mw_set = set(mw)
    found_kws = []
    for kw in expected_kws:
        # Check direct match or simple variants (plural, participle)
        if (kw in mw_set or 
            kw.rstrip('ing') in mw_set or 
            kw.rstrip('s') in mw_set or 
            kw + 's' in mw_set or 
            kw + 'ing' in mw_set or 
            kw + 'ed' in mw_set):
            found_kws.append(kw)
            
    missing_kws = [kw for kw in expected_kws if kw not in found_kws]
    kw_score = len(found_kws) / len(expected_kws) if expected_kws else 1.0

    # 5. Coherence and Vocab Richness Component (Concept Score)
    has_coherence = any(phrase in a_clean.lower() for phrase in [
        'because', 'therefore', 'which means', 'for example', 'such as', 
        'however', 'although', 'this means', 'in order', 'as a result', 
        'furthermore', 'additionally', 'specifically', 'consequently'
    ])
    coherence_val = 1.0 if has_coherence else 0.0
    rich_val = 1.0 if len(set(mw)) >= 6 else (0.4 if len(set(mw)) >= 4 else 0.0)
    con_score = round(0.7 * coherence_val + 0.3 * rich_val, 3)

    # 6. SBERT Semantic Component
    sem_score = 0.0
    evaluator = get_evaluator()
    if evaluator.model is not None:
        try:
            embeddings = evaluator.encode([a_clean, q_clean])
            sim = evaluator._cosine_sim(embeddings[0], embeddings[1])
            # Scale cosine similarity [0.1, 0.7] -> [0.0, 1.0]
            sem_score = max(0.0, min(1.0, (sim - 0.1) / 0.6))
        except Exception:
            sem_score = kw_score
    else:
        # Fallback to keyword overlap if model fails to load
        sem_score = kw_score

    sem_score = round(sem_score, 3)

    # 7. Final Score Fusion
    # Component points: keyword = 50 max, depth = 30 max, coherence = 15 max, rich = 5 max
    # Depth uses 15 meaningful words as general target for full points
    depth_pts = min(30.0, (len(mw) / 15.0) * 30.0)
    kw_pts = kw_score * 50.0
    coherence_pts = coherence_val * 15.0
    rich_pts = rich_val * 5.0

    heuristic_val = (kw_pts + depth_pts + coherence_pts + rich_pts) / 100.0
    
    # Blend: 60% heuristics, 40% SBERT semantic score
    final_score = round(0.6 * heuristic_val + 0.4 * sem_score, 3)
    final_score = max(0.0, min(1.0, final_score))

    # Tiers and Colors mapping
    if final_score >= 0.78:
        tier = "Excellent"
        color = "#10B981"  # Emerald green
        correct = "Excellent! You demonstrated a comprehensive understanding and used appropriate technical terms."
        missing = "None identified."
        suggestion = "Maintain this level of depth and structure in subsequent technical rounds."
    elif final_score >= 0.60:
        tier = "Good"
        color = "#3B82F6"  # Blue
        correct = "Good response covering the core concepts."
        missing = f"Could elaborate more on: {', '.join(missing_kws[:2]) or 'further details'}."
        suggestion = "Expand on the underlying mechanics and real-world use cases."
    elif final_score >= 0.40:
        tier = "Average"
        color = "#F59E0B"  # Amber
        correct = "Partial understanding shown."
        missing = f"Key technical areas missed: {', '.join(missing_kws[:3]) or 'core definition details'}."
        suggestion = "Study the core definitions and practice explaining them step-by-step."
    else:
        tier = "Poor"
        color = "#EF4444"  # Red
        correct = "Minimal or non-technical response."
        missing = f"Missed essential concepts: {', '.join(expected_kws[:4]) or 'fundamental topics'}."
        suggestion = "Focus on covering the fundamental definitions and key components of the technology."

    return {
        "question": question,
        "user_answer": answer,
        "kw_score": round(kw_score, 3),
        "sem_score": sem_score,
        "con_score": con_score,
        "score": final_score,
        "score_pct": f"{final_score * 100:.1f}%",
        "tier": tier,
        "color": color,
        "correct": correct,
        "missing": missing,
        "suggestion": suggestion
    }

def evaluate_all(questions: List[str], answers: List[str], role: str, topic: str) -> List[Dict]:
    """
    Evaluates all Q&A pairs for the session.
    """
    results = []
    for q, a in zip(questions, answers):
        res = evaluate_single(q, a)
        results.append(res)
    return results

def compute_final_score(evaluations: List[Dict]) -> float:
    """
    Computes average session score.
    """
    if not evaluations:
        return 0.0
    scores = [e["score"] for e in evaluations]
    return round(float(sum(scores) / len(scores)), 3)
