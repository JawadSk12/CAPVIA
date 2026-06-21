import asyncio
from db.postgres import AsyncSessionLocal
from models.resume import Resume
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Resume).order_by(Resume.created_at.desc()).limit(1))
        resume = res.scalars().first()
        if resume:
            print(f"ID: {resume.id}, Status: {resume.status}, Error: {resume.error_message}")
            
asyncio.run(main())
