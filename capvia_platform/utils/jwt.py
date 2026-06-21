import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from jose import jwt, JWTError
from capvia_platform.core.config import settings
from capvia_platform.core.exceptions import AuthorizationException

# Secret keys and algorithms
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

def create_system_jwt(audience: str, expires_in_sec: int = 300) -> str:
    """
    Creates a short-lived System-to-Service JWT.
    """
    now = datetime.utcnow()
    payload = {
        "iss": "CAPVIA_CORE",
        "aud": audience,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in_sec),
        "roles": ["system_admin"]
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_system_jwt(token: str, expected_audience: str) -> Dict[str, Any]:
    """
    Verifies a System-to-Service JWT.
    """
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM], 
            audience=expected_audience
        )
        # Check issuer
        if payload.get("iss") != "CAPVIA_CORE":
            raise AuthorizationException("Invalid token issuer")
        
        # Check roles
        roles = payload.get("roles", [])
        if "system_admin" not in roles:
            raise AuthorizationException("Missing system_admin authorization role")
            
        return payload
    except JWTError as e:
        raise AuthorizationException(f"Invalid system token: {str(e)}")

def create_candidate_jwt(candidate_uuid: str, application_id: str, audience: str, expires_in_sec: int = 7200) -> str:
    """
    Creates a short-lived Kiosk JWT for candidates.
    """
    now = datetime.utcnow()
    payload = {
        "iss": "CAPVIA_CORE",
        "sub": str(candidate_uuid),
        "aud": audience,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in_sec),
        "application_id": str(application_id)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_candidate_jwt(token: str, expected_audience: str) -> Dict[str, Any]:
    """
    Verifies a Candidate Kiosk JWT.
    """
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM], 
            audience=expected_audience
        )
        if payload.get("iss") != "CAPVIA_CORE":
            raise AuthorizationException("Invalid token issuer")
        
        if not payload.get("sub") or not payload.get("application_id"):
            raise AuthorizationException("Token lacks required candidate/application identifiers")
            
        return payload
    except JWTError as e:
        raise AuthorizationException(f"Invalid candidate token: {str(e)}")
