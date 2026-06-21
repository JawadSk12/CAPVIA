"""Make description nullable

Revision ID: 2ea5957f5c65
Revises: dc3237f5cbbd
Create Date: 2026-04-29 06:38:37.289749

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '2ea5957f5c65'
down_revision = 'dc3237f5cbbd'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.alter_column('questions', 'description', nullable=True)

def downgrade() -> None:
    op.alter_column('questions', 'description', nullable=False)
