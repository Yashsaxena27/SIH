"""Seed the configured Delhi-NCR prototype authorities.

Revision ID: 0006_seed_delhi_ncr_departments
Revises: 0005_inspection_events
"""

from alembic import op


revision = "0006_seed_delhi_ncr_departments"
down_revision = "0005_inspection_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO departments (id, name, department_type, service_area, is_active)
        VALUES
          ('DELHI-NCR-ROADS', 'Delhi-NCR Road Infrastructure', 'maintenance', 'Delhi-NCR', true),
          ('NOIDA-GHAZIABAD-ROADS', 'Noida-Ghaziabad Road Works', 'maintenance', 'Noida-Ghaziabad', true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          department_type = EXCLUDED.department_type,
          service_area = EXCLUDED.service_area,
          is_active = EXCLUDED.is_active
        """
    )
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
    op.execute(
        """
        DELETE FROM departments
        WHERE id IN ('DELHI-NCR-ROADS', 'NOIDA-GHAZIABAD-ROADS')
        """
    )
