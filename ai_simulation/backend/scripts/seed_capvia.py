#!/usr/bin/env python3
"""
CAPVIA / IntelliRecruit AI — Seed Script
Seeds demo HR accounts, company profiles, 5 internships with AI simulations,
and 20 demo candidates with completed simulation attempts.

Usage:
    cd backend
    python scripts/seed_capvia.py
"""

import sys
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, engine, Base
from app.models import *  # registers all models
from app.models.user import User, UserRole, UserStatus
from app.models.company import Company
from app.models.internship import Internship, InternshipStatus, WorkMode
from app.models.application import InternshipApplication, ApplicationStatus
from app.models.simulation_blueprint import SimulationBlueprint
from app.models.simulation_attempt import SimulationAttempt, AttemptStatus
from app.models.behavior_log import CandidateBehaviorLog
from app.core.security import get_password_hash
from app.services.internship_understanding_engine import internship_understanding_engine
from app.services.simulation_blueprint_generator import simulation_blueprint_generator
from app.services.ai_evaluation_engine import ai_evaluation_engine

print("🚀 CAPVIA Seed Script Starting...")

# Create all tables
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ──────────────────────────────────────────────
# DEMO HR ACCOUNT
# ──────────────────────────────────────────────
def seed_hr():
    existing = db.query(User).filter(User.email == "hr@capvia.ai").first()
    if existing:
        print("  ⚠  HR user already exists, skipping.")
        return existing
    hr = User(
        email="hr@capvia.ai",
        username="capvia_hr",
        full_name="Sarah Mitchell",
        hashed_password=get_password_hash("HRDemo2024!"),
        role=UserRole.HR,
        status=UserStatus.ACTIVE,
        is_active=True,
        is_verified=True,
        position="Head of Talent",
        phone="+91-9876543210",
    )
    db.add(hr)
    db.flush()

    company = Company(
        name="CapviaAI",
        slug=f"capviaai-{hr.id}",
        description="India's leading AI-powered hiring platform for internships.",
        industry="HR Technology",
        company_size="51-200",
        headquarters="Bangalore, India",
        website="https://capvia.ai",
        owner_id=hr.id,
        email="hr@capvia.ai",
        is_verified=True,
        is_active=True,
        tech_stack=["Python", "React", "FastAPI", "PostgreSQL", "Docker"],
        culture_tags=["Remote-first", "AI-driven", "Growth-focused"],
        perks=["Flexible hours", "Stock options", "Learning budget"],
    )
    db.add(company)
    db.commit()
    print(f"  ✓ HR: {hr.email} | Company: CapviaAI")
    return hr

# ──────────────────────────────────────────────
# DEMO CANDIDATE ACCOUNTS
# ──────────────────────────────────────────────
CANDIDATE_PROFILES = [
    # (name, email, skills, level)  level: beginner/intermediate/advanced/cheating/ai_assisted
    ("Arjun Sharma", "arjun.s@test.com", ["Python", "ML", "scikit-learn"], "advanced"),
    ("Priya Patel", "priya.p@test.com", ["Python", "TensorFlow", "NLP"], "advanced"),
    ("Rohit Kumar", "rohit.k@test.com", ["Python", "pandas", "numpy"], "intermediate"),
    ("Sneha Reddy", "sneha.r@test.com", ["Machine Learning", "Statistics"], "intermediate"),
    ("Vikram Singh", "vikram.s@test.com", ["Python", "Data Science"], "intermediate"),
    ("Ananya Nair", "ananya.n@test.com", ["Python"], "beginner"),
    ("Kiran Mehta", "kiran.m@test.com", ["Excel", "Python basics"], "beginner"),
    ("Dev Joshi", "dev.j@test.com", ["Python", "Jupyter"], "beginner"),
    ("Aisha Khan", "aisha.k@test.com", ["Python", "Deep Learning", "PyTorch"], "advanced"),
    ("Rahul Gupta", "rahul.g@test.com", ["Python", "ML", "SQL"], "intermediate"),
    ("Mia Chen", "mia.c@test.com", ["Python", "R", "Statistics"], "advanced"),
    ("Omar Farooq", "omar.f@test.com", ["Python", "AutoML"], "ai_assisted"),
    ("Zara Ahmed", "zara.a@test.com", ["ChatGPT", "Python basics"], "ai_assisted"),
    ("Sam Wilson", "sam.w@test.com", ["Python", "copy-paste hero"], "cheating"),
    ("Nina Patel", "nina.p@test.com", ["Python", "pandas"], "cheating"),
    ("Harsh Vardhan", "harsh.v@test.com", ["Python", "scikit-learn", "MLOps"], "advanced"),
    ("Pooja Iyer", "pooja.i@test.com", ["Python", "visualization"], "intermediate"),
    ("Ali Hassan", "ali.h@test.com", ["Python", "data analysis"], "intermediate"),
    ("Lucy Martinez", "lucy.m@test.com", ["Machine Learning", "PyTorch"], "advanced"),
    ("candidate@capvia.ai", "candidate@capvia.ai", ["Python", "ML"], "intermediate"),
]

def seed_candidates():
    candidates = []
    for name, email, skills, level in CANDIDATE_PROFILES:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            candidates.append((existing, level))
            continue
        c = User(
            email=email,
            username=email.split("@")[0].replace(".", "_"),
            full_name=name,
            hashed_password=get_password_hash("CandDemo2024!"),
            role=UserRole.CANDIDATE,
            status=UserStatus.ACTIVE,
            is_active=True,
            is_verified=True,
            skills=skills,
            years_of_experience=random.choice(["0-1", "1-2", "2-3"]),
        )
        db.add(c)
        candidates.append((c, level))
    db.commit()
    print(f"  ✓ {len(candidates)} candidate accounts seeded")
    return candidates

# ──────────────────────────────────────────────
# INTERNSHIP DEFINITIONS
# ──────────────────────────────────────────────
INTERNSHIPS_DATA = [
    {
        "title": "ML Engineer Internship",
        "description": "Join CapviaAI's ML team to build predictive models and intelligent automation systems. Work with large-scale datasets, design feature pipelines, and deploy models to production.",
        "responsibilities": "Train and evaluate ML models using scikit-learn and PyTorch. Perform EDA on real datasets. Build feature engineering pipelines. Debug model performance issues. Write clean, documented Python code.",
        "requirements": "Strong Python skills. Understanding of supervised and unsupervised learning. Experience with pandas, numpy, scikit-learn. Good knowledge of statistics and probability.",
        "required_skills": ["Python", "Machine Learning", "scikit-learn", "pandas", "NumPy"],
        "technologies": ["Python", "PyTorch", "scikit-learn", "pandas", "MLflow", "Docker"],
        "duration_months": 3,
        "stipend_min": 15000,
        "stipend_max": 25000,
        "location": "Bangalore / Remote",
        "work_mode": WorkMode.HYBRID,
        "openings": 3,
    },
    {
        "title": "Frontend Developer Internship",
        "description": "Build stunning React applications for CapviaAI's candidate-facing products. You'll work on our core simulation UI, dashboard components, and real-time collaboration features.",
        "responsibilities": "Build React components with TypeScript. Implement responsive UI from Figma designs. Integrate REST APIs. Optimize performance and accessibility. Write unit tests with Jest.",
        "requirements": "Strong HTML/CSS/JavaScript skills. React knowledge required. TypeScript experience preferred. Understanding of REST APIs and async JS.",
        "required_skills": ["React", "TypeScript", "HTML", "CSS", "JavaScript"],
        "technologies": ["React 18", "TypeScript", "Vite", "TailwindCSS", "Zustand", "React Query"],
        "duration_months": 3,
        "stipend_min": 12000,
        "stipend_max": 20000,
        "location": "Remote",
        "work_mode": WorkMode.REMOTE,
        "openings": 2,
    },
    {
        "title": "Backend Developer Internship",
        "description": "Design and build scalable REST APIs and microservices for CapviaAI's evaluation platform. Work with FastAPI, PostgreSQL, Redis, and Docker.",
        "responsibilities": "Build FastAPI endpoints with full CRUD. Design PostgreSQL schemas. Implement caching with Redis. Write API tests with pytest. Handle async task processing with Celery.",
        "requirements": "Python proficiency required. Understanding of REST APIs and HTTP. Basic SQL knowledge. Familiarity with Docker is a plus.",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "REST API"],
        "technologies": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "SQLAlchemy", "Celery"],
        "duration_months": 3,
        "stipend_min": 15000,
        "stipend_max": 22000,
        "location": "Remote",
        "work_mode": WorkMode.REMOTE,
        "openings": 2,
    },
    {
        "title": "Data Analyst Internship",
        "description": "Turn data into actionable insights for CapviaAI's product and growth teams. You'll build dashboards, run cohort analyses, and define KPIs that guide product decisions.",
        "responsibilities": "Write complex SQL queries. Build dashboards in Metabase/Tableau. Conduct cohort and funnel analysis. Define and track KPIs. Present insights to stakeholders.",
        "requirements": "Strong SQL skills required. Experience with Python/pandas a plus. Understanding of metrics and analytics. Data visualization skills.",
        "required_skills": ["SQL", "Data Analysis", "Excel", "Tableau", "Python"],
        "technologies": ["PostgreSQL", "Python", "pandas", "Tableau", "Metabase", "Google Sheets"],
        "duration_months": 2,
        "stipend_min": 10000,
        "stipend_max": 18000,
        "location": "Bangalore",
        "work_mode": WorkMode.ONSITE,
        "openings": 2,
    },
    {
        "title": "Project Coordinator Internship",
        "description": "Join CapviaAI's operations team to manage cross-functional projects, coordinate between engineering and product, and ensure on-time delivery of key initiatives.",
        "responsibilities": "Create and maintain project plans and timelines. Coordinate sprint planning and retrospectives. Track milestones and dependencies. Communicate status to stakeholders. Manage risk register.",
        "requirements": "Strong communication and organizational skills. Basic understanding of Agile/Scrum. Proficiency in project management tools. Attention to detail.",
        "required_skills": ["Project Management", "Communication", "Agile", "Scrum"],
        "technologies": ["Jira", "Notion", "Slack", "Google Workspace", "Asana"],
        "duration_months": 3,
        "stipend_min": 8000,
        "stipend_max": 15000,
        "location": "Remote",
        "work_mode": WorkMode.REMOTE,
        "openings": 1,
    },
]

def seed_internships(hr_user, company):
    internships = []
    for data in INTERNSHIPS_DATA:
        existing = db.query(Internship).filter(Internship.title == data["title"]).first()
        if existing:
            internships.append(existing)
            continue

        role_intel = internship_understanding_engine.analyze(data)

        internship = Internship(
            title=data["title"],
            company_id=company.id,
            created_by=hr_user.id,
            description=data["description"],
            responsibilities=data["responsibilities"],
            requirements=data["requirements"],
            required_skills=data["required_skills"],
            technologies=data["technologies"],
            stipend_min=data["stipend_min"],
            stipend_max=data["stipend_max"],
            stipend_currency="INR",
            duration_months=data["duration_months"],
            location=data["location"],
            work_mode=data["work_mode"],
            openings=data["openings"],
            status=InternshipStatus.ACTIVE,
            simulation_enabled=True,
            detected_role=role_intel["detected_role_name"],
            detected_role_key=role_intel["detected_role_key"],
            detected_specialization=role_intel["detected_specialization"],
            role_confidence=role_intel["role_confidence"],
            role_taxonomy_category=role_intel["role_taxonomy_category"],
        )
        db.add(internship)
        db.flush()

        # Generate blueprint
        bp_data = simulation_blueprint_generator.generate(
            internship_id=internship.id,
            role_key=role_intel["detected_role_key"],
            role_name=role_intel["detected_role_name"],
            specialization=role_intel.get("detected_specialization"),
            internship_data=data,
        )
        blueprint = SimulationBlueprint(
            internship_id=internship.id,
            role_key=bp_data["role_key"],
            role_name=bp_data["role_name"],
            specialization=bp_data.get("specialization"),
            difficulty="mid",
            randomization_seed=bp_data["randomization_seed"],
            rounds=bp_data["rounds"],
            total_duration_minutes=bp_data["total_duration_minutes"],
            total_tasks=bp_data["total_tasks"],
            round_weights=bp_data["round_weights"],
            keywords_detected=bp_data.get("keywords_detected", []),
            datasets_used=bp_data.get("datasets_used", []),
        )
        db.add(blueprint)
        db.flush()
        internship.blueprint_id = blueprint.id
        internships.append(internship)
        print(f"  ✓ Internship: {internship.title} | Role: {role_intel['detected_role_name']}")

    db.commit()
    return internships

# ──────────────────────────────────────────────
# DEMO ATTEMPTS
# ──────────────────────────────────────────────
def _make_answers(level: str, blueprint_rounds: list) -> tuple:
    """Generate mock answers and code based on candidate level."""
    rng = random.Random(level)
    answers, code_subs = {}, {}

    quality = {"advanced": 0.9, "intermediate": 0.6, "beginner": 0.3, "ai_assisted": 0.85, "cheating": 0.75}[level]

    for round_data in blueprint_rounds:
        rk = f"round_{round_data['round_number']}"
        answers[rk] = {}
        code_subs[rk] = {}
        for task in round_data.get("tasks", []):
            tid = task["id"]
            if task["type"] == "code":
                if level == "advanced":
                    code_subs[rk][tid] = "import pandas as pd\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split, cross_val_score\nfrom sklearn.preprocessing import StandardScaler\nimport numpy as np\n\n# Load and preprocess\ndf = pd.read_csv('data.csv')\nX = df.drop('target', axis=1)\ny = df['target']\n\n# Split first, then scale (avoid data leakage)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nscaler = StandardScaler()\nX_train = scaler.fit_transform(X_train)\nX_test = scaler.transform(X_test)\n\n# Cross-validated model\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\nscores = cross_val_score(model, X_train, y_train, cv=5)\nprint(f'CV Accuracy: {scores.mean():.3f} +/- {scores.std():.3f}')\n\nmodel.fit(X_train, y_train)\nprint(f'Test Accuracy: {model.score(X_test, y_test):.3f}')\n"
                elif level in ["ai_assisted", "cheating"]:
                    code_subs[rk][tid] = "# perfect solution\nimport pandas as pd\nfrom sklearn.ensemble import GradientBoostingClassifier\ndf = pd.read_csv('data.csv')\nX, y = df.drop('target',1), df['target']\nmodel = GradientBoostingClassifier()\nmodel.fit(X, y)\nprint(model.score(X, y))\n"
                elif level == "intermediate":
                    code_subs[rk][tid] = "import pandas as pd\nfrom sklearn.linear_model import LogisticRegression\n\ndf = pd.read_csv('data.csv')\nX = df.drop('target', axis=1)\ny = df['target']\n\nmodel = LogisticRegression()\nmodel.fit(X, y)\nprint('Done')\n"
                else:
                    code_subs[rk][tid] = "# I'm not sure how to do this\nimport pandas as pd\nprint('help')\n"
            elif task["type"] == "written":
                words = int(150 * quality)
                filler = "The solution involves careful consideration of requirements. " * (words // 10)
                if level == "advanced":
                    answers[rk][tid] = f"First, I would analyze the requirements by identifying the target variable and key features. The edge cases include missing data, class imbalance, and distribution shift. My approach would involve: 1) EDA to understand data distribution, 2) feature engineering based on domain knowledge, 3) model selection using cross-validation, 4) threshold tuning for precision-recall tradeoff. {filler}"
                elif level in ["ai_assisted"]:
                    answers[rk][tid] = "The optimal solution leverages advanced techniques to comprehensively address all requirements. Utilizing state-of-the-art methodologies, we can effectively implement a robust system. " * 3
                else:
                    answers[rk][tid] = filler[:words]
            elif task["type"] == "multiple_choice":
                answers[rk][tid] = rng.choice(["A", "B", "C", "D"])
                if quality > 0.7:
                    answers[rk][tid] += " — I chose this because it provides the best scalability and maintainability tradeoff for production systems. The alternative options have significant drawbacks in terms of operational complexity."
            elif task["type"] == "debugging":
                if level == "advanced":
                    code_subs[rk][tid] = "# Bug 1 Fixed: Moved scaling after train/test split to prevent data leakage\n# Bug 2 Fixed: Changed model.score(X_train) to model.score(X_test)\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\nscaler = StandardScaler()\nX_train = scaler.fit_transform(X_train)\nX_test = scaler.transform(X_test)  # Only transform, don't fit!\nprint('Test Accuracy:', model.score(X_test, y_test))\n"
                else:
                    code_subs[rk][tid] = "# Fixed some issues\nprint('fixed')\n"

    return answers, code_subs


def _make_behavior_events(level: str) -> list:
    events = []
    if level == "cheating":
        for _ in range(8):
            events.append({"event_type": "copy_paste", "severity": "critical"})
        for _ in range(12):
            events.append({"event_type": "tab_switch", "severity": "warning"})
        for _ in range(5):
            events.append({"event_type": "burst_typing", "severity": "warning"})
    elif level == "ai_assisted":
        for _ in range(6):
            events.append({"event_type": "burst_typing", "severity": "warning"})
        for _ in range(3):
            events.append({"event_type": "copy_paste", "severity": "warning"})
    elif level == "intermediate":
        events.append({"event_type": "tab_switch", "severity": "info"})
        events.append({"event_type": "idle", "severity": "info"})
    return events


def seed_attempts(candidates, ml_internship):
    blueprint = db.query(SimulationBlueprint).filter(
        SimulationBlueprint.internship_id == ml_internship.id
    ).first()
    if not blueprint:
        print("  ⚠  No blueprint for ML internship, skipping attempts")
        return

    submitted = 0
    for candidate, level in candidates:
        # Skip if already has attempt
        existing = db.query(SimulationAttempt).filter(
            SimulationAttempt.candidate_id == candidate.id,
            SimulationAttempt.internship_id == ml_internship.id,
        ).first()
        if existing:
            continue

        # Create application
        app = InternshipApplication(
            internship_id=ml_internship.id,
            candidate_id=candidate.id,
            status=ApplicationStatus.SIMULATION_COMPLETED,
            resume_url="https://example.com/resume.pdf",
        )
        db.add(app)
        db.flush()

        answers, code_subs = _make_answers(level, blueprint.rounds)
        behavior_events = _make_behavior_events(level)

        now = datetime.utcnow()
        started = now - timedelta(hours=random.randint(1, 48))
        submitted_at = started + timedelta(minutes=blueprint.total_duration_minutes - random.randint(5, 20))

        attempt = SimulationAttempt(
            blueprint_id=blueprint.id,
            candidate_id=candidate.id,
            internship_id=ml_internship.id,
            application_id=app.id,
            status=AttemptStatus.SUBMITTED,
            current_round=5,
            completed_rounds=[1, 2, 3, 4, 5],
            answers=answers,
            code_submissions=code_subs,
            started_at=started.isoformat(),
            submitted_at=submitted_at.isoformat(),
            expires_at=(started + timedelta(hours=3)).isoformat(),
            access_token=f"seed_token_{candidate.id}_{ml_internship.id}",
        )
        db.add(attempt)
        db.flush()
        app.attempt_id = attempt.id

        # Add behavior logs
        ts = started
        for ev in behavior_events:
            ts += timedelta(minutes=random.randint(2, 10))
            log = CandidateBehaviorLog(
                attempt_id=attempt.id,
                candidate_id=candidate.id,
                event_type=ev["event_type"],
                timestamp=ts.isoformat(),
                severity=ev["severity"],
            )
            db.add(log)

        # AI Evaluation
        eval_result = ai_evaluation_engine.evaluate_attempt(
            attempt_data={"answers": answers, "code_submissions": code_subs, "behavior_events": behavior_events},
            blueprint={"rounds": blueprint.rounds},
        )

        attempt.status = AttemptStatus.EVALUATED
        attempt.total_score = eval_result["total_score"]
        attempt.round_scores = eval_result["round_scores"]
        attempt.cheating_risk_score = eval_result["cheating_risk_score"]
        attempt.ai_dependency_score = eval_result["ai_dependency_score"]
        attempt.cheating_risk_level = eval_result["cheating_risk_level"]
        attempt.evaluation_report = eval_result

        app.status = ApplicationStatus.SIMULATION_COMPLETED
        app.final_score = str(round(eval_result["total_score"], 1))
        app.recommendation = eval_result["recommendation"]
        ml_internship.applications_count = (ml_internship.applications_count or 0) + 1
        submitted += 1

    db.commit()
    print(f"  ✓ {submitted} simulation attempts seeded with AI evaluation")


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
try:
    print("\n📋 Step 1: Seeding HR account & company...")
    hr = seed_hr()
    company = db.query(Company).filter(Company.owner_id == hr.id).first()

    print("\n👥 Step 2: Seeding 20 demo candidates...")
    candidates = seed_candidates()

    print("\n💼 Step 3: Seeding 5 internships with AI simulations...")
    internships = seed_internships(hr, company)

    ml_internship = next((i for i in internships if "ML" in i.title), None)

    print("\n🎯 Step 4: Seeding 20 candidate attempts for ML internship...")
    if ml_internship:
        seed_attempts(candidates, ml_internship)

    print("\n✅ Seed complete!")
    print("\n🔑 Demo Credentials:")
    print("   HR:        hr@capvia.ai       / HRDemo2024!")
    print("   Candidate: candidate@capvia.ai / CandDemo2024!")
    print(f"\n   Internships seeded: {len(internships)}")
    print(f"   Candidates seeded:  {len(candidates)}")

except Exception as e:
    db.rollback()
    import traceback
    traceback.print_exc()
    print(f"\n❌ Seed failed: {e}")
finally:
    db.close()
