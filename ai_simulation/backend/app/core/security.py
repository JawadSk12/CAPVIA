"""
Security Module
Handles authentication, password hashing, JWT token generation
"""

from datetime import datetime, timedelta
from typing import Any, Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.core.config import settings


# ========================================
# PASSWORD HASHING
# ========================================
pwd_context = CryptContext(
    schemes=settings.PWD_CONTEXT_SCHEMES,
    deprecated=settings.PWD_CONTEXT_DEPRECATED
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
    
    Returns:
        bool: True if password matches
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
    
    Returns:
        str: Hashed password
    """
    return pwd_context.hash(password)


# ========================================
# JWT TOKEN GENERATION
# ========================================
def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[dict] = None
) -> str:
    """
    Create JWT access token
    
    Args:
        subject: User identifier (usually user_id or email)
        expires_delta: Custom expiration time
        additional_claims: Additional data to include in token
    
    Returns:
        str: Encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access"
    }
    
    # Add additional claims if provided
    if additional_claims:
        to_encode.update(additional_claims)
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT refresh token
    
    Args:
        subject: User identifier
        expires_delta: Custom expiration time
    
    Returns:
        str: Encoded JWT refresh token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh"
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        dict: Decoded token payload
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token_type(payload: dict, expected_type: str) -> bool:
    """
    Verify that token is of expected type (access/refresh)
    
    Args:
        payload: Decoded token payload
        expected_type: Expected token type
    
    Returns:
        bool: True if token type matches
    """
    token_type = payload.get("type")
    return token_type == expected_type


# ========================================
# SESSION TOKEN GENERATION
# ========================================
def generate_session_token() -> str:
    """
    Generate unique session token for test sessions
    
    Returns:
        str: Random session token
    """
    import secrets
    return secrets.token_urlsafe(32)


def generate_test_access_code(length: int = 6) -> str:
    """
    Generate random access code for test sessions
    
    Args:
        length: Length of access code
    
    Returns:
        str: Random access code (uppercase alphanumeric)
    """
    import secrets
    import string
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ========================================
# API KEY GENERATION
# ========================================
def generate_api_key() -> str:
    """
    Generate API key for external integrations
    
    Returns:
        str: Random API key
    """
    import secrets
    return f"sk_{secrets.token_urlsafe(32)}"


# ========================================
# ENCRYPTION HELPERS
# ========================================
def encrypt_data(data: str) -> str:
    """
    Encrypt sensitive data (placeholder - implement with cryptography library)
    
    Args:
        data: Plain text data
    
    Returns:
        str: Encrypted data
    """
    # TODO: Implement proper encryption using Fernet or similar
    # For now, just return base64 encoded
    import base64
    return base64.b64encode(data.encode()).decode()


def decrypt_data(encrypted_data: str) -> str:
    """
    Decrypt sensitive data (placeholder)
    
    Args:
        encrypted_data: Encrypted data
    
    Returns:
        str: Decrypted plain text
    """
    # TODO: Implement proper decryption
    import base64
    return base64.b64decode(encrypted_data.encode()).decode()