"""Phase 13 — Integrity Engine Compiled Fields

Revision ID: 002_integrity_engine_fields
Revises: 001_initial_schema
Create Date: 2026-06-21 12:00:00

Adds Phase 13 Integrity Engine compiled-score columns to integrity_results table:
  - integrity_score
  - ai_dependency_score
  - trust_index
  - compiled_risk_level
  - confidence_level
  - explainability (JSONB)
  - scoring_formula (JSONB)
  - calibration_logic (JSONB)
  - audit_trail (JSONB)
  - historical_tracking (JSONB)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_integrity_engine_fields'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('integrity_results', sa.Column('integrity_score', sa.Integer(), nullable=True))
    op.add_column('integrity_results', sa.Column('ai_dependency_score', sa.Numeric(5, 4), nullable=True))
    op.add_column('integrity_results', sa.Column('trust_index', sa.Integer(), nullable=True))
    op.add_column('integrity_results', sa.Column('compiled_risk_level', sa.String(20), nullable=True))
    op.add_column('integrity_results', sa.Column('confidence_level', sa.Numeric(5, 4), nullable=True))
    op.add_column('integrity_results', sa.Column('explainability', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('integrity_results', sa.Column('scoring_formula', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('integrity_results', sa.Column('calibration_logic', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('integrity_results', sa.Column('audit_trail', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('integrity_results', sa.Column('historical_tracking', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('integrity_results', 'historical_tracking')
    op.drop_column('integrity_results', 'audit_trail')
    op.drop_column('integrity_results', 'calibration_logic')
    op.drop_column('integrity_results', 'scoring_formula')
    op.drop_column('integrity_results', 'explainability')
    op.drop_column('integrity_results', 'confidence_level')
    op.drop_column('integrity_results', 'compiled_risk_level')
    op.drop_column('integrity_results', 'trust_index')
    op.drop_column('integrity_results', 'ai_dependency_score')
    op.drop_column('integrity_results', 'integrity_score')
