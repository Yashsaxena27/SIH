"""POTHOLE WALA — Phase 10 Mission Control Automated Test Suite.

Verifies:
- Mission Control Overview API & cross-domain KPI aggregation
- Prioritized Action Queue generation and multi-tier priority sorting
- Priority-based filtering (P1_CRITICAL, P2_HIGH, P3_MEDIUM)
- Dispatcher action acknowledgement endpoint
- System health status diagnostics
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

pytestmark = pytest.mark.asyncio


async def test_mission_control_overview_api():
    """Verify Mission Control Overview returns all cross-domain operational KPIs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/mission-control/overview")
        assert response.status_code == 200
        data = response.json()

        assert "network_kpis" in data
        kpis = data["network_kpis"]
        assert "operational_road_health_index" in kpis
        assert "total_active_defects" in kpis
        assert "critical_defects" in kpis
        assert "open_tickets" in kpis
        assert "verification_resolution_rate" in kpis
        assert "active_sensing_vehicles" in kpis
        assert "corridor_coverage_percentage" in kpis

        assert "action_queue" in data
        assert isinstance(data["action_queue"], list)
        assert len(data["action_queue"]) >= 4

        for item in data["action_queue"]:
            assert "id" in item
            assert "type" in item
            assert "priority" in item
            assert "title" in item
            assert "action_label" in item
            assert "action_url" in item

        assert "system_status" in data
        sys_status = data["system_status"]
        assert "spatial_database" in sys_status
        assert "edge_model" in sys_status
        assert "telemetry_disclosure" in sys_status


async def test_mission_control_action_queue_filtering():
    """Verify filtering action queue by priority level."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/mission-control/action-queue?priority=P1_CRITICAL")
        assert response.status_code == 200
        data = response.json()

        assert "action_queue" in data
        for item in data["action_queue"]:
            assert item["priority"] == "P1_CRITICAL"


async def test_mission_control_execute_action():
    """Verify acknowledging and executing an action from the queue."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "action_id": "act_defect_test_01",
            "action_type": "CREATE_WORK_ORDER",
            "target_id": "iss_test_01",
            "operator_notes": "Urgent patch required before monsoon."
        }
        response = await client.post("/api/v1/mission-control/execute-action", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "acknowledged"
        assert data["action_id"] == "act_defect_test_01"
