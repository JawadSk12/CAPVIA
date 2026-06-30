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
    pass


def downgrade() -> None:
    pass
