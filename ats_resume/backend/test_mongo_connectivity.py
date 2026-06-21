import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_mongo():
    uri = os.getenv("MONGO_URL")
    print(f"Connecting to: {uri[:30]}...")
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command('ping')
        print("MongoDB Ping successful!")
    except Exception as e:
        print(f"MongoDB Ping failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_mongo())
