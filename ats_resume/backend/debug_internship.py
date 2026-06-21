import asyncio
from sqlalchemy import select
from db.postgres import AsyncSessionLocal
from models.internship import Internship
from models.user import User, UserRole
from core.auth import TokenPayload

async def test_list_internships():
    async with AsyncSessionLocal() as session:
        try:
            print("Attempting to list internships...")
            query = select(Internship)
            result = await session.execute(query)
            internships = result.scalars().all()
            print(f"Found {len(internships)} internships.")
            for i in internships:
                print(f"- {i.title} (ID: {i.id})")
        except Exception as e:
            print(f"Error listing internships: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_list_internships())
