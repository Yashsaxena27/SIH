"""Seed the demo operator used by the browser ticket workflow.

Revision ID: 0007_seed_demo_operator
Revises: 0006_seed_delhi_ncr_departments
"""

from alembic import op


revision = "0007_seed_demo_operator"
down_revision = "0006_seed_delhi_ncr_departments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO users (id, name, email, hashed_password, role, department_id, is_active)
        VALUES (
          'OP-001',
          'Delhi-NCR Operations Officer',
          'operator.demo@pothole-wala.local',
          'demo-only-no-login',
          'operator',
          'DELHI-NCR-ROADS',
          true
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          department_id = EXCLUDED.department_id,
          is_active = EXCLUDED.is_active
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE id = 'OP-001'")
