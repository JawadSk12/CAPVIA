#!/usr/bin/env python3
"""
Demo Seed Script — 20 ML Engineer Candidates
Simulates diverse skill levels and behavioral patterns including AI cheaters
Run: python -m scripts.seed_ml_demo
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.session import Session as DBSession, SessionStatus
from app.models.submission import Submission
from app.models.evaluation import Evaluation
from app.models.behavioral_event import BehavioralEvent
from app.core.security import get_password_hash
from loguru import logger

random.seed(42)

# ── Candidate profiles ────────────────────────────────────────────────────────
CANDIDATES = [
    # Genuines — strong
    {"name": "Aisha Patel",       "email": "aisha.patel@demo.com",       "skill": 0.92, "behavior": "clean",    "level": "senior"},
    {"name": "Carlos Rivera",     "email": "carlos.rivera@demo.com",     "skill": 0.88, "behavior": "clean",    "level": "senior"},
    {"name": "Mei Lin",           "email": "mei.lin@demo.com",           "skill": 0.85, "behavior": "clean",    "level": "mid"},
    {"name": "James Okonkwo",     "email": "james.okonkwo@demo.com",     "skill": 0.82, "behavior": "clean",    "level": "mid"},
    {"name": "Sara Johansson",    "email": "sara.johansson@demo.com",    "skill": 0.79, "behavior": "clean",    "level": "mid"},
    # Genuines — average
    {"name": "Ravi Sharma",       "email": "ravi.sharma@demo.com",       "skill": 0.68, "behavior": "clean",    "level": "mid"},
    {"name": "Emily Chen",        "email": "emily.chen@demo.com",        "skill": 0.65, "behavior": "clean",    "level": "junior"},
    {"name": "Lucas Ferreira",    "email": "lucas.ferreira@demo.com",    "skill": 0.61, "behavior": "clean",    "level": "junior"},
    {"name": "Priya Nair",        "email": "priya.nair@demo.com",        "skill": 0.58, "behavior": "clean",    "level": "junior"},
    {"name": "Tom Müller",        "email": "tom.muller@demo.com",        "skill": 0.55, "behavior": "clean",    "level": "junior"},
    # Genuines — weak
    {"name": "Fatima Al-Hassan",  "email": "fatima.hassan@demo.com",     "skill": 0.42, "behavior": "clean",    "level": "junior"},
    {"name": "Diego Morales",     "email": "diego.morales@demo.com",     "skill": 0.38, "behavior": "clean",    "level": "junior"},
    # AI Cheaters — high scores but suspicious
    {"name": "Alex Kim",          "email": "alex.kim@demo.com",          "skill": 0.95, "behavior": "ai_cheat", "level": "mid"},
    {"name": "Natasha Ivanova",   "email": "natasha.ivanova@demo.com",   "skill": 0.93, "behavior": "ai_cheat", "level": "mid"},
    {"name": "Brad Wilson",       "email": "brad.wilson@demo.com",       "skill": 0.89, "behavior": "ai_cheat", "level": "junior"},
    # Tab switchers / copy-pasters
    {"name": "Kevin Tran",        "email": "kevin.tran@demo.com",        "skill": 0.72, "behavior": "tab_switch","level": "mid"},
    {"name": "Ananya Bose",       "email": "ananya.bose@demo.com",       "skill": 0.66, "behavior": "copy_paste","level": "mid"},
    {"name": "Omar Shaikh",       "email": "omar.shaikh@demo.com",       "skill": 0.60, "behavior": "tab_switch","level": "junior"},
    # Mixed
    {"name": "Sofia Costa",       "email": "sofia.costa@demo.com",       "skill": 0.51, "behavior": "copy_paste","level": "junior"},
    {"name": "Jin Park",          "email": "jin.park@demo.com",          "skill": 0.45, "behavior": "tab_switch","level": "junior"},
]

QUESTION_TYPES = ["problem_understanding", "coding", "decision_making", "explanation", "debugging"]

def create_candidate(db: Session, c: dict) -> User:
    existing = db.query(User).filter(User.email == c["email"]).first()
    if existing:
        return existing
    user = User(
        email=c["email"],
        username=c["email"].split("@")[0].replace(".", "_"),
        full_name=c["name"],
        hashed_password=get_password_hash("DemoPass123!"),
        role="candidate",
        status="active",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


def generate_behavioral_events(session_id: int, behavior: str, db: Session):
    """Generate realistic behavioral events based on pattern."""
    events = []
    now = datetime.utcnow()

    if behavior == "clean":
        # Occasional idle, no suspicious activity
        events.append(BehavioralEvent(
            session_id=session_id, event_type="session_started",
            event_data={}, event_timestamp=now, severity="info"
        ))

    elif behavior == "ai_cheat":
        # Burst paste events + very fast typing + minimal time per answer
        for i in range(random.randint(6, 10)):
            events.append(BehavioralEvent(
                session_id=session_id, event_type="paste_detected",
                event_data={"chars_pasted": random.randint(800, 2000), "question_index": i % 5},
                event_timestamp=now + timedelta(minutes=i * 3), severity="high"
            ))
        events.append(BehavioralEvent(
            session_id=session_id, event_type="burst_typing",
            event_data={"wpm": random.randint(320, 600), "duration_seconds": 45},
            event_timestamp=now + timedelta(minutes=5), severity="high"
        ))

    elif behavior == "tab_switch":
        for i in range(random.randint(8, 15)):
            events.append(BehavioralEvent(
                session_id=session_id, event_type="tab_switch",
                event_data={"switch_number": i + 1},
                event_timestamp=now + timedelta(minutes=i * 4), severity="medium"
            ))

    elif behavior == "copy_paste":
        for i in range(random.randint(4, 7)):
            events.append(BehavioralEvent(
                session_id=session_id, event_type="paste_detected",
                event_data={"chars_pasted": random.randint(200, 500), "question_index": i},
                event_timestamp=now + timedelta(minutes=i * 5), severity="medium"
            ))

    for e in events:
        db.add(e)


def calculate_behavior_score(behavior: str) -> tuple:
    """Returns (behavior_score, risk_level)."""
    if behavior == "clean":
        return round(random.uniform(88, 100), 1), "low"
    elif behavior == "ai_cheat":
        return round(random.uniform(18, 35), 1), "high"
    elif behavior == "tab_switch":
        return round(random.uniform(45, 65), 1), "medium"
    elif behavior == "copy_paste":
        return round(random.uniform(52, 70), 1), "medium"
    return 75.0, "low"


def simulate_submissions(session_id: int, candidate: dict, question_ids: list, db: Session):
    """Create realistic submissions for each question."""
    skill = candidate["skill"]
    behavior = candidate["behavior"]

    for i, qid in enumerate(question_ids):
        round_num = (i % 5) + 1
        time_spent = int(random.gauss(600, 150))

        if behavior == "ai_cheat":
            time_spent = int(random.uniform(45, 120))  # suspiciously fast
            paste_count = random.randint(3, 8)
            copy_count = random.randint(1, 3)
        else:
            paste_count = random.randint(0, 1)
            copy_count = random.randint(0, 2)

        base_score = skill * 100
        noise = random.gauss(0, 8)
        score = max(0, min(100, base_score + noise))

        sub = Submission(
            session_id=session_id,
            question_id=qid,
            answer_text=f"[Demo answer for round {round_num}]" if round_num in [1, 4] else None,
            code_answer=f"# Demo code solution\npass" if round_num == 2 else None,
            selected_option=random.choice(["A", "B", "C", "D"]) if round_num == 3 else None,
            explanation=f"[Demo explanation]" if round_num in [3, 5] else None,
            time_spent_seconds=max(30, time_spent),
            paste_count=paste_count,
            copy_count=copy_count,
            score=round(score, 2),
            max_score=100.0,
            is_correct="true" if score >= 60 else "false",
        )
        db.add(sub)


def create_evaluation(session_id: int, candidate: dict, db: Session) -> Evaluation:
    skill = candidate["skill"]
    behavior = candidate["behavior"]
    behavior_score, risk_level = calculate_behavior_score(behavior)

    accuracy = round(skill * 100 + random.gauss(0, 5), 2)
    logic = round(skill * 95 + random.gauss(0, 6), 2)
    speed = round(random.uniform(55, 90), 2)
    explanation = round(skill * 85 + random.gauss(0, 8), 2)

    for v in [accuracy, logic, speed, explanation]:
        v = max(0, min(100, v))

    total = (accuracy * 0.40 + logic * 0.25 + speed * 0.15 + explanation * 0.10 + behavior_score * 0.10)
    total = max(0, min(100, total))
    pct = total

    if pct >= 90: grade = "A"
    elif pct >= 80: grade = "B"
    elif pct >= 70: grade = "C"
    elif pct >= 60: grade = "D"
    else: grade = "F"

    if risk_level == "high":
        recommendation = "reject"
    elif total >= 85 and behavior_score >= 80:
        recommendation = "strong_hire"
    elif total >= 75 and behavior_score >= 70:
        recommendation = "hire"
    elif total >= 60:
        recommendation = "maybe"
    else:
        recommendation = "reject"

    eval_rec = Evaluation(
        session_id=session_id,
        accuracy_score=round(accuracy, 2),
        logic_score=round(logic, 2),
        speed_score=round(speed, 2),
        explanation_score=round(explanation, 2),
        behavior_score=round(behavior_score, 2),
        total_score=round(total, 2),
        max_possible_score=100.0,
        cheating_risk_level=risk_level,
        suspicious_events=[],
        cheating_indicators={"behavior_pattern": behavior},
        passed="true" if total >= 60 else "false",
        grade=grade,
        recommendation=recommendation,
        evaluated_by="AI",
        evaluation_method="automated",
    )
    db.add(eval_rec)
    return eval_rec


def seed(db: Session):
    logger.info("=" * 60)
    logger.info("Seeding 20 ML Engineer Demo Candidates")
    logger.info("=" * 60)

    # Get or create some placeholder question IDs (5 questions for 5 rounds)
    from app.models.question import Question, QuestionType, DifficultyLevel
    placeholder_qids = []
    for i in range(1, 6):
        q = db.query(Question).filter(Question.module_number == i).first()
        if not q:
            q = Question(
                title=f"ML Engineer Demo Question Round {i}",
                description=f"Demo question for round {i}",
                question_type=list(QuestionType)[i - 1],
                difficulty=DifficultyLevel.MEDIUM,
                module_number=i,
                category="ML Engineer",
                tags=["ml_engineer", "demo"],
                max_score=100.0,
                is_active="true",
                usage_count=0,
            )
            db.add(q)
            db.flush()
        placeholder_qids.append(q.id)

    results = []
    for c in CANDIDATES:
        user = create_candidate(db, c)
        start_time = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        end_time = start_time + timedelta(minutes=90)

        session = DBSession(
            session_token=f"demo_{c['email'].replace('@','_').replace('.','_')}_{int(time.time())}",
            access_code=f"DEMO{random.randint(1000,9999)}",
            candidate_id=user.id,
            candidate_email=c["email"],
            candidate_name=c["name"],
            test_name="ML Engineer Simulation — Mid Level",
            test_description="Full 5-round ML engineering assessment",
            role_being_tested="ML Engineer",
            role_key="ml_engineer",
            difficulty_level=c["level"],
            duration_minutes=90,
            start_time=start_time,
            end_time=end_time,
            actual_end=end_time,
            status=SessionStatus.COMPLETED,
            question_ids=placeholder_qids,
            current_question_index=5,
            completed_questions=placeholder_qids,
            module_status={"1": True, "2": True, "3": True, "4": True, "5": True},
            is_proctored="true",
            allow_code_execution="true",
            has_suspicious_activity="true" if c["behavior"] != "clean" else "false",
            cheating_risk_level=calculate_behavior_score(c["behavior"])[1],
        )
        db.add(session)
        db.flush()

        generate_behavioral_events(session.id, c["behavior"], db)
        simulate_submissions(session.id, c, placeholder_qids, db)
        eval_rec = create_evaluation(session.id, c, db)

        session.total_score = str(round(eval_rec.total_score, 2))
        session.behavior_score = str(round(eval_rec.behavior_score, 2))

        results.append({
            "name": c["name"],
            "score": eval_rec.total_score,
            "grade": eval_rec.grade,
            "recommendation": eval_rec.recommendation,
            "risk": eval_rec.cheating_risk_level,
            "behavior": c["behavior"],
        })

        logger.info(f"  ✓ {c['name']:25} score={eval_rec.total_score:5.1f} grade={eval_rec.grade} rec={eval_rec.recommendation:12} risk={eval_rec.cheating_risk_level}")

    db.commit()

    results.sort(key=lambda x: x["score"], reverse=True)
    logger.info("\n" + "=" * 60)
    logger.info("FINAL RANKINGS")
    logger.info("=" * 60)
    for rank, r in enumerate(results, 1):
        flag = " ⚠️  SUSPICIOUS" if r["behavior"] != "clean" else ""
        logger.info(f"  #{rank:2}  {r['name']:25}  {r['score']:5.1f}%  [{r['grade']}]  {r['recommendation']:12}{flag}")

    logger.info("\n✅ Demo seed complete — 20 candidates loaded.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
