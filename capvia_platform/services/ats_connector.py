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

logger = logging.getLogger("ats_connector")

class ATSConnectorException(BaseAPIException):
    def __init__(self, message: str, status_code: int = 502, code: str = "ATS_CONNECTOR_ERROR", details: Optional[dict] = None):
        super().__init__(message=message, status_code=status_code, code=code, details=details)

class CircuitBreakerOpenException(BaseAPIException):
    def __init__(self, message: str = "ATS Service is currently unavailable due to repeated failures."):
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


class ATSConnector:
    def __init__(self):
        self.base_url = settings.ATS_ENGINE_URL.rstrip("/") + "/api/v1"
        self.circuit_breaker = CircuitBreaker()
        self._local_cache: Dict[str, Dict[str, Any]] = {}
        # We will lazy-initialize redis pool
        self._redis_client: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> Optional[aioredis.Redis]:
        if self._redis_client is not None:
            return self._redis_client
        if settings.REDIS_URL:
            try:
                # Setup a clean connection pool
                pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
                self._redis_client = aioredis.Redis(connection_pool=pool)
                return self._redis_client
            except Exception as e:
                logger.warning(f"Failed to connect to Redis. Caching will fallback to local memory. Error: {str(e)}")
        return None

    def _get_auth_headers(self) -> dict:
        token = create_system_jwt(audience="ATS_ENGINE", expires_in_sec=300)
        return {"Authorization": f"Bearer {token}"}

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        # Check Redis
        redis_client = await self._get_redis()
        if redis_client:
            try:
                import json
                val = await redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"Redis cache read error: {str(e)}")
        
        # Check local cache
        cache_item = self._local_cache.get(key)
        if cache_item:
            # Check expiry
            if cache_item.get("expires_at", 0) > time.time():
                return cache_item.get("data")
            else:
                del self._local_cache[key]
        return None

    async def _set_cache(self, key: str, value: Dict[str, Any], ttl: int = 3600):
        # Set Redis
        redis_client = await self._get_redis()
        if redis_client:
            try:
                import json
                await redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception as e:
                logger.warning(f"Redis cache write error: {str(e)}")
        
        # Set local cache
        self._local_cache[key] = {
            "data": value,
            "expires_at": time.time() + ttl
        }

    async def _request_with_retry(
        self,
        method: str,
        path: str,
        files: Optional[dict] = None,
        json_data: Optional[dict] = None,
        params: Optional[dict] = None,
        custom_timeout: Optional[float] = None
    ) -> httpx.Response:
        self.circuit_breaker.check_request_allowed()

        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = self._get_auth_headers()

        # Connect timeout: 2s, Read timeout: 5s (default)
        timeout = httpx.Timeout(custom_timeout or 5.0, connect=2.0)

        max_retries = 3
        base_delay = 1.0

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(max_retries):
                start_time = time.time()
                try:
                    logger.info(f"ATS API Call: {method} {url} (Attempt {attempt + 1}/{max_retries})")
                    if method.upper() == "POST":
                        if files:
                            # Do not add Content-Type header manually when uploading files as httpx does it with boundary
                            response = await client.post(url, headers=headers, files=files, params=params)
                        else:
                            response = await client.post(url, headers=headers, json=json_data, params=params)
                    else:
                        response = await client.get(url, headers=headers, params=params)

                    latency = time.time() - start_time
                    logger.info(f"ATS API Response: {response.status_code} in {latency:.4f}s")

                    # If successful or client error, count as success for circuit breaker (we only trip on 5xx or connection issues)
                    if response.status_code < 500:
                        self.circuit_breaker.record_success()
                        return response

                    # 5xx triggers retry
                    raise httpx.HTTPStatusError(
                        f"Server error: {response.status_code}",
                        request=response.request,
                        response=response
                    )

                except (httpx.RequestError, httpx.HTTPStatusError) as e:
                    latency = time.time() - start_time
                    logger.warning(f"ATS API Error: {str(e)} on attempt {attempt + 1} (latency: {latency:.4f}s)")
                    
                    if attempt == max_retries - 1:
                        self.circuit_breaker.record_failure()
                        if isinstance(e, httpx.HTTPStatusError):
                            raise ATSConnectorException(
                                message=f"External ATS service returned error: {e.response.text}",
                                status_code=e.response.status_code,
                                details={"url": url, "status_code": e.response.status_code}
                            )
                        else:
                            raise ATSConnectorException(
                                message=f"Failed to communicate with external ATS service: {str(e)}",
                                status_code=502,
                                details={"url": url, "error": str(e)}
                            )
                    
                    # Backoff with jitter: delay = 2^attempt * base_delay + jitter
                    delay = (2 ** attempt) * base_delay + random.uniform(-0.2, 0.2)
                    await asyncio.sleep(max(0.1, delay))

    async def sync_jd_to_ats(
        self,
        jd_id: str,
        title: str,
        required_skills: list,
        responsibilities: list = None,
        preferred_skills: list = None,
        tools_and_technologies: list = None,
        company: str = None,
        description: str = None,
        experience_level: str = "entry",
    ) -> dict:
        """
        Creates or updates the JD in the ATS Engine.
        Must be called before compare_resume to ensure the JD exists in the ATS system.
        Uses POST /internship with the jd_id as the id field.
        """
        payload = {
            "id": jd_id,
            "title": title,
            "company": company or "CAPVIA",
            "department": None,
            "location": None,
            "is_remote": False,
            "experience_level": experience_level.lower() if experience_level else "entry",
            "short_description": (description or "")[:500] if description else None,
            "responsibilities": responsibilities or [title],
            "required_skills": required_skills or ["General"],
            "preferred_skills": preferred_skills or [],
            "tools_and_technologies": tools_and_technologies or [],
            "expected_projects": [],
            "full_jd_text": description or title,
            "application_deadline": None,
        }
        try:
            res = await self._request_with_retry(
                method="POST",
                path="/internship",
                json_data=payload,
                custom_timeout=10.0
            )
            data = res.json()
            logger.info(f"JD {jd_id} synced to ATS Engine. Response: {data}")
            return data
        except ATSConnectorException as e:
            # If JD already exists (409 conflict), that's fine — it's already in the ATS
            if e.status_code == 409 or "already" in str(e).lower():
                logger.info(f"JD {jd_id} already exists in ATS Engine (409). Proceeding.")
                return {"id": jd_id, "status": "already_exists"}
            raise

    async def upload_resume(self, file_content: bytes, filename: str, jd_id: Optional[str] = None) -> str:

        """
        Sequence 1.1: Uploads resume to start parsing.
        """
        # Upload timeout is larger (15s)
        files = {"file": (filename, file_content, "application/pdf")}
        params = {"mode": "GLOBAL"}
        if jd_id:
            params["mode"] = "INTERNSHIP"
            params["jd_id"] = jd_id

        res = await self._request_with_retry(
            method="POST",
            path="/resume/upload",
            files=files,
            params=params,
            custom_timeout=15.0
        )
        data = res.json()
        resume_id = data.get("resume_id")
        if not resume_id:
            raise ATSConnectorException("Resume upload succeeded but no resume_id returned.", details=data)
        return resume_id

    async def get_resume_status(self, resume_id: str) -> dict:
        """
        Polls processing status of an uploaded resume.
        """
        res = await self._request_with_retry(
            method="GET",
            path=f"/resume/{resume_id}/status"
        )
        return res.json()

    async def compare_resume(self, jd_id: str, resume_id: str, force_rerun: bool = False) -> dict:
        """
        Sequence 1.2: Compares resume against Job Description.
        """
        res = await self._request_with_retry(
            method="POST",
            path=f"/internship/{jd_id}/compare/{resume_id}",
            json_data={"force_rerun": force_rerun}
        )
        return res.json()

    async def get_comparison_result(self, jd_id: str, resume_id: str) -> dict:
        """
        Sequence 1.3: Fetches final parsed results and skill gap analysis.
        """
        cache_key = f"ats_compare_result:{jd_id}:{resume_id}"
        cached = await self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for comparison result: {cache_key}")
            return cached

        res = await self._request_with_retry(
            method="GET",
            path=f"/internship/{jd_id}/result/{resume_id}"
        )
        data = res.json()
        await self._set_cache(cache_key, data)
        return data

    async def get_dna_graph(self, resume_id: str) -> dict:
        """
        Fetches the standardized capability DNA Graph.
        """
        cache_key = f"ats_dna_graph:{resume_id}"
        cached = await self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for DNA graph: {cache_key}")
            return cached

        res = await self._request_with_retry(
            method="GET",
            path=f"/resume/{resume_id}/dna"
        )
        data = res.json()
        await self._set_cache(cache_key, data)
        return data

ats_connector = ATSConnector()
