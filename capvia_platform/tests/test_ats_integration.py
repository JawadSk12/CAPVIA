import os
import uuid
import time
import pytest
import asyncio
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

# Setup environment variables before imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db"
os.environ["SECRET_KEY"] = "test_secret_for_ats_integration"
os.environ["ALGORITHM"] = "HS256"
os.environ["REDIS_URL"] = ""  # Force local memory cache fallback in tests

from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel,
    User, Internship, Application, ApplicationMapping, ATSResult, DNAProfile,
    CandidateMapping, VacancyMapping, ApplicationEvent, Notification, Company
)
from capvia_platform.utils.jwt import create_system_jwt, verify_system_jwt
from capvia_platform.services.ats_connector import ATSConnector, CircuitBreaker, CircuitBreakerOpenException, ATSConnectorException
from capvia_platform.repositories.ats_repository import ATSRepository
from capvia_platform.tasks.ats_tasks import process_ats_stage
from capvia_platform.webhooks.ats_webhooks import handle_ats_processed_webhook
from capvia_platform.services.services import MappingService, RecruitmentProgressService

ats_repo = ATSRepository()

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
                    "notifications, company_members, companies CASCADE;"
                )
            )
            await session.commit()
    run_async_test(run_clean())
    yield

# =========================================================================
# Test System JWT Auth
# =========================================================================
def test_system_jwt_generation_and_verification():
    audience = "ATS_ENGINE"
    token = create_system_jwt(audience=audience, expires_in_sec=100)
    assert token is not None
    
    payload = verify_system_jwt(token, expected_audience=audience)
    assert payload["iss"] == "CAPVIA_CORE"
    assert "system_admin" in payload["roles"]

# =========================================================================
# Test Circuit Breaker
# =========================================================================
def test_circuit_breaker_states():
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=0.5)
    assert cb.state == "CLOSED"
    
    # 1st and 2nd failure
    cb.record_failure()
    cb.record_failure()
    assert cb.state == "CLOSED"
    
    # 3rd failure triggers OPEN
    cb.record_failure()
    assert cb.state == "OPEN"
    
    # Request should be blocked immediately
    with pytest.raises(CircuitBreakerOpenException):
        cb.check_request_allowed()
        
    # Wait for recovery timeout
    time.sleep(0.6)
    
    # Request should be allowed (transitions to HALF-OPEN)
    assert cb.check_request_allowed() is True
    assert cb.state == "HALF-OPEN"
    
    # Success resets to CLOSED
    cb.record_success()
    assert cb.state == "CLOSED"
    assert cb.consecutive_failures == 0

# =========================================================================
# Test Retry Logic & Timeout Handling
# =========================================================================
def test_connector_retry_and_failure():
    async def run():
        connector = ATSConnector()
        # Mock httpx AsyncClient request to fail with ConnectError
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            # Create a mock request to pass to ConnectError
            mock_req = httpx.Request("GET", "http://localhost:8000/api/v1/test-path")
            mock_get.side_effect = httpx.ConnectError("Connection Refused", request=mock_req)
            
            with pytest.raises(ATSConnectorException) as excinfo:
                await connector._request_with_retry("GET", "/test-path")
                
            assert "Failed to communicate with external ATS" in str(excinfo.value)
            # Should have tried 3 times (1 initial + 2 retries)
            assert mock_get.call_count == 3
            
    run_async_test(run())

# =========================================================================
# Test Caching Behavior
# =========================================================================
def test_connector_caching():
    async def run():
        connector = ATSConnector()
        jd_id = str(uuid.uuid4())
        resume_id = str(uuid.uuid4())
        
        mock_data = {"overall_score": 85.0, "score_band": "STRONG"}
        
        with patch.object(connector, "_request_with_retry", new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json = lambda: mock_data
            
            # 1st call: Cache miss, calls request
            res1 = await connector.get_comparison_result(jd_id, resume_id)
            assert res1 == mock_data
            assert mock_request.call_count == 1
            
            # 2nd call: Cache hit, does not call request
            res2 = await connector.get_comparison_result(jd_id, resume_id)
            assert res2 == mock_data
            assert mock_request.call_count == 1
            
    run_async_test(run())

# =========================================================================
# Test ATSRepository
# =========================================================================
def test_ats_repository():
    async def run():
        async with AsyncSessionFactory() as session:
            # Create user, company, internship, and application to satisfy foreign keys
            candidate = User(
                id=uuid.uuid4(),
                email=f"candidate_{uuid.uuid4().hex[:4]}@capvia.com",
                full_name="Arjun Kumar",
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
                title="Software Intern",
                required_skills=["Python", "SQL"]
            )
            session.add(internship)
            await session.flush()
            
            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.APPLIED,
                resume_url="https://example.com/resumes/arjun.pdf"
            )
            session.add(application)
            await session.commit()
            
            # Save ATS result
            await ats_repo.save_ats_result(
                session,
                application_id=application.id,
                overall_score=78.5,
                score_band="GOOD",
                detected_role="Backend Developer",
                matched_skills=["Python", "SQL"]
            )
            
            # Save DNA Profile
            await ats_repo.save_dna_profile(
                session,
                application_id=application.id,
                technical_alignment=85.0,
                project_alignment=80.0,
                experience_alignment=75.0,
                domain_alignment=70.0,
                semantic_match_strength=80.0,
                readability=90.0,
                clarity=85.0,
                ats_compatibility=95.0,
                technical_depth=80.0,
                practical_exposure=75.0,
                internship_readiness=85.0,
                hiring_readiness_score=80.0,
                capability_score=78.5,
                candidate_level="JUNIOR_DEVELOPER"
            )
            await session.commit()
            
            # Verify save
            ats_result = await ats_repo.get_ats_result(session, application.id)
            assert ats_result is not None
            assert ats_result.overall_score == 78.5
            assert ats_result.score_band == "GOOD"
            assert "Python" in ats_result.matched_skills
            
            dna_profile = await ats_repo.get_dna_profile(session, application.id)
            assert dna_profile is not None
            assert dna_profile.capability_score == 78.5
            assert dna_profile.candidate_level == "JUNIOR_DEVELOPER"
            
    run_async_test(run())

# =========================================================================
# Test Background Tasks and Webhooks Flow
# =========================================================================
def test_full_ats_integration_lifecycle():
    async def run():
        async with AsyncSessionFactory() as db_session:
            # Setup candidate & internship records
            candidate = User(
                id=uuid.uuid4(),
                email=f"candidate_{uuid.uuid4().hex[:4]}@capvia.com",
                full_name="Arjun Kumar",
                password_hash="pw_hash",
                role="STUDENT"
            )
            db_session.add(candidate)
            await db_session.flush()
            
            # Create a company to associate the internship with
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
                title="Software Intern",
                required_skills=["Python", "SQL"]
            )
            db_session.add(internship)
            await db_session.flush()
            
            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.APPLIED,
                resume_url="https://example.com/resumes/arjun.pdf"
            )
            db_session.add(application)
            await db_session.commit()
            
            # Mock ats_connector calls
            mock_upload = AsyncMock(return_value=str(uuid.uuid4()))
            mock_compare = AsyncMock(return_value={"status": "PROCESSING"})
            
            with patch("capvia_platform.services.ats_connector.ats_connector.upload_resume", mock_upload), \
                 patch("capvia_platform.services.ats_connector.ats_connector.compare_resume", mock_compare), \
                 patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_resume_download:
                 
                # Mock download response
                mock_resume_download.return_value.status_code = 200
                mock_resume_download.return_value.content = b"Mock Resume PDF content"
                mock_resume_download.return_value.raise_for_status = MagicMock()
                
                # 1. Trigger background task
                await process_ats_stage(application.id)
                
                # Verify status transitioned to ATS_PENDING
                await db_session.refresh(application)
                assert application.status == ApplicationStatus.ATS_PENDING
                
                # Verify upload and compare were triggered
                mock_upload.assert_called_once()
                mock_compare.assert_called_once()
                
                # Verify ApplicationMapping exists
                stmt = select(ApplicationMapping).where(ApplicationMapping.application_id == application.id)
                res = await db_session.execute(stmt)
                mapping = res.scalar_one_or_none()
                assert mapping is not None
                assert mapping.ats_resume_uuid is not None
                
                # 2. Trigger processed webhook with PASSING score (>= 60%)
                mock_get_comparison = AsyncMock(return_value={
                    "overall_score": 82.5,
                    "score_band": "GOOD",
                    "is_suspicious": False,
                    "required_skills_analysis": {"matches": [{"target": "Python"}], "gaps": []},
                    "preferred_skills_analysis": {"matches": [], "gaps": []},
                    "ai_confidence": 0.9
                })
                mock_get_dna = AsyncMock(return_value={
                    "role_match": {"technical_alignment": 85.0},
                    "resume_quality": {"readability": 80.0},
                    "skill_intelligence": {"technical_depth": 80.0},
                    "readiness_intelligence": {"internship_readiness": 80.0},
                    "overall": {"capability_score": 82.5, "candidate_level": "JUNIOR_DEVELOPER"}
                })
                
                mock_register_internship = AsyncMock(return_value=9841)
                mock_register_candidate = AsyncMock(return_value={
                    "simulation_candidate_id": 2510,
                    "simulation_application_id": 9841
                })
                
                with patch("capvia_platform.services.ats_connector.ats_connector.get_comparison_result", mock_get_comparison), \
                     patch("capvia_platform.services.ats_connector.ats_connector.get_dna_graph", mock_get_dna), \
                     patch("capvia_platform.services.simulation_connector.simulation_connector.register_internship", mock_register_internship), \
                     patch("capvia_platform.services.simulation_connector.simulation_connector.register_candidate", mock_register_candidate):
                      
                     webhook_data = {
                         "application_id": str(application.id),
                         "resume_id": str(mapping.ats_resume_uuid),
                         "jd_id": str(internship.id),
                         "status": "SUCCESS",
                         "overall_ats_score": 82.5,
                         "score_band": "GOOD",
                         "is_suspicious": False
                     }
                     
                     await handle_ats_processed_webhook(db_session, webhook_data)
                     await db_session.commit()
                     
                     # Let background registration task complete
                     await asyncio.sleep(0.3)
                     
                     # Verify status transitioned to SIMULATION_INVITED
                     await db_session.refresh(application)
                     assert application.status == ApplicationStatus.SIMULATION_INVITED
                     assert application.current_stage == StageName.SIMULATION
                     
                     # Verify mappings (simulation IDs registered)
                     await db_session.refresh(mapping)
                     assert mapping.simulation_application_id == 9841
                     assert mapping.ats_score == 82.5
                     
                     # Verify ATSResult and DNAProfile exist in Postgres
                     ats_res = await ats_repo.get_ats_result(db_session, application.id)
                     assert ats_res is not None
                     assert ats_res.overall_score == 82.5
                     
                     dna_prof = await ats_repo.get_dna_profile(db_session, application.id)
                     assert dna_prof is not None
                     assert dna_prof.capability_score == 82.5
                     assert dna_prof.candidate_level == "JUNIOR_DEVELOPER"
                     
                     # Verify notification was sent
                     stmt_notif = select(Notification).where(Notification.user_id == candidate.id)
                     notif_res = await db_session.execute(stmt_notif)
                     notifications = notif_res.scalars().all()
                     assert len(notifications) > 0
                     assert any("Simulation Invited" in n.title for n in notifications)

    run_async_test(run())
