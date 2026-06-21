import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from jose import jwt, JWTError

from capvia_platform.core.config import settings
from capvia_platform.core.exceptions import AuthorizationException

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    """
    Hashes a plain text password using bcrypt directly.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against its bcrypt hash.
    """
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def hash_token(token: str) -> str:
    """
    Hashes a token string using SHA-256 to avoid storing raw refresh tokens.
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def create_access_token(user_id: str, email: str, role: str) -> str:
    """
    Generates a JWT Access Token.
    """
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "iss": "CAPVIA_CORE",
        "sub": str(user_id),
        "email": email,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """
    Generates a JWT Refresh Token.
    """
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "iss": "CAPVIA_CORE",
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Decodes and validates a JWT token. Raises AuthorizationException if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("iss") != "CAPVIA_CORE":
            raise AuthorizationException("Invalid token issuer")
            
        if payload.get("type") != expected_type:
            raise AuthorizationException(f"Invalid token type. Expected {expected_type}")
            
        return payload
    except JWTError as e:
        raise AuthorizationException(f"Invalid or expired credentials: {str(e)}")
