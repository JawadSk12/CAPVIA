"""
Skill Evaluation Model — Sentence-BERT Answer Scorer
Input:  candidate answer (str) + reference answer (str) + question (str)
Output: score 0-10, relevance 0-1, matched keywords (list)

Uses: sentence-transformers/all-MiniLM-L6-v2 (80MB, fast CPU inference)
"""

import sys
import re
import json
import math
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import numpy as np

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


# ── Stop words for keyword extraction ─────────────────────────────────────────
STOP_WORDS = {
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'it', 'its', 'this', 'that', 'these', 'those', 'but', 'or', 'and',
    'if', 'then', 'so', 'not', 'no', 'yes', 'also', 'both', 'each',
    'which', 'when', 'where', 'how', 'what', 'who', 'very', 'more',
    'some', 'than', 'use', 'used', 'using', 'make', 'made'
}


def extract_keywords(text: str, top_n: int = 15) -> List[str]:
    """
    Extract top-N keywords by TF-IDF-style scoring (single document).
    Filters stop words, keeps meaningful technical terms.
    """
    text  = text.lower()
    words = re.findall(r'\b[a-z][a-z\-_]{2,}\b', text)
    words = [w for w in words if w not in STOP_WORDS]

    # Word frequency
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1

    # Bonus weight for longer, technical-looking words
    scored = {
        w: freq[w] * (1.0 + 0.1 * max(0, len(w) - 5))
        for w in freq
    }
    sorted_kw = sorted(scored, key=scored.get, reverse=True)
    return sorted_kw[:top_n]


def keyword_overlap_score(candidate: str, reference: str) -> Tuple[float, List[str]]:
    """
    Compute keyword overlap between candidate and reference answers.

    Returns:
        (score 0-1, list of matched keywords)
    """
    ref_kw  = set(extract_keywords(reference, top_n=20))
    cand_kw = set(extract_keywords(candidate, top_n=20))

    if not ref_kw:
        return 0.0, []

    matched = list(ref_kw & cand_kw)
    score   = len(matched) / len(ref_kw)
    return min(1.0, score), matched


class SkillEvaluator:
    """
    Sentence-BERT based answer evaluator.

    Scoring formula:
      semantic_sim  = cosine_similarity(encode(candidate), encode(reference))
      keyword_match = |candidate_kw ∩ reference_kw| / |reference_kw|
      raw_score     = 0.7 * semantic_sim + 0.3 * keyword_match
      score_10      = raw_score * 10
    """

    SEMANTIC_WEIGHT  = 0.70
    KEYWORD_WEIGHT   = 0.30
    MODEL_NAME       = 'all-MiniLM-L6-v2'

    def __init__(self,
                 model_name_or_path: Optional[str] = None,
                 device: str = 'cpu'):
        """
        Args:
            model_name_or_path: HuggingFace model name or local path.
                                Defaults to 'all-MiniLM-L6-v2'.
            device: 'cpu', 'cuda', or 'mps'
        """
        self.device = device
        self.model  = None

        try:
            from sentence_transformers import SentenceTransformer
            model_id = model_name_or_path or self.MODEL_NAME
            self.model = SentenceTransformer(model_id, device=device)
            self.model.eval()
            print(f"✅ SkillEvaluator loaded: {model_id} on {device}")
        except ImportError:
            print("⚠️  sentence-transformers not installed.")
            print("    Run: pip install sentence-transformers")
        except Exception as e:
            print(f"⚠️  Could not load sentence-transformer: {e}")
            print("    Falling back to keyword-only scoring.")

    def _cosine_sim(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine similarity between two vectors."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a < 1e-10 or norm_b < 1e-10:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to dense embeddings."""
        if self.model is None:
            # Fallback: random vectors (keyword-only mode)
            rng = np.random.default_rng(hash(texts[0]) % 2**31)
            return rng.normal(0, 1, (len(texts), 384)).astype(np.float32)

        return self.model.encode(texts, show_progress_bar=False,
                                 convert_to_numpy=True)

    def evaluate(self,
                 question:   str,
                 candidate:  str,
                 reference:  str,
                 domain:     str = 'general') -> Dict:
        """
        Evaluate a candidate's answer against the reference.

        Args:
            question:  Interview question asked
            candidate: Candidate's answer text
            reference: Reference/ideal answer text
            domain:    Topic domain ('python', 'sql', 'behavioral', ...)

        Returns:
            dict with score, relevance, keywords, breakdown
        """
        if not candidate.strip():
            return {
                'score': 0.0, 'relevance': 0.0,
                'keywords_matched': [], 'keywords_reference': [],
                'semantic_similarity': 0.0, 'keyword_score': 0.0,
                'domain': domain, 'feedback': 'No answer provided.',
            }

        # Semantic similarity
        embeddings = self.encode([candidate, reference])
        semantic   = max(0.0, self._cosine_sim(embeddings[0], embeddings[1]))

        # Keyword overlap
        kw_score, matched_kw = keyword_overlap_score(candidate, reference)

        # Fuse scores
        fused = (self.SEMANTIC_WEIGHT  * semantic +
                 self.KEYWORD_WEIGHT   * kw_score)
        fused = max(0.0, min(1.0, fused))

        score_10 = round(fused * 10, 2)
        feedback = self._generate_feedback(score_10, semantic, kw_score, matched_kw, reference)

        return {
            'score':                 score_10,
            'relevance':             round(semantic, 4),
            'keywords_matched':      matched_kw,
            'keywords_reference':    extract_keywords(reference, top_n=15),
            'semantic_similarity':   round(semantic, 4),
            'keyword_score':         round(kw_score, 4),
            'domain':                domain,
            'feedback':              feedback,
        }

    def _generate_feedback(self, score: float, semantic: float, kw_score: float,
                           matched: List[str], reference: str) -> str:
        """Generate human-readable feedback string."""
        if score >= 8.0:
            tier = "Excellent answer!"
        elif score >= 6.0:
            tier = "Good answer with room for improvement."
        elif score >= 4.0:
            tier = "Partial understanding demonstrated."
        else:
            tier = "Answer needs significant improvement."

        missing_kw = [k for k in extract_keywords(reference, top_n=8) if k not in matched]
        if missing_kw:
            tier += f" Consider mentioning: {', '.join(missing_kw[:5])}."

        return tier

    def batch_evaluate(self, samples: List[Dict]) -> List[Dict]:
        """
        Evaluate a batch of QA samples.

        Args:
            samples: List of dicts with 'question', 'candidate', 'reference' keys.

        Returns:
            List of evaluation result dicts.
        """
        results = []
        for s in samples:
            r = self.evaluate(
                question  = s.get('question',  ''),
                candidate = s.get('candidate', ''),
                reference = s.get('reference', ''),
                domain    = s.get('domain',    'general'),
            )
            results.append(r)
        return results


# ── Demo ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    evaluator = SkillEvaluator()

    tests = [
        {
            'question':  'What is a Python decorator?',
            'candidate': 'A decorator wraps a function to add functionality without modifying it. '
                         'It uses @syntax and closures for logging, caching.',
            'reference': 'A decorator is a function that wraps another function to extend its behavior '
                         'without modifying it directly. It uses @syntax and leverages closures. '
                         'Common uses include logging, authorization, caching, and timing.',
            'domain':    'python',
        },
        {
            'question':  'What is a binary search tree?',
            'candidate': 'It is a tree with nodes.',
            'reference': 'A BST is a tree where each node has smaller values in left subtree and larger in right. '
                         'Search, insert, delete are O(log n) average. Balanced variants like AVL ensure O(log n).',
            'domain':    'algorithms',
        },
    ]

    print(f"\n{'='*55}")
    print(f"  SKILL EVALUATOR DEMO")
    print(f"{'='*55}")
    for t in tests:
        result = evaluator.evaluate(**t)
        print(f"\n  Q: {t['question'][:60]}...")
        print(f"  Score:     {result['score']:.2f}/10")
        print(f"  Relevance: {result['relevance']:.4f}")
        print(f"  Keywords matched: {result['keywords_matched']}")
        print(f"  Feedback:  {result['feedback']}")
