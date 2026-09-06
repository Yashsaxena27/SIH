"""Persist inspection events for the upload results view."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_inspection_events"
down_revision: Union[str, None] = "0004_timeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("inspection_jobs", sa.Column("events", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("inspection_jobs", "events")
