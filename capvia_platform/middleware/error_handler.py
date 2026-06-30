from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from capvia_platform.core.exceptions import BaseAPIException
from capvia_platform.core.logger import logger
import traceback

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
    
    origin = request.headers.get("origin", "http://localhost:3000")
    return JSONResponse(
        status_code=422,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": exc.errors()
            }
        }
    )

async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "http://localhost:3000")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }

    if isinstance(exc, BaseAPIException):
        logger.warning(f"API Exception: {exc.code} - {exc.message} | Details: {exc.details}")
        return JSONResponse(
            status_code=exc.status_code,
            headers=headers,
            content={
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )
    
    # Unhandled server errors
    logger.error(f"Unhandled Exception on {request.url}: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        headers=headers,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }
    )


