"""Phase 15 — Ranking Engine Fields

Revision ID: 003_ranking_engine_fields
Revises: 002_integrity_engine_fields
Create Date: 2026-06-21 13:00:00

Adds Phase 15 Ranking Engine columns to rankings table:
  - final_score (weighted composite, 0-100)
  - ats_component, simulation_component, interview_component, integrity_component
  - ats_raw_score, simulation_raw_score, interview_raw_score, integrity_raw_score
  - internship_rank, company_rank, global_percentile
  - is_top_candidate, recommendation_tier, data_completeness
  - explainability, score_breakdown, ranking_analytics, audit_trail (JSONB)
  - legacy score / rank columns made nullable
  - New partial indexes for ranking queries
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '003_ranking_engine_fields'
down_revision: Union[str, None] = '002_integrity_engine_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Phase 15: Weighted composite score
    op.add_column('rankings', sa.Column('final_score', sa.Numeric(5, 2), nullable=True))

    # Phase 15: Per-component weighted contributions
    op.add_column('rankings', sa.Column('ats_component', sa.Numeric(5, 2), nullable=True))
    op.add_column('rankings', sa.Column('simulation_component', sa.Numeric(5, 2), nullable=True))
    op.add_column('rankings', sa.Column('interview_component', sa.Numeric(5, 2), nullable=True))
    op.add_column('rankings', sa.Column('integrity_component', sa.Numeric(5, 2), nullable=True))

    # Phase 15: Raw source scores (pre-weighting)
    op.add_column('rankings', sa.Column('ats_raw_score', sa.Numeric(5, 2), nullable=True))
    op.add_column('rankings', sa.Column('simulation_raw_score', sa.Numeric(5, 2), nullable=True))
    op.add_column('rankings', sa.Column('interview_raw_score', sa.Numeric(5, 2), nullable=True))
    op.add_column('rankings', sa.Column('integrity_raw_score', sa.Numeric(5, 2), nullable=True))

    # Phase 15: Computed ranking positions
    op.add_column('rankings', sa.Column('internship_rank', sa.Integer(), nullable=True))
    op.add_column('rankings', sa.Column('company_rank', sa.Integer(), nullable=True))
    op.add_column('rankings', sa.Column('global_percentile', sa.Numeric(5, 2), nullable=True))

    # Phase 15: Derived signals
    op.add_column('rankings', sa.Column('is_top_candidate', sa.Boolean(), nullable=False, server_default='FALSE'))
    op.add_column('rankings', sa.Column('recommendation_tier', sa.String(50), nullable=True))
    op.add_column('rankings', sa.Column('data_completeness', sa.Numeric(5, 4), nullable=True))

    # Phase 15: JSONB explainability & analytics
    op.add_column('rankings', sa.Column('explainability', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('rankings', sa.Column('score_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('rankings', sa.Column('ranking_analytics', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('rankings', sa.Column('audit_trail', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Make legacy columns nullable (were NOT NULL before)
    op.alter_column('rankings', 'score', nullable=True)
    op.alter_column('rankings', 'rank', nullable=True)

    # Phase 15 indexes
    op.create_index(
        'idx_rankings_internship_final_score',
        'rankings',
        ['internship_id', sa.text('final_score DESC NULLS LAST')],
        postgresql_where=sa.text('deleted_at IS NULL'),
    )
    op.create_index(
        'idx_rankings_internship_rank',
        'rankings',
        ['internship_id', sa.text('internship_rank ASC NULLS LAST')],
        postgresql_where=sa.text('deleted_at IS NULL'),
    )
    op.create_index(
        'idx_rankings_top_candidates',
        'rankings',
        ['internship_id'],
        postgresql_where=sa.text('is_top_candidate = TRUE AND deleted_at IS NULL'),
    )


def downgrade() -> None:
    op.drop_index('idx_rankings_top_candidates', table_name='rankings')
    op.drop_index('idx_rankings_internship_rank', table_name='rankings')
    op.drop_index('idx_rankings_internship_final_score', table_name='rankings')

    op.alter_column('rankings', 'rank', nullable=False)
    op.alter_column('rankings', 'score', nullable=False)

    op.drop_column('rankings', 'audit_trail')
    op.drop_column('rankings', 'ranking_analytics')
    op.drop_column('rankings', 'score_breakdown')
    op.drop_column('rankings', 'explainability')
    op.drop_column('rankings', 'data_completeness')
    op.drop_column('rankings', 'recommendation_tier')
    op.drop_column('rankings', 'is_top_candidate')
    op.drop_column('rankings', 'global_percentile')
    op.drop_column('rankings', 'company_rank')
    op.drop_column('rankings', 'internship_rank')
    op.drop_column('rankings', 'integrity_raw_score')
    op.drop_column('rankings', 'interview_raw_score')
    op.drop_column('rankings', 'simulation_raw_score')
    op.drop_column('rankings', 'ats_raw_score')
    op.drop_column('rankings', 'integrity_component')
    op.drop_column('rankings', 'interview_component')
    op.drop_column('rankings', 'simulation_component')
    op.drop_column('rankings', 'ats_component')
    op.drop_column('rankings', 'final_score')
