import asyncio
import sys
import os
import json
sys.path.append(os.path.dirname(os.getcwd())) # append project root
from backend.db.mongodb import get_mongo_db, Collections
from ai_engine.utils.section_detector import SectionDetector
from ai_engine.models.ner_extractor import NERExtractor

async def main():
    mongo_db = await get_mongo_db()
    doc = await mongo_db[Collections.RESUMES].find_one({"raw_text": {"$regex": "JAWAD"}}, sort=[("created_at", -1)])
    if not doc:
        print("No resume found")
        return
    
    raw_text = doc.get("raw_text", "")
    detector = SectionDetector()
    sections = detector.detect(raw_text)
    
    # We should merge 'skills' into 'projects' if it looks like they are interleaved
    # Actually just run NER
    extractor = NERExtractor()
    parsed = extractor.extract(sections)
    
    print("Parsed output:")
    print(json.dumps(parsed, indent=2))

asyncio.run(main())
