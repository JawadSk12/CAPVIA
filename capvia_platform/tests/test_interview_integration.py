import os
import uuid
import time
import pytest
import asyncio
import httpx
import random
import json
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

# Setup environment variables before imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db"
os.environ["SECRET_KEY"] = "test_secret_for_interview_integration"
os.environ["ALGORITHM"] = "HS256"
os.environ["REDIS_URL"] = ""  # Force local memory cache fallback in tests

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel, RecommendationType,
    User, Internship, Application, ApplicationMapping, InterviewResult, IntegrityResult, Notification, Company
)
from capvia_platform.utils.jwt import create_candidate_jwt, verify_candidate_jwt, create_system_jwt, verify_system_jwt
from capvia_platform.services.interview_connector import (
    InterviewConnector, CircuitBreaker, CircuitBreakerOpenException, InterviewConnectorException
)
from capvia_platform.repositories.interview_repository import InterviewRepository
from capvia_platform.tasks.interview_tasks import process_interview_evaluation_task
from capvia_platform.webhooks.interview_webhooks import handle_interview_evaluated_webhook
from capvia_platform.routers.interview import start_interview, save_interview_answer, complete_interview
from capvia_platform.schemas.schemas import StartInterviewRequest, SaveInterviewAnswerRequest
from capvia_platform.services.services import MappingService, RecruitmentProgressService

interview_repo = InterviewRepository()

def run_async_test(coro):
    """Runs a coroutine on a clean event loop and disposes the connection pool afterwards."""
    async def wrapper():
        try:
            await coro
        finally:
            await engine.dispose()
    asyncio.run(wrapper())

@pytest.fixture(autouse=True)
def clean_database():
    """Sync fixture that runs db truncation on a clean event loop and disposes the engine."""
    async def run_clean():
        async with AsyncSessionFactory() as session:
            await session.execute(
                text(
                    "TRUNCATE TABLE users, internships, applications, candidate_mappings, "
                    "vacancy_mappings, application_mappings, ats_results, dna_profiles, "
                    "simulation_results, notifications, company_members, companies, "
                    "interview_results, integrity_results CASCADE;"
                )
            )
            await session.commit()
    run_async_test(run_clean())
    yield

# =========================================================================
# Test Candidate & System JWT Auth
# =========================================================================
def test_interview_jwt_generation_and_verification():
    candidate_uuid = uuid.uuid4()
    app_uuid = uuid.uuid4()
    audience = "INTELLIRECRUIT_ENGINE"
    
    # Candidate Kiosk JWT
    token = create_candidate_jwt(candidate_uuid, app_uuid, audience, expires_in_sec=100)
    assert token is not None
    
    payload = verify_candidate_jwt(token, expected_audience=audience)
    assert payload["iss"] == "CAPVIA_CORE"
    assert payload["sub"] == str(candidate_uuid)
    assert payload["application_id"] == str(app_uuid)

    # System-to-Service JWT
    system_token = create_system_jwt(audience=audience, expires_in_sec=100)
    assert system_token is not None
    
    system_payload = verify_system_jwt(system_token, expected_audience=audience)
    assert "system_admin" in system_payload["roles"]

# =========================================================================
# Test Circuit Breaker
# =========================================================================
def test_interview_circuit_breaker_states():
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=0.5)
    assert cb.state == "CLOSED"
    
    cb.record_failure()
    cb.record_failure()
    assert cb.state == "CLOSED"
    
    cb.record_failure()
    assert cb.state == "OPEN"
    
    with pytest.raises(CircuitBreakerOpenException):
        cb.check_request_allowed()
        
    time.sleep(0.6)
    
    assert cb.check_request_allowed() is True
    assert cb.state == "HALF-OPEN"
    
    cb.record_success()
    assert cb.state == "CLOSED"
    assert cb.consecutive_failures == 0

# =========================================================================
# Test Retry Logic & Timeout Handling
# =========================================================================
def test_interview_connector_retry_and_failure():
    async def run():
        connector = InterviewConnector()
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_req = httpx.Request("POST", "http://localhost:8765/evaluate")
            mock_post.side_effect = httpx.ConnectError("Connection Refused", request=mock_req)
            
            with pytest.raises(InterviewConnectorException) as excinfo:
                await connector._request_with_retry("POST", "/evaluate")
                
            assert "Failed to communicate with external Interview" in str(excinfo.value)
            assert mock_post.call_count == 3
            
    run_async_test(run())

# =========================================================================
# Test Caching Behavior
# =========================================================================
def test_interview_connector_caching():
    async def run():
        connector = InterviewConnector()
        role = "Backend Intern"
        topic = "Python API"
        qa_pairs = [{"question": "What is GIL?", "answer": "Global Interpreter Lock"}]
        mock_data = {"final_score_raw": 0.85, "tier": "Good", "strengths": "GIL concept"}
        
        with patch.object(connector, "_request_with_retry", new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json = lambda: mock_data
            
            # Use unique key to prevent collisions
            cache_key = f"test_caching:{uuid.uuid4()}"
            
            # Cache miss
            cached1 = await connector._get_cache(cache_key)
            assert cached1 is None
            
            await connector._set_cache(cache_key, mock_data)
            
            # Cache hit
            cached2 = await connector._get_cache(cache_key)
            assert cached2 == mock_data
            
    run_async_test(run())

# =========================================================================
# Test InterviewRepository
# =========================================================================
def test_interview_repository():
    async def run():
        async with AsyncSessionFactory() as session:
            # Create user, company, internship, and application
            candidate = User(
                id=uuid.uuid4(),
                email=f"candidate_{uuid.uuid4().hex[:4]}@capvia.com",
                full_name="Rohan Sharma",
                password_hash="pw_hash",
                role="STUDENT"
            )
            session.add(candidate)
            await session.flush()
            
            company = Company(
                id=uuid.uuid4(),
                name=f"Acme Corp {uuid.uuid4().hex[:4]}",
                is_verified=True
            )
            session.add(company)
            await session.flush()
            
            internship = Internship(
                id=uuid.uuid4(),
                company_id=company.id,
                title="Python Developer Intern",
                required_skills=["Python"]
            )
            session.add(internship)
            await session.flush()
            
            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.SIMULATION_COMPLETED
            )
            session.add(application)
            await session.commit()
            
            session_id = uuid.uuid4()
            # Save interview result
            await interview_repo.save_interview_result(
                session,
                application_id=application.id,
                session_id=session_id,
                overall_answer_score_pct=80,
                overall_integrity_score=95,
                cheating_probability_pct=5,
                risk_level=RiskLevel.LOW,
                recommendation=RecommendationType.STRONG_HIRE,
                video_url="http://storage.com/video.webm",
                baselined_locally=False,
                strengths=["Technical skills"],
                improvements=["None"],
                raw_report={"eval": "completed"}
            )
            await session.commit()
            
            # Save proctoring integrity results
            await interview_repo.save_integrity_result(
                session,
                application_id=application.id,
                focus_percentage=95,
                look_away_count=1,
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
            await session.commit()
            
            # Verify results
            res = await interview_repo.get_interview_result(session, application.id)
            assert res is not None
            assert res.overall_answer_score_pct == 80
            assert res.recommendation == RecommendationType.STRONG_HIRE
            
            integrity_res = await interview_repo.get_integrity_result(session, application.id)
            assert integrity_res is not None
            assert integrity_res.focus_percentage == 95
            
    run_async_test(run())

# =========================================================================
# Test Full Integration Lifecycle
# =========================================================================
def test_full_interview_integration_lifecycle():
    async def run():
        async with AsyncSessionFactory() as db_session:
            # 1. Database Setup
            candidate = User(
                id=uuid.uuid4(),
                email=f"candidate_{uuid.uuid4().hex[:4]}@capvia.com",
                full_name="Rohan Sharma",
                password_hash="pw_hash",
                role="STUDENT"
            )
            db_session.add(candidate)
            await db_session.flush()
            
            company = Company(
                id=uuid.uuid4(),
                name=f"Acme Corp {uuid.uuid4().hex[:4]}",
                is_verified=True
            )
            db_session.add(company)
            await db_session.flush()
            
            internship = Internship(
                id=uuid.uuid4(),
                company_id=company.id,
                title="Python Developer Intern",
                required_skills=["Python", "SQL"]
            )
            db_session.add(internship)
            await db_session.flush()
            
            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.SIMULATION_COMPLETED
            )
            db_session.add(application)
            await db_session.commit()
            
            # Verify status in DB
            await db_session.refresh(application)
            assert application.status == ApplicationStatus.SIMULATION_COMPLETED

            # 2. Start Interview Router Endpoint
            start_payload = StartInterviewRequest(
                application_id=str(application.id),
                candidate_id=str(candidate.id),
                candidate_name=candidate.full_name,
                job_role=internship.title,
                skills=internship.required_skills,
                company_name=company.name
            )
            
            system_claims = {"roles": ["system_admin"]}
            start_resp = await start_interview(start_payload, system_claims, db_session)
            
            assert start_resp.session_id is not None
            assert len(start_resp.questions) == 5
            
            # Verify application status transitioned to INTERVIEW_IN_PROGRESS
            await db_session.refresh(application)
            assert application.status == ApplicationStatus.INTERVIEW_IN_PROGRESS
            
            # Check mappings
            mapping = await MappingService.get_or_create_application_mapping(db_session, application.id)
            assert str(mapping.interview_session_uuid) == start_resp.session_id

            # 3. Answer Submissions Router Endpoint
            candidate_claims = {"application_id": str(application.id), "sub": str(candidate.id)}
            
            # Answer 0
            ans_payload_0 = SaveInterviewAnswerRequest(
                question_index=0,
                audio_duration_sec=15.5,
                transcript="I have 2 years of python experience",
                proctoring_violations_count=0,
                proctoring_details={"phone_detected": False, "gaze_direction": "CENTER"}
            )
            ans_resp_0 = await save_interview_answer(ans_payload_0, candidate_claims, db_session)
            assert ans_resp_0.success is True

            # Answer 1 (with look away violation)
            ans_payload_1 = SaveInterviewAnswerRequest(
                question_index=1,
                audio_duration_sec=20.0,
                transcript="For database indexing we use B-Tree models.",
                proctoring_violations_count=1,
                proctoring_details={"phone_detected": False, "gaze_direction": "LEFT"}
            )
            ans_resp_1 = await save_interview_answer(ans_payload_1, candidate_claims, db_session)
            assert ans_resp_1.success is True

            # 4. Complete Interview Endpoint (Trigger Background Evaluation)
            mock_evaluate = AsyncMock(return_value={
                "final_score_pct": "80%",
                "final_score_raw": 0.80,
                "tier": "Good",
                "color": "#10B981",
                "strengths": "Clear terminology",
                "weaknesses": "None",
                "suggestions": "None",
                "per_question": []
            })
            
            with patch("capvia_platform.services.interview_connector.interview_connector.evaluate_answers", mock_evaluate):
                complete_resp = await complete_interview(
                    session_id=start_resp.session_id,
                    video_url=f"http://storage.com/{start_resp.session_id}.webm",
                    local_violations_json=json.dumps({"tabSwitches": 1, "copyPastes": 0}),
                    baselined_locally=False,
                    local_evaluation_report_json=None,
                    candidate_claims=candidate_claims,
                    db=db_session
                )
                
                assert complete_resp.success is True
                assert complete_resp.status == "processing_evaluation"
                
                # Verify state transitioned to INTERVIEW_COMPLETED
                await db_session.refresh(application)
                assert application.status == ApplicationStatus.INTERVIEW_COMPLETED

                # Let the spawned background task run
                for _ in range(30):
                    await db_session.refresh(application)
                    if application.status == ApplicationStatus.EVALUATED:
                        break
                    await asyncio.sleep(0.1)
                
                # Verify final state transitioned to EVALUATED
                assert application.status == ApplicationStatus.EVALUATED
                
                # Check stored results
                int_res = await interview_repo.get_interview_result(db_session, application.id)
                assert int_res is not None
                assert int_res.overall_answer_score_pct == 80
                
                integrity_res = await interview_repo.get_integrity_result(db_session, application.id)
                assert integrity_res is not None
                assert integrity_res.tab_switches == 1
                
                # Check notifications
                stmt_notif = select(Notification).where(Notification.user_id == candidate.id)
                notif_res = await db_session.execute(stmt_notif)
                notifications = notif_res.scalars().all()
                assert len(notifications) > 0
                assert any("Evaluation Completed" in n.title for n in notifications)

            # 5. Complete Interview Endpoint (Offline local baseline)
            # Re-invite
            await RecruitmentProgressService.update_application_status(
                db_session,
                application_id=application.id,
                status=ApplicationStatus.INTERVIEW_IN_PROGRESS,
                stage=StageName.INTERVIEW
            )
            await db_session.commit()
            
            local_report = {
                "overall_answer_score_pct": 75,
                "overall_integrity_score": 85,
                "cheating_probability_pct": 10,
                "risk_level": "LOW",
                "recommendation": "Consider"
            }
            
            complete_resp_local = await complete_interview(
                session_id=start_resp.session_id,
                video_url=f"http://storage.com/{start_resp.session_id}.webm",
                local_violations_json=json.dumps({"tabSwitches": 1, "copyPastes": 0}),
                baselined_locally=True,
                local_evaluation_report_json=json.dumps(local_report),
                candidate_claims=candidate_claims,
                db=db_session
            )
            
            assert complete_resp_local.success is True
            assert complete_resp_local.status == "BASELINED_LOCALLY"
            
            # Verify transitioned to EVALUATED_LOCAL_BASELINE
            await db_session.refresh(application)
            assert application.status == ApplicationStatus.EVALUATED_LOCAL_BASELINE
            
            # Check results
            int_res_local = await interview_repo.get_interview_result(db_session, application.id)
            assert int_res_local.overall_answer_score_pct == 75
            assert int_res_local.baselined_locally is True

    run_async_test(run())
