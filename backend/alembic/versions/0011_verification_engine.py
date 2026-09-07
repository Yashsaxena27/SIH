"""Add Closed-Loop Verification 2.0 decision engine columns.

Revision ID: 0011_verification_engine
Revises: 0010_spatial_geography_index
"""

from alembic import op

revision = "0011_verification_engine"
down_revision = "0010_spatial_geography_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE verifications
        ADD COLUMN IF NOT EXISTS verifier VARCHAR(100) DEFAULT 'TRANSIT_REINSPECTION',
        ADD COLUMN IF NOT EXISTS evidence_source VARCHAR(100) DEFAULT 'bus_dashcam',
        ADD COLUMN IF NOT EXISTS inspection_job_id VARCHAR(50) REFERENCES inspection_jobs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS rationale VARCHAR(1000),
        ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(100),
        ADD COLUMN IF NOT EXISTS comparison_metrics JSON,
        ADD COLUMN IF NOT EXISTS is_override BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS overrides_verification_id VARCHAR(50) REFERENCES verifications(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS operator_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_verifications_issue_id ON verifications(issue_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_verifications_ticket_id ON verifications(ticket_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_verifications_result ON verifications(result);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_verifications_result;")
    op.execute("DROP INDEX IF EXISTS idx_verifications_ticket_id;")
    op.execute("DROP INDEX IF EXISTS idx_verifications_issue_id;")
    op.execute(
        """
        ALTER TABLE verifications
        DROP COLUMN IF EXISTS operator_id,
        DROP COLUMN IF EXISTS overrides_verification_id,
        DROP COLUMN IF EXISTS is_override,
        DROP COLUMN IF EXISTS comparison_metrics,
        DROP COLUMN IF EXISTS failure_reason,
        DROP COLUMN IF EXISTS rationale,
        DROP COLUMN IF EXISTS inspection_job_id,
        DROP COLUMN IF EXISTS evidence_source,
        DROP COLUMN IF EXISTS verifier;
        """
    )
