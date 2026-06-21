"""
Seed script to generate 1000+ users, resumes, and ATS results into the databases.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Ensure correct Postgres credentials for the user's local setup
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:Almas@6060@localhost:5432/capvia"

import random
import uuid
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from db.postgres import create_all_tables, AsyncSessionLocal
from db.mongodb import get_mongo_db, create_indexes, Collections
from models.user import User, UserRole, Organization
from models.resume import Resume
from models.internship import Internship
from core.security import get_password_hash
from config import settings


def generate_name(i): return f"User{i} Test"
def generate_email(i): return f"user{i}@example.com"
def generate_company(i): return f"Company {i}"

async def seed_data():
    print("Initializing databases...")
    
    # Setup PostgreSQL
    await create_all_tables()
    print("PostgreSQL tables created.")
    
    # Setup MongoDB
    await create_indexes()
    db_mongo = await get_mongo_db()
    print("MongoDB indexes created.")

    # Shared password hash for all mock users
    mock_password_hash = get_password_hash("Almas@6060")

    users_to_insert = []
    resumes_to_insert = []
    mongo_resumes = []
    mongo_ats_results = []
    
    # ─── Create Mock Organizations ───────────────────────────────────────────
    orgs = []
    for i in range(5):
        org = Organization(
            id=str(uuid.uuid4()),
            name=generate_company(i),
            domain=f"company{i}.com",
            is_active=True,
        )
        orgs.append(org)
        
    print(f"Generated {len(orgs)} organizations.")
    
    # ─── Create 1000 Users ───────────────────────────────────────────────────
    print("Generating 1000+ mock users and resumes...")
    
    # 50 HR Users
    for i in range(50):
        org = random.choice(orgs)
        users_to_insert.append(
            User(
                id=str(uuid.uuid4()),
                email=f"hr{i}@{org.domain}",
                password_hash=mock_password_hash,
                full_name=generate_name(f"_hr_{i}"),
                role=UserRole.HR,
                org_id=org.id,
                is_active=True,
                is_email_verified=True,
            )
        )
        
    # 950 Student Users
    roles = ["Software Engineer", "Data Scientist", "Product Manager", "Frontend Developer", "Backend Engineer"]
    for i in range(950):
        user_id = str(uuid.uuid4())
        users_to_insert.append(
            User(
                id=user_id,
                email=generate_email(i),
                password_hash=mock_password_hash,
                full_name=generate_name(i),
                role=UserRole.STUDENT,
                org_id=None,
                is_active=True,
                is_email_verified=True,
            )
        )
        
        # Each student has 1 resume
        resume_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 100))
        
        resumes_to_insert.append(
            Resume(
                id=resume_id,
                user_id=user_id,
                original_filename=f"Resume_{i}.pdf",
                storage_url=f"s3://capvia-resumes-dev/{user_id}/{resume_id}.pdf",
                status="DONE",
                created_at=created_at,
                updated_at=created_at,
            )
        )
        
        # MongoDB: parsed resume
        mongo_resumes.append({
            "_id": resume_id,
            "user_id": user_id,
            "skills": [{"name": f"Skill {j}"} for j in range(random.randint(5, 15))],
            "experience": [{"company": generate_company(j), "title": "Developer"} for j in range(random.randint(1, 3))],
            "education": [{"degree": "Bachelor of Science", "institution": "University"}],
        })
        
        # MongoDB: ATS Result
        mongo_ats_results.append({
            "_id": resume_id,
            "resume_id": resume_id,
            "user_id": user_id,
            "overall_score": round(random.uniform(40.0, 95.0), 1),
            "detected_role": random.choice(roles),
            "fraud_analysis": {
                "is_suspicious": random.random() > 0.95,
                "fraud_probability": random.uniform(0.0, 1.0)
            },
            "created_at": created_at,
        })
        
    print("Inserting data into PostgreSQL in chunks...")
    async with AsyncSessionLocal() as session:
        session.add_all(orgs)
        await session.commit()
        
        # Insert users in chunks
        chunk_size = 200
        for i in range(0, len(users_to_insert), chunk_size):
            session.add_all(users_to_insert[i:i + chunk_size])
            await session.commit()
            print(f"  Inserted {min(i + chunk_size, len(users_to_insert))}/{len(users_to_insert)} users.")
            
        for i in range(0, len(resumes_to_insert), chunk_size):
            session.add_all(resumes_to_insert[i:i + chunk_size])
            await session.commit()
            print(f"  Inserted {min(i + chunk_size, len(resumes_to_insert))}/{len(resumes_to_insert)} resumes.")
            
    print("Inserting data into MongoDB...")
    if mongo_resumes:
        await db_mongo[Collections.RESUMES].insert_many(mongo_resumes)
    if mongo_ats_results:
        await db_mongo[Collections.ATS_RESULTS].insert_many(mongo_ats_results)
    
    print("✅ Seed process completed! 1000 users created successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
