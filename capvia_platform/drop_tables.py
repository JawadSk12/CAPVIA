import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def drop_all():
    engine = create_async_engine(os.environ["DATABASE_URL"])
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
