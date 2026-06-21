import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.database.connection import get_db_session
from capvia_platform.models.models import (
    User, UserRole, Company, Internship, Application, ApplicationStatus, StageName,
    CandidateMapping, VacancyMapping, ApplicationMapping, RiskLevel,
    ATSResult, SimulationResult, InterviewResult, RecommendationType,
    IntegrityResult, DNAProfile, Ranking, Report, ActivityLog, Notification
)

async def seed_data():
    print("Initializing CAPVIA Database Seeding...")

    async with get_db_session() as session:
        # Check if already seeded to prevent duplicate records
        stmt = select(User).where(User.email == "candidate@example.com")
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            print("Database is already seeded. Skipping seed execution.")
            return

        # 1. Companies
        company = Company(
            id=uuid.uuid4(),
            name="Capvia AI",
            logo_url="https://capvia.ai/logo.png"
        )
        session.add(company)
        await session.flush()
        print(f"Seeded Company: {company.name} ({company.id})")

        # 2. Users (Candidate and Recruiter)
        candidate = User(
            id=uuid.uuid4(),
            email="candidate@example.com",
            password_hash="pbkdf2:sha256:260000$randomhash123",
            full_name="Arjun Kumar",
            role=UserRole.STUDENT,
            is_active=True
        )
        recruiter = User(
            id=uuid.uuid4(),
            email="hr@capvia.ai",
            password_hash="pbkdf2:sha256:260000$recruiterhash456",
            full_name="Jane Smith",
            role=UserRole.HR,
            is_active=True
        )
        session.add_all([candidate, recruiter])
        await session.flush()
        print(f"Seeded Users: Candidate {candidate.full_name}, Recruiter {recruiter.full_name}")

        # 3. Internship
        vacancy = Internship(
            id=uuid.uuid4(),
            company_id=company.id,
            title="Backend Developer",
            description="Develop robust async microservices with Python and FastAPI.",
            responsibilities=["Develop and train backend models", "Prepare database pipelines", "Optimize SQL queries"],
            required_skills=["Python", "SQL", "FastAPI"],
            technologies=["PostgreSQL", "Docker", "Git"],
            experience_level="ENTRY",
            is_active=True
        )
        session.add(vacancy)
        await session.flush()
        print(f"Seeded Internship: {vacancy.title} ({vacancy.id})")

        # 4. Application
        application = Application(
            id=uuid.uuid4(),
            candidate_id=candidate.id,
            vacancy_id=vacancy.id,
            status=ApplicationStatus.EVALUATED,
            current_stage=StageName.INTERVIEW
        )
        session.add(application)
        await session.flush()
        print(f"Seeded Application: Candidate {candidate.full_name} -> Vacancy {vacancy.title} ({application.id})")

        # 5. Candidate Mapping (UUID -> Simulation Integer ID / Subsystem IDs)
        candidate_map = CandidateMapping(
            mapping_id=uuid.uuid4(),
            capvia_candidate_uuid=candidate.id,
            ats_user_uuid=candidate.id,
            simulation_candidate_id=2510,
            interview_candidate_uuid=candidate.id
        )
        session.add(candidate_map)
        print("Seeded Candidate Mapping coordinate details")

        # 6. Vacancy Mapping
        vacancy_map = VacancyMapping(
            mapping_id=uuid.uuid4(),
            capvia_vacancy_uuid=vacancy.id,
            ats_jd_uuid=vacancy.id,
            simulation_internship_id=1
        )
        session.add(vacancy_map)
        print("Seeded Vacancy Mapping coordinate details")

        # 7. Application Mapping
        resume_uuid = uuid.uuid4()
        session_uuid = uuid.uuid4()
        
        app_map = ApplicationMapping(
            mapping_id=uuid.uuid4(),
            application_id=application.id,
            ats_resume_uuid=resume_uuid,
            simulation_attempt_id=42,
            simulation_application_id=9841,
            interview_session_uuid=session_uuid,
            ats_score=82.5,
            simulation_score=85.5,
            interview_answer_score_pct=78,
            interview_integrity_score=88,
            combined_risk_level=RiskLevel.LOW
        )
        session.add(app_map)
        print("Seeded Application Mapping scores cache details")

        # 8. ATS Result
        ats_result = ATSResult(
            id=uuid.uuid4(),
            application_id=application.id,
            overall_score=82.5,
            score_band="GOOD",
            detected_role="Backend Engineer",
            role_confidence=0.92,
            matched_skills=["Python", "SQL"],
            missing_skills=["FastAPI"],
            is_suspicious=False,
            fraud_probability=0.05,
            fraud_flags=[],
            raw_analysis={"dimensions": {"experience": 80, "skills": 85}}
        )
        session.add(ats_result)
        print("Seeded ATS parsing results")

        # 9. Simulation Result
        sim_result = SimulationResult(
            id=uuid.uuid4(),
            application_id=application.id,
            attempt_id=42,
            total_score=85.5,
            recommendation="hire",
            cheating_risk_level=RiskLevel.LOW,
            ai_dependency_score=0.12,
            round_scores={"round_1": 90.0, "round_2": 81.0},
            submitted_at=datetime.now(timezone.utc)
        )
        session.add(sim_result)
        print("Seeded AssessAI coding simulation details")

        # 10. Interview Result
        interview_result = InterviewResult(
            id=uuid.uuid4(),
            application_id=application.id,
            session_id=session_uuid,
            overall_answer_score_pct=78,
            overall_integrity_score=88,
            cheating_probability_pct=12,
            risk_level=RiskLevel.LOW,
            recommendation=RecommendationType.STRONG_HIRE,
            video_url="https://storage.googleapis.com/capvia-interview-videos/s8r7q6p5.webm",
            baselined_locally=False,
            strengths=["Excellent functional component structures explanation", "Strong active voice delivery"],
            improvements=["Mention hooks dependencies hooks cleanups"],
            raw_report={"nlp_keywords": ["React", "fastapi"], "sentiment": "positive"}
        )
        session.add(interview_result)
        print("Seeded Video Interview result evaluations details")

        # 11. Integrity Result
        integrity = IntegrityResult(
            id=uuid.uuid4(),
            application_id=application.id,
            focus_percentage=92,
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
        session.add(integrity)
        print("Seeded anti-cheat proctoring details")

        # 12. DNA Profile
        dna = DNAProfile(
            id=uuid.uuid4(),
            application_id=application.id,
            technical_alignment=82.5,
            project_alignment=78.0,
            experience_alignment=80.0,
            domain_alignment=85.0,
            semantic_match_strength=82.0,
            readability=90.0,
            clarity=85.0,
            ats_compatibility=85.0,
            technical_depth=84.0,
            practical_exposure=76.0,
            internship_readiness=85.0,
            hiring_readiness_score=81.0,
            capability_score=81.5,
            candidate_level="JUNIOR_DEVELOPER"
        )
        session.add(dna)
        print("Seeded Capability DNA profile scores")

        # 13. Rankings
        ranking = Ranking(
            id=uuid.uuid4(),
            application_id=application.id,
            internship_id=vacancy.id,
            score=82.5,
            rank=1
        )
        session.add(ranking)
        print("Seeded Internship rankings score cache")

        # 14. Report
        report = Report(
            id=uuid.uuid4(),
            application_id=application.id,
            summary="Strong candidate with high technical backend alignment, displaying robust software coding skills.",
            strengths=["Python data structures mastery", "FastAPI architecture"],
            weaknesses=["Docker containerization gaps"],
            recommendations=["Enroll in containerization training"],
            pdf_url="https://storage.googleapis.com/capvia-reports/arjun_report.pdf"
        )
        session.add(report)
        print("Seeded recruiter evaluation reports")

        # 15. Activity Log
        log = ActivityLog(
            id=uuid.uuid4(),
            user_id=candidate.id,
            action="COMPLETED_INTERVIEW",
            description="Candidate Arjun Kumar finished Video Interview stage.",
            ip_address="192.168.1.42",
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        )
        session.add(log)
        print("Seeded Activity log audit trails")

        # 16. Notification
        notification = Notification(
            id=uuid.uuid4(),
            user_id=candidate.id,
            title="Interview Completed",
            message="Your video interview has been successfully saved and scored. Recruiters will contact you shortly."
        )
        session.add(notification)
        print("Seeded User Notification details")

        # The context manager automatically commits on exit block
        print("Transaction successfully processed and committed.")
        print("CAPVIA Database Seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
