import time
from fastapi import Request
import redis.asyncio as aioredis
from capvia_platform.core.logger import logger
from capvia_platform.core.exceptions import BaseAPIException

class RateLimitExceeded(BaseAPIException):
    def __init__(self, limit: int, window: int):
        super().__init__(
            message=f"Too many requests. Limit is {limit} requests per {window} seconds.",
            status_code=429,
            code="RATE_LIMIT_EXCEEDED",
            details={"limit": limit, "window_seconds": window}
        )

class RateLimiter:
    """
    FastAPI dependency-compatible class for enforcing Redis-backed rate limits.
    """
    def __init__(self, requests_limit: int = 60, window_seconds: int = 60):
        self.limit = requests_limit
        self.window = window_seconds

    async def __call__(self, request: Request):
        # Determine client identifier (use IP address, fallback to loopback)
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"rate_limit:{client_ip}:{request.url.path}"
        
        # Check if Redis connection pool exists
        if not hasattr(request.app.state, "redis_pool"):
            # If Redis is not configured or offline, skip enforcement with warning
            logger.warning("Redis pool not initialized. Rate limiter bypassed.")
            return

        try:
            # Connect to Redis
            r = aioredis.Redis(connection_pool=request.app.state.redis_pool)
            
            # Use sliding window or fixed window counter
            # Fixed window is simple, reliable and fast:
            current_count = await r.get(key)
            
            if current_count is not None:
                count = int(current_count)
                if count >= self.limit:
                    raise RateLimitExceeded(self.limit, self.window)
                await r.incr(key)
            else:
                # Set key with TTL
                await r.set(key, 1, ex=self.window)
                
        except RateLimitExceeded:
            raise
        except Exception as e:
            # Fail-open design: Log Redis errors but do not crash the application
            logger.error(f"Rate limiting database error: {str(e)}. Permitting request.")
            return
