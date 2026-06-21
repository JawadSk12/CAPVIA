import os
import uuid
import time
import pytest
import asyncio
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime
# Setup environment variables before imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db"
os.environ["SECRET_KEY"] = "test_secret_for_ats_integration"
os.environ["ALGORITHM"] = "HS256"
os.environ["REDIS_URL"] = ""  # Force local memory cache fallback in tests

import random
from capvia_platform.database.connection import AsyncSessionFactory, engine
from capvia_platform.core.config import settings
settings.REDIS_URL = ""

from capvia_platform.models.models import (
    ApplicationStatus, StageName, RiskLevel,
    User, Internship, Application, ApplicationMapping, SimulationResult, Notification, Company
)
from capvia_platform.utils.jwt import create_system_jwt, verify_system_jwt
from capvia_platform.services.simulation_connector import (
    SimulationConnector, CircuitBreaker, CircuitBreakerOpenException, SimulationConnectorException
)
from capvia_platform.repositories.simulation_repository import SimulationRepository
from capvia_platform.tasks.simulation_tasks import register_candidate_for_simulation_task
from capvia_platform.webhooks.simulation_webhooks import handle_simulation_submitted_webhook
from capvia_platform.services.services import MappingService

sim_repo = SimulationRepository()

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
                    "simulation_results, notifications, company_members, companies CASCADE;"
                )
            )
            await session.commit()
    run_async_test(run_clean())
    yield

# =========================================================================
# Test System JWT Auth
# =========================================================================
def test_system_jwt_generation_and_verification():
    audience = "ASSESS_AI"
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
def test_connector_retry_and_failure():
    async def run():
        connector = SimulationConnector()
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_req = httpx.Request("POST", "http://localhost:8001/api/v1/system/internships")
            mock_post.side_effect = httpx.ConnectError("Connection Refused", request=mock_req)
            
            with pytest.raises(SimulationConnectorException) as excinfo:
                await connector._request_with_retry("POST", "/system/internships")
                
            assert "Failed to communicate with external Simulation" in str(excinfo.value)
            assert mock_post.call_count == 3
            
    run_async_test(run())

# =========================================================================
# Test Caching Behavior
# =========================================================================
def test_connector_caching():
    async def run():
        connector = SimulationConnector()
        attempt_id = random.randint(100000, 999999)
        mock_data = {"total_score": 85.0, "recommendation": "hire"}
        
        with patch.object(connector, "_request_with_retry", new_callable=AsyncMock) as mock_request:
            mock_request.return_value.json = lambda: mock_data
            
            # 1st call: Cache miss
            res1 = await connector.get_evaluation_report(attempt_id)
            assert res1 == mock_data
            assert mock_request.call_count == 1
            
            # 2nd call: Cache hit
            res2 = await connector.get_evaluation_report(attempt_id)
            assert res2 == mock_data
            assert mock_request.call_count == 1
            
    run_async_test(run())

# =========================================================================
# Test SimulationRepository
# =========================================================================
def test_simulation_repository():
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
                required_skills=["Python"]
            )
            session.add(internship)
            await session.flush()
            
            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.APPLIED
            )
            session.add(application)
            await session.commit()
            
            # Save simulation result
            await sim_repo.save_simulation_result(
                session,
                application_id=application.id,
                attempt_id=123,
                total_score=82.5,
                recommendation="hire",
                cheating_risk_level=RiskLevel.LOW,
                ai_dependency_score=0.1,
                round_scores={"round_1": 80.0, "round_2": 85.0},
                submitted_at=datetime.utcnow()
            )
            await session.commit()
            
            # Verify save
            res = await sim_repo.get_simulation_result(session, application.id)
            assert res is not None
            assert res.total_score == 82.5
            assert res.recommendation == "hire"
            assert res.cheating_risk_level == RiskLevel.LOW
            assert res.round_scores["round_1"] == 80.0
            
    run_async_test(run())

# =========================================================================
# Test Full Integration Lifecycle
# =========================================================================
def test_full_simulation_integration_lifecycle():
    async def run():
        async with AsyncSessionFactory() as db_session:
            # Setup database records
            candidate = User(
                id=uuid.uuid4(),
                email=f"candidate_{uuid.uuid4().hex[:4]}@capvia.com",
                full_name="Arjun Kumar",
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
                title="Software Intern",
                required_skills=["Python", "SQL"]
            )
            db_session.add(internship)
            await db_session.flush()
            
            application = Application(
                id=uuid.uuid4(),
                candidate_id=candidate.id,
                vacancy_id=internship.id,
                status=ApplicationStatus.ATS_COMPLETED
            )
            db_session.add(application)
            await db_session.commit()
            
            # 1. Trigger background registration task
            mock_register_internship = AsyncMock(return_value=9841)
            mock_register_candidate = AsyncMock(return_value={
                "simulation_candidate_id": 2510,
                "simulation_application_id": 9841
            })
            
            with patch("capvia_platform.services.simulation_connector.simulation_connector.register_internship", mock_register_internship), \
                 patch("capvia_platform.services.simulation_connector.simulation_connector.register_candidate", mock_register_candidate):
                 
                 await register_candidate_for_simulation_task(application.id)
                 
                 # Verify mappings and status transition
                 await db_session.refresh(application)
                 assert application.status == ApplicationStatus.SIMULATION_INVITED
                 assert application.current_stage == StageName.SIMULATION
                 
                 mock_register_internship.assert_called_once()
                 mock_register_candidate.assert_called_once()
                 
                 # Check mapping records
                 mapping = await MappingService.get_or_create_application_mapping(db_session, application.id)
                 assert mapping.simulation_application_id == 9841
                 
                 vacancy_map = await MappingService.get_or_create_vacancy_mapping(db_session, internship.id)
                 assert vacancy_map.simulation_internship_id == 9841
                 
                 cand_map = await MappingService.get_or_create_candidate_mapping(db_session, candidate.id)
                 assert cand_map.simulation_candidate_id == 2510

            # 2. Trigger webhook with passing score (85.5%)
            mock_get_report = AsyncMock(return_value={
                "total_score": 85.5,
                "round_scores": {"round_1": 85.0, "round_2": 86.0},
                "cheating_risk_level": "LOW",
                "ai_dependency_score": 0.12,
                "recommendation": "hire",
                "submitted_at": "2026-06-20T12:00:00Z"
            })
            
            with patch("capvia_platform.services.simulation_connector.simulation_connector.get_evaluation_report", mock_get_report):
                webhook_data = {
                    "application_id": str(application.id),
                    "attempt_id": 42,
                    "total_score": 85.5,
                    "cheating_risk_level": "LOW",
                    "ai_dependency_score": 0.12,
                    "recommendation": "hire"
                }
                
                await handle_simulation_submitted_webhook(db_session, webhook_data)
                await db_session.commit()
                
                # Verify status transitioned to INTERVIEW_INVITED
                await db_session.refresh(application)
                assert application.status == ApplicationStatus.INTERVIEW_INVITED
                assert application.current_stage == StageName.INTERVIEW
                
                # Verify SimulationResult was stored
                sim_res = await sim_repo.get_simulation_result(db_session, application.id)
                assert sim_res is not None
                assert sim_res.total_score == 85.5
                assert sim_res.attempt_id == 42
                
                # Verify mappings score cache
                await db_session.refresh(mapping)
                assert mapping.simulation_score == 85.5
                assert mapping.simulation_attempt_id == 42
                
                # Verify notification exists
                stmt_notif = select(Notification).where(Notification.user_id == candidate.id)
                notif_res = await db_session.execute(stmt_notif)
                notifications = notif_res.scalars().all()
                assert len(notifications) > 0
                assert any("Interview Invited" in n.title for n in notifications)

    run_async_test(run())
