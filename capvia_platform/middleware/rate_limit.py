import time
import logging
from fastapi import Request, Depends
import redis.asyncio as aioredis
from capvia_platform.api.dependencies import get_redis
from capvia_platform.core.exceptions import BaseAPIException

logger = logging.getLogger("rate_limit")

class RateLimitException(BaseAPIException):
    def __init__(self, message: str = "Too many requests. Please try again later.", status_code: int = 429):
        super().__init__(message=message, status_code=status_code, code="TOO_MANY_REQUESTS")

class RateLimiter:
    def __init__(self, limit: int, window_sec: int):
        self.limit = limit
        self.window_sec = window_sec

    async def __call__(self, request: Request, redis: aioredis.Redis = Depends(get_redis)):
        if not redis:
            return
            
        ip = request.client.host if request.client else "127.0.0.1"
        path = request.url.path
        
        key = f"ratelimit:{ip}:{path}"
        now = time.time()
        clear_before = now - self.window_sec

        try:
            async with redis.pipeline(transaction=True) as pipe:
                pipe.zremrangebyscore(key, 0, clear_before)
                pipe.zcard(key)
                pipe.zadd(key, {str(now): now})
                pipe.expire(key, self.window_sec + 2)
                
                res = await pipe.execute()
                count = res[1]
                
            if count > self.limit:
                raise RateLimitException(
                    message=f"Rate limit exceeded. Max {self.limit} requests per {self.window_sec} seconds."
                )
        except RateLimitException:
            raise
        except Exception as e:
            logger.warning(f"Redis rate limiter failed (fail-open): {str(e)}")
            return
