import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from capvia_platform.core.logger import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercept HTTP requests to log endpoint routes, 
    status codes, and total execution durations.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request receipt
        logger.info(f"---> {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            
            # Log successful or client-error completion
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                f"<--- {request.method} {request.url.path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration_ms:.2f}ms"
            )
            return response
            
        except Exception as e:
            # Errors are handled by the global error handler middleware,
            # but logging here provides visibility in case of crash before handler
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"<--- {request.method} {request.url.path} FAILED | "
                f"Error: {str(e)} | "
                f"Duration: {duration_ms:.2f}ms"
            )
            raise e
