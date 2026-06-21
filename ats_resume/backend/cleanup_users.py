import asyncio
from db.postgres import AsyncSessionLocal
from models.user import User
from sqlalchemy import select, delete

async def cleanup():
    async with AsyncSessionLocal() as db:
        # Find all users
        res = await db.execute(select(User))
        users = res.scalars().all()
        
        seen = set()
        duplicates = []
        for user in users:
            if user.email in seen:
                duplicates.append(user.id)
            else:
                seen.add(user.email)
        
        if duplicates:
            print(f"Found {len(duplicates)} duplicate users. Deleting...")
            for uid in duplicates:
                await db.execute(delete(User).where(User.id == uid))
            await db.commit()
            print("Cleanup complete!")
        else:
            print("No duplicates found.")

if __name__ == "__main__":
    asyncio.run(cleanup())
