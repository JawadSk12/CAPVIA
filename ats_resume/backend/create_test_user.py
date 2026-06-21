import asyncio
from db.postgres import AsyncSessionLocal
from models.user import User, UserRole
from core.auth import hash_password
from sqlalchemy import select

async def create_test_user():
    async with AsyncSessionLocal() as db:
        # Check if exists
        res = await db.execute(select(User).where(User.email == "test@capvia.com"))
        if res.scalar_one_or_none():
            print("User test@capvia.com already exists. Updating password...")
            res = await db.execute(select(User).where(User.email == "test@capvia.com"))
            user = res.scalar_one()
        else:
            print("Creating new user test@capvia.com...")
            user = User(
                email="test@capvia.com",
                full_name="Test User",
                role=UserRole.STUDENT,
                is_active=True,
                is_email_verified=True
            )
            db.add(user)
        
        user.password_hash = hash_password("Capvia2024!")
        await db.commit()
        print("Success! You can now login with test@capvia.com / Capvia2024!")

if __name__ == "__main__":
    asyncio.run(create_test_user())
