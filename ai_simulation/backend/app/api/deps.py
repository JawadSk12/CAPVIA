"""
API Dependencies
Provides dependency injection for FastAPI routes
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.db.session import get_db
from app.core.security import decode_token, verify_token_type
from app.models.user import User, UserRole
from app.repositories.user_repository import user_repository
from loguru import logger


# Security scheme
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Get current authenticated user
    
    Args:
        db: Database session
        credentials: JWT credentials
    
    Returns:
        Current user
    
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Decode token
        token = credentials.credentials
        payload = decode_token(token)
        
        # Verify token type
        if not verify_token_type(payload, "access"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Get user ID from token
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        
        # Get user from database
        user = user_repository.get(db, id=int(user_id))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        
        return user
        
    except JWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user
    
    Args:
        current_user: Current user from token
    
    Returns:
        Active user
    
    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current admin user
    
    Args:
        current_user: Current user from token
    
    Returns:
        Admin user
    
    Raises:
        HTTPException: If user is not admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def require_hr(current_user: User = Depends(get_current_active_user)) -> User:
    """Require HR or super-admin role."""
    if not current_user.is_hr:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HR access required")
    return current_user


def require_candidate(current_user: User = Depends(get_current_active_user)) -> User:
    """Require candidate role."""
    if not current_user.is_candidate:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate access required")
    return current_user


def get_optional_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security)
) -> Optional[User]:
    """
    Get user if authenticated, None otherwise
    
    Args:
        db: Database session
        credentials: Optional JWT credentials
    
    Returns:
        User or None
    """
    if not credentials:
        return None
    
    try:
        return get_current_user(db, credentials)
    except HTTPException:
        return None