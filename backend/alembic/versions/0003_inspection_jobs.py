"""Add inspection_jobs

Revision ID: 0003_inspection_jobs
Revises: 0002_complaints
Create Date: 2026-09-04 12:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_inspection_jobs'
down_revision: Union[str, None] = '0002_complaints'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('inspection_jobs',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('bus_id', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=True),
        sa.Column('video_metadata', sa.JSON(), nullable=True),
        sa.Column('statistics', sa.JSON(), nullable=True),
        sa.Column('annotated_video_url', sa.String(length=500), nullable=True),
        sa.Column('error', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['bus_id'], ['buses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    pass
