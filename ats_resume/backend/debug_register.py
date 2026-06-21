import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from db.postgres import AsyncSessionLocal, engine
from models.user import User, UserRole
from core.auth import hash_password
from datetime import datetime, timezone
import uuid

async def test_register():
    async with AsyncSessionLocal() as session:
        try:
            print("Attempting to create user...")
            new_user = User(
                email=f"test_{uuid.uuid4()}@example.com",
                password_hash=hash_password("Password123"),
                full_name="Test User",
                role=UserRole.STUDENT,
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            session.add(new_user)
            await session.commit()
            print(f"User created successfully with ID: {new_user.id}")
        except Exception as e:
            print(f"Error during registration: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(test_register())
