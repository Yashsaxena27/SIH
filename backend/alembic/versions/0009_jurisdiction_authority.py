"""Add authorities and jurisdictions models and seed prototype boundaries.

Revision ID: 0009_jurisdiction_authority
Revises: 0008_seed_delhi_ncr_route
"""

from alembic import op

revision = "0009_jurisdiction_authority"
down_revision = "0008_seed_delhi_ncr_route"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create authorities table and index
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS authorities (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(20) NOT NULL UNIQUE,
            authority_type VARCHAR(50) NOT NULL,
            jurisdiction_boundary geometry(POLYGON, 4326),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_authorities_code ON authorities (code)")

    # 2. Create jurisdictions table and index
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS jurisdictions (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            authority_id VARCHAR(50) NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
            boundary geometry(POLYGON, 4326) NOT NULL,
            boundary_type VARCHAR(50) NOT NULL DEFAULT 'configured_prototype_boundary',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_jurisdictions_boundary ON jurisdictions USING GIST (boundary)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_jurisdictions_authority ON jurisdictions (authority_id)")

    # 3. Add authority_id to departments
    op.execute("ALTER TABLE departments ADD COLUMN IF NOT EXISTS authority_id VARCHAR(50) REFERENCES authorities(id)")

    # 4. Add authority_id and owner_agency to road_segments
    op.execute("ALTER TABLE road_segments ADD COLUMN IF NOT EXISTS authority_id VARCHAR(50) REFERENCES authorities(id)")
    op.execute("ALTER TABLE road_segments ADD COLUMN IF NOT EXISTS owner_agency VARCHAR(100)")

    # 5. Add authority_id, jurisdiction_id, jurisdiction_source to urban_issues
    op.execute("ALTER TABLE urban_issues ADD COLUMN IF NOT EXISTS authority_id VARCHAR(50) REFERENCES authorities(id)")
    op.execute("ALTER TABLE urban_issues ADD COLUMN IF NOT EXISTS jurisdiction_id VARCHAR(50) REFERENCES jurisdictions(id)")
    op.execute("ALTER TABLE urban_issues ADD COLUMN IF NOT EXISTS jurisdiction_source VARCHAR(50)")

    # 6. Add authority_id to tickets
    op.execute("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS authority_id VARCHAR(50) REFERENCES authorities(id)")

    # 7. Seed prototype authorities
    op.execute(
        """
        INSERT INTO authorities (id, name, code, authority_type, is_active)
        VALUES
          ('AUTH-PWD-DELHI', 'Delhi Public Works Department', 'PWD', 'state_pwd', true),
          ('AUTH-MCD-CENTRAL', 'Municipal Corporation of Delhi - Central', 'MCD', 'municipal_corporation', true),
          ('AUTH-NOIDA', 'Noida Development Authority', 'NOIDA', 'development_authority', true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          authority_type = EXCLUDED.authority_type,
          is_active = EXCLUDED.is_active
        """
    )

    # 8. Seed configured prototype jurisdiction boundaries
    op.execute(
        """
        INSERT INTO jurisdictions (id, name, authority_id, boundary, boundary_type, is_active)
        VALUES
          (
            'JUR-DEL-CENTRAL',
            'Delhi Central Prototype Zone',
            'AUTH-MCD-CENTRAL',
            ST_GeomFromText('POLYGON((77.18 28.58, 77.26 28.58, 77.26 28.66, 77.18 28.66, 77.18 28.58))', 4326),
            'configured_prototype_boundary',
            true
          ),
          (
            'JUR-NOIDA-URBAN',
            'Noida Urban Prototype Sector',
            'AUTH-NOIDA',
            ST_GeomFromText('POLYGON((77.32 28.50, 77.42 28.50, 77.42 28.60, 77.32 28.60, 77.32 28.50))', 4326),
            'configured_prototype_boundary',
            true
          )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          authority_id = EXCLUDED.authority_id,
          boundary = EXCLUDED.boundary,
          boundary_type = EXCLUDED.boundary_type,
          is_active = EXCLUDED.is_active
        """
    )

    # 9. Link departments to authorities and create MCD department
    op.execute(
        """
        INSERT INTO departments (id, name, department_type, service_area, authority_id, is_active)
        VALUES
          ('MCD-CENTRAL-MAINT', 'MCD Central Ward Maintenance', 'maintenance', 'Delhi Central Zone', 'AUTH-MCD-CENTRAL', true)
        ON CONFLICT (id) DO UPDATE SET
          authority_id = EXCLUDED.authority_id,
          name = EXCLUDED.name,
          service_area = EXCLUDED.service_area
        """
    )
    op.execute("UPDATE departments SET authority_id = 'AUTH-PWD-DELHI' WHERE id = 'DELHI-NCR-ROADS'")
    op.execute("UPDATE departments SET authority_id = 'AUTH-NOIDA' WHERE id = 'NOIDA-GHAZIABAD-ROADS'")

    # 10. Configure RoadSegment ownership for SEG-DEL-NCR-01
    op.execute(
        """
        UPDATE road_segments 
        SET authority_id = 'AUTH-PWD-DELHI', owner_agency = 'Delhi Public Works Department'
        WHERE id = 'SEG-DEL-NCR-01'
        """
    )

    # 11. Retrofit existing urban_issues according to strict priority rules:
    # Priority 1: road_segment_ownership
    op.execute(
        """
        UPDATE urban_issues
        SET 
          authority_id = rs.authority_id,
          assigned_department_id = 'DELHI-NCR-ROADS',
          jurisdiction_source = 'road_segment_ownership'
        FROM road_segments rs
        WHERE urban_issues.road_segment_id = rs.id
          AND rs.authority_id IS NOT NULL
        """
    )

    # Priority 2: configured_prototype_boundary
    op.execute(
        """
        UPDATE urban_issues
        SET 
          authority_id = j.authority_id,
          jurisdiction_id = j.id,
          assigned_department_id = CASE 
            WHEN j.authority_id = 'AUTH-MCD-CENTRAL' THEN 'MCD-CENTRAL-MAINT'
            WHEN j.authority_id = 'AUTH-NOIDA' THEN 'NOIDA-GHAZIABAD-ROADS'
            ELSE assigned_department_id
          END,
          jurisdiction_source = j.boundary_type
        FROM jurisdictions j
        WHERE urban_issues.authority_id IS NULL
          AND ST_Contains(j.boundary, urban_issues.location)
        """
    )

    # Unresolved fallback for issues outside all ownership and boundaries
    op.execute(
        """
        UPDATE urban_issues
        SET jurisdiction_source = 'unresolved'
        WHERE authority_id IS NULL
        """
    )

    # Synchronize existing tickets with their issues' resolved authority
    op.execute(
        """
        UPDATE tickets
        SET authority_id = ui.authority_id
        FROM urban_issues ui
        WHERE tickets.issue_id = ui.id
          AND ui.authority_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE tickets DROP COLUMN IF EXISTS authority_id")
    op.execute("ALTER TABLE urban_issues DROP COLUMN IF EXISTS authority_id")
    op.execute("ALTER TABLE urban_issues DROP COLUMN IF EXISTS jurisdiction_id")
    op.execute("ALTER TABLE urban_issues DROP COLUMN IF EXISTS jurisdiction_source")
    op.execute("ALTER TABLE road_segments DROP COLUMN IF EXISTS authority_id")
    op.execute("ALTER TABLE road_segments DROP COLUMN IF EXISTS owner_agency")
    op.execute("ALTER TABLE departments DROP COLUMN IF EXISTS authority_id")
    op.execute("DROP TABLE IF EXISTS jurisdictions")
    op.execute("DROP TABLE IF EXISTS authorities")
