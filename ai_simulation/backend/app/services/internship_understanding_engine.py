"""
Internship Understanding Engine
Analyzes internship metadata to detect role, specialization, and match to taxonomy.
Uses keyword-based cosine similarity (no external ML server required).
"""

import json
import math
import re
import os
from typing import Dict, Any, List, Optional, Tuple
from collections import Counter
from loguru import logger


# Load taxonomy once at module level
_TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "role_taxonomy.json")

def _load_taxonomy() -> Dict:
    with open(_TAXONOMY_PATH, "r") as f:
        return json.load(f)

ROLE_TAXONOMY = _load_taxonomy()


def _tokenize(text: str) -> List[str]:
    """Lowercase, strip punctuation, split into words."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\.\+\#]", " ", text)
    return [t.strip() for t in text.split() if len(t.strip()) > 1]


def _build_internship_text(internship_data: Dict) -> str:
    """Combine all internship text fields into one corpus."""
    parts = [
        internship_data.get("title", ""),
        internship_data.get("description", ""),
        internship_data.get("responsibilities", ""),
        internship_data.get("requirements", ""),
        " ".join(internship_data.get("required_skills", []) or []),
        " ".join(internship_data.get("technologies", []) or []),
    ]
    return " ".join(p for p in parts if p)


def _tfidf_vector(tokens: List[str], vocabulary: List[str]) -> List[float]:
    """Simple TF vector over a fixed vocabulary."""
    tf = Counter(tokens)
    total = len(tokens) if tokens else 1
    return [tf.get(w, 0) / total for w in vocabulary]


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


def _keyword_overlap_score(text_tokens: List[str], keywords: List[str]) -> float:
    """Score how many role keywords appear in the internship text."""
    if not keywords:
        return 0.0
    text_set = set(text_tokens)
    # Support multi-word keywords by joining text
    text_joined = " ".join(text_tokens)
    matches = sum(1 for kw in keywords if kw.lower() in text_joined)
    return matches / len(keywords)


class InternshipUnderstandingEngine:
    """
    Analyzes internship data and returns:
    - detected_role_key
    - detected_role_name
    - detected_specialization
    - role_confidence
    - role_category
    - keywords_found
    """

    def analyze(self, internship_data: Dict) -> Dict[str, Any]:
        """
        Main entrypoint. Accepts internship dict, returns role intelligence.

        internship_data keys used:
            title, description, responsibilities, requirements,
            required_skills (list), technologies (list)
        """
        text = _build_internship_text(internship_data)
        tokens = _tokenize(text)
        text_joined = " ".join(tokens)

        best_role_key = None
        best_role_name = None
        best_category = None
        best_score = 0.0
        best_specialization = None
        keywords_found = []

        for category, roles in ROLE_TAXONOMY.items():
            for role_key, role_data in roles.items():
                keywords = role_data.get("keywords", [])
                score = _keyword_overlap_score(tokens, keywords)

                if score > best_score:
                    best_score = score
                    best_role_key = role_key
                    best_role_name = role_data["name"]
                    best_category = category
                    keywords_found = [kw for kw in keywords if kw.lower() in text_joined]

                    # Detect specialization
                    spec = self._detect_specialization(text_joined, role_data)
                    best_specialization = spec

        # Fallback: if nothing matched well, default to closest by title
        if best_score < 0.05:
            best_role_key, best_role_name, best_category, best_score = self._title_fallback(
                internship_data.get("title", "")
            )

        confidence = min(best_score * 3.0, 1.0)  # Scale 0–1

        result = {
            "detected_role_key": best_role_key or "fullstack_developer",
            "detected_role_name": best_role_name or "Full Stack Developer",
            "detected_specialization": best_specialization,
            "role_confidence": round(confidence, 3),
            "role_taxonomy_category": best_category or "SOFTWARE_ENGINEERING",
            "keywords_found": keywords_found[:15],
        }

        logger.info(f"Role detection: {result['detected_role_key']} ({confidence:.1%} confidence)")
        return result

    def _detect_specialization(self, text_joined: str, role_data: Dict) -> Optional[str]:
        """Detect specialization within a matched role."""
        specializations = role_data.get("specializations", {})
        best_spec = None
        best_spec_score = 0

        for spec_key, spec_keywords in specializations.items():
            score = sum(1 for kw in spec_keywords if kw.lower() in text_joined)
            if score > best_spec_score:
                best_spec_score = score
                best_spec = spec_key

        return best_spec if best_spec_score > 0 else None

    def _title_fallback(self, title: str) -> Tuple[str, str, str, float]:
        """Basic title keyword match as fallback."""
        title_lower = title.lower()
        fallbacks = [
            ("ml", "ml_engineer", "ML Engineer", "AI_DATA"),
            ("machine learning", "ml_engineer", "ML Engineer", "AI_DATA"),
            ("frontend", "frontend_developer", "Frontend Developer", "SOFTWARE_ENGINEERING"),
            ("backend", "backend_developer", "Backend Developer", "SOFTWARE_ENGINEERING"),
            ("fullstack", "fullstack_developer", "Full Stack Developer", "SOFTWARE_ENGINEERING"),
            ("data", "data_analyst", "Data Analyst", "AI_DATA"),
            ("devops", "devops_engineer", "DevOps Engineer", "DEVOPS_CLOUD"),
            ("security", "cybersecurity_analyst", "Cybersecurity Analyst", "CYBERSECURITY"),
            ("design", "ux_designer", "UX Designer", "DESIGN"),
            ("product", "product_manager", "Product Manager", "PRODUCT_MANAGEMENT"),
            ("marketing", "digital_marketing", "Digital Marketing Intern", "MARKETING"),
        ]
        for kw, role_key, role_name, category in fallbacks:
            if kw in title_lower:
                return role_key, role_name, category, 0.3
        return "fullstack_developer", "Full Stack Developer", "SOFTWARE_ENGINEERING", 0.1


# Singleton
internship_understanding_engine = InternshipUnderstandingEngine()
