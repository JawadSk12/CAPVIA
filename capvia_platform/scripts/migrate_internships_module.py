"""
CAPVIA Phase 8 — Internships Module DDL Migration
Extends the existing internships table with marketplace fields.
All statements are idempotent (IF NOT EXISTS / DO $$ BEGIN ... END $$).
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://neondb_owner:npg_tLEN1ylR7PGq@ep-bitter-sea-ao65dvct-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require"
)

DDL_STATEMENTS = [
    # 1. Add internship_status enum
    """
    DO $$ BEGIN
        CREATE TYPE internship_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    """,

    # 2. Add work_mode enum
    """
    DO $$ BEGIN
        CREATE TYPE work_mode AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    """,

    # 3. Status column
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS status internship_status NOT NULL DEFAULT 'DRAFT';",

    # 4. Work mode column
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS work_mode work_mode NOT NULL DEFAULT 'ONSITE';",

    # 5. Location
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL;",

    # 6. Stipend fields
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend_min INTEGER DEFAULT NULL;",
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend_max INTEGER DEFAULT NULL;",
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend_currency VARCHAR(10) NOT NULL DEFAULT 'INR';",

    # 7. Duration
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT NULL;",

    # 8. Application limits
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS application_limit INTEGER DEFAULT NULL;",
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS application_deadline DATE DEFAULT NULL;",
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS openings INTEGER NOT NULL DEFAULT 1;",

    # 9. Engagement tracking
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;",

    # 10. Ownership
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;",
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;",

    # 11. Slug (unique URL identifier)
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS slug VARCHAR(300) DEFAULT NULL;",

    # 12. Published timestamp
    "ALTER TABLE internships ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;",

    # 13. Indexes
    "CREATE INDEX IF NOT EXISTS idx_internships_company_status ON internships(company_id, status) WHERE deleted_at IS NULL;",
    "CREATE INDEX IF NOT EXISTS idx_internships_status ON internships(status) WHERE deleted_at IS NULL;",
    "CREATE INDEX IF NOT EXISTS idx_internships_created_by ON internships(created_by);",
    "CREATE INDEX IF NOT EXISTS idx_internships_deadline ON internships(application_deadline) WHERE deleted_at IS NULL;",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_internships_slug ON internships(slug) WHERE slug IS NOT NULL AND deleted_at IS NULL;",

    # 14a. Drop existing trigger if any
    "DROP TRIGGER IF EXISTS set_internships_updated_at ON internships;",

    # 14b. Re-create updated_at trigger
    """
    CREATE TRIGGER set_internships_updated_at
        BEFORE UPDATE ON internships
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """,
]


async def run_migration():
    print("[CAPVIA] Connecting to Neon PostgreSQL...")
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        print("[CAPVIA] Connected. Running Internships Module DDL migration...")
        for i, stmt in enumerate(DDL_STATEMENTS, 1):
            preview = stmt.strip().replace("\n", " ")[:80]
            try:
                await conn.execute(text(stmt))
                print(f"  [{i}/{len(DDL_STATEMENTS)}] OK: {preview}")
            except Exception as e:
                print(f"  [{i}/{len(DDL_STATEMENTS)}] ERROR: {preview}")
                print(f"    → {e}")
                raise

    await engine.dispose()
    print("\n[CAPVIA] Internships migration complete.\n")


if __name__ == "__main__":
    asyncio.run(run_migration())
