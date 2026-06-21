"""
Custom Exceptions Module
Defines all custom exceptions used throughout the application
"""

from typing import Any, Optional
from fastapi import HTTPException, status


class BaseAppException(Exception):
    """Base exception for all custom exceptions"""
    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


# ========================================
# AUTHENTICATION EXCEPTIONS
# ========================================
class AuthenticationException(BaseAppException):
    """Raised when authentication fails"""
    pass


class InvalidCredentialsException(AuthenticationException):
    """Raised when login credentials are invalid"""
    pass


class TokenExpiredException(AuthenticationException):
    """Raised when JWT token has expired"""
    pass


class InvalidTokenException(AuthenticationException):
    """Raised when JWT token is invalid"""
    pass


class InsufficientPermissionsException(AuthenticationException):
    """Raised when user doesn't have required permissions"""
    pass


# ========================================
# SESSION EXCEPTIONS
# ========================================
class SessionException(BaseAppException):
    """Base exception for session-related errors"""
    pass


class SessionNotFoundException(SessionException):
    """Raised when session is not found"""
    pass


class SessionExpiredException(SessionException):
    """Raised when test session has expired"""
    pass


class SessionAlreadyCompletedException(SessionException):
    """Raised when trying to access completed session"""
    pass


class SessionNotStartedException(SessionException):
    """Raised when trying to submit before session starts"""
    pass


class InvalidAccessCodeException(SessionException):
    """Raised when access code is invalid"""
    pass


# ========================================
# SUBMISSION EXCEPTIONS
# ========================================
class SubmissionException(BaseAppException):
    """Base exception for submission-related errors"""
    pass


class DuplicateSubmissionException(SubmissionException):
    """Raised when trying to submit same question twice"""
    pass


class InvalidSubmissionException(SubmissionException):
    """Raised when submission data is invalid"""
    pass


class SubmissionTimeoutException(SubmissionException):
    """Raised when submission is made after time limit"""
    pass


# ========================================
# CODE EXECUTION EXCEPTIONS
# ========================================
class CodeExecutionException(BaseAppException):
    """Base exception for code execution errors"""
    pass


class CompilationErrorException(CodeExecutionException):
    """Raised when code compilation fails"""
    pass


class RuntimeErrorException(CodeExecutionException):
    """Raised when code execution fails at runtime"""
    pass


class TimeoutException(CodeExecutionException):
    """Raised when code execution times out"""
    pass


class MemoryLimitException(CodeExecutionException):
    """Raised when code exceeds memory limit"""
    pass


class UnsupportedLanguageException(CodeExecutionException):
    """Raised when programming language is not supported"""
    pass


# ========================================
# EVALUATION EXCEPTIONS
# ========================================
class EvaluationException(BaseAppException):
    """Base exception for evaluation-related errors"""
    pass


class InvalidQuestionTypeException(EvaluationException):
    """Raised when question type is invalid"""
    pass


class EvaluationFailedException(EvaluationException):
    """Raised when evaluation process fails"""
    pass


class AIDetectionException(EvaluationException):
    """Raised when AI-generated content is detected"""
    pass


# ========================================
# DATABASE EXCEPTIONS
# ========================================
class DatabaseException(BaseAppException):
    """Base exception for database errors"""
    pass


class RecordNotFoundException(DatabaseException):
    """Raised when database record is not found"""
    pass


class DuplicateRecordException(DatabaseException):
    """Raised when trying to create duplicate record"""
    pass


class DatabaseConnectionException(DatabaseException):
    """Raised when database connection fails"""
    pass


# ========================================
# VALIDATION EXCEPTIONS
# ========================================
class ValidationException(BaseAppException):
    """Base exception for validation errors"""
    pass


class InvalidInputException(ValidationException):
    """Raised when input validation fails"""
    pass


class MissingRequiredFieldException(ValidationException):
    """Raised when required field is missing"""
    pass


# ========================================
# RATE LIMITING EXCEPTIONS
# ========================================
class RateLimitException(BaseAppException):
    """Raised when rate limit is exceeded"""
    pass


# ========================================
# FILE PROCESSING EXCEPTIONS
# ========================================
class FileProcessingException(BaseAppException):
    """Base exception for file processing errors"""
    pass


class InvalidFileTypeException(FileProcessingException):
    """Raised when file type is not allowed"""
    pass


class FileSizeLimitException(FileProcessingException):
    """Raised when file size exceeds limit"""
    pass


# ========================================
# HELPER FUNCTIONS TO CONVERT TO HTTP EXCEPTIONS
# ========================================
def to_http_exception(exception: BaseAppException) -> HTTPException:
    """
    Convert custom exception to FastAPI HTTPException
    
    Args:
        exception: Custom application exception
    
    Returns:
        HTTPException: FastAPI HTTP exception
    """
    exception_mapping = {
        # Authentication
        AuthenticationException: status.HTTP_401_UNAUTHORIZED,
        InvalidCredentialsException: status.HTTP_401_UNAUTHORIZED,
        TokenExpiredException: status.HTTP_401_UNAUTHORIZED,
        InvalidTokenException: status.HTTP_401_UNAUTHORIZED,
        InsufficientPermissionsException: status.HTTP_403_FORBIDDEN,
        
        # Session
        SessionNotFoundException: status.HTTP_404_NOT_FOUND,
        SessionExpiredException: status.HTTP_410_GONE,
        SessionAlreadyCompletedException: status.HTTP_410_GONE,
        SessionNotStartedException: status.HTTP_400_BAD_REQUEST,
        InvalidAccessCodeException: status.HTTP_401_UNAUTHORIZED,
        
        # Submission
        DuplicateSubmissionException: status.HTTP_409_CONFLICT,
        InvalidSubmissionException: status.HTTP_400_BAD_REQUEST,
        SubmissionTimeoutException: status.HTTP_408_REQUEST_TIMEOUT,
        
        # Code Execution
        CompilationErrorException: status.HTTP_422_UNPROCESSABLE_ENTITY,
        RuntimeErrorException: status.HTTP_422_UNPROCESSABLE_ENTITY,
        TimeoutException: status.HTTP_408_REQUEST_TIMEOUT,
        MemoryLimitException: status.HTTP_507_INSUFFICIENT_STORAGE,
        UnsupportedLanguageException: status.HTTP_400_BAD_REQUEST,
        
        # Evaluation
        InvalidQuestionTypeException: status.HTTP_400_BAD_REQUEST,
        EvaluationFailedException: status.HTTP_500_INTERNAL_SERVER_ERROR,
        AIDetectionException: status.HTTP_422_UNPROCESSABLE_ENTITY,
        
        # Database
        RecordNotFoundException: status.HTTP_404_NOT_FOUND,
        DuplicateRecordException: status.HTTP_409_CONFLICT,
        DatabaseConnectionException: status.HTTP_503_SERVICE_UNAVAILABLE,
        
        # Validation
        InvalidInputException: status.HTTP_422_UNPROCESSABLE_ENTITY,
        MissingRequiredFieldException: status.HTTP_422_UNPROCESSABLE_ENTITY,
        
        # Rate Limiting
        RateLimitException: status.HTTP_429_TOO_MANY_REQUESTS,
        
        # File Processing
        InvalidFileTypeException: status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        FileSizeLimitException: status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
    }
    
    status_code = exception_mapping.get(
        type(exception),
        status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    return HTTPException(
        status_code=status_code,
        detail={
            "message": exception.message,
            "details": exception.details
        }
    )