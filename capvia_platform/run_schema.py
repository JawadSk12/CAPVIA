import asyncio
import asyncpg
import os

async def main():
    db_url = os.environ["DATABASE_URL"]
    # asyncpg requires postgresql:// not postgresql+asyncpg://
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(db_url)
    
    with open('database/schema.sql', 'r') as f:
        sql = f.read()
    
    try:
        await conn.execute(sql)
        print("Schema applied successfully.")
    except Exception as e:
        print("Error applying schema:", e)
    finally:
        await conn.close()

asyncio.run(main())
