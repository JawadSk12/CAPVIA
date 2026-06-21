"""
CAPVIA Phase 7 — Companies Module DDL Migration
Extends the companies table with full company profile fields.
Creates the company_members join table.
Adds the company_member_role enum type.
Safe: uses ALTER TABLE IF NOT EXISTS / CREATE TABLE IF NOT EXISTS patterns.
"""
import asyncio
import asyncpg
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_tLEN1ylR7PGq@ep-bitter-sea-ao65dvct-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

DDL_STATEMENTS = [
    # 1. Add company_member_role enum (safe no-op if exists)
    """
    DO $$ BEGIN
        CREATE TYPE company_member_role AS ENUM ('OWNER', 'MEMBER');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    """,

    # 2. Extend companies table — add new profile columns
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_url VARCHAR(512) DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS headquarters VARCHAR(255) DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INTEGER DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count VARCHAR(50) DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL;",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL;",

    # 3. Create company_members join table
    """
    CREATE TABLE IF NOT EXISTS company_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_role company_member_role NOT NULL DEFAULT 'MEMBER',
        joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_company_member UNIQUE (company_id, user_id)
    );
    """,

    # 4. Indexes for company_members
    "CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);",
    "CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);",

    # 5. Indexes for companies created_by
    "CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);",
]


async def run_migration():
    print("[CAPVIA] Connecting to Neon PostgreSQL...")
    # Convert SQLAlchemy URL format to asyncpg format
    url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    if "sslmode=require" in url:
        url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")

    conn = await asyncpg.connect(url, ssl="require")
    print("[CAPVIA] Connected. Running Companies Module DDL migration...")

    for i, stmt in enumerate(DDL_STATEMENTS, 1):
        stmt_preview = stmt.strip().split('\n')[0][:80]
        try:
            await conn.execute(stmt)
            print(f"  [{i}/{len(DDL_STATEMENTS)}] OK: {stmt_preview}")
        except Exception as e:
            print(f"  [{i}/{len(DDL_STATEMENTS)}] ERROR on: {stmt_preview}")
            print(f"    => {e}")

    await conn.close()
    print("\n[CAPVIA] Migration complete.")


if __name__ == "__main__":
    asyncio.run(run_migration())
