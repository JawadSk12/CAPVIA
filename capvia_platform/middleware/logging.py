import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from capvia_platform.core.logger import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts HTTP requests to log endpoint routes, 
    status codes, and total execution durations. Injects correlation trace IDs.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Generate trace ID for correlation
        trace_id = request.headers.get("X-Trace-ID") or f"tr_{uuid.uuid4().hex[:12]}"
        request.state.trace_id = trace_id
        
        # Log request receipt
        logger.info(f"---> [{trace_id}] {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            
            # Log successful or client-error completion
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                f"<--- [{trace_id}] {request.method} {request.url.path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration_ms:.2f}ms"
            )
            response.headers["X-Trace-ID"] = trace_id
            return response
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"<--- [{trace_id}] {request.method} {request.url.path} FAILED | "
                f"Error: {str(e)} | "
                f"Duration: {duration_ms:.2f}ms"
            )
            raise e
