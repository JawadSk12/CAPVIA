from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from capvia_platform.core.exceptions import BaseAPIException
from capvia_platform.core.logger import logger
import traceback
from datetime import datetime, timezone

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        loc = [str(x) for x in error.get("loc", [])]
        if len(loc) > 1 and loc[0] == "body":
            field = " -> ".join(loc[1:])
        else:
            field = " -> ".join(loc)
        msg = error.get("msg", "Invalid value")
        errors.append(f"{field}: {msg}")
    
    message = "Validation failed: " + "; ".join(errors)
    logger.warning(f"Validation Exception on {request.url}: {message}")
    
    trace_id = getattr(request.state, "trace_id", "trace_id_unavailable")
    origin = request.headers.get("origin", "http://localhost:3000")
    
    return JSONResponse(
        status_code=422,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            "X-Trace-ID": trace_id,
        },
        content={
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "message": message,
            "developer_message": str(exc.errors()),
            "trace_id": trace_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": exc.errors()
            }
        }
    )

async def global_exception_handler(request: Request, exc: Exception):
    trace_id = getattr(request.state, "trace_id", "trace_id_unavailable")
    origin = request.headers.get("origin", "http://localhost:3000")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "X-Trace-ID": trace_id,
    }

    if isinstance(exc, BaseAPIException):
        logger.warning(f"API Exception: {exc.code} - {exc.message} | Details: {exc.details}")
        return JSONResponse(
            status_code=exc.status_code,
            headers=headers,
            content={
                "success": False,
                "error_code": exc.code,
                "message": exc.message,
                "developer_message": str(exc.details or ""),
                "trace_id": trace_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )
    
    # Unhandled server errors (hide stack trace from user, log it internally)
    logger.error(f"Unhandled Exception on {request.url} [Trace: {trace_id}]: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        headers=headers,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred.",
            "developer_message": "Consult backend logs for this Trace ID.",
            "trace_id": trace_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }
    )


