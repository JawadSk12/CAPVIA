"""
User Repository
Database operations for User model
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, UserStatus
from app.repositories.base import BaseRepository
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """
    User repository with custom methods
    """
    
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """
        Get user by email
        
        Args:
            db: Database session
            email: User email
        
        Returns:
            User instance or None
        """
        return db.query(User).filter(User.email == email).first()
    
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """
        Get user by username
        
        Args:
            db: Database session
            username: Username
        
        Returns:
            User instance or None
        """
        return db.query(User).filter(User.username == username).first()
    
    def create_user(self, db: Session, *, obj_in: UserCreate) -> User:
        """
        Create new user with hashed password
        
        Args:
            db: Database session
            obj_in: User creation schema
        
        Returns:
            Created user instance
        """
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            full_name=obj_in.full_name,
            hashed_password=get_password_hash(obj_in.password),
            role=obj_in.role if obj_in.role else UserRole.CANDIDATE,
            is_active=True,
            is_verified=False,
            phone=obj_in.phone,
            organization=obj_in.organization,
            position=obj_in.position,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def authenticate(
        self,
        db: Session,
        *,
        email: str,
        password: str
    ) -> Optional[User]:
        """
        Authenticate user with email and password
        
        Args:
            db: Database session
            email: User email
            password: Plain password
        
        Returns:
            User instance if authenticated, None otherwise
        """
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    def update_password(
        self,
        db: Session,
        *,
        user: User,
        new_password: str
    ) -> User:
        """
        Update user password
        
        Args:
            db: Database session
            user: User instance
            new_password: New plain password
        
        Returns:
            Updated user
        """
        user.hashed_password = get_password_hash(new_password)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def get_admins(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Get all admin users
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of admin users
        """
        return db.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])
        ).offset(skip).limit(limit).all()
    
    def get_candidates(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Get all candidate users
        
        Args:
            db: Database session
            skip: Pagination skip
            limit: Pagination limit
        
        Returns:
            List of candidates
        """
        return db.query(User).filter(
            User.role == UserRole.CANDIDATE
        ).offset(skip).limit(limit).all()
    
    def activate_user(self, db: Session, *, user: User) -> User:
        """
        Activate user account
        
        Args:
            db: Database session
            user: User instance
        
        Returns:
            Updated user
        """
        user.is_active = True
        user.status = UserStatus.ACTIVE
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def deactivate_user(self, db: Session, *, user: User) -> User:
        """
        Deactivate user account
        
        Args:
            db: Database session
            user: User instance
        
        Returns:
            Updated user
        """
        user.is_active = False
        user.status = UserStatus.INACTIVE
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def increment_login_count(self, db: Session, *, user: User) -> User:
        """
        Increment user login count
        
        Args:
            db: Database session
            user: User instance
        
        Returns:
            Updated user
        """
        from datetime import datetime
        current_count = int(user.login_count) if user.login_count else 0
        user.login_count = str(current_count + 1)
        user.last_login = datetime.utcnow().isoformat()
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


# Singleton instance
user_repository = UserRepository(User)