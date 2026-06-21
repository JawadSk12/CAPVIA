import os
import uuid
import asyncio
import pytest
from datetime import datetime, timezone
from sqlalchemy import text

# Setup environment variables before importing capvia modules
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db")
os.environ.setdefault("SECRET_KEY", "test_secret_for_report_engine")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("REDIS_URL", "")

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType,
    User, Company, Internship, Application,
    ATSResult, SimulationResult, InterviewResult, IntegrityResult,
    DNAProfile, Ranking, Report, ActivityLog, UserRole
)
from capvia_platform.services.report_service import ReportService
from capvia_platform.repositories.repositories import ReportRepository, ActivityLogRepository

def run_async(coro):
    async def wrapper():
        try:
            await coro
        finally:
            await engine.dispose()
    asyncio.run(wrapper())


@pytest.fixture(autouse=True)
def clean_database():
    async def run_clean():
        async with AsyncSessionFactory() as session:
            await session.execute(text(
                "TRUNCATE TABLE users, internships, applications, candidate_mappings, "
                "vacancy_mappings, application_mappings, ats_results, dna_profiles, rankings, "
                "simulation_results, notifications, company_members, companies, "
                "interview_results, integrity_results, reports, activity_logs CASCADE;"
            ))
            await session.commit()
    run_async(run_clean())
    yield


# ============================================================
# Helpers
# ============================================================

async def _create_test_candidate(db) -> User:
    u = User(
        id=uuid.uuid4(),
        email=f"candidate_{uuid.uuid4().hex[:6]}@capvia.com",
        full_name="John Doe",
        password_hash="password",
        role="STUDENT"
    )
    db.add(u)
    await db.flush()
    return u


async def _create_company_and_internship(db) -> tuple[Company, Internship]:
    company = Company(
        id=uuid.uuid4(),
        name=f"Google_{uuid.uuid4().hex[:4]}",
        is_verified=True
    )
    db.add(company)
    await db.flush()

    internship = Internship(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Software Engineering Intern",
        required_skills=["Python", "SQL"]
    )
    db.add(internship)
    await db.flush()
    return company, internship


async def _attach_all_results(db, app: Application) -> None:
    ats = ATSResult(
        application_id=app.id,
        overall_score=85.0,
        score_band="EXCELLENT",
        detected_role="Software Engineer",
        role_confidence=0.92,
        matched_skills=["Python", "SQL"],
        missing_skills=["Docker"],
        is_suspicious=False,
        fraud_probability=0.01,
        fraud_flags=[],
        raw_analysis={}
    )
    sim = SimulationResult(
        application_id=app.id,
        attempt_id=int(uuid.uuid4().int % 10_000_000),
        total_score=88.0,
        recommendation="hire",
        cheating_risk_level=RiskLevel.LOW,
        ai_dependency_score=0.08,
        round_scores={"Round 1": 88.0},
        submitted_at=datetime.now(timezone.utc)
    )
    iv = InterviewResult(
        application_id=app.id,
        session_id=uuid.uuid4(),
        overall_answer_score_pct=82,
        overall_integrity_score=94,
        cheating_probability_pct=2,
        risk_level=RiskLevel.LOW,
        recommendation=RecommendationType.STRONG_HIRE,
        video_url="http://storage.capvia.com/john_doe.webm",
        strengths=["Clear logic", "Structured communication"],
        improvements=["Speak a bit slower"],
        raw_report={}
    )
    ir = IntegrityResult(
        application_id=app.id,
        focus_percentage=98,
        look_away_count=1,
        head_stability_pct=99,
        head_movements_count=2,
        face_visibility_pct=100,
        face_absences_count=0,
        multi_face_events=0,
        phone_detections_count=0,
        tab_switches=0,
        copy_pastes=0,
        suspicious_keys=0,
        violations=[],
        trust_index=96,
        compiled_risk_level="LOW",
        confidence_level=0.98
    )
    dna = DNAProfile(
        application_id=app.id,
        technical_alignment=85.0,
        project_alignment=80.0,
        experience_alignment=75.0,
        domain_alignment=85.0,
        semantic_match_strength=80.0,
        readability=90.0,
        clarity=90.0,
        ats_compatibility=85.0,
        technical_depth=80.0,
        practical_exposure=75.0,
        internship_readiness=85.0,
        hiring_readiness_score=85.0,
        capability_score=85.0,
        candidate_level="Mid",
        problem_solving=85,
        execution=90,
        communication=82,
        learning_ability=88,
        adaptability=80,
        consistency=88,
        confidence=85,
        role_fit=85,
        leadership_potential=75
    )
    ranking = Ranking(
        application_id=app.id,
        internship_id=app.vacancy_id,
        final_score=90.0,
        ats_component=21.25,
        simulation_component=26.4,
        interview_component=20.5,
        integrity_component=19.2,
        ats_raw_score=85.0,
        simulation_raw_score=88.0,
        interview_raw_score=82.0,
        integrity_raw_score=96.0,
        internship_rank=1,
        company_rank=1,
        global_percentile=98.5,
        is_top_candidate=True,
        recommendation_tier="PLATINUM",
        data_completeness=1.0,
        explainability={"summary": "Excellent"},
        score_breakdown={},
        ranking_analytics={},
        audit_trail=[]
    )
    db.add_all([ats, sim, iv, ir, dna, ranking])
    await db.flush()


# ============================================================
# Tests
# ============================================================

def test_generate_report_data():
    """Verifies that generate_report_data fetches all context fields correctly."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            
            app = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app)
            await db.flush()
            await _attach_all_results(db, app)
            await db.commit()

            context = await ReportService.generate_report_data(db, app.id)
            assert context["candidate_name"] == "John Doe"
            assert context["candidate_email"] == candidate.email
            assert context["vacancy_title"] == "Software Engineering Intern"
            assert context["company_name"].startswith("Google")
            assert context["ats_result"].overall_score == 85.0
            assert context["ranking"].final_score == 90.0
            assert context["dna_profile"].problem_solving == 85
            assert context["integrity_result"].trust_index == 96

    run_async(run())


def test_compile_default_metadata():
    """Verifies the heuristic default compiler output."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            
            app = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app)
            await db.flush()
            await _attach_all_results(db, app)
            await db.commit()

            context = await ReportService.generate_report_data(db, app.id)
            summary, strengths, weaknesses, recommendations = (
                ReportService.compile_default_metadata(context)
            )

            assert "elite candidate" in summary
            assert len(strengths) >= 2
            assert any("Docker" in w for w in weaknesses)
            assert any("fast-track" in r.lower() for r in recommendations)

    run_async(run())


def test_build_pdf_report():
    """Verifies PDF document generation output signature."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            
            app = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app)
            await db.flush()
            await _attach_all_results(db, app)
            await db.commit()

            context = await ReportService.generate_report_data(db, app.id)
            summary, strengths, weaknesses, recommendations = (
                ReportService.compile_default_metadata(context)
            )
            context["summary"] = summary
            context["strengths"] = strengths
            context["weaknesses"] = weaknesses
            context["recommendations"] = recommendations

            pdf_bytes = ReportService.build_pdf_report(context, version=1)
            assert pdf_bytes is not None
            assert len(pdf_bytes) > 1000
            # A valid PDF starts with %PDF signature
            assert pdf_bytes[:4] == b"%PDF"

    run_async(run())


def test_save_report_and_versioning():
    """Verifies storage file writing, DB insertion, and version increments."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            
            app = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app)
            await db.flush()
            await _attach_all_results(db, app)
            await db.commit()

            # Clean existing PDFs for this app if any (should be clean due to DB truncate, but good practice)
            reports_dir = ReportService._get_storage_dir()
            for f in os.listdir(reports_dir):
                if f.startswith(str(app.id)):
                    os.remove(os.path.join(reports_dir, f))

            context = await ReportService.generate_report_data(db, app.id)
            summary, strengths, weaknesses, recommendations = (
                ReportService.compile_default_metadata(context)
            )
            context["summary"] = summary
            context["strengths"] = strengths
            context["weaknesses"] = weaknesses
            context["recommendations"] = recommendations

            v1_bytes = ReportService.build_pdf_report(context, version=1)
            
            # Save Version 1
            report1 = await ReportService.save_report(
                db=db,
                application_id=app.id,
                summary=summary,
                strengths=strengths,
                weaknesses=weaknesses,
                recommendations=recommendations,
                pdf_bytes=v1_bytes,
                version=1,
                actor_id=candidate.id
            )
            await db.commit()

            assert report1.pdf_url == f"storage/reports/{app.id}_v1.pdf"
            assert os.path.exists(os.path.join(reports_dir, f"{app.id}_v1.pdf"))

            # Save Version 2
            v2_bytes = ReportService.build_pdf_report(context, version=2)
            next_version = ReportService.resolve_next_version(app.id)
            assert next_version == 2

            report2 = await ReportService.save_report(
                db=db,
                application_id=app.id,
                summary=summary,
                strengths=strengths,
                weaknesses=weaknesses,
                recommendations=recommendations,
                pdf_bytes=v2_bytes,
                version=2,
                actor_id=candidate.id
            )
            await db.commit()

            assert report2.pdf_url == f"storage/reports/{app.id}_v2.pdf"
            assert os.path.exists(os.path.join(reports_dir, f"{app.id}_v2.pdf"))

            # Assert DB record updated and didn't insert a duplicate row
            repo = ReportRepository()
            count_stmt = text(f"SELECT COUNT(*) FROM reports WHERE application_id = '{app.id}'")
            res = await db.execute(count_stmt)
            count = res.scalar()
            assert count == 1

            # Cleanup files
            os.remove(os.path.join(reports_dir, f"{app.id}_v1.pdf"))
            os.remove(os.path.join(reports_dir, f"{app.id}_v2.pdf"))

    run_async(run())


def test_activity_logs_on_report():
    """Verifies custom logs record generation events."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            app = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app)
            await db.flush()
            await _attach_all_results(db, app)
            await db.commit()

            context = await ReportService.generate_report_data(db, app.id)
            summary, strengths, weaknesses, recommendations = (
                ReportService.compile_default_metadata(context)
            )
            context["summary"] = summary
            context["strengths"] = strengths
            context["weaknesses"] = weaknesses
            context["recommendations"] = recommendations

            pdf_bytes = ReportService.build_pdf_report(context, version=1)

            # Save report triggers log inside save_report
            await ReportService.save_report(
                db=db,
                application_id=app.id,
                summary=summary,
                strengths=strengths,
                weaknesses=weaknesses,
                recommendations=recommendations,
                pdf_bytes=pdf_bytes,
                version=1,
                actor_id=candidate.id
            )
            await db.commit()

            # Retrieve logs
            log_stmt = text("SELECT action, description, user_id FROM activity_logs")
            logs_res = await db.execute(log_stmt)
            logs = logs_res.all()
            assert len(logs) == 1
            assert logs[0].action == "GENERATE_REPORT"
            assert str(candidate.id) in str(logs[0].user_id)

            # Cleanup file
            reports_dir = ReportService._get_storage_dir()
            filename = f"{app.id}_v1.pdf"
            if os.path.exists(os.path.join(reports_dir, filename)):
                os.remove(os.path.join(reports_dir, filename))

    run_async(run())


# ============================================================
# Router API Tests
# ============================================================

from capvia_platform.routers.reports import generate_report, get_report_metadata, download_report_pdf
from fastapi import BackgroundTasks
from capvia_platform.core.exceptions import AuthorizationException

def test_router_generate_report():
    """Verifies generating report via router function directly (HR role)."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            app_rec = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app_rec)
            await db.flush()
            await _attach_all_results(db, app_rec)
            
            # Create HR User
            hr_user = User(
                id=uuid.uuid4(),
                email="hr@capvia.com",
                full_name="Recruiter Jane",
                password_hash="pass",
                role="HR"
            )
            db.add(hr_user)
            await db.commit()
            
            # Clean storage files first
            reports_dir = ReportService._get_storage_dir()
            for f in os.listdir(reports_dir):
                if f.startswith(str(app_rec.id)):
                    os.remove(os.path.join(reports_dir, f))

            from capvia_platform.schemas.schemas import ReportGenerateRequest
            payload = ReportGenerateRequest(
                summary="Custom Recruiter Summary",
                strengths=["Strong engineering skills"],
                weaknesses=["None"],
                recommendations=["Hire immediately"]
            )

            res = await generate_report(
                application_id=str(app_rec.id),
                payload=payload,
                current_user=hr_user,
                db=db
            )
            assert res is not None
            assert res.summary == "Custom Recruiter Summary"
            assert res.strengths == ["Strong engineering skills"]
            assert res.pdf_url == f"storage/reports/{app_rec.id}_v1.pdf"
            assert os.path.exists(os.path.join(reports_dir, f"{app_rec.id}_v1.pdf"))

            # Cleanup
            os.remove(os.path.join(reports_dir, f"{app_rec.id}_v1.pdf"))

    run_async(run())


def test_router_generate_report_candidate_denied():
    """Verifies that candidates are forbidden from generating reports."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            app_rec = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app_rec)
            await db.commit()
            
            from capvia_platform.core.exceptions import AuthorizationException
            with pytest.raises(AuthorizationException):
                await generate_report(
                    application_id=str(app_rec.id),
                    payload=None,
                    current_user=candidate,
                    db=db
                )

    run_async(run())


def test_router_get_report_metadata():
    """Verifies that candidate can fetch their own report metadata, but not others."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate_a = await _create_test_candidate(db)
            candidate_b = User(
                id=uuid.uuid4(),
                email="candidate_b@capvia.com",
                full_name="Bob Smith",
                password_hash="pass",
                role="STUDENT"
            )
            db.add(candidate_b)
            _, internship = await _create_company_and_internship(db)
            
            app_a = Application(
                id=uuid.uuid4(),
                candidate_id=candidate_a.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app_a)
            await db.flush()
            
            # Add mock report for Candidate A
            report_a = Report(
                application_id=app_a.id,
                summary="Candidate A report summary",
                strengths=["Strength"],
                weaknesses=["Weakness"],
                recommendations=["Rec"],
                pdf_url=f"storage/reports/{app_a.id}_v1.pdf"
            )
            db.add(report_a)
            await db.commit()

            # Test 1: Candidate A retrieves own metadata -> Success
            res = await get_report_metadata(application_id=str(app_a.id), current_user=candidate_a, db=db)
            assert res.summary == "Candidate A report summary"

            # Test 2: Candidate B retrieves Candidate A metadata -> Forbidden
            with pytest.raises(AuthorizationException):
                await get_report_metadata(application_id=str(app_a.id), current_user=candidate_b, db=db)

    run_async(run())


def test_router_download_report():
    """Verifies report PDF download and background download audit log entry."""
    async def run():
        async with AsyncSessionFactory() as db:
            candidate = await _create_test_candidate(db)
            _, internship = await _create_company_and_internship(db)
            app_rec = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.EVALUATED
            )
            db.add(app_rec)
            await db.flush()
            
            # Setup report record + write mock file to storage
            reports_dir = ReportService._get_storage_dir()
            filepath = os.path.join(reports_dir, f"{app_rec.id}_v1.pdf")
            with open(filepath, "wb") as f:
                f.write(b"%PDF-1.4 mock pdf data")
                
            report = Report(
                application_id=app_rec.id,
                summary="Candidate summary",
                strengths=[],
                weaknesses=[],
                recommendations=[],
                pdf_url=f"storage/reports/{app_rec.id}_v1.pdf"
            )
            db.add(report)
            await db.commit()

            from fastapi import BackgroundTasks
            bg_tasks = BackgroundTasks()

            # Trigger Download
            resp = await download_report_pdf(
                application_id=str(app_rec.id),
                background_tasks=bg_tasks,
                current_user=candidate,
                db=db
            )
            assert resp is not None
            assert resp.path == filepath
            assert resp.media_type == "application/pdf"

            # Run background tasks manually
            for task in bg_tasks.tasks:
                await task()
                
            # Assert ActivityLog written
            logs_res = await db.execute(
                text("SELECT action, user_id FROM activity_logs WHERE action = 'DOWNLOAD_REPORT'")
            )
            logs = logs_res.all()
            assert len(logs) == 1
            assert str(candidate.id) in str(logs[0].user_id)

            # Cleanup
            os.remove(filepath)

    run_async(run())
