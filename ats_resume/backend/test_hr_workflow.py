import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from db.postgres import AsyncSessionLocal
from models.user import User, Organization, UserRole
from models.internship import Internship, ExperienceLevel
from core.auth import hash_password
from db.mongodb import get_mongo_db, Collections

async def setup_hr_test_data():
    async with AsyncSessionLocal() as session:
        print("--- PHASE 1: HR WORKFLOW TESTING ---")
        
        # 1. Create Organization
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id,
            name="Capvia Tech Solutions",
            domain="capvia.io",
            created_at=datetime.now(timezone.utc)
        )
        session.add(org)
        print(f"Created Organization: {org.name} (ID: {org_id})")
        
        # 2. Create HR User
        hr_id = str(uuid.uuid4())
        hr_user = User(
            id=hr_id,
            email="hr@capvia.io",
            password_hash=hash_password("capvia123"),
            full_name="HR Manager",
            role=UserRole.HR,
            org_id=org_id,
            is_active=True,
            is_email_verified=True,
            created_at=datetime.now(timezone.utc)
        )
        session.add(hr_user)
        print(f"Created HR User: {hr_user.email} (ID: {hr_id})")
        
        # 3. Create Internship JD (PostgreSQL part)
        jd_id = str(uuid.uuid4())
        internship = Internship(
            id=jd_id,
            created_by=hr_id,
            org_id=org_id,
            title="Senior Fullstack Developer Intern",
            company="Capvia",
            department="Engineering",
            location="Remote",
            is_remote=True,
            experience_level=ExperienceLevel.MID,
            short_description="Looking for an elite fullstack developer intern to build AI platforms.",
            application_deadline=datetime.now(timezone.utc) + timedelta(days=30),
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        session.add(internship)
        print(f"Created Internship JD: {internship.title} (ID: {jd_id})")
        
        await session.commit()

        # 4. Create Internship JD (MongoDB part)
        mongo_db = await get_mongo_db()
        jd_doc = {
            "_id": jd_id,
            "title": internship.title,
            "company": internship.company,
            "responsibilities": [
                "Build scalable microservices in Python",
                "Develop premium React interfaces",
                "Optimize AI model inference",
                "Design system architecture"
            ],
            "required_skills": ["Python", "React", "PostgreSQL", "Redis", "Docker", "FastAPI"],
            "preferred_skills": ["Machine Learning", "Kubernetes", "AWS", "Next.js"],
            "tools_and_technologies": ["Git", "Jira", "Slack"],
            "expected_projects": ["AI Resume Parser", "Real-time Chat App"],
            "experience_level": "mid",
            "full_jd_text": "Full JD text content goes here...",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await mongo_db[Collections.INTERNSHIPS].insert_one(jd_doc)
        print(f"Stored JD content in MongoDB (ID: {jd_id})")

        return {
            "hr_id": hr_id,
            "org_id": org_id,
            "jd_id": jd_id
        }

if __name__ == "__main__":
    asyncio.run(setup_hr_test_data())
