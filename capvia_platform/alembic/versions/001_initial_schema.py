"""Initial CAPVIA Database Schema

Revision ID: 001_initial_schema
Revises: None
Create Date: 2026-06-17 15:10:00

"""
from typing import Sequence, Union
import os
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Resolve absolute path to schema.sql relative to this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sql_path = os.path.join(current_dir, '..', '..', 'database', 'schema.sql')
    
    with open(sql_path, 'r') as f:
        sql_script = f.read()
    
    # Execute the raw SQL script block against the PostgreSQL database.
    # Since Postgres allows multiple statements in a single execute for DDL scripts,
    # but asyncpg prepared statements do not, we use the raw asyncpg driver connection.
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql' and 'asyncpg' in connection.dialect.driver:
        from sqlalchemy.util import await_only
        raw_asyncpg = connection.connection.driver_connection
        await_only(raw_asyncpg.execute(sql_script))
    else:
        connection.execute(sa.text(sql_script))

def downgrade() -> None:
    # Rollback DDL statements in order of dependency
    op.execute("DROP TRIGGER IF EXISTS trigger_reports_updated_at ON reports;")
    op.execute("DROP TRIGGER IF EXISTS trigger_rankings_updated_at ON rankings;")
    op.execute("DROP TRIGGER IF EXISTS trigger_dna_profiles_updated_at ON dna_profiles;")
    op.execute("DROP TRIGGER IF EXISTS trigger_integrity_results_updated_at ON integrity_results;")
    op.execute("DROP TRIGGER IF EXISTS trigger_interview_results_updated_at ON interview_results;")
    op.execute("DROP TRIGGER IF EXISTS trigger_simulation_results_updated_at ON simulation_results;")
    op.execute("DROP TRIGGER IF EXISTS trigger_ats_results_updated_at ON ats_results;")
    op.execute("DROP TRIGGER IF EXISTS trigger_application_mappings_updated_at ON application_mappings;")
    op.execute("DROP TRIGGER IF EXISTS trigger_vacancy_mappings_updated_at ON vacancy_mappings;")
    op.execute("DROP TRIGGER IF EXISTS trigger_candidate_mappings_updated_at ON candidate_mappings;")
    op.execute("DROP TRIGGER IF EXISTS trigger_applications_updated_at ON applications;")
    op.execute("DROP TRIGGER IF EXISTS trigger_internships_updated_at ON internships;")
    op.execute("DROP TRIGGER IF EXISTS trigger_companies_updated_at ON companies;")
    op.execute("DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;")
    
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")
    
    op.execute("DROP TABLE IF EXISTS notifications CASCADE;")
    op.execute("DROP TABLE IF EXISTS activity_logs CASCADE;")
    op.execute("DROP TABLE IF EXISTS reports CASCADE;")
    op.execute("DROP TABLE IF EXISTS rankings CASCADE;")
    op.execute("DROP TABLE IF EXISTS dna_profiles CASCADE;")
    op.execute("DROP TABLE IF EXISTS integrity_results CASCADE;")
    op.execute("DROP TABLE IF EXISTS interview_results CASCADE;")
    op.execute("DROP TABLE IF EXISTS simulation_results CASCADE;")
    op.execute("DROP TABLE IF EXISTS ats_results CASCADE;")
    op.execute("DROP TABLE IF EXISTS application_mappings CASCADE;")
    op.execute("DROP TABLE IF EXISTS vacancy_mappings CASCADE;")
    op.execute("DROP TABLE IF EXISTS candidate_mappings CASCADE;")
    op.execute("DROP TABLE IF EXISTS applications CASCADE;")
    op.execute("DROP TABLE IF EXISTS internships CASCADE;")
    op.execute("DROP TABLE IF EXISTS companies CASCADE;")
    op.execute("DROP TABLE IF EXISTS users CASCADE;")
    
    op.execute("DROP TYPE IF EXISTS application_status;")
    op.execute("DROP TYPE IF EXISTS recommendation_type;")
    op.execute("DROP TYPE IF EXISTS risk_level;")
    op.execute("DROP TYPE IF EXISTS stage_name;")
    op.execute("DROP TYPE IF EXISTS user_role;")
