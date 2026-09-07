"""POTHOLE WALA — Phase 9 Fleet / Multi-Camera / Distributed Sensing Test Suite.

Verifies:
- Fleet summary API (vehicle breakdown, camera counts, coverage health)
- Generalized vehicle data (public buses, PWD inspection rigs, service trucks)
- Camera mount and calibration normalization
- Inspection session lifecycle and strict telemetry provenance attribution
- Municipal network coverage intelligence and sensing gap analysis
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

pytestmark = pytest.mark.asyncio


# ============================================================
# 1. Fleet Summary & Vehicle Types Tests
# ============================================================

async def test_fleet_summary_api():
    """Verify fleet summary aggregates multi-vehicle breakdown and camera health."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/fleet/summary")
        assert response.status_code == 200
        data = response.json()

        assert data["total_vehicles"] >= 3
        assert "vehicle_breakdown" in data
        assert data["vehicle_breakdown"]["public_buses"] >= 1
        assert data["vehicle_breakdown"]["pwd_inspection_vehicles"] >= 2
        assert data["vehicle_breakdown"]["municipal_service_trucks"] >= 1

        assert data["total_cameras"] >= 6
        assert data["active_cameras"] >= 6
        assert data["calibrated_cameras"] >= 6

        assert "sessions" in data
        assert "provenance_breakdown" in data["sessions"]
        assert "SIMULATED" in data["sessions"]["provenance_breakdown"]
        assert "REPLAY" in data["sessions"]["provenance_breakdown"]

        assert "coverage" in data
        assert data["coverage"]["total_corridors"] >= 4
        assert "coverage_rate_pct" in data["coverage"]


async def test_fleet_vehicles_multi_camera():
    """Verify vehicle catalog returns cameras, mount positions, and orientations."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/fleet/buses")
        assert response.status_code == 200
        vehicles = response.json()
        assert len(vehicles) >= 3

        # Check specialized PWD inspection vehicle with multi-camera rig
        pwd_insp = next((v for v in vehicles if v["id"] == "veh_pwd_insp_01"), None)
        assert pwd_insp is not None
        assert pwd_insp["vehicle_type"] == "inspection_vehicle"
        assert pwd_insp["camera_count"] >= 3
        
        mounts = [c["mount_position"] for c in pwd_insp["cameras"]]
        assert "windshield_center" in mounts
        assert "bumper_forward" in mounts
        assert "roof_center" in mounts

        orientations = [c["orientation"] for c in pwd_insp["cameras"]]
        assert "forward" in orientations
        assert "forward_down" in orientations


# ============================================================
# 2. Inspection Session Lifecycle & Provenance
# ============================================================

async def test_fleet_sessions_provenance_api():
    """Verify inspection sessions return explicit telemetry provenance."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/fleet/sessions")
        assert response.status_code == 200
        sessions = response.json()
        assert len(sessions) >= 2

        for s in sessions:
            assert "id" in s
            assert "vehicle_id" in s
            assert "started_at" in s
            assert "telemetry_provenance" in s
            assert s["telemetry_provenance"] in ["LIVE", "REPLAY", "SIMULATED", "ESTIMATED"]


async def test_fleet_session_start_and_end_lifecycle():
    """Verify starting and ending an active inspection session."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Start session
        start_payload = {
            "vehicle_id": "veh_pwd_insp_02",
            "camera_id": "cam_pwd02_fwd",
            "telemetry_provenance": "SIMULATED"
        }
        start_res = await client.post("/api/v1/fleet/sessions/start", json=start_payload)
        assert start_res.status_code == 200
        start_data = start_res.json()
        session_id = start_data["id"]
        assert start_data["status"] == "active"
        assert start_data["telemetry_provenance"] == "SIMULATED"

        # 2. End session
        end_payload = {
            "distance_km": 18.2,
            "frames_analyzed": 9100,
            "detections_count": 4,
            "potholes_detected": 4,
            "road_segments_covered": ["SEG-DEL-NCR-02", "SEG-DEL-NCR-03"]
        }
        end_res = await client.post(f"/api/v1/fleet/sessions/{session_id}/end", json=end_payload)
        assert end_res.status_code == 200
        end_data = end_res.json()
        assert end_data["status"] == "completed"
        assert end_data["distance_sensed_km"] == 18.2
        assert end_data["potholes_detected"] == 4


# ============================================================
# 3. Distributed Sensing Coverage Intelligence
# ============================================================

async def test_fleet_coverage_intelligence_api():
    """Verify corridor sensing recency and blind spot gap detection."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/fleet/coverage")
        assert response.status_code == 200
        cov = response.json()

        assert "total_corridors" in cov
        assert "actively_covered_corridors" in cov
        assert "coverage_gap_corridors" in cov
        assert "coverage_percentage" in cov
        assert "corridors" in cov
        assert len(cov["corridors"]) >= 4

        for c in cov["corridors"]:
            assert "segment_id" in c
            assert "coverage_status" in c
            assert c["coverage_status"] in ["RECENT", "ACCEPTABLE", "GAP", "NEVER_SENSED"]
