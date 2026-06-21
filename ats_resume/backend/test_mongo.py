import asyncio
import json
from db.mongodb import get_mongo_db, Collections

async def main():
    mongo_db = await get_mongo_db()
    # Find the most recent analysis
    doc = await mongo_db[Collections.ATS_RESULTS].find_one(sort=[("created_at", -1)])
    if doc:
        print(json.dumps(doc, indent=2, default=str))
    else:
        print("No ATS results found in Mongo.")

asyncio.run(main())
