import time
import random
import asyncio
import logging
import json
from typing import Dict, Any, Optional, List
import httpx
import redis.asyncio as aioredis
from capvia_platform.core.config import settings
from capvia_platform.core.exceptions import BaseAPIException
from capvia_platform.utils.jwt import create_system_jwt

logger = logging.getLogger("interview_connector")

class InterviewConnectorException(BaseAPIException):
    def __init__(self, message: str, status_code: int = 502, code: str = "INTERVIEW_CONNECTOR_ERROR", details: Optional[dict] = None):
        super().__init__(message=message, status_code=status_code, code=code, details=details)

class CircuitBreakerOpenException(BaseAPIException):
    def __init__(self, message: str = "Interview Service is currently unavailable due to repeated failures."):
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


class InterviewConnector:
    def __init__(self):
        self.base_url = settings.INTERVIEW_ENGINE_URL.rstrip("/")
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

    def _get_auth_headers(self) -> dict:
        token = create_system_jwt(audience="INTELLIRECRUIT_ENGINE", expires_in_sec=300)
        return {"Authorization": f"Bearer {token}"}

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        redis_client = await self._get_redis()
        if redis_client:
            try:
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
        json_data: Optional[dict] = None,
        params: Optional[dict] = None,
        custom_timeout: Optional[float] = None
    ) -> httpx.Response:
        self.circuit_breaker.check_request_allowed()

        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = self._get_auth_headers()
        timeout = httpx.Timeout(custom_timeout or 30.0, connect=2.0)  # Evaluations can take longer

        max_retries = 3
        base_delay = 1.0

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(max_retries):
                start_time = time.time()
                try:
                    logger.info(f"Interview API Call: {method} {url} (Attempt {attempt + 1}/{max_retries})")
                    if method.upper() == "POST":
                        response = await client.post(url, headers=headers, json=json_data, params=params)
                    else:
                        response = await client.get(url, headers=headers, params=params)

                    latency = time.time() - start_time
                    logger.info(f"Interview API Response: {response.status_code} in {latency:.4f}s")

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
                    logger.warning(f"Interview API Error: {str(e)} on attempt {attempt + 1} (latency: {latency:.4f}s)")
                    
                    if attempt == max_retries - 1:
                        self.circuit_breaker.record_failure()
                        if isinstance(e, httpx.HTTPStatusError):
                            raise InterviewConnectorException(
                                message=f"External Interview service returned error: {e.response.text}",
                                status_code=e.response.status_code,
                                details={"url": url, "status_code": e.response.status_code}
                            )
                        else:
                            raise InterviewConnectorException(
                                message=f"Failed to communicate with external Interview service: {str(e)}",
                                status_code=502,
                                details={"url": url, "error": str(e)}
                            )
                    
                    delay = (2 ** attempt) * base_delay + random.uniform(-0.2, 0.2)
                    await asyncio.sleep(max(0.1, delay))

    async def health_check(self) -> bool:
        """
        Check health of the evaluation server.
        """
        try:
            res = await self._request_with_retry("GET", "/health", custom_timeout=2.0)
            data = res.json()
            return data.get("status") == "ok"
        except Exception as e:
            logger.warning(f"Interview evaluation health check failed: {str(e)}")
            return False

    async def evaluate_answers(self, role: str, topic: str, qa_pairs: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Calls /evaluate to run SBERT + KeyBERT metrics on Q&A pairs.
        """
        payload = {
            "role": role,
            "topic": topic,
            "qa_pairs": qa_pairs
        }
        res = await self._request_with_retry(
            method="POST",
            path="/evaluate",
            json_data=payload
        )
        return res.json()


interview_connector = InterviewConnector()
