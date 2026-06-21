from fastapi import Request
from fastapi.responses import JSONResponse
from capvia_platform.core.exceptions import BaseAPIException
from capvia_platform.core.logger import logger
import traceback

async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, BaseAPIException):
        logger.warning(f"API Exception: {exc.code} - {exc.message} | Details: {exc.details}")
        return JSONResponse(
            status_code=exc.status_code,
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
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }
    )
