"""
ai_engine/nlp/semantic_matcher.py
───────────────────────────────────
Core semantic matching engine using Sentence Transformers.

This is the heart of what makes CAPVIA different from keyword ATS systems.
Instead of checking if "TensorFlow" appears in the resume, we check if the
resume's skill set is semantically aligned with the target skills.

Key operations:
  1. match_skills(resume_skills, target_skills)
     → Pairwise cosine similarity matrix
     → For each target skill: best matching resume skill
     → Returns: matches, gaps, coverage, alignment_matrix

  2. compute_text_similarity(text1, text2)
     → Encode both as 768-dim vectors
     → Return cosine similarity (0.0-1.0)

  3. rank_candidates(jd_embedding, candidate_embeddings)
     → Rank candidates by distance to JD embedding

Model: all-mpnet-base-v2 (best quality/speed tradeoff at 768 dimensions)
Alternative: all-MiniLM-L6-v2 (384 dims, 2x faster, slightly lower accuracy)
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

import numpy as np
import torch
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)


# Similarity thresholds
DIRECT_MATCH_THRESHOLD = 0.90   # Near-identical (React vs React.js)
SEMANTIC_MATCH_THRESHOLD = 0.75  # Strong semantic match (TF vs deep learning fw)
PARTIAL_MATCH_THRESHOLD = 0.55   # Partial match (Python vs scripting language)

# Skills that are critical for specific roles (missing these = higher gap priority)
CRITICAL_SKILLS_VOCAB = {
    "Python", "JavaScript", "TypeScript", "SQL", "Git", "Docker",
    "TensorFlow", "PyTorch", "React", "Node.js", "AWS",
}


class SemanticMatcher:
    """
    Sentence Transformer-based semantic similarity engine.

    Lazy-loads the model on first use. Model is ~420MB and takes ~10s
    to load — this is done once per Celery worker process.
    """

    MODEL_NAME = "all-mpnet-base-v2"

    def __init__(self) -> None:
        self._model: SentenceTransformer | None = None
        # Force CPU for background workers on Mac to avoid SIGABRT/Metal conflicts
        self._device = "cpu"
        logger.info(f"SemanticMatcher using device: {self._device} (forced CPU for stability)")

    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load model. Thread-safe due to GIL on model load."""
        if self._model is None:
            logger.info(f"Loading {self.MODEL_NAME}...")
            self._model = SentenceTransformer(
                self.MODEL_NAME,
                device=self._device,
            )
            # Warm-up pass (JIT compilation)
            _ = self._model.encode(["warmup"], convert_to_tensor=True)
            logger.info(f"{self.MODEL_NAME} loaded successfully")
        return self._model

    # ─── Core: Skill Matching ─────────────────────────────────────────────────

    def match_skills(
        self,
        resume_skills: list[str],
        target_skills: list[str],
    ) -> dict[str, Any]:
        """
        Compute semantic alignment between resume skills and target skills.

        For each target skill, finds the best-matching resume skill using
        cosine similarity of sentence embeddings.

        Returns:
            {
              "score": float,          # mean cosine similarity (0-1)
              "coverage": float,       # fraction of targets covered
              "matches": [...],        # semantically matched pairs
              "gaps": [...],           # unmatched target skills
              "alignment_matrix": [[]] # full similarity matrix
            }
        """
        if not target_skills:
            return {
                "score": 1.0, "coverage": 1.0,
                "matches": [], "gaps": [],
                "alignment_matrix": [],
            }

        if not resume_skills:
            return {
                "score": 0.0, "coverage": 0.0,
                "matches": [],
                "gaps": [
                    {
                        "skill": s, "closest_match": None,
                        "similarity": 0.0,
                        "priority": "HIGH" if s in CRITICAL_SKILLS_VOCAB else "LOW",
                    }
                    for s in target_skills
                ],
                "alignment_matrix": [],
            }

        # Encode both skill lists in a single batch for efficiency
        all_skills = resume_skills + target_skills
        all_embeddings = self.model.encode(
            all_skills,
            convert_to_tensor=True,
            normalize_embeddings=True,   # L2-normalize → cosine = dot product
            batch_size=64,
            show_progress_bar=False,
        )

        resume_embs = all_embeddings[: len(resume_skills)]
        target_embs = all_embeddings[len(resume_skills) :]

        # Full similarity matrix: shape (num_resume_skills, num_target_skills)
        sim_matrix = util.cos_sim(resume_embs, target_embs)  # Tensor

        # For each target: best matching resume skill
        best_matches = sim_matrix.max(dim=0)   # values and indices

        matches: list[dict] = []
        gaps: list[dict] = []
        similarity_values: list[float] = []

        for t_idx, target_skill in enumerate(target_skills):
            best_score = float(best_matches.values[t_idx])
            best_r_idx = int(best_matches.indices[t_idx])
            best_resume_skill = resume_skills[best_r_idx]

            similarity_values.append(best_score)

            if best_score >= SEMANTIC_MATCH_THRESHOLD:
                match_type = "DIRECT" if best_score >= DIRECT_MATCH_THRESHOLD else "SEMANTIC"
                matches.append({
                    "target_skill": target_skill,
                    "matched_by": best_resume_skill,
                    "similarity_score": round(best_score, 4),
                    "match_type": match_type,
                })
            elif best_score >= PARTIAL_MATCH_THRESHOLD:
                matches.append({
                    "target_skill": target_skill,
                    "matched_by": best_resume_skill,
                    "similarity_score": round(best_score, 4),
                    "match_type": "PARTIAL",
                })
            else:
                is_critical = target_skill in CRITICAL_SKILLS_VOCAB
                gaps.append({
                    "skill": target_skill,
                    "closest_match": best_resume_skill,
                    "similarity": round(best_score, 4),
                    "priority": "HIGH" if is_critical else "LOW",
                })

        # Coverage: fraction of targets with meaningful match (score >= partial threshold)
        coverage = len(matches) / len(target_skills)

        # Overall score: weighted average
        # (partial matches count half, full matches count fully)
        weighted_score = np.mean([
            s if s >= SEMANTIC_MATCH_THRESHOLD else s * 0.5
            for s in similarity_values
        ])

        return {
            "score": round(float(weighted_score), 4),
            "coverage": round(coverage, 4),
            "matches": matches,
            "gaps": gaps,
            "matched_count": len(matches),
            "gap_count": len(gaps),
            "alignment_matrix": sim_matrix.tolist(),
        }

    # ─── Core: Text Similarity ────────────────────────────────────────────────

    def compute_text_similarity(self, text1: str, text2: str) -> float:
        """
        Compute semantic similarity between two texts.
        Used for project relevance scoring (projects vs. JD responsibilities).

        Returns cosine similarity in [0, 1].
        """
        if not text1.strip() or not text2.strip():
            return 0.0

        embeddings = self.model.encode(
            [text1[:1024], text2[:1024]],  # Truncate for speed
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        similarity = float(util.cos_sim(embeddings[0], embeddings[1]))
        return max(0.0, min(1.0, similarity))

    # ─── Batch Operations ─────────────────────────────────────────────────────

    def encode_texts(
        self,
        texts: list[str],
        batch_size: int = 32,
    ) -> np.ndarray:
        """
        Encode a list of texts to embeddings.
        Returns numpy array of shape (n, 768).
        """
        return self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )

    def rank_candidates(
        self,
        jd_embedding: list[float],
        candidate_embeddings: dict[str, list[float]],
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Rank candidates by semantic similarity to a JD embedding.

        Used for vector search: "find candidates most similar to this JD".

        Args:
            jd_embedding:          768-dim JD vector
            candidate_embeddings:  {resume_id: 768-dim vector} dict
            top_k:                 Return only top K results

        Returns:
            Sorted list of {resume_id, similarity_score}
        """
        if not candidate_embeddings:
            return []

        jd_tensor = torch.tensor(jd_embedding, dtype=torch.float32).unsqueeze(0)

        results = []
        for resume_id, emb in candidate_embeddings.items():
            cand_tensor = torch.tensor(emb, dtype=torch.float32).unsqueeze(0)
            similarity = float(util.cos_sim(jd_tensor, cand_tensor))
            results.append({"resume_id": resume_id, "similarity_score": similarity})

        results.sort(key=lambda x: x["similarity_score"], reverse=True)

        if top_k:
            return results[:top_k]
        return results