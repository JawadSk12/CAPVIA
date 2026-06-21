import uuid
from typing import AsyncGenerator, Optional, List
from fastapi import Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from capvia_platform.core.config import settings
from capvia_platform.core.exceptions import AuthorizationException
from capvia_platform.database.connection import get_db_session
from capvia_platform.models.models import User, UserRole
from capvia_platform.utils.auth import decode_token
from capvia_platform.utils.jwt import (
    verify_system_jwt as verify_sys_token, 
    verify_candidate_jwt as verify_cand_token
)

# HTTPBearer security scheme
security_scheme = HTTPBearer(auto_error=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency yielding a database session with transaction management.
    """
    async with get_db_session() as session:
        yield session

async def get_redis(request: Request) -> AsyncGenerator[aioredis.Redis, None]:
    """
    Dependency yielding a Redis client connection.
    """
    if not hasattr(request.app.state, "redis_pool"):
        url = settings.REDIS_URL or "redis://localhost:6379/0"
        request.app.state.redis_pool = aioredis.ConnectionPool.from_url(url)
    
    client = aioredis.Redis(connection_pool=request.app.state.redis_pool)
    try:
        yield client
    finally:
        await client.close()

def get_system_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    """
    Dependency validating system-to-service calls using JWT and returning token claims.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AuthorizationException("Bearer token required")
    return verify_sys_token(credentials.credentials, expected_audience="CAPVIA_CORE")

def get_candidate_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    """
    Dependency validating candidate kiosk calls using JWT and returning token claims.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AuthorizationException("Bearer token required")
    return verify_cand_token(credentials.credentials, expected_audience="CAPVIA_CORE")

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency that decodes the access token and returns the current authenticated User.
    Raises AuthorizationException if credentials are missing or invalid.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AuthorizationException("Bearer authentication token is missing")
        
    payload = decode_token(credentials.credentials, expected_type="access")
    user_id_str = payload.get("sub")
    
    if not user_id_str:
        raise AuthorizationException("Token subject is missing")
        
    user_uuid = uuid.UUID(user_id_str)
    user = await db.get(User, user_uuid)
    
    if not user:
        raise AuthorizationException("User account associated with token was not found")
        
    if not user.is_active:
        raise AuthorizationException("User account is currently disabled")
        
    return user

class RoleChecker:
    """
    RBAC authorization validation dependency. Enforces role memberships.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.lower() for r in allowed_roles]

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        # Convert DB role enum to equivalent client role
        db_role = user.role.value
        role_mapping = {
            "STUDENT": "candidate",
            "HR": "hr",
            "ADMIN": "admin"
        }
        mapped_role = role_mapping.get(db_role, "candidate").lower()
        
        # Check against list of allowed roles
        if mapped_role not in self.allowed_roles and db_role.lower() not in self.allowed_roles:
            raise AuthorizationException(
                f"Access denied. User role '{mapped_role}' lacks permissions for this endpoint."
            )
            
        return user
