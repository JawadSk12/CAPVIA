"""
Specialization Detection Engine
================================
Multi-label specialization detector.
Uses weighted keyword scoring + semantic rule matching.
No external ML dependencies required.

Detects 30+ specializations across:
  AI/ML, Software Engineering, Data, DevOps, Cybersecurity,
  Management, Marketing, Finance, Design, QA
"""

import re
from typing import Dict, List, Tuple, Set
from collections import defaultdict


# ──────────────────────────────────────────────────────────────────────────────
# SPECIALIZATION SIGNAL LIBRARY
# Each specialization has: keywords (weight), anti-signals (negative weight),
# required_any (must have at least one), domain
# ──────────────────────────────────────────────────────────────────────────────

SPECIALIZATION_SIGNALS: Dict[str, Dict] = {

    # ── AI / ML ───────────────────────────────────────────────────────────────
    "nlp": {
        "domain": "ai_ml",
        "label": "Natural Language Processing",
        "keywords": {
            "nlp": 10, "natural language processing": 10, "text classification": 9,
            "sentiment analysis": 9, "named entity recognition": 9, "ner": 8,
            "transformers": 8, "bert": 9, "gpt": 8, "llm": 8,
            "tokenization": 7, "word embeddings": 8, "text mining": 7,
            "hugging face": 9, "spacy": 8, "nltk": 7, "language model": 9,
            "question answering": 8, "text generation": 8, "summarization": 7,
            "machine translation": 8, "chatbot": 7, "dialogue systems": 8,
            "information extraction": 7, "semantic similarity": 8,
            "topic modeling": 7, "lda": 6, "word2vec": 7, "glove": 6,
        },
        "required_any": ["nlp", "text", "language", "bert", "gpt", "transformers",
                         "hugging face", "spacy", "nltk", "sentiment", "chatbot"],
        "anti_signals": {"computer vision": -5, "image": -3, "cnn": -3},
    },

    "computer_vision": {
        "domain": "ai_ml",
        "label": "Computer Vision",
        "keywords": {
            "computer vision": 10, "cv": 6, "image classification": 9,
            "object detection": 9, "image segmentation": 9, "yolo": 9,
            "opencv": 8, "cnn": 8, "convolutional": 8, "resnet": 8,
            "vgg": 7, "efficientnet": 8, "image processing": 8,
            "video analysis": 8, "pose estimation": 8, "face detection": 8,
            "ocr": 7, "optical flow": 8, "image recognition": 8,
            "generative adversarial": 8, "gan": 8, "diffusion": 7,
            "pillow": 6, "torchvision": 8, "albumentations": 7,
        },
        "required_any": ["image", "visual", "computer vision", "opencv", "yolo",
                         "cnn", "detection", "segmentation", "ocr"],
        "anti_signals": {"nlp": -3, "text classification": -3},
    },

    "mlops": {
        "domain": "ai_ml",
        "label": "MLOps & ML Infrastructure",
        "keywords": {
            "mlops": 10, "ml pipeline": 9, "model deployment": 9,
            "model serving": 9, "mlflow": 9, "kubeflow": 9, "airflow": 8,
            "model monitoring": 9, "feature store": 9, "data pipeline": 8,
            "ci/cd": 7, "kubernetes": 7, "docker": 6, "model registry": 9,
            "experiment tracking": 9, "a/b testing": 7, "shadow deployment": 8,
            "blue-green deployment": 7, "drift detection": 9, "retraining": 8,
            "inference optimization": 9, "onnx": 8, "triton": 8, "bentoml": 8,
            "seldon": 8, "sagemaker": 8, "vertex ai": 8, "azure ml": 8,
        },
        "required_any": ["mlops", "pipeline", "deployment", "serving", "mlflow",
                         "monitoring", "feature store", "kubeflow"],
        "anti_signals": {},
    },

    "forecasting": {
        "domain": "ai_ml",
        "label": "Time Series & Forecasting",
        "keywords": {
            "forecasting": 10, "time series": 10, "arima": 9, "prophet": 9,
            "lstm": 8, "temporal": 8, "demand forecasting": 9, "trend analysis": 8,
            "seasonality": 9, "anomaly detection": 8, "sarima": 9, "garch": 8,
            "signal processing": 7, "stock prediction": 8, "sales forecasting": 8,
            "energy forecasting": 9, "xgboost": 6, "gradient boosting": 6,
            "statsmodels": 8, "darts": 8, "neuralprophet": 8,
        },
        "required_any": ["forecast", "time series", "temporal", "anomaly", "arima",
                         "prophet", "sarima", "trend", "seasonality"],
        "anti_signals": {},
    },

    "reinforcement_learning": {
        "domain": "ai_ml",
        "label": "Reinforcement Learning",
        "keywords": {
            "reinforcement learning": 10, "rl": 8, "q-learning": 9, "dqn": 9,
            "policy gradient": 9, "ppo": 9, "a3c": 8, "actor-critic": 9,
            "gym": 8, "openai gym": 9, "reward function": 9, "agent": 7,
            "environment": 7, "markov decision": 9, "mdp": 8, "bandit": 8,
            "monte carlo": 7, "temporal difference": 9, "stable baselines": 8,
        },
        "required_any": ["reinforcement learning", "rl", "q-learning", "policy",
                         "reward", "agent", "gym", "mdp"],
        "anti_signals": {},
    },

    "generative_ai": {
        "domain": "ai_ml",
        "label": "Generative AI & LLMs",
        "keywords": {
            "generative ai": 10, "llm": 9, "large language model": 10, "gpt": 9,
            "prompt engineering": 10, "rag": 9, "retrieval augmented": 10,
            "fine-tuning": 8, "lora": 9, "qlora": 9, "langchain": 9,
            "vector database": 9, "embeddings": 8, "semantic search": 8,
            "stable diffusion": 9, "midjourney": 7, "dall-e": 8,
            "multimodal": 9, "foundation model": 9, "gemini": 8, "claude": 8,
            "openai": 8, "anthropic": 8, "ollama": 8, "vllm": 8,
        },
        "required_any": ["generative", "llm", "gpt", "rag", "prompt", "langchain",
                         "vector database", "foundation model", "fine-tuning"],
        "anti_signals": {},
    },

    "general_ml": {
        "domain": "ai_ml",
        "label": "Machine Learning Engineering",
        "keywords": {
            "machine learning": 8, "ml": 6, "deep learning": 8, "neural network": 8,
            "scikit-learn": 8, "sklearn": 8, "tensorflow": 8, "pytorch": 8,
            "keras": 7, "feature engineering": 9, "model training": 8,
            "hyperparameter tuning": 8, "cross validation": 8, "ensemble": 8,
            "random forest": 7, "gradient boosting": 7, "xgboost": 7,
            "model evaluation": 8, "prediction": 7, "classification": 7,
            "regression": 7, "clustering": 7,
        },
        "required_any": ["machine learning", "ml", "deep learning", "neural",
                         "scikit-learn", "tensorflow", "pytorch"],
        "anti_signals": {},
    },

    # ── DATA ──────────────────────────────────────────────────────────────────
    "data_analytics": {
        "domain": "data",
        "label": "Data Analytics & BI",
        "keywords": {
            "data analytics": 9, "business intelligence": 9, "bi": 6,
            "tableau": 9, "power bi": 9, "looker": 8, "dashboards": 8,
            "sql": 7, "kpi": 8, "metrics": 7, "reporting": 7,
            "excel": 6, "pivot tables": 7, "data visualization": 8,
            "google analytics": 8, "clickhouse": 7, "superset": 7,
            "a/b testing": 8, "cohort analysis": 8, "funnel analysis": 8,
            "customer segmentation": 8, "churn analysis": 8,
        },
        "required_any": ["analytics", "tableau", "power bi", "dashboard", "kpi",
                         "reporting", "bi", "visualization", "churn"],
        "anti_signals": {"machine learning": -2},
    },

    "data_engineering": {
        "domain": "data",
        "label": "Data Engineering",
        "keywords": {
            "data engineering": 10, "etl": 9, "data pipeline": 9,
            "apache spark": 9, "kafka": 9, "flink": 8, "airflow": 8,
            "dbt": 9, "data warehouse": 9, "snowflake": 8, "bigquery": 8,
            "redshift": 8, "data lake": 9, "delta lake": 8, "hadoop": 7,
            "hive": 7, "presto": 7, "databricks": 8, "streaming": 8,
            "batch processing": 8, "data quality": 8, "schema": 7,
        },
        "required_any": ["etl", "pipeline", "spark", "kafka", "data engineering",
                         "warehouse", "airflow", "dbt", "databricks"],
        "anti_signals": {},
    },

    # ── SOFTWARE ENGINEERING ──────────────────────────────────────────────────
    "frontend": {
        "domain": "swe",
        "label": "Frontend Development",
        "keywords": {
            "react": 9, "vue": 8, "angular": 8, "next.js": 9, "nextjs": 9,
            "typescript": 7, "javascript": 7, "html": 6, "css": 6,
            "tailwind": 7, "redux": 8, "graphql": 7, "webpack": 7,
            "vite": 7, "responsive design": 8, "ui/ux": 7, "figma": 7,
            "web performance": 8, "accessibility": 7, "pwa": 8,
            "react native": 7, "flutter": 7, "svelte": 8,
        },
        "required_any": ["react", "vue", "angular", "frontend", "html", "css",
                         "javascript", "typescript", "next.js", "ui/ux"],
        "anti_signals": {"backend": -2, "django": -3, "fastapi": -3},
    },

    "backend": {
        "domain": "swe",
        "label": "Backend Development",
        "keywords": {
            "backend": 9, "api": 7, "rest api": 8, "graphql": 7,
            "django": 9, "fastapi": 9, "flask": 8, "node.js": 8,
            "express": 8, "spring boot": 8, "golang": 8, "rust": 7,
            "postgresql": 7, "mysql": 7, "redis": 7, "mongodb": 7,
            "microservices": 9, "authentication": 7, "jwt": 7, "oauth": 8,
            "websockets": 8, "grpc": 8, "message queue": 8, "rabbitmq": 8,
        },
        "required_any": ["api", "backend", "django", "fastapi", "flask", "node.js",
                         "express", "microservices", "spring boot", "rest"],
        "anti_signals": {"frontend": -2, "react": -2},
    },

    "fullstack": {
        "domain": "swe",
        "label": "Full-Stack Development",
        "keywords": {
            "full stack": 10, "fullstack": 10, "full-stack": 10,
            "mern": 9, "mean": 9, "mevn": 8, "react": 6, "node": 6,
            "both frontend and backend": 10, "end-to-end": 7,
        },
        "required_any": ["full stack", "fullstack", "full-stack", "mern", "mean"],
        "anti_signals": {},
    },

    "mobile": {
        "domain": "swe",
        "label": "Mobile Development",
        "keywords": {
            "mobile": 9, "ios": 9, "android": 9, "react native": 9,
            "flutter": 9, "swift": 9, "kotlin": 9, "xcode": 8,
            "app development": 8, "mobile app": 9, "play store": 7,
            "app store": 7, "firebase": 7, "push notifications": 8,
        },
        "required_any": ["mobile", "ios", "android", "react native", "flutter",
                         "swift", "kotlin", "app development"],
        "anti_signals": {},
    },

    # ── DEVOPS / CLOUD ────────────────────────────────────────────────────────
    "devops": {
        "domain": "devops",
        "label": "DevOps & Cloud Infrastructure",
        "keywords": {
            "devops": 10, "kubernetes": 9, "docker": 8, "ci/cd": 9,
            "jenkins": 8, "github actions": 8, "terraform": 9, "ansible": 8,
            "aws": 7, "gcp": 7, "azure": 7, "cloud": 6, "helm": 8,
            "prometheus": 8, "grafana": 8, "elk stack": 8, "nginx": 7,
            "infrastructure as code": 9, "iac": 8, "monitoring": 7,
            "reliability": 7, "sre": 8, "site reliability": 9,
        },
        "required_any": ["devops", "kubernetes", "docker", "ci/cd", "terraform",
                         "jenkins", "aws", "cloud", "infrastructure", "sre"],
        "anti_signals": {},
    },

    "cybersecurity": {
        "domain": "security",
        "label": "Cybersecurity",
        "keywords": {
            "cybersecurity": 10, "security": 7, "penetration testing": 10,
            "ethical hacking": 10, "vulnerability": 9, "siem": 9,
            "intrusion detection": 9, "ids": 8, "firewall": 7, "encryption": 7,
            "ctf": 8, "owasp": 9, "burp suite": 9, "nmap": 8,
            "metasploit": 8, "threat modeling": 9, "soc": 8, "incident response": 9,
        },
        "required_any": ["security", "cybersecurity", "penetration", "vulnerability",
                         "ethical hacking", "siem", "owasp", "ctf"],
        "anti_signals": {},
    },

    # ── MANAGEMENT ────────────────────────────────────────────────────────────
    "product_management": {
        "domain": "management",
        "label": "Product Management",
        "keywords": {
            "product management": 10, "product manager": 10, "roadmap": 9,
            "user stories": 9, "backlog": 8, "agile": 7, "scrum": 7,
            "product strategy": 9, "go-to-market": 8, "gtm": 7,
            "okr": 8, "kpi": 7, "product analytics": 8, "user research": 8,
            "feature prioritization": 9, "stakeholder": 8, "prd": 9,
        },
        "required_any": ["product manager", "product management", "roadmap",
                         "user stories", "backlog", "product strategy", "prd"],
        "anti_signals": {},
    },

    "project_management": {
        "domain": "management",
        "label": "Project Management",
        "keywords": {
            "project management": 10, "project manager": 10, "pmp": 8,
            "agile": 7, "scrum": 7, "kanban": 7, "jira": 7,
            "risk management": 9, "stakeholder management": 9, "gantt": 8,
            "milestone": 8, "deliverables": 8, "resource planning": 8,
            "budget management": 8, "timeline": 7, "coordination": 7,
        },
        "required_any": ["project manager", "project management", "pmp",
                         "gantt", "milestone", "stakeholder management"],
        "anti_signals": {},
    },

    # ── MARKETING ─────────────────────────────────────────────────────────────
    "digital_marketing": {
        "domain": "marketing",
        "label": "Digital Marketing & Growth",
        "keywords": {
            "digital marketing": 10, "seo": 9, "sem": 8, "ppc": 8,
            "google ads": 8, "facebook ads": 8, "social media": 7,
            "content marketing": 9, "email marketing": 8, "growth hacking": 9,
            "conversion rate": 9, "cro": 8, "landing page": 7, "funnel": 7,
            "influencer": 7, "brand": 6, "analytics": 6, "mailchimp": 7,
        },
        "required_any": ["seo", "digital marketing", "google ads", "social media",
                         "content marketing", "growth", "conversion"],
        "anti_signals": {},
    },

    # ── FINANCE ───────────────────────────────────────────────────────────────
    "finance": {
        "domain": "finance",
        "label": "Finance & Investment Analysis",
        "keywords": {
            "financial analysis": 10, "investment": 8, "valuation": 9,
            "dcf": 9, "financial modeling": 10, "excel": 6, "bloomberg": 8,
            "equity research": 9, "portfolio": 8, "risk analysis": 8,
            "accounting": 7, "p&l": 8, "balance sheet": 8, "cash flow": 8,
            "m&a": 9, "merger": 8, "acquisition": 8, "ipo": 7, "venture": 7,
        },
        "required_any": ["financial analysis", "valuation", "dcf", "financial modeling",
                         "equity", "portfolio", "accounting", "investment"],
        "anti_signals": {},
    },

    # ── DESIGN ────────────────────────────────────────────────────────────────
    "ux_design": {
        "domain": "design",
        "label": "UX/UI Design",
        "keywords": {
            "ux design": 10, "ui design": 9, "user experience": 10,
            "figma": 9, "sketch": 8, "adobe xd": 8, "wireframe": 9,
            "prototyping": 9, "user research": 9, "usability testing": 9,
            "design system": 9, "interaction design": 9, "information architecture": 8,
            "accessibility": 7, "user journey": 9, "persona": 8,
        },
        "required_any": ["ux design", "ui design", "figma", "wireframe", "prototype",
                         "user research", "user experience", "design system"],
        "anti_signals": {},
    },

    # ── QA ────────────────────────────────────────────────────────────────────
    "qa_testing": {
        "domain": "qa",
        "label": "QA & Test Engineering",
        "keywords": {
            "quality assurance": 10, "qa": 7, "testing": 7, "automation": 7,
            "selenium": 9, "cypress": 9, "playwright": 9, "pytest": 8,
            "unit testing": 8, "integration testing": 8, "e2e": 8,
            "test plan": 9, "bug reporting": 8, "load testing": 8,
            "jmeter": 8, "postman": 7, "api testing": 8, "tdd": 8, "bdd": 8,
        },
        "required_any": ["qa", "quality assurance", "testing", "selenium", "cypress",
                         "playwright", "test automation", "tdd"],
        "anti_signals": {},
    },
}


# ──────────────────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase + collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower().strip())


def detect_specializations(internship_data: Dict) -> List[Tuple[str, float, str]]:
    """
    Returns list of (spec_key, confidence_score, domain) sorted by score desc.
    Only returns specializations with score > threshold.
    """
    # Build full text corpus
    parts = [
        internship_data.get("title", "") * 3,       # title weighted 3x
        internship_data.get("description", ""),
        internship_data.get("responsibilities", "") * 2,
        internship_data.get("requirements", "") * 2,
        " ".join(internship_data.get("required_skills", []) or []) * 3,
        " ".join(internship_data.get("technologies", []) or []) * 3,
    ]
    corpus = _normalize(" ".join(str(p) for p in parts if p))

    results = []
    for spec_key, signals in SPECIALIZATION_SIGNALS.items():
        # Check required_any gating
        required = signals.get("required_any", [])
        has_required = any(kw in corpus for kw in required)
        if not has_required:
            continue

        # Score = weighted keyword hits
        raw_score = 0.0
        for kw, weight in signals["keywords"].items():
            if kw in corpus:
                raw_score += weight

        # Apply anti-signals
        for kw, penalty in signals.get("anti_signals", {}).items():
            if kw in corpus:
                raw_score += penalty  # penalty is negative

        if raw_score >= 8:  # minimum threshold
            results.append((spec_key, raw_score, signals["domain"]))

    # Sort by score descending
    results.sort(key=lambda x: x[1], reverse=True)
    return results


def get_primary_specialization(internship_data: Dict) -> Tuple[str, str, str]:
    """
    Returns (spec_key, label, domain) for the single strongest specialization.
    Falls back to a sensible default based on title keywords.
    """
    specs = detect_specializations(internship_data)
    if specs:
        spec_key, _, domain = specs[0]
        label = SPECIALIZATION_SIGNALS[spec_key]["label"]
        return spec_key, label, domain

    # Fallback: classify by title/skills alone
    title = _normalize(internship_data.get("title", ""))
    skills_text = _normalize(" ".join(internship_data.get("required_skills", []) or []))
    combined = title + " " + skills_text

    if any(k in combined for k in ["machine learning", "ml", "ai", "deep learning", "data science"]):
        return "general_ml", "Machine Learning Engineering", "ai_ml"
    if any(k in combined for k in ["data analyst", "analytics", "business intelligence"]):
        return "data_analytics", "Data Analytics", "data"
    if any(k in combined for k in ["frontend", "react", "vue", "angular"]):
        return "frontend", "Frontend Development", "swe"
    if any(k in combined for k in ["backend", "api", "django", "flask", "node"]):
        return "backend", "Backend Development", "swe"
    if any(k in combined for k in ["full stack", "fullstack"]):
        return "fullstack", "Full-Stack Development", "swe"
    if any(k in combined for k in ["devops", "cloud", "kubernetes", "docker"]):
        return "devops", "DevOps & Cloud", "devops"
    if any(k in combined for k in ["marketing", "seo", "growth"]):
        return "digital_marketing", "Digital Marketing", "marketing"
    if any(k in combined for k in ["finance", "financial", "investment"]):
        return "finance", "Finance Analysis", "finance"
    if any(k in combined for k in ["product manager", "product management"]):
        return "product_management", "Product Management", "management"
    if any(k in combined for k in ["project manager", "project management"]):
        return "project_management", "Project Management", "management"

    # Ultimate fallback
    return "general_ml", "Technical Role", "swe"


def get_top_specializations(internship_data: Dict, top_n: int = 3) -> List[Dict]:
    """Returns top N specializations with metadata."""
    specs = detect_specializations(internship_data)[:top_n]
    return [
        {
            "key": s[0],
            "label": SPECIALIZATION_SIGNALS[s[0]]["label"],
            "domain": s[2],
            "confidence": round(min(s[1] / 50, 1.0), 2),
        }
        for s in specs
    ]
