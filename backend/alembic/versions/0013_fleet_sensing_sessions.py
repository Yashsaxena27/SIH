"""Fleet Multi-Camera & Distributed Sensing Sessions.

Revision ID: 0013_fleet_sensing_sessions
Revises: 0012_saferoute_corridors
"""

from alembic import op
import sqlalchemy as sa

revision = "0013_fleet_sensing_sessions"
down_revision = "0012_saferoute_corridors"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add vehicle generalization and provenance columns to buses
    op.execute("ALTER TABLE buses ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT 'bus';")
    op.execute("ALTER TABLE buses ADD COLUMN IF NOT EXISTS make_model VARCHAR(100);")
    op.execute("ALTER TABLE buses ADD COLUMN IF NOT EXISTS department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL;")
    op.execute("ALTER TABLE buses ADD COLUMN IF NOT EXISTS total_distance_km FLOAT DEFAULT 0.0;")
    op.execute("ALTER TABLE buses ADD COLUMN IF NOT EXISTS telemetry_mode VARCHAR(50) DEFAULT 'SIMULATED';")

    # 2. Create cameras table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS cameras (
            id VARCHAR(50) PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
            mount_position VARCHAR(50) NOT NULL,
            orientation VARCHAR(50) NOT NULL,
            resolution VARCHAR(50) DEFAULT '1080p',
            fps INTEGER DEFAULT 30,
            status VARCHAR(50) DEFAULT 'active',
            calibration_status VARCHAR(50) DEFAULT 'calibrated',
            last_health_check TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_cameras_vehicle ON cameras(vehicle_id);")

    # 3. Create inspection_sessions table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS inspection_sessions (
            id VARCHAR(50) PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
            camera_id VARCHAR(50) REFERENCES cameras(id) ON DELETE SET NULL,
            route_id VARCHAR(50) REFERENCES routes(id) ON DELETE SET NULL,
            started_at TIMESTAMPTZ NOT NULL,
            ended_at TIMESTAMPTZ,
            status VARCHAR(50) DEFAULT 'completed',
            telemetry_provenance VARCHAR(50) NOT NULL DEFAULT 'SIMULATED',
            distance_sensed_km FLOAT DEFAULT 0.0,
            frames_analyzed INTEGER DEFAULT 0,
            detections_count INTEGER DEFAULT 0,
            potholes_detected INTEGER DEFAULT 0,
            road_segments_covered JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_inspection_sessions_vehicle ON inspection_sessions(vehicle_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_inspection_sessions_started ON inspection_sessions(started_at DESC);")

    # 4. Update existing buses
    op.execute(
        """
        UPDATE buses 
        SET 
          vehicle_type = 'bus',
          make_model = 'Tata Starbus Urban 9/12m EV',
          telemetry_mode = 'SIMULATED',
          total_distance_km = 4280.5
        WHERE id LIKE 'bus_%' OR registration_number LIKE 'DL-%';
        """
    )

    # 5. Insert specialized PWD inspection vehicles
    op.execute(
        """
        INSERT INTO buses (id, registration_number, operator, vehicle_type, make_model, status, camera_status, gps_status, edge_ai_status, total_distance_km, telemetry_mode)
        VALUES 
          ('veh_pwd_insp_01', 'DL-1V-9901', 'Delhi PWD Quality Assurance Cell', 'inspection_vehicle', 'Mahindra Bolero Camper Mobile Survey Unit', 'active', 'active', 'active', 'active', 6120.0, 'SIMULATED'),
          ('veh_pwd_insp_02', 'DL-1V-9902', 'Delhi PWD Rapid Infrastructure Recon', 'inspection_vehicle', 'Force Gurkha 4x4 Survey Rig', 'active', 'active', 'active', 'active', 3890.2, 'SIMULATED'),
          ('veh_mcd_service_01', 'DL-1M-4401', 'MCD Pothole Rapid Patching Crew', 'service_vehicle', 'Tata 407 Pavement Maintenance Truck', 'active', 'active', 'active', 'active', 8410.8, 'SIMULATED')
        ON CONFLICT (id) DO UPDATE SET
          registration_number = EXCLUDED.registration_number,
          operator = EXCLUDED.operator,
          vehicle_type = EXCLUDED.vehicle_type,
          make_model = EXCLUDED.make_model,
          telemetry_mode = EXCLUDED.telemetry_mode;
        """
    )

    # 6. Seed camera mount configurations
    op.execute(
        """
        INSERT INTO cameras (id, vehicle_id, mount_position, orientation, resolution, fps, status, calibration_status)
        VALUES
          ('cam_pwd01_fwd', 'veh_pwd_insp_01', 'windshield_center', 'forward', '1080p', 30, 'active', 'calibrated'),
          ('cam_pwd01_down', 'veh_pwd_insp_01', 'bumper_forward', 'forward_down', '1080p', 30, 'active', 'calibrated'),
          ('cam_pwd01_roof', 'veh_pwd_insp_01', 'roof_center', 'angled_right', '1080p', 30, 'active', 'calibrated'),
          ('cam_pwd02_fwd', 'veh_pwd_insp_02', 'windshield_center', 'forward', '1080p', 30, 'active', 'calibrated'),
          ('cam_pwd02_down', 'veh_pwd_insp_02', 'bumper_forward', 'forward_down', '1080p', 30, 'active', 'calibrated'),
          ('cam_mcd01_fwd', 'veh_mcd_service_01', 'windshield_center', 'forward', '1080p', 30, 'active', 'calibrated'),
          ('cam_bus01_fwd', 'BUS-001', 'windshield_center', 'forward', '1080p', 30, 'active', 'calibrated')
        ON CONFLICT (id) DO UPDATE SET
          mount_position = EXCLUDED.mount_position,
          orientation = EXCLUDED.orientation,
          status = EXCLUDED.status,
          calibration_status = EXCLUDED.calibration_status;
        """
    )

    # 7. Seed inspection sessions with explicit telemetry provenance
    op.execute(
        """
        INSERT INTO inspection_sessions (
            id, vehicle_id, camera_id, started_at, ended_at, status, 
            telemetry_provenance, distance_sensed_km, frames_analyzed, 
            detections_count, potholes_detected, road_segments_covered
        )
        VALUES
          (
            'sess_del_001',
            'veh_pwd_insp_01',
            'cam_pwd01_fwd',
            NOW() - INTERVAL '4 hours',
            NOW() - INTERVAL '2 hours 15 minutes',
            'completed',
            'REPLAY',
            24.6,
            12400,
            17,
            17,
            '["SEG-DEL-NCR-01", "SEG-DEL-NCR-02"]'::jsonb
          ),
          (
            'sess_del_002',
            'veh_pwd_insp_02',
            'cam_pwd02_fwd',
            NOW() - INTERVAL '1 day 3 hours',
            NOW() - INTERVAL '1 day 1 hour',
            'completed',
            'REPLAY',
            31.2,
            16800,
            8,
            8,
            '["SEG-DEL-NCR-03", "SEG-DEL-NCR-04"]'::jsonb
          ),
          (
            'sess_del_003',
            'veh_pwd_insp_01',
            'cam_pwd01_down',
            NOW() - INTERVAL '45 minutes',
            NULL,
            'active',
            'SIMULATED',
            8.4,
            4200,
            3,
            3,
            '["SEG-DEL-NCR-01"]'::jsonb
          )
        ON CONFLICT (id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS inspection_sessions CASCADE;")
    op.execute("DROP TABLE IF EXISTS cameras CASCADE;")
    op.execute("ALTER TABLE buses DROP COLUMN IF EXISTS vehicle_type;")
    op.execute("ALTER TABLE buses DROP COLUMN IF EXISTS make_model;")
    op.execute("ALTER TABLE buses DROP COLUMN IF EXISTS department_id;")
    op.execute("ALTER TABLE buses DROP COLUMN IF EXISTS total_distance_km;")
    op.execute("ALTER TABLE buses DROP COLUMN IF EXISTS telemetry_mode;")
