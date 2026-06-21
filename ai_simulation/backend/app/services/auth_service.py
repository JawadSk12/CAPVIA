from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.exceptions import UnauthorizedError, ConflictError, NotFoundError

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserCreate) -> User:
        existing = await self.db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise ConflictError("User with this email already exists")
        user = User(email=data.email, name=data.name, hashed_password=hash_password(data.password), role=data.role)
        self.db.add(user)
        await self.db.flush()
        return user

    async def login(self, email: str, password: str) -> dict:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid credentials")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}

    async def get_user_by_id(self, user_id: str) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User")
        return user
