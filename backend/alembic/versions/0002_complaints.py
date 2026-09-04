"""Add complaints

Revision ID: 0002_complaints
Revises: 0001_initial
Create Date: 2026-09-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_complaints'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('complaints',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('urban_issue_id', sa.String(length=50), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('source', sa.Enum('ai_detected', 'citizen_reported', 'operator_created', name='complaintsource'), nullable=False),
        sa.Column('status', sa.Enum('open', 'under_review', 'linked_to_issue', 'resolved', 'closed', name='complaintstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['urban_issue_id'], ['urban_issues.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    pass
