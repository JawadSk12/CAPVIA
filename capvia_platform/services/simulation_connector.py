import time
import random
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
import redis.asyncio as aioredis
from capvia_platform.core.config import settings
from capvia_platform.core.exceptions import BaseAPIException
from capvia_platform.utils.jwt import create_system_jwt

logger = logging.getLogger("simulation_connector")

class SimulationConnectorException(BaseAPIException):
    def __init__(self, message: str, status_code: int = 502, code: str = "SIMULATION_CONNECTOR_ERROR", details: Optional[dict] = None):
        super().__init__(message=message, status_code=status_code, code=code, details=details)

class CircuitBreakerOpenException(BaseAPIException):
    def __init__(self, message: str = "Simulation Service is currently unavailable due to repeated failures."):
        super().__init__(message=message, status_code=503, code="CIRCUIT_BREAKER_OPEN")


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN
        self.consecutive_failures = 0
        self.last_state_change = time.time()

    def record_success(self):
        if self.state != "CLOSED":
            logger.info(f"Circuit breaker transitioning from {self.state} to CLOSED")
            self.state = "CLOSED"
        self.consecutive_failures = 0

    def record_failure(self):
        self.consecutive_failures += 1
        logger.warning(f"Circuit breaker failure recorded. Count = {self.consecutive_failures}/{self.failure_threshold}")
        if self.consecutive_failures >= self.failure_threshold and self.state != "OPEN":
            logger.error(f"Circuit breaker tripping to OPEN state for {self.recovery_timeout}s")
            self.state = "OPEN"
            self.last_state_change = time.time()

    def check_request_allowed(self):
        if self.state == "OPEN":
            elapsed = time.time() - self.last_state_change
            if elapsed > self.recovery_timeout:
                logger.info("Circuit breaker recovery timeout elapsed. Transitioning to HALF-OPEN")
                self.state = "HALF-OPEN"
                self.last_state_change = time.time()
                return True
            raise CircuitBreakerOpenException()
        return True


class SimulationConnector:
    def __init__(self):
        self.base_url = settings.SIMULATION_ENGINE_URL.rstrip("/") + "/api/v1"
        self.circuit_breaker = CircuitBreaker()
        self._local_cache: Dict[str, Dict[str, Any]] = {}
        self._redis_client: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> Optional[aioredis.Redis]:
        if self._redis_client is not None:
            return self._redis_client
        if settings.REDIS_URL:
            try:
                pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
                self._redis_client = aioredis.Redis(connection_pool=pool)
                return self._redis_client
            except Exception as e:
                logger.warning(f"Failed to connect to Redis. Caching will fallback to local memory. Error: {str(e)}")
        return None

    def _get_auth_headers(self, sim_candidate_id: Optional[int] = None) -> dict:
        if sim_candidate_id is not None:
            from jose import jwt
            from datetime import datetime, timedelta
            from capvia_platform.core.config import settings
            
            now = datetime.utcnow()
            payload = {
                "sub": str(sim_candidate_id),
                "type": "access",
                "exp": now + timedelta(seconds=300),
                "iat": now
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        else:
            token = create_system_jwt(audience="ASSESS_AI", expires_in_sec=300)
        return {"Authorization": f"Bearer {token}"}

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        redis_client = await self._get_redis()
        if redis_client:
            try:
                import json
                val = await redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"Redis cache read error: {str(e)}")
        
        cache_item = self._local_cache.get(key)
        if cache_item:
            if cache_item.get("expires_at", 0) > time.time():
                return cache_item.get("data")
            else:
                del self._local_cache[key]
        return None

    async def _set_cache(self, key: str, value: Dict[str, Any], ttl: int = 3600):
        redis_client = await self._get_redis()
        if redis_client:
            try:
                import json
                await redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception as e:
                logger.warning(f"Redis cache write error: {str(e)}")
        
        self._local_cache[key] = {
            "data": value,
            "expires_at": time.time() + ttl
        }

    async def _request_with_retry(
        self,
        method: str,
        path: str,
        json_data = None,  # Optional[dict | list] — httpx accepts any JSON-serializable value
        params: Optional[dict] = None,
        custom_timeout: Optional[float] = None,
        sim_candidate_id: Optional[int] = None
    ) -> httpx.Response:
        self.circuit_breaker.check_request_allowed()

        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = self._get_auth_headers(sim_candidate_id=sim_candidate_id)
        timeout = httpx.Timeout(custom_timeout or 5.0, connect=2.0)

        max_retries = 3
        base_delay = 1.0

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(max_retries):
                start_time = time.time()
                try:
                    logger.info(f"Simulation API Call: {method} {url} (Attempt {attempt + 1}/{max_retries})")
                    if method.upper() == "POST":
                        response = await client.post(url, headers=headers, json=json_data, params=params)
                    else:
                        response = await client.get(url, headers=headers, params=params)

                    latency = time.time() - start_time
                    logger.info(f"Simulation API Response: {response.status_code} in {latency:.4f}s")

                    if response.status_code < 500:
                        self.circuit_breaker.record_success()
                        return response

                    raise httpx.HTTPStatusError(
                        f"Server error: {response.status_code}",
                        request=response.request,
                        response=response
                    )

                except (httpx.RequestError, httpx.HTTPStatusError) as e:
                    latency = time.time() - start_time
                    logger.warning(f"Simulation API Error: {str(e)} on attempt {attempt + 1} (latency: {latency:.4f}s)")
                    
                    if attempt == max_retries - 1:
                        self.circuit_breaker.record_failure()
                        if isinstance(e, httpx.HTTPStatusError):
                            raise SimulationConnectorException(
                                message=f"External Simulation service returned error: {e.response.text}",
                                status_code=e.response.status_code,
                                details={"url": url, "status_code": e.response.status_code}
                            )
                        else:
                            raise SimulationConnectorException(
                                message=f"Failed to communicate with external Simulation service: {str(e)}",
                                status_code=502,
                                details={"url": url, "error": str(e)}
                            )
                    
                    delay = (2 ** attempt) * base_delay + random.uniform(-0.2, 0.2)
                    await asyncio.sleep(max(0.1, delay))

    async def register_internship(
        self,
        title: str,
        company_name: str,
        description: Optional[str] = None,
        required_skills: list = None,
        technologies: list = None
    ) -> int:
        """
        Registers a new internship in AssessAI, returning the internal simulation internship ID.
        """
        payload = {
            "title": title,
            "company_name": company_name,
            "description": description or "",
            "required_skills": required_skills or [],
            "technologies": technologies or []
        }
        res = await self._request_with_retry(
            method="POST",
            path="/system/internships",
            json_data=payload
        )
        data = res.json()
        sim_id = data.get("simulation_internship_id")
        if sim_id is None:
            raise SimulationConnectorException("Vacancy registration succeeded but no ID returned.", details=data)
        return int(sim_id)

    async def register_candidate(
        self,
        internship_id: int,
        external_application_uuid: str,
        external_candidate_uuid: str,
        email: str,
        name: str,
        skills: list = None
    ) -> dict:
        """
        Sequence 2.1: Registers candidate and links mappings in AssessAI.
        """
        payload = {
            "external_application_uuid": external_application_uuid,
            "external_candidate_uuid": external_candidate_uuid,
            "email": email,
            "full_name": name,
            "skills_from_resume": skills or []
        }
        res = await self._request_with_retry(
            method="POST",
            path=f"/system/internships/{internship_id}/register-candidate",
            json_data=payload
        )
        return res.json()

    async def get_attempt_metadata(self, attempt_id: int, sim_candidate_id: Optional[int] = None) -> dict:
        """
        Sequence 2.2: Fetches attempt configuration/timing parameters.
        """
        res = await self._request_with_retry(
            method="GET",
            path=f"/attempts/{attempt_id}",
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def get_evaluation_report(self, attempt_id: int, sim_candidate_id: Optional[int] = None) -> dict:
        """
        Sequence 2.2 & 3.4: Fetches AI evaluation feedback report, scores, and risk flags.
        """
        cache_key = f"simulation_report:{attempt_id}"
        cached = await self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for simulation report: {cache_key}")
            return cached

        res = await self._request_with_retry(
            method="GET",
            path=f"/attempts/{attempt_id}/report",
            sim_candidate_id=sim_candidate_id
        )
        data = res.json()
        await self._set_cache(cache_key, data)
        return data

    async def get_candidate_rankings(self, internship_id: int) -> dict:
        """
        Returns ranked leaderboard of candidates who completed the simulation.
        """
        cache_key = f"simulation_rankings:{internship_id}"
        cached = await self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for simulation rankings: {cache_key}")
            return cached

        res = await self._request_with_retry(
            method="GET",
            path=f"/internships/{internship_id}/rankings"
        )
        data = res.json()
        await self._set_cache(cache_key, data, ttl=600)  # cache rankings for 10 minutes
        return data

    async def start_attempt(self, sim_application_id: int, sim_candidate_id: int) -> dict:
        """
        Starts a simulation attempt for the given simulation-internal application ID.
        Calls POST /api/v1/applications/{sim_application_id}/start-simulation on the
        simulation engine. Returns the attempt data including attempt_id, blueprint, etc.
        """
        res = await self._request_with_retry(
            method="POST",
            path=f"/applications/{sim_application_id}/start-simulation",
            custom_timeout=10.0,
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def get_attempt(self, attempt_id: int, sim_candidate_id: int) -> dict:
        """
        Fetches attempt configuration and current state from the simulation engine.
        Proxies GET /api/v1/attempts/{attempt_id}.
        """
        res = await self._request_with_retry(
            method="GET",
            path=f"/attempts/{attempt_id}",
            custom_timeout=10.0,
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def submit_answer(self, attempt_id: int, sim_candidate_id: int, data: dict) -> dict:
        """
        Submits an answer for a specific task in the simulation attempt.
        Proxies POST /api/v1/attempts/{attempt_id}/answer.
        """
        res = await self._request_with_retry(
            method="POST",
            path=f"/attempts/{attempt_id}/answer",
            json_data=data,
            custom_timeout=10.0,
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def complete_round(self, attempt_id: int, sim_candidate_id: int, round_number: int) -> dict:
        """
        Marks a simulation round as complete.
        Proxies POST /api/v1/attempts/{attempt_id}/complete-round.
        """
        res = await self._request_with_retry(
            method="POST",
            path=f"/attempts/{attempt_id}/complete-round",
            params={"round_number": round_number},
            custom_timeout=10.0,
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def submit_attempt(self, attempt_id: int, sim_candidate_id: int) -> dict:
        """
        Submits the completed simulation attempt for final AI evaluation.
        Proxies POST /api/v1/attempts/{attempt_id}/submit.
        """
        res = await self._request_with_retry(
            method="POST",
            path=f"/attempts/{attempt_id}/submit",
            custom_timeout=30.0,  # AI evaluation can take longer
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def log_events(self, attempt_id: int, sim_candidate_id: int, events: list) -> dict:
        """
        Sends anti-cheat behavior events to the simulation engine.
        Proxies POST /api/v1/attempts/{attempt_id}/events.
        """
        res = await self._request_with_retry(
            method="POST",
            path=f"/attempts/{attempt_id}/events",
            json_data=events,
            custom_timeout=5.0,
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def get_report(self, attempt_id: int, sim_candidate_id: int) -> dict:
        """
        Fetches the final AI evaluation report for a completed attempt.
        Proxies GET /api/v1/attempts/{attempt_id}/report.
        """
        res = await self._request_with_retry(
            method="GET",
            path=f"/attempts/{attempt_id}/report",
            custom_timeout=15.0,
            sim_candidate_id=sim_candidate_id
        )
        return res.json()

    async def get_internship_blueprint(self, internship_id: int) -> dict:
        """
        Fetches the simulation blueprint for an internship.
        Proxies GET /api/v1/internships/{internship_id}/blueprint.
        """
        cache_key = f"simulation_blueprint:{internship_id}"
        cached = await self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for simulation blueprint: {cache_key}")
            return cached

        res = await self._request_with_retry(
            method="GET",
            path=f"/internships/{internship_id}/blueprint",
            custom_timeout=10.0
        )
        data = res.json()
        await self._set_cache(cache_key, data, ttl=3600)
        return data


simulation_connector = SimulationConnector()
