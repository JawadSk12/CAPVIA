"""
ai_engine/scoring/global_scorer.py
───────────────────────────────────
Heuristic-based multi-dimensional scoring for resumes.

Key improvement: All scoring methods fall back to raw section text when
the NER parser extracts empty structured data. This prevents 0% scores.

Dimensions scored:
  1. Semantic Skill Match  – skills count + seniority + role keyword overlap
  2. Experience Depth      – years + raw text volume + achievement density
  3. Education Alignment   – degree level + CGPA + field relevance
  4. Project Relevance     – structured projects OR raw section text analysis
  5. ATS Format            – section presence + word count + formatting
  6. Keyword Intelligence  – role-specific keyword density in full text
  7. Skill Proof Score     – evidence of claimed skills (projects + experience)
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# ─── Role-specific keyword sets for richer scoring ───────────────────────────
_ROLE_KEYWORDS: Dict[str, List[str]] = {
    "Machine Learning Engineer": [
        "model", "training", "neural", "deep learning", "pytorch", "tensorflow",
        "scikit", "regression", "classification", "dataset", "accuracy", "loss",
        "gradient", "epoch", "feature", "pipeline", "mlflow", "experiment",
        "inference", "deployment", "bert", "transformer", "nlp", "cnn", "rnn",
    ],
    "Software Engineer": [
        "api", "rest", "microservice", "backend", "frontend", "database", "sql",
        "docker", "kubernetes", "ci/cd", "agile", "git", "algorithm", "system design",
        "scalable", "distributed", "cloud", "aws", "gcp", "azure", "redis", "kafka",
    ],
    "Data Scientist": [
        "analysis", "visualization", "statistics", "hypothesis", "correlation",
        "pandas", "numpy", "matplotlib", "seaborn", "regression", "clustering",
        "a/b test", "insights", "dashboard", "sql", "r ", "jupyter", "notebook",
    ],
    "Frontend Developer": [
        "react", "angular", "vue", "javascript", "typescript", "html", "css",
        "component", "responsive", "redux", "rest api", "npm", "webpack", "ui",
        "ux", "accessibility", "performance", "next.js", "tailwind",
    ],
    "Backend Developer": [
        "api", "rest", "django", "fastapi", "flask", "node", "express", "spring",
        "database", "sql", "postgresql", "mongodb", "redis", "queue", "auth",
        "jwt", "microservice", "docker", "deployment", "server",
    ],
    "Data Analyst": [
        "excel", "sql", "power bi", "tableau", "pivot", "dashboard", "kpi",
        "reporting", "analysis", "visualization", "data cleaning", "insights",
        "metrics", "trend", "statistical",
    ],
    "DevOps Engineer": [
        "docker", "kubernetes", "jenkins", "ci/cd", "pipeline", "infrastructure",
        "terraform", "ansible", "linux", "bash", "monitoring", "prometheus",
        "grafana", "aws", "gcp", "azure", "deployment", "helm", "git",
    ],
    "Product Manager": [
        "roadmap", "stakeholder", "user story", "sprint", "agile", "kpi",
        "metrics", "launch", "go-to-market", "ab test", "prioritization",
        "backlog", "user research", "product strategy",
    ],
}

# Generic keywords that apply to any role
_GENERIC_KEYWORDS = [
    "agile", "git", "cloud", "api", "database", "performance", "scalable",
    "documentation", "collaboration", "team", "project", "development",
    "testing", "optimization", "integration",
]

# Achievement verbs that indicate quantified impact
_ACHIEVEMENT_VERBS = [
    "improved", "reduced", "increased", "built", "led", "designed", "developed",
    "deployed", "implemented", "achieved", "optimized", "automated", "delivered",
    "created", "launched", "managed", "scaled", "boosted",
]


class GlobalScorer:
    """
    Computes multi-dimensional ATS scores for a resume.
    Robust to incomplete NER extraction — always falls back to raw text.
    """

    def __init__(self, semantic_matcher=None):
        self.semantic_matcher = semantic_matcher

    def compute_all_dimensions(
        self,
        parsed: Dict[str, Any],
        sections: Dict[str, str],
        role: str,
        embeddings: Dict[str, List[float]] = None,
    ) -> Dict[str, float]:
        scores = {
            "semantic_skill_match":  self._score_skills(parsed, sections, role),
            "experience_depth":      self._score_experience(parsed, sections),
            "education_alignment":   self._score_education(parsed, sections),
            "project_relevance":     self._score_projects(parsed, sections, role),
            "ats_format":            self._score_format(sections, parsed),
            "keyword_intelligence":  self._score_keywords(sections, role),
            "skill_proof_score":     self._score_skill_proof(parsed, sections),
        }
        return {k: round(min(max(v, 0.0), 1.0), 4) for k, v in scores.items()}

    # ── 1. Semantic Skill Match ───────────────────────────────────────────────

    def _score_skills(self, parsed: Dict, sections: Dict, role: str) -> float:
        skills = parsed.get("skills", [])
        skills_text = sections.get("skills", "") + " " + sections.get("summary", "")
        all_resume_text = " ".join(sections.values()).lower()

        # Structured skills from NER
        if skills:
            count_score = min(len(skills) / 12.0, 1.0) * 0.35
            advanced = len([s for s in skills if s.get("seniority") in ("ADVANCED", "EXPERT")])
            seniority_score = min(advanced / 5.0, 1.0) * 0.25
        else:
            # Fallback: estimate skill count from raw skills section
            words = re.split(r'[,|\n•\-]', skills_text)
            skill_words = [w.strip() for w in words if len(w.strip()) > 2]
            count_score = min(len(skill_words) / 20.0, 1.0) * 0.35
            seniority_score = 0.1

        # Role keyword overlap in resume
        role_kws = _ROLE_KEYWORDS.get(role, [])
        if not role_kws:
            role_kws = _GENERIC_KEYWORDS
        kw_hits = sum(1 for kw in role_kws if kw.lower() in all_resume_text)
        kw_score = min(kw_hits / max(len(role_kws) * 0.4, 1), 1.0) * 0.40

        return count_score + seniority_score + kw_score

    # ── 2. Experience Depth ───────────────────────────────────────────────────

    def _score_experience(self, parsed: Dict, sections: Dict) -> float:
        exp_text = sections.get("experience", "") or sections.get("work experience", "")
        years = parsed.get("experience_years", 0) or 0

        # If NER missed years, try extracting from text
        if years == 0 and exp_text:
            year_matches = re.findall(r'\b(20\d{2})\b', exp_text)
            unique_years = set(year_matches)
            if len(unique_years) >= 2:
                years = max(0, int(max(unique_years)) - int(min(unique_years)))

        # Years score (0→0, 1yr→0.2, 3yr→0.5, 5+yr→0.6)
        years_score = min(years / 5.0, 1.0) * 0.45

        # Volume/detail score
        word_count = len(exp_text.split()) if exp_text else 0
        detail_score = min(word_count / 250.0, 1.0) * 0.30

        # Achievement density (quantified impact)
        achievement_hits = sum(
            1 for verb in _ACHIEVEMENT_VERBS if verb in exp_text.lower()
        )
        achievement_score = min(achievement_hits / 6.0, 1.0) * 0.25

        return years_score + detail_score + achievement_score

    # ── 3. Education Alignment ────────────────────────────────────────────────

    def _score_education(self, parsed: Dict, sections: Dict) -> float:
        edu = parsed.get("education", [])
        edu_text = (sections.get("education", "") or "").upper()

        # Structured education from NER
        if edu:
            degrees = [e.get("degree", "").upper() for e in edu]
        else:
            # Fallback: extract degree type from raw text
            degrees = [edu_text]

        combined = " ".join(degrees) + " " + edu_text

        if any(k in combined for k in ["PHD", "DOCTOR", "D.PHIL"]):
            degree_score = 1.0
        elif any(k in combined for k in ["MASTER", "MTECH", "M.TECH", "MBA", "M.S", "MSC"]):
            degree_score = 0.90
        elif any(k in combined for k in ["BACHELOR", "BTECH", "B.TECH", "B.E", "BSC", "B.S"]):
            degree_score = 0.80
        elif any(k in combined for k in ["DIPLOMA", "ASSOCIATE"]):
            degree_score = 0.60
        elif edu_text.strip():
            degree_score = 0.55  # Has some education text
        else:
            degree_score = 0.30  # Nothing found

        # CGPA/GPA bonus
        gpa_match = re.search(r'(\d+\.\d+)\s*(?:cgpa|gpa|/10|/4)', edu_text.lower())
        gpa_bonus = 0.0
        if gpa_match:
            gpa_val = float(gpa_match.group(1))
            if gpa_val > 3.5 or gpa_val > 8.0:  # 4.0 scale or 10.0 scale
                gpa_bonus = 0.05

        return min(degree_score + gpa_bonus, 1.0)

    # ── 4. Project Relevance ─────────────────────────────────────────────────

    def _score_projects(self, parsed: Dict, sections: Dict, role: str) -> float:
        projects = parsed.get("projects", [])
        proj_text = (
            sections.get("projects", "")
            or sections.get("academic projects", "")
            or sections.get("personal projects", "")
            or ""
        )

        # Also look for project mentions in experience section
        exp_text = sections.get("experience", "")

        if projects:
            # Structured projects from NER
            count_score = min(len(projects) / 3.0, 1.0) * 0.40
            tech_counts = [len(p.get("tech_stack", [])) for p in projects]
            avg_tech = sum(tech_counts) / len(tech_counts) if tech_counts else 0
            tech_score = min(avg_tech / 4.0, 1.0) * 0.35
            # Description richness
            rich = sum(1 for p in projects if len(str(p.get("description", ""))) > 80)
            rich_score = min(rich / max(len(projects), 1), 1.0) * 0.25
            return count_score + tech_score + rich_score

        elif proj_text.strip():
            # Fallback: analyse raw project section text
            # Estimate project count from bullet points or "Project" headers
            proj_blocks = re.split(r'\n{2,}|(?<=\n)(?=[A-Z][a-z])', proj_text)
            proj_count = max(len([b for b in proj_blocks if len(b.strip()) > 30]), 1)
            count_score = min(proj_count / 3.0, 1.0) * 0.40

            # Tech keyword density in project text
            role_kws = _ROLE_KEYWORDS.get(role, _GENERIC_KEYWORDS)
            kw_hits = sum(1 for kw in role_kws if kw.lower() in proj_text.lower())
            tech_score = min(kw_hits / max(len(role_kws) * 0.3, 1), 1.0) * 0.35

            # Word volume (detail) score
            word_count = len(proj_text.split())
            detail_score = min(word_count / 150.0, 1.0) * 0.25

            return count_score + tech_score + detail_score

        elif exp_text:
            # Last resort: look for project-like content inside experience
            proj_mentions = len(re.findall(
                r'\b(?:project|built|developed|implemented|created|designed)\b',
                exp_text.lower()
            ))
            return min(proj_mentions / 8.0, 0.50)  # Cap at 0.50 since it's indirect

        return 0.15  # Default floor — never completely 0 unless resume has nothing

    # ── 5. ATS Format Score ───────────────────────────────────────────────────

    def _score_format(self, sections: Dict, parsed: Dict) -> float:
        critical = ["summary", "skills", "experience", "education"]
        bonus = ["projects", "certifications", "achievements", "awards"]

        found_critical = sum(1 for s in critical if sections.get(s, "").strip())
        found_bonus = sum(1 for s in bonus if sections.get(s, "").strip())

        section_score = (found_critical / len(critical)) * 0.60
        bonus_score = min(found_bonus / 2.0, 1.0) * 0.20

        # Total word count (resume shouldn't be too short or too long)
        total_words = sum(len(v.split()) for v in sections.values())
        if total_words < 100:
            length_score = 0.10
        elif total_words < 200:
            length_score = 0.12
        elif total_words <= 800:
            length_score = 0.20
        else:
            length_score = 0.15  # Too long = slight penalty

        return section_score + bonus_score + length_score

    # ── 6. Keyword Intelligence ───────────────────────────────────────────────

    def _score_keywords(self, sections: Dict, role: str) -> float:
        all_text = " ".join(sections.values()).lower()

        # Role-specific keywords
        role_kws = _ROLE_KEYWORDS.get(role, [])
        generic_kws = _GENERIC_KEYWORDS

        role_hits = sum(1 for kw in role_kws if kw in all_text)
        generic_hits = sum(1 for kw in generic_kws if kw in all_text)

        role_score = min(role_hits / max(len(role_kws) * 0.35, 1), 1.0) * 0.65
        generic_score = min(generic_hits / (len(generic_kws) * 0.5), 1.0) * 0.35

        return role_score + generic_score

    # ── 7. Skill Proof Score ──────────────────────────────────────────────────

    def _score_skill_proof(self, parsed: Dict, sections: Dict) -> float:
        """Evidence that claimed skills are actually used in experience/projects."""
        skills = parsed.get("skills", [])
        skill_names = [s.get("skill", "").lower() for s in skills]
        proj_exp_text = (
            sections.get("experience", "") + " " + sections.get("projects", "")
        ).lower()

        if not skill_names:
            # Extract from raw skills section
            skills_raw = sections.get("skills", "")
            skill_names = [w.strip().lower() for w in re.split(r'[,|\n•\-]', skills_raw) if len(w.strip()) > 2]

        if not skill_names:
            return 0.70  # Neutral default

        # How many claimed skills appear in exp/project text
        proven = sum(1 for sk in skill_names if sk in proj_exp_text)
        proof_ratio = proven / len(skill_names)

        # Base: 0.70 always, + up to 0.30 for proof
        return 0.70 + (proof_ratio * 0.30)
