"""Seed the configured Delhi-NCR showcase road segment.

Revision ID: 0008_seed_delhi_ncr_route
Revises: 0007_seed_demo_operator
"""

from alembic import op


revision = "0008_seed_delhi_ncr_route"
down_revision = "0007_seed_demo_operator"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO road_segments (id, name, road_class, geometry, health_score)
        VALUES (
          'SEG-DEL-NCR-01',
          'Delhi - Noida Corridor',
          'arterial',
          ST_GeomFromText('LINESTRING(77.2090 28.6139, 77.3910 28.5355)', 4326),
          100.0
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          road_class = EXCLUDED.road_class,
          geometry = EXCLUDED.geometry
        """
    )
    op.execute(
        """
        UPDATE urban_issues
        SET road_segment_id = 'SEG-DEL-NCR-01'
        WHERE road_segment_id IS NULL
          AND ST_DWithin(
            Geography(location),
            Geography(ST_GeomFromText('LINESTRING(77.2090 28.6139, 77.3910 28.5355)', 4326)),
            100
          )
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM road_segments WHERE id = 'SEG-DEL-NCR-01'")
