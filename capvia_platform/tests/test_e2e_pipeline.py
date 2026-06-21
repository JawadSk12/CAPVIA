import os
import uuid
import asyncio
import pytest
from datetime import datetime, timezone
from sqlalchemy import select, text
from fastapi.responses import FileResponse
from unittest.mock import AsyncMock, patch

# Setup environment variables before importing capvia modules
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db")
os.environ.setdefault("SECRET_KEY", "test_secret_for_e2e_pipeline")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("REDIS_URL", "")

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType,
    User, Company, Internship, Application, ApplicationMapping,
    ATSResult, SimulationResult, InterviewResult, IntegrityResult,
    DNAProfile, Ranking, Report, ActivityLog, UserRole, Notification,
    ApplicationEvent
)
from capvia_platform.services.application_service import ApplicationService
from capvia_platform.services.report_service import ReportService
from capvia_platform.webhooks.ats_webhooks import handle_ats_processed_webhook
from capvia_platform.webhooks.simulation_webhooks import handle_simulation_submitted_webhook
from capvia_platform.webhooks.interview_webhooks import handle_interview_evaluated_webhook
from capvia_platform.routers.reports import generate_report, download_report_pdf
from capvia_platform.schemas.schemas import ReportGenerateRequest

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


@patch("capvia_platform.services.ats_connector.ats_connector.upload_resume")
@patch("capvia_platform.services.ats_connector.ats_connector.compare_resume")
@patch("capvia_platform.services.ats_connector.ats_connector.get_comparison_result")
@patch("capvia_platform.services.ats_connector.ats_connector.get_dna_graph")
@patch("capvia_platform.services.simulation_connector.simulation_connector.register_internship")
@patch("capvia_platform.services.simulation_connector.simulation_connector.register_candidate")
@patch("capvia_platform.services.simulation_connector.simulation_connector.get_evaluation_report")
def test_complete_e2e_recruitment_flow(
    mock_get_report,
    mock_register_candidate,
    mock_register_internship,
    mock_get_dna,
    mock_get_comparison,
    mock_compare,
    mock_upload
):
    """
    Executes a complete E2E recruitment flow:
    Candidate Apply -> ATS -> Simulation -> Interview -> Integrity -> DNA -> Ranking -> Report
    """
    # Configure mocks
    mock_upload.return_value = str(uuid.uuid4())
    mock_compare.return_value = {"status": "PROCESSING"}
    mock_get_comparison.return_value = {
        "overall_score": 85.0,
        "score_band": "EXCELLENT",
        "is_suspicious": False,
        "required_skills_analysis": {"matches": [{"target": "Python"}], "gaps": []},
        "preferred_skills_analysis": {"matches": [], "gaps": []},
        "ai_confidence": 0.9
    }
    mock_get_dna.return_value = {
        "role_match": {
            "technical_alignment": 85.0,
            "project_alignment": 80.0,
            "experience_alignment": 75.0,
            "domain_alignment": 70.0,
            "semantic_match_strength": 80.0
        },
        "resume_quality": {"readability": 80.0, "clarity": 85.0, "ats_compatibility": 95.0},
        "skill_intelligence": {"technical_depth": 80.0, "practical_exposure": 75.0},
        "readiness_intelligence": {"internship_readiness": 85.0, "hiring_readiness_score": 80.0},
        "overall": {"capability_score": 85.0, "candidate_level": "JUNIOR_DEVELOPER"}
    }
    mock_register_internship.return_value = 9841
    mock_register_candidate.return_value = {
        "simulation_candidate_id": 2510,
        "simulation_application_id": 9841
    }
    mock_get_report.return_value = {
        "total_score": 88.5,
        "round_scores": {"round_1": 85.0, "round_2": 92.0},
        "cheating_risk_level": "LOW",
        "ai_dependency_score": 0.15,
        "recommendation": "hire",
        "submitted_at": "2026-06-21T12:00:00Z"
    }

    async def run_flow():
        async with AsyncSessionFactory() as db:
            # 1. Setup Candidate
            candidate = User(
                id=uuid.uuid4(),
                email="john.doe@candidate.com",
                full_name="John Doe",
                password_hash="hashed_pass",
                role=UserRole.STUDENT
            )
            db.add(candidate)
            
            # 2. Setup HR Recruiter
            hr_user = User(
                id=uuid.uuid4(),
                email="jane.hr@recruiter.com",
                full_name="Jane HR",
                password_hash="hashed_pass",
                role=UserRole.HR
            )
            db.add(hr_user)
            await db.flush()

            # 3. Setup Company and Internship
            company = Company(id=uuid.uuid4(), name="Capvia AI Corp", is_verified=True)
            db.add(company)
            await db.flush()

            internship = Internship(
                id=uuid.uuid4(),
                company_id=company.id,
                title="AI Platform Engineer Intern",
                description="Looking for an outstanding developer.",
                required_skills=["Python", "PyTorch", "SQL"],
                status="PUBLISHED",
                company=company
            )
            db.add(internship)
            await db.flush()
            await db.commit()

        # Step 1: Candidate Applies
        with patch("capvia_platform.tasks.ats_tasks.process_ats_stage", new_callable=AsyncMock):
            async with AsyncSessionFactory() as db:
                app_response = await ApplicationService.apply(
                    db,
                    internship_id=internship.id,
                    current_user=candidate,
                    cover_letter="I am very excited to join the AI engineering team.",
                    resume_url="http://storage.capvia.com/resumes/john_doe.pdf"
                )
                app_id = uuid.UUID(app_response["id"])
                await db.commit()

        # Trigger the ATS process task synchronously
        from capvia_platform.tasks.ats_tasks import process_ats_stage
        await process_ats_stage(app_id)

        # Verify DB: Application is ATS_PENDING
        async with AsyncSessionFactory() as db:
            app_rec = await db.get(Application, app_id)
            assert app_rec.status == ApplicationStatus.ATS_PENDING
            
            events = (await db.execute(select(ApplicationEvent).where(ApplicationEvent.application_id == app_id))).scalars().all()
            assert len(events) == 2
            assert any(e.to_status == "ATS_PENDING" for e in events)

            notifs = (await db.execute(select(Notification).where(Notification.user_id == candidate.id))).scalars().all()
            assert len(notifs) == 2

        # Step 2: ATS Process Webhook Scored (Overall Score: 85%) -> Qualifies
        async with AsyncSessionFactory() as db:
            stmt = select(ApplicationMapping).where(ApplicationMapping.application_id == app_id)
            res_mapping = await db.execute(stmt)
            mapping_rec = res_mapping.scalar_one()
            resume_uuid = mapping_rec.ats_resume_uuid

            ats_payload = {
                "event": "ATS_PROCESSED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "application_id": str(app_id),
                    "resume_id": str(resume_uuid),
                    "jd_id": str(internship.id),
                    "status": "SUCCESS",
                    "overall_ats_score": 85.0,
                    "score_band": "EXCELLENT",
                    "is_suspicious": False
                }
            }
            
            with patch("capvia_platform.tasks.simulation_tasks.register_candidate_for_simulation_task", new_callable=AsyncMock):
                res = await handle_ats_processed_webhook(db, ats_payload["data"])
                assert res.get("success") is True
                await db.commit()

        # Trigger simulation registration task synchronously
        from capvia_platform.tasks.simulation_tasks import register_candidate_for_simulation_task
        await register_candidate_for_simulation_task(app_id)

        # Verify DB: Application state is SIMULATION_INVITED & ATSResult created
        async with AsyncSessionFactory() as db:
            app_rec = await db.get(Application, app_id)
            assert app_rec.status == ApplicationStatus.SIMULATION_INVITED
            
            ats_res = (await db.execute(select(ATSResult).where(ATSResult.application_id == app_id))).scalar_one_or_none()
            assert ats_res is not None
            assert ats_res.overall_score == 85.0
            assert ats_res.score_band == "EXCELLENT"

        # Step 3: Candidate starts & submits Coding Simulation (Score: 88.5%)
        # Pre-populate application mappings and sync attempt
        async with AsyncSessionFactory() as db:
            stmt = select(ApplicationMapping).where(ApplicationMapping.application_id == app_id)
            res_mapping = await db.execute(stmt)
            app_map = res_mapping.scalar_one()
            app_map.simulation_attempt_id = 4242

            # Update application status to Simulation In Progress
            app_rec = await db.get(Application, app_id)
            app_rec.status = ApplicationStatus.SIMULATION_IN_PROGRESS
            await db.commit()

        # Trigger Simulation Webhook
        async with AsyncSessionFactory() as db:
            sim_payload = {
                "event": "SIMULATION_SUBMITTED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "application_id": str(app_id),
                    "attempt_id": 4242,
                    "total_score": 88.5,
                    "cheating_risk_level": "LOW",
                    "ai_dependency_score": 0.15,
                    "recommendation": "hire"
                }
            }
            res = await handle_simulation_submitted_webhook(db, sim_payload["data"])
            assert res.get("success") is True
            await db.commit()

        # Verify DB: Application is INTERVIEW_INVITED & SimulationResult created
        async with AsyncSessionFactory() as db:
            app_rec = await db.get(Application, app_id)
            assert app_rec.status == ApplicationStatus.INTERVIEW_INVITED
            
            sim_res = (await db.execute(select(SimulationResult).where(SimulationResult.application_id == app_id))).scalar_one_or_none()
            assert sim_res is not None
            assert sim_res.total_score == 88.5
            assert sim_res.cheating_risk_level == RiskLevel.LOW

        # Step 4: Candidate completes AI Video Interview -> Scored
        # Candidate starts interview (transitions to INTERVIEW_IN_PROGRESS)
        async with AsyncSessionFactory() as db:
            app_rec = await db.get(Application, app_id)
            app_rec.status = ApplicationStatus.INTERVIEW_IN_PROGRESS
            await db.commit()

        # Trigger Interview Webhook (auto-triggers Integrity, DNA, and Ranking engines!)
        async with AsyncSessionFactory() as db:
            iv_payload = {
                "event": "INTERVIEW_EVALUATED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "application_id": str(app_id),
                    "session_id": str(uuid.uuid4()),
                    "overall_answer_score_pct": 82,
                    "overall_integrity_score": 95,
                    "cheating_probability_pct": 5,
                    "risk_level": "LOW",
                    "recommendation": "Strong Hire",
                    "video_url": "https://storage.capvia.com/videos/test.webm",
                    "integrity_details": {
                        "focus_percentage": 98,
                        "look_away_count": 1,
                        "head_stability_pct": 99,
                        "face_visibility_pct": 100,
                        "phone_detections_count": 0,
                        "tab_switches": 0,
                        "copy_pastes": 0,
                        "suspicious_keys": 0
                    }
                }
            }
            res = await handle_interview_evaluated_webhook(db, iv_payload["data"])
            assert res.get("success") is True
            await db.commit()

        # Verify DB: Application transitions to EVALUATED, and all sub-results exist
        async with AsyncSessionFactory() as db:
            app_rec = await db.get(Application, app_id)
            assert app_rec.status == ApplicationStatus.EVALUATED
            
            # Confirm InterviewResult
            iv_res = (await db.execute(select(InterviewResult).where(InterviewResult.application_id == app_id))).scalar_one_or_none()
            assert iv_res is not None
            assert iv_res.overall_answer_score_pct == 82
            
            # Confirm IntegrityResult (Trust Index calculation check)
            integ_res = (await db.execute(select(IntegrityResult).where(IntegrityResult.application_id == app_id))).scalar_one_or_none()
            assert integ_res is not None
            assert integ_res.trust_index is not None
            assert integ_res.trust_index > 0
            
            # Confirm DNAProfile (9 dimensions calculations check)
            dna = (await db.execute(select(DNAProfile).where(DNAProfile.application_id == app_id))).scalar_one_or_none()
            assert dna is not None
            assert dna.problem_solving > 0
            assert dna.communication > 0
            
            # Confirm Ranking (Composite final score leaderboard check)
            rank = (await db.execute(select(Ranking).where(Ranking.application_id == app_id))).scalar_one_or_none()
            assert rank is not None
            assert rank.final_score > 0
            assert rank.recommendation_tier in ["PLATINUM", "GOLD", "SILVER", "BRONZE", "UNRANKED"]

        # Step 5: Recruiter Generates Report PDF
        async with AsyncSessionFactory() as db:
            # Clean storage files first
            reports_dir = ReportService._get_storage_dir()
            for f in os.listdir(reports_dir):
                if f.startswith(str(app_id)):
                    os.remove(os.path.join(reports_dir, f))

            payload = ReportGenerateRequest(
                summary="Elite candidate with excellent programming capabilities and clean proctoring logs.",
                strengths=["Elite Problem Solving", "Strong communication and execution skills"],
                weaknesses=["None observed"],
                recommendations=["Hire immediately as AI Platform Engineer"]
            )
            report_res = await generate_report(
                application_id=str(app_id),
                payload=payload,
                current_user=hr_user,
                db=db
            )
            assert report_res is not None
            assert report_res.summary == "Elite candidate with excellent programming capabilities and clean proctoring logs."
            assert report_res.pdf_url == f"storage/reports/{app_id}_v1.pdf"
            assert os.path.exists(os.path.join(reports_dir, f"{app_id}_v1.pdf"))
            await db.commit()

        # Verify DB: Report table entry exists, ActivityLog generated for generate
        async with AsyncSessionFactory() as db:
            rep_entry = (await db.execute(select(Report).where(Report.application_id == app_id))).scalar_one_or_none()
            assert rep_entry is not None
            
            logs = (await db.execute(select(ActivityLog).where(ActivityLog.action == "GENERATE_REPORT"))).scalars().all()
            assert len(logs) == 1

        # Step 6: Recruiter downloads Report PDF
        # We can call the download_report API controller directly (using mock background tasks)
        class MockBackgroundTasks:
            def add_task(self, func, *args, **kwargs):
                # Run the task on the current event loop
                asyncio.create_task(func(*args, **kwargs))

        async with AsyncSessionFactory() as db:
            bg_tasks = MockBackgroundTasks()
            dl_res = await download_report_pdf(
                application_id=str(app_id),
                background_tasks=bg_tasks,
                current_user=hr_user,
                db=db
            )
            assert isinstance(dl_res, FileResponse)
            assert dl_res.path.endswith(f"{app_id}_v1.pdf")
            await db.commit()

        # Let background activity log tasks complete
        await asyncio.sleep(0.1)

        # Verify DB: ActivityLog generated for download
        async with AsyncSessionFactory() as db:
            logs = (await db.execute(select(ActivityLog).where(ActivityLog.action == "DOWNLOAD_REPORT"))).scalars().all()
            assert len(logs) == 1

            # Cleanup stored PDF file
            reports_dir = ReportService._get_storage_dir()
            pdf_path = os.path.join(reports_dir, f"{app_id}_v1.pdf")
            if os.path.exists(pdf_path):
                os.remove(pdf_path)

    run_async(run_flow())
