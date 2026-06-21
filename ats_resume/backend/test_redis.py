import asyncio
from db.redis_client import get_redis_client
async def main():
    r = get_redis_client()
    keys = await r.keys("resume:*")
    print(keys)
asyncio.run(main())
