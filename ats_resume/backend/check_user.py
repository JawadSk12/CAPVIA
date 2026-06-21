import asyncio
from db.postgres import AsyncSessionLocal
from models.user import User
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == 'umar@gmail.com'))
        user = res.scalar_one_or_none()
        if user:
            print(f"User found: {user.email}, Role: {user.role}, Active: {user.is_active}")
        else:
            print("User NOT found")

if __name__ == "__main__":
    asyncio.run(check())
