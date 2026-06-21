import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.internship import Internship
from app.models.application import InternshipApplication, ApplicationStatus
from app.models.simulation_blueprint import SimulationBlueprint
from app.core.security import get_password_hash
from app.services.simulation_blueprint_generator import generate as generate_blueprint

db = SessionLocal()

def run_seed():
    print("🚀 Starting Mass Seed for Architecture Testing...")

    # 1. Create a Global HR User & Company
    hr_email = "mass_test_hr@capvia.com"
    hr = db.query(User).filter(User.email == hr_email).first()
    if not hr:
        hr = User(
            email=hr_email,
            hashed_password=get_password_hash("Password123!"),
            full_name="Mass Test HR",
            role=UserRole.HR,
            is_active=True
        )
        db.add(hr)
        db.commit()
        db.refresh(hr)
        print(f"Created HR User: {hr_email}")

    company = db.query(Company).filter(Company.name == "Global Tech Simulations").first()
    if not company:
        company = Company(
            name="Global Tech Simulations",
            description="Testing the dynamic simulation engine at scale.",
            owner_id=hr.id
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        print("Created Company: Global Tech Simulations")

    # 2. Define Internship Templates
    templates = [
        {"title": "Machine Learning Intern (NLP)", "desc": "Build text classification and semantic search models using LLMs and Transformers.", "resp": "Fine-tune language models, build RAG pipelines.", "skills": ["Python", "PyTorch", "NLP", "Transformers", "HuggingFace"]},
        {"title": "Computer Vision Intern", "desc": "Develop real-time object detection models for edge devices.", "resp": "Annotate data, train YOLO models, deploy to TensorRT.", "skills": ["Python", "OpenCV", "YOLO", "PyTorch", "CNN"]},
        {"title": "Data Analytics Intern", "desc": "Analyze user behavior and build business intelligence dashboards.", "resp": "Create Tableau dashboards, write SQL queries, present findings.", "skills": ["SQL", "Tableau", "Excel", "Data Analytics"]},
        {"title": "Frontend Developer Intern", "desc": "Build scalable and responsive user interfaces.", "resp": "Develop React components, integrate APIs.", "skills": ["React", "TypeScript", "Tailwind", "Next.js"]},
        {"title": "Backend Developer Intern", "desc": "Design and build high-performance microservices.", "resp": "Build REST APIs, optimize database queries.", "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"]},
        {"title": "DevOps & Cloud Intern", "desc": "Automate infrastructure and deployment pipelines.", "resp": "Write Terraform scripts, manage Kubernetes clusters.", "skills": ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS"]},
        {"title": "Product Management Intern", "desc": "Drive product strategy and prioritize feature roadmaps.", "resp": "Write PRDs, conduct user research, define OKRs.", "skills": ["Product Management", "Jira", "Agile", "User Research"]},
        {"title": "Cybersecurity Intern", "desc": "Identify vulnerabilities and secure applications.", "resp": "Conduct penetration testing, monitor SIEM logs.", "skills": ["Cybersecurity", "Penetration Testing", "OWASP", "Burp Suite"]},
        {"title": "Digital Marketing Intern", "desc": "Drive growth through SEO, SEM, and content campaigns.", "resp": "Manage Google Ads, track conversions, write copy.", "skills": ["SEO", "Digital Marketing", "Google Analytics", "Content Marketing"]},
        {"title": "Finance Analyst Intern", "desc": "Perform financial modeling and valuation analysis.", "resp": "Build DCF models, analyze P&L statements.", "skills": ["Financial Analysis", "Excel", "Valuation", "Accounting"]},
        {"title": "Time Series Forecasting Intern", "desc": "Predict demand and sales trends using temporal data.", "resp": "Train Prophet models, evaluate MAPE.", "skills": ["Python", "Prophet", "Time Series", "Pandas"]},
        {"title": "MLOps Engineer Intern", "desc": "Deploy and monitor machine learning models in production.", "resp": "Set up MLflow, automate retraining pipelines.", "skills": ["MLOps", "Docker", "Kubernetes", "MLflow", "CI/CD"]},
    ]

    internships = []
    print("\n📦 Creating 25 Internships and Generating Dynamic Blueprints...")
    for i in range(25):
        t = templates[i % len(templates)]
        variant_title = f"{t['title']} - Team {chr(65 + (i % 5))}"
        
        internship = Internship(
            title=variant_title,
            company_id=company.id,
            created_by=hr.id,
            description=t['desc'],
            responsibilities=t['resp'],
            requirements="Currently pursuing a degree in related field.",
            required_skills=t['skills'],
            technologies=t['skills'][:2],
            stipend_min=1000 + (i * 100),
            duration_months=3 + (i % 4),
            location="Remote",
            work_mode="remote",
            openings=random.randint(1, 5),
            status="active",
            simulation_enabled=True,
            deadline=datetime.utcnow() + timedelta(days=30)
        )
        db.add(internship)
        db.commit()
        db.refresh(internship)
        
        full_data = {
            "id": internship.id,
            "title": internship.title,
            "description": internship.description,
            "responsibilities": internship.responsibilities,
            "requirements": internship.requirements,
            "required_skills": internship.required_skills,
            "technologies": internship.technologies,
        }
        
        bp_data = generate_blueprint(internship_id=internship.id, internship_data=full_data)
        
        new_bp = SimulationBlueprint(
            internship_id=internship.id,
            role_key=bp_data["role_key"],
            role_name=internship.title,
            specialization=bp_data.get("specialization"),
            difficulty=bp_data["difficulty"],
            randomization_seed=bp_data["randomization_seed"],
            rounds=bp_data["rounds"],
            total_duration_minutes=bp_data["total_duration_minutes"],
            total_tasks=bp_data["total_tasks"],
            round_weights=[r["scoring_weight"] for r in bp_data["rounds"]],
            keywords_detected=bp_data.get("capability_graph_summary", {}).get("primary_skills", []),
            datasets_used=[bp_data.get("capability_graph_summary", {}).get("dataset_used", "")]
        )
        db.add(new_bp)
        db.commit()
        
        internship.blueprint_id = new_bp.id
        db.commit()
        internships.append(internship)
        print(f"  ✓ {internship.title} -> {bp_data['specialization']} (Blueprint Gen Success)")

    print("\n👥 Creating 120 Candidates...")
    candidates = []
    existing_count = db.query(User).filter(User.email.like("mass_cand_%")).count()
    if existing_count < 120:
        for i in range(120):
            email = f"mass_cand_{i}@test.com"
            cand = db.query(User).filter(User.email == email).first()
            if not cand:
                cand = User(
                    email=email,
                    hashed_password=get_password_hash("Password123!"),
                    full_name=f"Test Candidate {i}",
                    role=UserRole.CANDIDATE,
                    is_active=True,
                    skills=random.sample(["Python", "React", "SQL", "Docker", "Figma", "AWS", "Java", "C++", "SEO"], 3)
                )
                db.add(cand)
            candidates.append(cand)
        db.commit()
    
    candidates = db.query(User).filter(User.email.like("mass_cand_%")).all()
    print(f"Total test candidates ready: {len(candidates)}")

    print("\n📝 Generating Applications...")
    applications_created = 0
    for cand in candidates:
        num_apps = random.randint(2, 4)
        target_internships = random.sample(internships, num_apps)
        
        for tgt in target_internships:
            existing_app = db.query(InternshipApplication).filter_by(candidate_id=cand.id, internship_id=tgt.id).first()
            if not existing_app:
                app = InternshipApplication(
                    candidate_id=cand.id,
                    internship_id=tgt.id,
                    status=ApplicationStatus.APPLIED,
                    cover_letter="I am very interested in this role and have the relevant skills.",
                    resume_url="https://example.com/resume.pdf"
                )
                db.add(app)
                applications_created += 1
                tgt.applications_count += 1
                
    db.commit()
    print(f"Created {applications_created} applications across the internships.")
    
    print("\n✅ MASS SEED COMPLETE.")
    print("Login as HR:")
    print("Email: mass_test_hr@capvia.com")
    print("Pass: Password123!")

if __name__ == "__main__":
    run_seed()
