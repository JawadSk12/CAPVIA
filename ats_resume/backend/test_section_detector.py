import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.getcwd())) # append project root
from backend.db.mongodb import get_mongo_db, Collections
from ai_engine.utils.section_detector import SectionDetector

async def main():
    mongo_db = await get_mongo_db()
    # get the latest resume
    doc = await mongo_db[Collections.RESUMES].find_one(sort=[("created_at", -1)])
    if not doc:
        print("No resume found")
        return
    
    raw_text = doc.get("raw_text", "")
    print(f"RAW TEXT LENGTH: {len(raw_text)}")
    print("RAW TEXT (first 1000 chars):\n" + raw_text[:1000])
    
    detector = SectionDetector()
    sections = detector.detect(raw_text)
    print("\n--- DETECTED SECTIONS ---")
    for k, v in sections.items():
        if k != "raw":
            print(f"[{k}] (len={len(v)})")
            print(f"[{k}] text: {v[:100]}...")

asyncio.run(main())
