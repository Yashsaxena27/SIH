"""Add GiST geography expression index on urban_issues.

Revision ID: 0010_spatial_geography_index
Revises: 0009_jurisdiction_authority
"""

from alembic import op

revision = "0010_spatial_geography_index"
down_revision = "0009_jurisdiction_authority"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_urban_issues_location_geog
        ON urban_issues
        USING gist (((location)::geography));
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_urban_issues_location_geog;")
