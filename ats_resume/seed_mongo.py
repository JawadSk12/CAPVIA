import asyncio
import json
import random
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

async def seed_mongo():
    print("Connecting to MongoDB Local...")
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["capvia_ats"]
    
    with open("resumes_data.json", "r") as f:
        resume_ids = json.load(f)
    with open("users_data.json", "r") as f:
        user_ids = json.load(f)
        
    print(f"Loaded {len(resume_ids)} resume tracking IDs.")
    
    mongo_resumes = []
    mongo_ats_results = []
    
    roles = ["Software Engineer", "Data Scientist", "Product Manager", "Frontend Developer", "Backend Engineer"]
    
    for resume_id, user_id in zip(resume_ids, user_ids):
        created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 100))
        
        # MongoDB: parsed resume
        mongo_resumes.append({
            "_id": resume_id,
            "user_id": user_id,
            "skills": [{"name": f"Skill {j}"} for j in range(random.randint(5, 15))],
            "experience": [{"company": f"Company {j}", "title": "Developer"} for j in range(random.randint(1, 3))],
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
        
    print("Inserting into MongoDB resumes collection...")
    if mongo_resumes:
        await db["resumes"].insert_many(mongo_resumes)
        
    print("Inserting into MongoDB ats_results collection...")
    if mongo_ats_results:
        await db["ats_results"].insert_many(mongo_ats_results)
        
    print("MongoDB seed completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_mongo())
