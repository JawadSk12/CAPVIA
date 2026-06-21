import os
import sys
from pathlib import Path
import random
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.internship import Internship
from app.models.application import InternshipApplication
from app.models.simulation_attempt import SimulationAttempt, AttemptStatus
from app.models.user import User

def generate_mock_report(total_score, candidate_name):
    # Determine recommendation based on score
    if total_score >= 80:
        rec = "hire"
        summary = f"{candidate_name} demonstrated exceptional technical proficiency and problem-solving skills."
    elif total_score >= 60:
        rec = "consider"
        summary = f"{candidate_name} showed good potential but had some gaps in advanced implementation."
    else:
        rec = "reject"
        summary = f"{candidate_name} struggled with core concepts and requires further development."

    return {
        "candidate_summary": summary,
        "recommendation": rec,
        "dimension_scores": {
            "Technical Correctness": min(100, total_score + random.randint(-5, 10)),
            "Logical Reasoning": min(100, total_score + random.randint(-10, 5)),
            "Best Practices": min(100, total_score + random.randint(-5, 5)),
            "Communication": min(100, total_score + random.randint(-15, 10))
        },
        "strengths": ["Quick learning", "Basic understanding"],
        "weaknesses": ["Advanced optimization", "Edge case handling"],
        "cheating_flags": []
    }

def run():
    db = SessionLocal()
    
    print("Fetching applications...")
    applications = db.query(InternshipApplication).all()
    print(f"Found {len(applications)} applications.")
    
    attempts_created = 0
    
    for app in applications:
        # Check if attempt already exists
        existing = db.query(SimulationAttempt).filter_by(
            internship_id=app.internship_id,
            candidate_id=app.candidate_id
        ).first()
        
        if not existing:
            # Generate random score between 40 and 95
            score = random.uniform(40.0, 95.0)
            
            # 5% chance of high cheating risk
            risk = "LOW"
            ai_dep = random.uniform(0.0, 20.0)
            if random.random() < 0.05:
                risk = "HIGH"
                ai_dep = random.uniform(60.0, 95.0)
            elif random.random() < 0.15:
                risk = "MEDIUM"
                ai_dep = random.uniform(20.0, 50.0)
                
            candidate = db.query(User).filter_by(id=app.candidate_id).first()
            name = candidate.full_name if candidate else "Candidate"
            
            report = generate_mock_report(score, name)
            
            internship = db.query(Internship).filter_by(id=app.internship_id).first()
            if not internship or not internship.blueprint_id:
                continue
                
            attempt = SimulationAttempt(
                candidate_id=app.candidate_id,
                internship_id=app.internship_id,
                blueprint_id=internship.blueprint_id,
                status=AttemptStatus.EVALUATED,
                total_score=score,
                ai_dependency_score=ai_dep,
                cheating_risk_level=risk,
                evaluation_report=report,
                round_scores={"round_1": score, "round_2": score - 5, "round_3": score + 5},
                answers={"mock": "data"},
                code_submissions={"mock": "data"},
                submitted_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            )
            db.add(attempt)
            attempts_created += 1
            
    db.commit()
    print(f"✅ Generated {attempts_created} mock evaluated simulation attempts.")

if __name__ == '__main__':
    run()
