import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from pathlib import Path

# Load .env file variables manually to ensure DATABASE_URL is resolved correctly
_env_file = Path(__file__).resolve().parent / ".env"
if _env_file.exists():
    with open(_env_file) as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ.setdefault(key.strip(), val.strip().strip("'\""))

async def drop_all():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set and .env file not found/empty.")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
        tables = [row[0] for row in res]
        print("Tables to drop:", tables)
        for t in tables:
            await conn.execute(text(f'DROP TABLE IF EXISTS "{t}" CASCADE;'))
            
        res2 = await conn.execute(text("SELECT typname FROM pg_type JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace WHERE typnamespace = 'public'::regnamespace AND typtype = 'e';"))
        enums = [row[0] for row in res2]
        print("Enums to drop:", enums)
        for e in enums:
            await conn.execute(text(f'DROP TYPE IF EXISTS "{e}" CASCADE;'))
    await engine.dispose()
asyncio.run(drop_all())
