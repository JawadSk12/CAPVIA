from typing import Any, Dict, Optional

class BaseAPIException(Exception):
    """Base exception for all API errors."""
    def __init__(self, message: str, status_code: int = 400, code: str = "BAD_REQUEST", details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

class ResourceNotFoundException(BaseAPIException):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            message=f"{resource} with ID {resource_id} not found.",
            status_code=404,
            code="NOT_FOUND",
            details={"resource": resource, "resource_id": resource_id}
        )

class ValidationException(BaseAPIException):
    def __init__(self, message: str, errors: list):
        super().__init__(
            message=message,
            status_code=422,
            code="VALIDATION_ERROR",
            details={"errors": errors}
        )

class AuthorizationException(BaseAPIException):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message=message, status_code=401, code="UNAUTHORIZED")

class SystemIntegrationException(BaseAPIException):
    def __init__(self, subsystem: str, message: str):
        super().__init__(
            message=f"Integration error with {subsystem}: {message}",
            status_code=502,
            code="INTEGRATION_ERROR",
            details={"subsystem": subsystem}
        )
