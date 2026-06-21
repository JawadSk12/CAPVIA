"""
ai_engine/scoring/formula.py
──────────────────────────────
Role-specific scoring weights and final score computation.

Each role has tuned weights across 7 scoring dimensions.
Weights sum to 1.0 per role.

Dimensions:
  - semantic_skill_match    : How well skills match role requirements
  - project_relevance       : Quality and relevance of projects
  - experience_depth        : Depth and seniority of experience
  - education_alignment     : Education fit for the role
  - ats_format              : Resume formatting and ATS-friendliness
  - keyword_intelligence    : Keyword density and placement
  - skill_proof_score       : Evidence of claimed skills
"""

from __future__ import annotations

# ── Default weights (used when role is unknown) ────────────────────────────────
_DEFAULT_WEIGHTS: dict[str, float] = {
    "semantic_skill_match": 0.25,
    "project_relevance": 0.18,
    "experience_depth": 0.20,
    "education_alignment": 0.12,
    "ats_format": 0.10,
    "keyword_intelligence": 0.08,
    "skill_proof_score": 0.07,
}

# ── Role-specific weight overrides ─────────────────────────────────────────────
_ROLE_WEIGHTS: dict[str, dict[str, float]] = {
    "Software Engineer": {
        "semantic_skill_match": 0.28,
        "project_relevance": 0.22,
        "experience_depth": 0.18,
        "education_alignment": 0.10,
        "ats_format": 0.08,
        "keyword_intelligence": 0.08,
        "skill_proof_score": 0.06,
    },
    "Data Scientist": {
        "semantic_skill_match": 0.26,
        "project_relevance": 0.24,
        "experience_depth": 0.18,
        "education_alignment": 0.14,
        "ats_format": 0.07,
        "keyword_intelligence": 0.07,
        "skill_proof_score": 0.04,
    },
    "Machine Learning Engineer": {
        "semantic_skill_match": 0.28,
        "project_relevance": 0.25,
        "experience_depth": 0.17,
        "education_alignment": 0.12,
        "ats_format": 0.07,
        "keyword_intelligence": 0.07,
        "skill_proof_score": 0.04,
    },
    "Product Manager": {
        "semantic_skill_match": 0.20,
        "project_relevance": 0.20,
        "experience_depth": 0.25,
        "education_alignment": 0.12,
        "ats_format": 0.10,
        "keyword_intelligence": 0.08,
        "skill_proof_score": 0.05,
    },
    "DevOps Engineer": {
        "semantic_skill_match": 0.26,
        "project_relevance": 0.20,
        "experience_depth": 0.20,
        "education_alignment": 0.08,
        "ats_format": 0.10,
        "keyword_intelligence": 0.10,
        "skill_proof_score": 0.06,
    },
    "Frontend Developer": {
        "semantic_skill_match": 0.26,
        "project_relevance": 0.25,
        "experience_depth": 0.18,
        "education_alignment": 0.08,
        "ats_format": 0.10,
        "keyword_intelligence": 0.08,
        "skill_proof_score": 0.05,
    },
    "Backend Developer": {
        "semantic_skill_match": 0.27,
        "project_relevance": 0.22,
        "experience_depth": 0.20,
        "education_alignment": 0.09,
        "ats_format": 0.09,
        "keyword_intelligence": 0.08,
        "skill_proof_score": 0.05,
    },
    "Data Analyst": {
        "semantic_skill_match": 0.24,
        "project_relevance": 0.22,
        "experience_depth": 0.18,
        "education_alignment": 0.14,
        "ats_format": 0.09,
        "keyword_intelligence": 0.08,
        "skill_proof_score": 0.05,
    },
    "Cybersecurity Analyst": {
        "semantic_skill_match": 0.28,
        "project_relevance": 0.18,
        "experience_depth": 0.22,
        "education_alignment": 0.12,
        "ats_format": 0.08,
        "keyword_intelligence": 0.07,
        "skill_proof_score": 0.05,
    },
    "Business Analyst": {
        "semantic_skill_match": 0.22,
        "project_relevance": 0.20,
        "experience_depth": 0.22,
        "education_alignment": 0.14,
        "ats_format": 0.10,
        "keyword_intelligence": 0.08,
        "skill_proof_score": 0.04,
    },
}

# Normalize role names for fuzzy matching
_ROLE_ALIASES: dict[str, str] = {
    "swe": "Software Engineer",
    "software developer": "Software Engineer",
    "sde": "Software Engineer",
    "full stack": "Software Engineer",
    "fullstack": "Software Engineer",
    "ml engineer": "Machine Learning Engineer",
    "ai engineer": "Machine Learning Engineer",
    "frontend": "Frontend Developer",
    "front-end": "Frontend Developer",
    "backend": "Backend Developer",
    "back-end": "Backend Developer",
    "ds": "Data Scientist",
    "data science": "Data Scientist",
    "analyst": "Data Analyst",
    "pm": "Product Manager",
    "devops": "DevOps Engineer",
    "sre": "DevOps Engineer",
    "security": "Cybersecurity Analyst",
    "ba": "Business Analyst",
}


def get_weights(role: str) -> dict[str, float]:
    """
    Return dimension weights for a detected role.

    Performs case-insensitive lookup with alias support.
    Falls back to default weights if role is unknown.

    Args:
        role: Detected role string (e.g. "Software Engineer")

    Returns:
        Dict mapping dimension name → weight (sum ≈ 1.0)
    """
    if not role:
        return _DEFAULT_WEIGHTS.copy()

    # Direct match (case-insensitive)
    role_lower = role.lower().strip()
    for canonical, weights in _ROLE_WEIGHTS.items():
        if canonical.lower() == role_lower:
            return weights.copy()

    # Alias match
    for alias, canonical in _ROLE_ALIASES.items():
        if alias in role_lower:
            return _ROLE_WEIGHTS.get(canonical, _DEFAULT_WEIGHTS).copy()

    # Partial match on canonical names
    for canonical, weights in _ROLE_WEIGHTS.items():
        if any(word in role_lower for word in canonical.lower().split()):
            return weights.copy()

    return _DEFAULT_WEIGHTS.copy()


def compute_final_score(
    dimension_scores: dict[str, float],
    weights: dict[str, float],
) -> float:
    """
    Compute a weighted final ATS score from dimension scores.

    This is used as a formula-based fallback when XGBoost is unavailable.
    The primary score comes from XGBoostScorer; this is supplementary.

    Args:
        dimension_scores: Dict of dimension_name → score (0.0–1.0)
        weights: Dict of dimension_name → weight

    Returns:
        Final score in range 0–100
    """
    total_weight = 0.0
    weighted_sum = 0.0

    for dim, weight in weights.items():
        score = dimension_scores.get(dim, 0.0)
        # Scores may be 0–1 or 0–100; normalize to 0–1
        if score > 1.0:
            score = score / 100.0
        weighted_sum += score * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    normalized = weighted_sum / total_weight
    return round(normalized * 100, 2)  # Return as 0–100
