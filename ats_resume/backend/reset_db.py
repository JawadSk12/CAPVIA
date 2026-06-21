import asyncio
from db.postgres import drop_all_tables, create_all_tables

async def reset_db():
    print("Dropping all tables...")
    await drop_all_tables()
    print("Recreating all tables...")
    await create_all_tables()
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_db())
