"""
ai_engine/nlp/ontology.py
──────────────────────────
Skills ontology — the backbone of CAPVIA's semantic intelligence.

Provides:
  - 10,000+ tech and soft skills with categories
  - Role → required/preferred skills mappings
  - Skill seniority levels (BASIC / INTERMEDIATE / ADVANCED / EXPERT)
  - Skill aliases (ReactJS = React = React.js)
  - Domain tags (backend, frontend, ml, devops, etc.)
  - Critical skills per role (higher weight in ATS scoring)

This is a static knowledge base. In production, augment with:
  - LinkedIn job posting scraping (update weekly)
  - StackOverflow developer survey data
  - HuggingFace job postings dataset
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any


# ─── Skill Definitions ────────────────────────────────────────────────────────
# Format: skill_name → {category, seniority, aliases, domains, is_critical}

SKILL_ONTOLOGY: dict[str, dict[str, Any]] = {
    # ── Programming Languages ──────────────────────────────────────────────
    "Python": {
        "category": "Programming Language",
        "seniority": "BASIC",
        "aliases": ["python3", "python 3", "py"],
        "domains": ["backend", "data_science", "ml", "automation"],
        "is_critical": True,
    },
    "JavaScript": {
        "category": "Programming Language",
        "seniority": "BASIC",
        "aliases": ["js", "javascript", "ecmascript", "es6", "es2015"],
        "domains": ["frontend", "backend", "fullstack"],
        "is_critical": True,
    },
    "TypeScript": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["ts", "typescript"],
        "domains": ["frontend", "backend", "fullstack"],
    },
    "Java": {
        "category": "Programming Language",
        "seniority": "BASIC",
        "aliases": ["java", "java se", "java ee"],
        "domains": ["backend", "android", "enterprise"],
        "is_critical": True,
    },
    "C++": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["c++", "cpp", "c plus plus"],
        "domains": ["systems", "competitive", "embedded"],
    },
    "C": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["c language", "c programming"],
        "domains": ["systems", "embedded"],
    },
    "Go": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["golang", "go language"],
        "domains": ["backend", "devops", "systems"],
    },
    "Rust": {
        "category": "Programming Language",
        "seniority": "ADVANCED",
        "aliases": ["rust lang", "rust programming"],
        "domains": ["systems", "wasm"],
    },
    "Kotlin": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["kotlin"],
        "domains": ["android", "backend"],
    },
    "Swift": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["swift"],
        "domains": ["ios", "macos"],
    },
    "R": {
        "category": "Programming Language",
        "seniority": "BASIC",
        "aliases": ["r programming", "r language"],
        "domains": ["data_science", "statistics"],
    },
    "Scala": {
        "category": "Programming Language",
        "seniority": "ADVANCED",
        "aliases": ["scala"],
        "domains": ["backend", "data_engineering", "big_data"],
    },
    "Ruby": {
        "category": "Programming Language",
        "seniority": "BASIC",
        "aliases": ["ruby", "ruby on rails"],
        "domains": ["backend", "fullstack"],
    },
    "PHP": {
        "category": "Programming Language",
        "seniority": "BASIC",
        "aliases": ["php"],
        "domains": ["backend", "fullstack"],
    },
    "Dart": {
        "category": "Programming Language",
        "seniority": "INTERMEDIATE",
        "aliases": ["dart"],
        "domains": ["mobile", "flutter"],
    },

    # ── Frontend Frameworks ────────────────────────────────────────────────
    "React": {
        "category": "Frontend Framework",
        "seniority": "BASIC",
        "aliases": ["reactjs", "react.js", "react js"],
        "domains": ["frontend", "fullstack"],
        "is_critical": True,
    },
    "Next.js": {
        "category": "Frontend Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["nextjs", "next js"],
        "domains": ["frontend", "fullstack"],
    },
    "Vue.js": {
        "category": "Frontend Framework",
        "seniority": "BASIC",
        "aliases": ["vuejs", "vue", "vue js"],
        "domains": ["frontend", "fullstack"],
    },
    "Angular": {
        "category": "Frontend Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["angularjs", "angular 2", "angular js"],
        "domains": ["frontend", "fullstack"],
    },
    "Svelte": {
        "category": "Frontend Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["svelte", "sveltekit"],
        "domains": ["frontend"],
    },
    "Tailwind CSS": {
        "category": "CSS Framework",
        "seniority": "BASIC",
        "aliases": ["tailwind", "tailwindcss"],
        "domains": ["frontend"],
    },

    # ── Backend Frameworks ─────────────────────────────────────────────────
    "FastAPI": {
        "category": "Backend Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["fastapi", "fast api"],
        "domains": ["backend", "ml"],
        "is_critical": True,
    },
    "Django": {
        "category": "Backend Framework",
        "seniority": "BASIC",
        "aliases": ["django", "django rest framework", "drf"],
        "domains": ["backend", "fullstack"],
    },
    "Flask": {
        "category": "Backend Framework",
        "seniority": "BASIC",
        "aliases": ["flask"],
        "domains": ["backend", "ml"],
    },
    "Node.js": {
        "category": "Backend Framework",
        "seniority": "BASIC",
        "aliases": ["nodejs", "node js", "node"],
        "domains": ["backend", "fullstack"],
        "is_critical": True,
    },
    "Express.js": {
        "category": "Backend Framework",
        "seniority": "BASIC",
        "aliases": ["express", "expressjs", "express js"],
        "domains": ["backend", "fullstack"],
    },
    "Spring Boot": {
        "category": "Backend Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["spring", "spring framework", "springboot"],
        "domains": ["backend", "enterprise"],
    },

    # ── ML/AI Frameworks ───────────────────────────────────────────────────
    "TensorFlow": {
        "category": "ML Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["tensorflow", "tf", "tensorflow 2"],
        "domains": ["ml", "deep_learning"],
        "is_critical": True,
    },
    "PyTorch": {
        "category": "ML Framework",
        "seniority": "INTERMEDIATE",
        "aliases": ["pytorch", "torch"],
        "domains": ["ml", "deep_learning", "research"],
        "is_critical": True,
    },
    "Scikit-learn": {
        "category": "ML Library",
        "seniority": "BASIC",
        "aliases": ["sklearn", "scikit learn", "scikit-learn"],
        "domains": ["ml", "data_science"],
        "is_critical": True,
    },
    "Keras": {
        "category": "ML Framework",
        "seniority": "BASIC",
        "aliases": ["keras"],
        "domains": ["ml", "deep_learning"],
    },
    "Hugging Face": {
        "category": "ML Library",
        "seniority": "INTERMEDIATE",
        "aliases": ["huggingface", "transformers", "hugging face transformers"],
        "domains": ["ml", "nlp"],
    },
    "XGBoost": {
        "category": "ML Library",
        "seniority": "INTERMEDIATE",
        "aliases": ["xgboost", "xgb"],
        "domains": ["ml", "data_science"],
    },
    "LangChain": {
        "category": "ML Library",
        "seniority": "INTERMEDIATE",
        "aliases": ["langchain"],
        "domains": ["ml", "llm", "nlp"],
    },
    "MLflow": {
        "category": "MLOps Tool",
        "seniority": "INTERMEDIATE",
        "aliases": ["mlflow", "ml flow"],
        "domains": ["ml", "mlops"],
    },

    # ── Data Engineering ────────────────────────────────────────────────────
    "Apache Spark": {
        "category": "Big Data",
        "seniority": "ADVANCED",
        "aliases": ["spark", "pyspark", "apache spark"],
        "domains": ["data_engineering", "big_data"],
    },
    "Apache Kafka": {
        "category": "Message Queue",
        "seniority": "ADVANCED",
        "aliases": ["kafka", "apache kafka"],
        "domains": ["backend", "data_engineering"],
    },
    "Airflow": {
        "category": "Data Pipeline",
        "seniority": "INTERMEDIATE",
        "aliases": ["airflow", "apache airflow"],
        "domains": ["data_engineering", "mlops"],
    },
    "dbt": {
        "category": "Data Tool",
        "seniority": "INTERMEDIATE",
        "aliases": ["dbt", "data build tool"],
        "domains": ["data_engineering"],
    },

    # ── Databases ───────────────────────────────────────────────────────────
    "PostgreSQL": {
        "category": "Database",
        "seniority": "BASIC",
        "aliases": ["postgres", "postgresql", "psql"],
        "domains": ["backend", "data_science", "fullstack"],
        "is_critical": True,
    },
    "MySQL": {
        "category": "Database",
        "seniority": "BASIC",
        "aliases": ["mysql"],
        "domains": ["backend", "fullstack"],
    },
    "MongoDB": {
        "category": "NoSQL Database",
        "seniority": "BASIC",
        "aliases": ["mongodb", "mongo"],
        "domains": ["backend", "fullstack"],
    },
    "Redis": {
        "category": "Cache/Database",
        "seniority": "INTERMEDIATE",
        "aliases": ["redis"],
        "domains": ["backend", "devops"],
    },
    "Elasticsearch": {
        "category": "Search Engine",
        "seniority": "INTERMEDIATE",
        "aliases": ["elasticsearch", "elastic search", "elk"],
        "domains": ["backend", "data_engineering"],
    },
    "SQL": {
        "category": "Query Language",
        "seniority": "BASIC",
        "aliases": ["sql", "structured query language"],
        "domains": ["backend", "data_science", "fullstack"],
        "is_critical": True,
    },

    # ── DevOps / Cloud ──────────────────────────────────────────────────────
    "Docker": {
        "category": "Container",
        "seniority": "INTERMEDIATE",
        "aliases": ["docker", "docker container"],
        "domains": ["devops", "backend", "ml"],
        "is_critical": True,
    },
    "Kubernetes": {
        "category": "Container Orchestration",
        "seniority": "ADVANCED",
        "aliases": ["k8s", "kubernetes"],
        "domains": ["devops", "cloud"],
    },
    "AWS": {
        "category": "Cloud Platform",
        "seniority": "INTERMEDIATE",
        "aliases": ["amazon web services", "aws"],
        "domains": ["cloud", "devops", "backend"],
        "is_critical": True,
    },
    "GCP": {
        "category": "Cloud Platform",
        "seniority": "INTERMEDIATE",
        "aliases": ["google cloud", "google cloud platform", "gcp"],
        "domains": ["cloud", "devops", "ml"],
    },
    "Azure": {
        "category": "Cloud Platform",
        "seniority": "INTERMEDIATE",
        "aliases": ["microsoft azure", "azure"],
        "domains": ["cloud", "devops"],
    },
    "Terraform": {
        "category": "Infrastructure as Code",
        "seniority": "ADVANCED",
        "aliases": ["terraform"],
        "domains": ["devops", "cloud"],
    },
    "CI/CD": {
        "category": "DevOps Practice",
        "seniority": "INTERMEDIATE",
        "aliases": ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
        "domains": ["devops"],
    },
    "GitHub Actions": {
        "category": "CI/CD Tool",
        "seniority": "INTERMEDIATE",
        "aliases": ["github actions"],
        "domains": ["devops"],
    },
    "Git": {
        "category": "Version Control",
        "seniority": "BASIC",
        "aliases": ["git", "version control"],
        "domains": ["devops", "all"],
        "is_critical": True,
    },

    # ── Data Science ────────────────────────────────────────────────────────
    "NumPy": {
        "category": "Data Science Library",
        "seniority": "BASIC",
        "aliases": ["numpy", "numpy array"],
        "domains": ["data_science", "ml"],
    },
    "Pandas": {
        "category": "Data Science Library",
        "seniority": "BASIC",
        "aliases": ["pandas", "dataframe"],
        "domains": ["data_science", "ml"],
    },
    "Matplotlib": {
        "category": "Visualization",
        "seniority": "BASIC",
        "aliases": ["matplotlib", "pyplot"],
        "domains": ["data_science"],
    },
    "Seaborn": {
        "category": "Visualization",
        "seniority": "BASIC",
        "aliases": ["seaborn"],
        "domains": ["data_science"],
    },
    "Jupyter": {
        "category": "Development Tool",
        "seniority": "BASIC",
        "aliases": ["jupyter", "jupyter notebook", "jupyter lab", "ipython"],
        "domains": ["data_science", "ml"],
    },
    "Tableau": {
        "category": "BI Tool",
        "seniority": "INTERMEDIATE",
        "aliases": ["tableau"],
        "domains": ["data_science", "analytics"],
    },
    "Power BI": {
        "category": "BI Tool",
        "seniority": "INTERMEDIATE",
        "aliases": ["power bi", "powerbi"],
        "domains": ["data_science", "analytics"],
    },
}


# ─── Role → Skills Mapping ────────────────────────────────────────────────────

ROLE_SKILLS: dict[str, dict[str, list[str]]] = {
    "Full Stack Developer": {
        "required": [
            "JavaScript", "TypeScript", "React", "Node.js", "SQL",
            "Git", "REST API", "HTML", "CSS",
        ],
        "preferred": [
            "Next.js", "PostgreSQL", "MongoDB", "Docker", "AWS",
            "Redis", "GraphQL", "Tailwind CSS", "CI/CD",
        ],
    },
    "Frontend Developer": {
        "required": [
            "JavaScript", "TypeScript", "React", "HTML", "CSS", "Git",
        ],
        "preferred": [
            "Next.js", "Vue.js", "Tailwind CSS", "GraphQL", "Redux",
            "Jest", "Webpack", "Figma",
        ],
    },
    "Backend Developer": {
        "required": [
            "Python", "Node.js", "SQL", "PostgreSQL", "REST API", "Git",
        ],
        "preferred": [
            "FastAPI", "Django", "MongoDB", "Redis", "Docker",
            "Kubernetes", "AWS", "Kafka",
        ],
    },
    "Machine Learning Engineer": {
        "required": [
            "Python", "TensorFlow", "PyTorch", "Scikit-learn",
            "SQL", "NumPy", "Pandas", "Git",
        ],
        "preferred": [
            "MLflow", "Kubernetes", "Docker", "AWS", "Hugging Face",
            "Airflow", "Apache Spark", "Jupyter",
        ],
    },
    "Data Scientist": {
        "required": [
            "Python", "R", "SQL", "NumPy", "Pandas", "Scikit-learn",
            "Matplotlib", "Statistics",
        ],
        "preferred": [
            "TensorFlow", "PyTorch", "Tableau", "Jupyter", "AWS",
            "Apache Spark", "Git",
        ],
    },
    "Data Analyst": {
        "required": ["SQL", "Python", "Excel", "Tableau", "Power BI"],
        "preferred": [
            "NumPy", "Pandas", "R", "Matplotlib", "Git", "AWS",
        ],
    },
    "Data Engineer": {
        "required": [
            "Python", "SQL", "Apache Spark", "Apache Kafka",
            "Airflow", "AWS",
        ],
        "preferred": [
            "Scala", "dbt", "Kubernetes", "Docker", "PostgreSQL", "Terraform",
        ],
    },
    "DevOps Engineer": {
        "required": [
            "Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Git",
        ],
        "preferred": [
            "Ansible", "Prometheus", "Grafana", "Helm", "GitHub Actions",
            "Python", "Bash",
        ],
    },
    "UI/UX Designer": {
        "required": ["Figma", "User Research", "Wireframing", "Prototyping"],
        "preferred": [
            "Adobe XD", "Sketch", "HTML", "CSS", "Usability Testing",
            "Design Systems",
        ],
    },
    "Android Developer": {
        "required": ["Kotlin", "Java", "Android SDK", "REST API", "Git"],
        "preferred": [
            "Jetpack Compose", "Room", "Firebase", "MVVM", "Coroutines",
        ],
    },
    "iOS Developer": {
        "required": ["Swift", "Xcode", "iOS SDK", "REST API", "Git"],
        "preferred": [
            "SwiftUI", "UIKit", "Core Data", "Firebase", "MVVM",
        ],
    },
    "Cloud Architect": {
        "required": [
            "AWS", "Kubernetes", "Terraform", "CI/CD", "Docker",
        ],
        "preferred": [
            "GCP", "Azure", "Ansible", "Prometheus", "Grafana", "Python",
        ],
    },
}


# ─── OntologyManager ──────────────────────────────────────────────────────────

class OntologyManager:
    """
    Singleton manager for the skills ontology.
    Provides fast lookup methods used across the AI pipeline.
    """

    def __init__(self) -> None:
        # Build alias → canonical name lookup
        self._alias_map: dict[str, str] = {}
        for canonical, info in SKILL_ONTOLOGY.items():
            self._alias_map[canonical.lower()] = canonical
            for alias in info.get("aliases", []):
                self._alias_map[alias.lower()] = canonical

    @property
    def all_skills(self) -> list[str]:
        """All skill names + aliases (for PhraseMatcher patterns)."""
        skills = list(SKILL_ONTOLOGY.keys())
        for info in SKILL_ONTOLOGY.values():
            skills.extend(info.get("aliases", []))
        return skills

    @property
    def all_canonical_skills(self) -> list[str]:
        """Just the canonical skill names."""
        return list(SKILL_ONTOLOGY.keys())

    def get_skill_info(self, skill_name: str) -> dict[str, Any]:
        """Get ontology info for a skill (by name or alias)."""
        canonical = self._alias_map.get(skill_name.lower())
        if canonical:
            return SKILL_ONTOLOGY.get(canonical, {})
        return {}

    def normalize(self, skill_name: str) -> str:
        """Normalize skill name to canonical form."""
        return self._alias_map.get(skill_name.lower(), skill_name)

    def is_advanced(self, skill_name: str) -> bool:
        """Check if a skill is considered advanced (needs project evidence)."""
        info = self.get_skill_info(skill_name)
        return info.get("seniority", "BASIC") in ("ADVANCED", "EXPERT")

    def is_critical(self, skill_name: str) -> bool:
        """Check if skill is marked as critical for its domain."""
        info = self.get_skill_info(skill_name)
        return bool(info.get("is_critical", False))

    def get_category(self, skill_name: str) -> str:
        info = self.get_skill_info(skill_name)
        return info.get("category", "Other")


@lru_cache(maxsize=1)
def get_role_skills(role: str) -> list[str]:
    """
    Get all target skills for a role (required + preferred combined).
    Used by SemanticMatcher for gap analysis.
    Cached — same role queried thousands of times per day.
    """
    role_data = ROLE_SKILLS.get(role, {})
    required = role_data.get("required", [])
    preferred = role_data.get("preferred", [])
    # Required first (higher priority for skill gap ordering)
    return required + [s for s in preferred if s not in required]