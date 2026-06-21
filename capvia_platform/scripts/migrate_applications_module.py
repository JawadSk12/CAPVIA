"""
CAPVIA Phase 9 — Application Lifecycle Migration
Adds: WITHDRAWN + HIRED enum values, application_events table,
      cover_letter / resume_url / withdrawn_at / hired_at / rejection_reason columns.
Idempotent — safe to re-run.
"""
import asyncio
import os
import asyncpg

DATABASE_URL = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")

DDL = [
    # 1. Add WITHDRAWN to enum (safe if already exists)
    """
    DO $$ BEGIN
        ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """,

    # 2. Add HIRED to enum
    """
    DO $$ BEGIN
        ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'HIRED';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """,

    # 3. Add cover_letter to applications
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT DEFAULT NULL;",

    # 4. Add resume_url
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url VARCHAR(512) DEFAULT NULL;",

    # 5. Add withdrawn_at
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;",

    # 6. Add hired_at
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS hired_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;",

    # 7. Add rejection_reason
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;",

    # 8. Create application_events table
    """
    CREATE TABLE IF NOT EXISTS application_events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        event_type      VARCHAR(100) NOT NULL,
        from_status     VARCHAR(50)  DEFAULT NULL,
        to_status       VARCHAR(50)  DEFAULT NULL,
        actor_id        UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL,
        actor_role      VARCHAR(20)  DEFAULT NULL,
        event_metadata  JSONB        NOT NULL DEFAULT '{}',
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # 9. Index: events by application_id
    "CREATE INDEX IF NOT EXISTS idx_app_events_application_id ON application_events(application_id);",

    # 10. Index: events by actor
    "CREATE INDEX IF NOT EXISTS idx_app_events_actor_id ON application_events(actor_id);",

    # 11. Index: events by created_at desc (timeline queries)
    "CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON application_events(created_at DESC);",

    # 12. Index: applications by candidate
    "CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id) WHERE deleted_at IS NULL;",

    # 13. Index: applications by vacancy + status
    "CREATE INDEX IF NOT EXISTS idx_applications_vacancy_status ON applications(vacancy_id, status) WHERE deleted_at IS NULL;",
]


async def run_migration():
    print("[CAPVIA] Connecting to Neon PostgreSQL...")
    conn = await asyncpg.connect(DATABASE_URL)
    print("[CAPVIA] Running Phase 9 Application Lifecycle migration...")

    for i, ddl in enumerate(DDL, 1):
        stmt = ddl.strip()
        preview = stmt[:80].replace("\n", " ")
        try:
            await conn.execute(stmt)
            print(f"  [{i}/{len(DDL)}] OK: {preview}")
        except Exception as e:
            print(f"  [{i}/{len(DDL)}] ERROR: {preview}")
            print(f"         → {e}")
            raise

    await conn.close()
    print("\n[CAPVIA] Phase 9 migration complete.\n")


if __name__ == "__main__":
    asyncio.run(run_migration())
