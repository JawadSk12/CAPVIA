import asyncio
import uuid
import random
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.database.connection import get_db_session
from capvia_platform.models.models import (
    User, UserRole, Company, CompanyMember, MemberRole, Internship, InternshipStatus, WorkMode,
    Application, ApplicationStatus, StageName, CandidateMapping, VacancyMapping, ApplicationMapping,
    RiskLevel, ATSResult, SimulationResult, InterviewResult, RecommendationType,
    IntegrityResult, DNAProfile, Ranking, Report, ActivityLog, Notification, ApplicationEvent
)
from capvia_platform.utils.auth import hash_password

async def seed_data():
    print("Initializing CAPVIA Database Seeding (Multiple Companies, JDs, Candidates, HRs)...")

    async with get_db_session() as session:
        # Clear existing data first to ensure clean state for detailed testing
        print("Clearing existing tables...")
        tables = [
            "notifications", "activity_logs", "reports", "rankings", "dna_profiles",
            "integrity_results", "interview_results", "simulation_results", "ats_results",
            "application_mappings", "vacancy_mappings", "candidate_mappings", "application_events",
            "applications", "internships", "company_members", "companies", "users"
        ]
        for table in tables:
            await session.execute(text(f'TRUNCATE TABLE "{table}" CASCADE;'))
        await session.commit()
        print("Existing tables cleared.")

    async with get_db_session() as session:
        # 1. Companies
        companies_data = [
            {"name": "Capvia AI", "logo_url": "https://capvia.ai/logo.png", "description": "Leading Autonomous AI Agent Platform", "industry": "Artificial Intelligence"},
            {"name": "Google DeepMind", "logo_url": "https://deepmind.google/logo.png", "description": "Pioneering Artificial Intelligence Research", "industry": "Technology"},
            {"name": "Stripe", "logo_url": "https://stripe.com/logo.png", "description": "Financial Infrastructure for the Internet", "industry": "Fintech"}
        ]
        companies = []
        for c in companies_data:
            company = Company(
                id=uuid.uuid4(),
                name=c["name"],
                logo_url=c["logo_url"],
                description=c["description"],
                industry=c["industry"]
            )
            session.add(company)
            companies.append(company)
        await session.flush()
        print(f"Seeded {len(companies)} Companies.")

        # 2. Recruiters / HRs
        hr_data = [
            {"email": "hr@capvia.ai", "name": "Jane Smith", "company": companies[0]},
            {"email": "sarah@deepmind.com", "name": "Sarah Jenkins", "company": companies[1]},
            {"email": "mcho@stripe.com", "name": "Michael Cho", "company": companies[2]}
        ]
        hrs = []
        for hr in hr_data:
            user = User(
                id=uuid.uuid4(),
                email=hr["email"],
                password_hash=hash_password("password123"),
                full_name=hr["name"],
                role=UserRole.HR,
                is_active=True
            )
            session.add(user)
            hrs.append((user, hr["company"]))
        await session.flush()
        
        # Link HRs to Companies
        for user, company in hrs:
            member = CompanyMember(
                id=uuid.uuid4(),
                company_id=company.id,
                user_id=user.id,
                member_role=MemberRole.OWNER
            )
            session.add(member)
        await session.flush()
        print(f"Seeded {len(hrs)} Recruiters and linked them to their respective companies.")

        # 3. Candidates (Students)
        candidate_names = [
            ("Arjun Kumar", "candidate@example.com"),
            ("Rohan Gupta", "rohan@example.com"),
            ("Priya Sharma", "priya@example.com"),
            ("Anita Patel", "anita@example.com"),
            ("Kabir Singh", "kabir@example.com"),
            ("Jawad Ansari", "jawad@gmail.com")
        ]
        candidates = []
        for name, email in candidate_names:
            pwd = "Test@123" if email == "jawad@gmail.com" else "password123"
            user = User(
                id=uuid.uuid4(),
                email=email,
                password_hash=hash_password(pwd),
                full_name=name,
                role=UserRole.STUDENT,
                is_active=True
            )
            session.add(user)
            candidates.append(user)
        await session.flush()
        print(f"Seeded {len(candidates)} Candidates.")

        # 4. Internships (Detailed JDs)
        internships_data = [
            {
                "company": companies[0],
                "title": "Backend Developer",
                "desc": "Develop robust async microservices with Python and FastAPI.",
                "skills": ["Python", "SQL", "FastAPI"],
                "techs": ["PostgreSQL", "Docker", "Git"],
                "work": WorkMode.REMOTE,
                "loc": "Bengaluru",
                "sim_id": 1
            },
            {
                "company": companies[1],
                "title": "Machine Learning Intern",
                "desc": "Research and deploy deep learning models at scale.",
                "skills": ["Python", "PyTorch", "TensorFlow", "ML", "Pandas"],
                "techs": ["CUDA", "Linux", "Jupyter", "Numpy"],
                "work": WorkMode.HYBRID,
                "loc": "London",
                "sim_id": 2
            },
            {
                "company": companies[2],
                "title": "Frontend Developer",
                "desc": "Build highly responsive and premium UI components using React and TailwindCSS.",
                "skills": ["React", "Next.js", "TypeScript", "TailwindCSS"],
                "techs": ["Vite", "Node.js", "Webpack", "CSS"],
                "work": WorkMode.ONSITE,
                "loc": "San Francisco",
                "sim_id": 3
            },
            {
                "company": companies[0],
                "title": "DevOps Engineer",
                "desc": "Optimize deployment pipelines and manage cloud infrastructure scalability.",
                "skills": ["Docker", "Kubernetes", "AWS", "CI/CD"],
                "techs": ["Terraform", "GitHub Actions", "Ansible", "Linux"],
                "work": WorkMode.HYBRID,
                "loc": "New York",
                "sim_id": 4
            },
            {
                "company": companies[1],
                "title": "Data Scientist",
                "desc": "Translate complex unstructured datasets into actionable business intelligence pipelines.",
                "skills": ["Python", "SQL", "Statistics", "Data Cleaning"],
                "techs": ["Scikit-Learn", "Matplotlib", "Spark", "SQLAlchemy"],
                "work": WorkMode.REMOTE,
                "loc": "Remote",
                "sim_id": 5
            }
        ]
        vacancies = []
        for i, jd in enumerate(internships_data):
            vacancy = Internship(
                id=uuid.uuid4(),
                company_id=jd["company"].id,
                title=jd["title"],
                description=jd["desc"],
                responsibilities=[f"Design and maintain components for {jd['title']} workflows", "Document code architecture patterns", "Collaborate with cross-functional product stakeholders"],
                required_skills=jd["skills"],
                technologies=jd["techs"],
                experience_level="ENTRY",
                status=InternshipStatus.PUBLISHED,
                is_active=True,
                work_mode=jd["work"],
                location=jd["loc"],
                duration_weeks=16,
                stipend_min=25000,
                stipend_max=50000,
                openings=2,
                application_deadline=date.today() + timedelta(days=30),
                published_at=datetime.now(timezone.utc)
            )
            session.add(vacancy)
            vacancies.append((vacancy, jd["sim_id"]))
        await session.flush()
        print(f"Seeded {len(vacancies)} Internships.")

        # 5. Candidate Mapping (subsystem coordinate details)
        for cand in candidates:
            cand_map = CandidateMapping(
                mapping_id=uuid.uuid4(),
                capvia_candidate_uuid=cand.id,
                ats_user_uuid=cand.id,
                simulation_candidate_id=random.randint(2000, 9999),
                interview_candidate_uuid=cand.id
            )
            session.add(cand_map)
        await session.flush()

        # 6. Vacancy Mapping
        for vac, sim_id in vacancies:
            vac_map = VacancyMapping(
                mapping_id=uuid.uuid4(),
                capvia_vacancy_uuid=vac.id,
                ats_jd_uuid=vac.id,
                simulation_internship_id=sim_id
            )
            session.add(vac_map)
        await session.flush()
        print("Candidate and Vacancy mappings initialized.")

        # 7. Seed Applications (Diverse Statuses and Scores)
        apps_configs = [
            {"candidate": candidates[0], "vacancy": vacancies[0][0], "status": ApplicationStatus.HIRED, "stage": StageName.INTERVIEW, "ats": 85.0, "sim": 88.0, "int_ans": 92, "int_integrity": 95}, # Arjun (Hired)
            {"candidate": candidates[1], "vacancy": vacancies[1][0], "status": ApplicationStatus.EVALUATED, "stage": StageName.INTERVIEW, "ats": 72.5, "sim": 65.0, "int_ans": 74, "int_integrity": 85}, # Rohan (Evaluated)
            {"candidate": candidates[2], "vacancy": vacancies[2][0], "status": ApplicationStatus.ATS_COMPLETED, "stage": StageName.SIMULATION, "ats": 65.0, "sim": None, "int_ans": None, "int_integrity": None}, # Priya (ATS completed)
            {"candidate": candidates[3], "vacancy": vacancies[1][0], "status": ApplicationStatus.SHORTLISTED, "stage": StageName.INTERVIEW, "ats": 94.0, "sim": 92.5, "int_ans": 88, "int_integrity": 99}, # Anita (Shortlisted)
            {"candidate": candidates[4], "vacancy": vacancies[0][0], "status": ApplicationStatus.REJECTED, "stage": StageName.ATS, "ats": 35.0, "sim": None, "int_ans": None, "int_integrity": None}, # Kabir (Rejected)
            {"candidate": candidates[0], "vacancy": vacancies[1][0], "status": ApplicationStatus.SIMULATION_INVITED, "stage": StageName.SIMULATION, "ats": 78.0, "sim": None, "int_ans": None, "int_integrity": None}, # Arjun (Invited)
            {"candidate": candidates[1], "vacancy": vacancies[3][0], "status": ApplicationStatus.INTERVIEW_INVITED, "stage": StageName.INTERVIEW, "ats": 81.0, "sim": 76.5, "int_ans": None, "int_integrity": None}, # Rohan (Interview Invited)
            {"candidate": candidates[2], "vacancy": vacancies[4][0], "status": ApplicationStatus.EVALUATED_LOCAL_BASELINE, "stage": StageName.INTERVIEW, "ats": 79.5, "sim": 80.0, "int_ans": 82, "int_integrity": 90}, # Priya (Evaluated Offline)
            {"candidate": candidates[5], "vacancy": vacancies[1][0], "status": ApplicationStatus.HIRED, "stage": StageName.INTERVIEW, "ats": 88.5, "sim": 91.0, "int_ans": 87, "int_integrity": 94}, # Jawad (Hired - ML Intern)
            {"candidate": candidates[5], "vacancy": vacancies[4][0], "status": ApplicationStatus.SIMULATION_INVITED, "stage": StageName.SIMULATION, "ats": 79.0, "sim": None, "int_ans": None, "int_integrity": None}, # Jawad (Invited - Data Scientist)
            {"candidate": candidates[5], "vacancy": vacancies[0][0], "status": ApplicationStatus.APPLIED, "stage": StageName.ATS, "ats": 0.0, "sim": None, "int_ans": None, "int_integrity": None} # Jawad (Applied - Backend)
        ]

        print("Generating Applications, mappings, results, events, and reports...")
        for cfg in apps_configs:
            cand = cfg["candidate"]
            vac = cfg["vacancy"]
            status = cfg["status"]
            stage = cfg["stage"]

            app = Application(
                id=uuid.uuid4(),
                candidate_id=cand.id,
                vacancy_id=vac.id,
                status=status,
                current_stage=stage,
                cover_letter=f"Hello, I am excited to apply for the {vac.title} role at {vac.company.name}. I have matching projects and skills.",
                resume_url="https://capvia-resumes.storage.googleapis.com/resume.pdf",
                hired_at=datetime.utcnow() if status == ApplicationStatus.HIRED else None,
                rejection_reason="Recruiter review finalized." if status == ApplicationStatus.REJECTED else None
            )
            session.add(app)
            await session.flush()

            # Create events
            events_to_create = [
                ("APPLICATION_SUBMITTED", None, "APPLIED"),
            ]
            if status != ApplicationStatus.APPLIED:
                events_to_create.append(("STATUS_UPDATED_ATS_PENDING", "APPLIED", "ATS_PENDING"))
                events_to_create.append(("STATUS_UPDATED_ATS_COMPLETED", "ATS_PENDING", "ATS_COMPLETED"))
            
            if status in [ApplicationStatus.SIMULATION_INVITED, ApplicationStatus.SIMULATION_IN_PROGRESS, ApplicationStatus.SIMULATION_COMPLETED, ApplicationStatus.INTERVIEW_INVITED, ApplicationStatus.INTERVIEW_IN_PROGRESS, ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.EVALUATED, ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED, ApplicationStatus.REJECTED]:
                events_to_create.append(("STATUS_UPDATED_SIMULATION_INVITED", "ATS_COMPLETED", "SIMULATION_INVITED"))
            if status in [ApplicationStatus.SIMULATION_COMPLETED, ApplicationStatus.INTERVIEW_INVITED, ApplicationStatus.INTERVIEW_IN_PROGRESS, ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.EVALUATED, ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED]:
                events_to_create.append(("STATUS_UPDATED_SIMULATION_COMPLETED", "SIMULATION_INVITED", "SIMULATION_COMPLETED"))
                events_to_create.append(("STATUS_UPDATED_INTERVIEW_INVITED", "SIMULATION_COMPLETED", "INTERVIEW_INVITED"))
            if status in [ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.EVALUATED, ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED]:
                events_to_create.append(("STATUS_UPDATED_INTERVIEW_COMPLETED", "INTERVIEW_INVITED", "INTERVIEW_COMPLETED"))
            if status == ApplicationStatus.EVALUATED:
                events_to_create.append(("STATUS_UPDATED_EVALUATED", "INTERVIEW_COMPLETED", "EVALUATED"))
            if status == ApplicationStatus.EVALUATED_LOCAL_BASELINE:
                events_to_create.append(("STATUS_UPDATED_EVALUATED_LOCAL_BASELINE", "INTERVIEW_COMPLETED", "EVALUATED_LOCAL_BASELINE"))
            if status == ApplicationStatus.SHORTLISTED:
                events_to_create.append(("STATUS_UPDATED_SHORTLISTED", "EVALUATED", "SHORTLISTED"))
            if status == ApplicationStatus.HIRED:
                events_to_create.append(("STATUS_UPDATED_HIRED", "SHORTLISTED", "HIRED"))
            if status == ApplicationStatus.REJECTED:
                events_to_create.append(("STATUS_UPDATED_REJECTED", "ATS_COMPLETED", "REJECTED"))

            for idx, (ev_type, from_s, to_s) in enumerate(events_to_create):
                event = ApplicationEvent(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    event_type=ev_type,
                    from_status=from_s,
                    to_status=to_s,
                    actor_role="SYSTEM" if idx > 0 else "STUDENT",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=len(events_to_create) - idx)
                )
                session.add(event)

            # Application Mapping Score Cache
            resume_uuid = uuid.uuid4()
            session_uuid = uuid.uuid4()
            app_map = ApplicationMapping(
                mapping_id=uuid.uuid4(),
                application_id=app.id,
                ats_resume_uuid=resume_uuid,
                simulation_attempt_id=random.randint(100, 999) if cfg["sim"] else None,
                simulation_application_id=random.randint(1000, 9999) if cfg["sim"] else None,
                interview_session_uuid=session_uuid if cfg["int_ans"] else None,
                ats_score=cfg["ats"],
                simulation_score=cfg["sim"],
                interview_answer_score_pct=cfg["int_ans"],
                interview_integrity_score=cfg["int_integrity"],
                combined_risk_level=RiskLevel.LOW if (cfg["int_integrity"] and cfg["int_integrity"] > 80) else (RiskLevel.HIGH if cfg["int_integrity"] else None)
            )
            session.add(app_map)

            # ATS result
            ats_res = ATSResult(
                id=uuid.uuid4(),
                application_id=app.id,
                overall_score=cfg["ats"],
                score_band="GOOD" if cfg["ats"] > 70 else ("REVIEW" if cfg["ats"] > 50 else "POOR"),
                detected_role=vac.title,
                role_confidence=0.85 + (random.random() * 0.1),
                matched_skills=vac.required_skills[:random.randint(1, len(vac.required_skills))],
                missing_skills=[s for s in vac.required_skills if s not in vac.required_skills[:random.randint(1, len(vac.required_skills))]],
                is_suspicious=False,
                fraud_probability=0.02,
                fraud_flags=[],
                raw_analysis={"experience": 80, "education": 90}
            )
            session.add(ats_res)

            # Simulation results
            if cfg["sim"] is not None:
                sim_res = SimulationResult(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    attempt_id=app_map.simulation_attempt_id,
                    total_score=cfg["sim"],
                    recommendation="hire" if cfg["sim"] > 70 else "consider",
                    cheating_risk_level=RiskLevel.LOW,
                    ai_dependency_score=0.15,
                    round_scores={"round_1": cfg["sim"] + 2.0, "round_2": cfg["sim"] - 2.0},
                    submitted_at=datetime.now(timezone.utc) - timedelta(days=1)
                )
                session.add(sim_res)

            # Interview results & integrity
            if cfg["int_ans"] is not None:
                int_res = InterviewResult(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    session_id=session_uuid,
                    overall_answer_score_pct=cfg["int_ans"],
                    overall_integrity_score=cfg["int_integrity"],
                    cheating_probability_pct=100 - cfg["int_integrity"],
                    risk_level=RiskLevel.LOW if cfg["int_integrity"] > 80 else RiskLevel.MEDIUM,
                    recommendation=RecommendationType.STRONG_HIRE if cfg["int_ans"] > 85 else RecommendationType.CONSIDER,
                    video_url="https://storage.googleapis.com/capvia-interview-videos/s8r7q6p5.webm",
                    baselined_locally=False,
                    strengths=["Strong concept understanding", "Clear communication"],
                    improvements=["Provide more detailed project architectures"],
                    raw_report={"nlp_score": 0.8}
                )
                session.add(int_res)

                integrity_res = IntegrityResult(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    focus_percentage=cfg["int_integrity"],
                    look_away_count=2,
                    head_stability_pct=95,
                    head_movements_count=1,
                    face_visibility_pct=100,
                    face_absences_count=0,
                    multi_face_events=0,
                    phone_detections_count=0,
                    tab_switches=0,
                    copy_pastes=0,
                    suspicious_keys=0,
                    violations=[]
                )
                session.add(integrity_res)

            # DNA Profile
            if cfg["ats"] is not None:
                dna_res = DNAProfile(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    technical_alignment=cfg["ats"],
                    project_alignment=cfg["sim"] if cfg["sim"] else 60.0,
                    experience_alignment=75.0,
                    domain_alignment=cfg["ats"] + 2.0,
                    semantic_match_strength=cfg["ats"] - 2.0,
                    readability=90.0,
                    clarity=85.0,
                    ats_compatibility=88.0,
                    technical_depth=cfg["sim"] if cfg["sim"] else 70.0,
                    practical_exposure=75.0,
                    internship_readiness=82.0,
                    hiring_readiness_score=80.0,
                    capability_score=(cfg["ats"] + (cfg["sim"] or 60.0) + (cfg["int_ans"] or 60.0)) / 3,
                    candidate_level="JUNIOR_DEVELOPER" if cfg["ats"] > 70 else "INTERN"
                )
                session.add(dna_res)

            # Rankings & Recruiter Report
            if status in [ApplicationStatus.EVALUATED, ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED]:
                ranking_score = (cfg["ats"] + cfg["sim"] + cfg["int_ans"]) / 3
                rank_item = Ranking(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    internship_id=vac.id,
                    score=ranking_score,
                    rank=random.randint(1, 3)
                )
                session.add(rank_item)

                report_item = Report(
                    id=uuid.uuid4(),
                    application_id=app.id,
                    summary=f"Strong technical alignment and assessment scores. Candidate {cand.full_name} demonstrates solid execution and domain capability fit.",
                    strengths=["Domain terminology mastery", "Strong algorithm design capabilities"],
                    weaknesses=["Could expand further on cloud systems deployment"],
                    recommendations=["Advance to final reviews"],
                    pdf_url=f"https://storage.googleapis.com/capvia-reports/{cand.full_name.lower().replace(' ', '_')}_report.pdf"
                )
                session.add(report_item)

            # Log Audit log
            activity = ActivityLog(
                id=uuid.uuid4(),
                user_id=cand.id,
                action="SUBMITTED_APPLICATION",
                description=f"Candidate {cand.full_name} submitted application for {vac.title}.",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
            )
            session.add(activity)

            # Notification
            notif = Notification(
                id=uuid.uuid4(),
                user_id=cand.id,
                title="Application Status Updated",
                message=f"Your application status for '{vac.title}' is now {status.value}."
            )
            session.add(notif)

        await session.commit()
        print("Database transaction successfully processed and committed.")
        print("Detailed Multi-Company & Multi-JD platform seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
