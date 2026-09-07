"""Seed SafeRoute alternative corridors in Delhi-NCR.

Revision ID: 0012_saferoute_corridors
Revises: 0011_verification_engine
"""

from alembic import op


revision = "0012_saferoute_corridors"
down_revision = "0011_verification_engine"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Barapullah Elevated Bypass (Southern arterial alternative)
    op.execute(
        """
        INSERT INTO road_segments (id, name, road_class, geometry, health_score, authority_id, owner_agency)
        VALUES (
          'SEG-DEL-NCR-02',
          'Barapullah Elevated Bypass',
          'arterial',
          ST_GeomFromText('LINESTRING(77.2180 28.5860, 77.2600 28.5830, 77.3100 28.5700, 77.3850 28.5400)', 4326),
          94.0,
          'AUTH-PWD-DELHI',
          'Delhi Public Works Department'
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          road_class = EXCLUDED.road_class,
          geometry = EXCLUDED.geometry,
          health_score = EXCLUDED.health_score,
          authority_id = EXCLUDED.authority_id,
          owner_agency = EXCLUDED.owner_agency;
        """
    )

    # 2. Vikas Marg - NH24 Outer Corridor (Northern expressway alternative)
    op.execute(
        """
        INSERT INTO road_segments (id, name, road_class, geometry, health_score, authority_id, owner_agency)
        VALUES (
          'SEG-DEL-NCR-03',
          'Vikas Marg - NH24 Outer Corridor',
          'arterial',
          ST_GeomFromText('LINESTRING(77.2400 28.6300, 77.2800 28.6280, 77.3400 28.6150, 77.3910 28.5355)', 4326),
          98.0,
          'AUTH-PWD-DELHI',
          'Delhi Public Works Department'
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          road_class = EXCLUDED.road_class,
          geometry = EXCLUDED.geometry,
          health_score = EXCLUDED.health_score,
          authority_id = EXCLUDED.authority_id,
          owner_agency = EXCLUDED.owner_agency;
        """
    )

    # 3. Ring Road - Ashram Link (Connecting arterial feeder)
    op.execute(
        """
        INSERT INTO road_segments (id, name, road_class, geometry, health_score, authority_id, owner_agency)
        VALUES (
          'SEG-DEL-NCR-04',
          'Ring Road - Ashram Link',
          'primary',
          ST_GeomFromText('LINESTRING(77.2080 28.6130, 77.2400 28.5750, 77.2600 28.5680)', 4326),
          82.0,
          'AUTH-PWD-DELHI',
          'Delhi Public Works Department'
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          road_class = EXCLUDED.road_class,
          geometry = EXCLUDED.geometry,
          health_score = EXCLUDED.health_score,
          authority_id = EXCLUDED.authority_id,
          owner_agency = EXCLUDED.owner_agency;
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM road_segments WHERE id IN ('SEG-DEL-NCR-02', 'SEG-DEL-NCR-03', 'SEG-DEL-NCR-04')")
