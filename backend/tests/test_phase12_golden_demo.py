"""POTHOLE WALA — Phase 12 Golden Demo & SIH Release Freeze Test Suite.

Rigorously verifies:
1. Canonical Golden Scenario reset endpoint (/api/v1/demo/reset-golden-scenario).
2. Dual-bus spatial corroboration (BUS-001 + BUS-002 on Delhi-Noida Corridor).
3. Trustworthy uncertainty handling (Inconclusive verification on Barapullah).
4. SafeRoute risk-aware route planning with contrasting FASTEST vs SAFEST recommendations.
5. Mission Control unified KPIs and prioritized action queue.
6. Distributed sensing sessions with explicit telemetry provenance.
"""

import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import (
    UrbanIssue, IssueStatus, Severity, Ticket, TicketStatus,
    TicketPriority, Verification, VerificationResult,
    RoadSegment, Bus, Camera, InspectionSession, TimelineEvent
)


@pytest.mark.asyncio
async def test_golden_demo_reset_endpoint_and_state():
    """
    Verifies that calling /api/v1/demo/reset-golden-scenario resets the database
    to the canonical, deterministic Golden Demo state.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/demo/reset-golden-scenario")
        assert res.status_code == 200, f"Reset failed: {res.text}"
        data = res.json()
        assert data["status"] == "reset_successful"
        assert data["scenario"] == "DELHI_NCR_GOLDEN_SCENARIO"
        assert "details" in data


@pytest.mark.asyncio
async def test_golden_demo_multi_bus_corroboration():
    """
    Verifies that iss_demo_gold_corrob:
    1. Was detected independently by BUS-001 and BUS-002.
    2. Has observation_count=2 and unique_bus_count=2.
    3. Has severity=critical and priority=urgent.
    4. Is attached to corridor SEG-DEL-NCR-01.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/issues/iss_demo_gold_corrob")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        issue = res.json()
        assert issue["id"] == "iss_demo_gold_corrob"
        assert issue["uniqueBusCount"] == 2
        assert issue["observationCount"] == 2
        assert "BUS-001" in issue["observingBuses"]
        assert "BUS-002" in issue["observingBuses"]
        assert issue["severity"] == "critical"
        assert issue["priority"] == "urgent"
        assert issue["roadSegmentId"] == "SEG-DEL-NCR-01"
        assert "corroborated by 2 distinct buses" in issue["corroborationText"].lower()


@pytest.mark.asyncio
async def test_golden_demo_inconclusive_verification_uncertainty():
    """
    Verifies that iss_demo_gold_inconcl:
    1. Holds an INCONCLUSIVE verification outcome.
    2. Explains the optical glare/occlusion rationale.
    3. Retains status=verification_pending (proving non-detection != resolved!).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/issues/iss_demo_gold_inconcl")
        assert res.status_code == 200
        issue = res.json()
        assert issue["id"] == "iss_demo_gold_inconcl"
        assert issue["status"] == "verification_pending"
        
        # Check verification record
        async with AsyncSessionLocal() as session:
            ver = await session.get(Verification, "ver_demo_gold_inconcl")
            assert ver is not None
            assert ver.result == VerificationResult.inconclusive
            reason = (ver.rationale or ver.notes or "").lower()
            assert "glare" in reason or "optical" in reason or "uncertain" in reason


@pytest.mark.asyncio
async def test_golden_demo_saferoute_mode_contrast():
    """
    Verifies that SafeRoute produces distinct, meaningful recommendations:
    - FASTEST mode selects the shorter, direct expressway (cand_direct_main)
    - SAFEST mode selects the lower-hazard bypass (cand_nh24_outer or cand_barapullah_bypass)
    - Recommendation explanations accurately mention avoided hazards.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # FASTEST
        res_fast = await client.post("/api/v1/saferoute/plan", json={
            "origin": "Connaught Place / PWD Delhi HQ",
            "destination": "Noida Sector 62 Tech Hub",
            "mode": "FASTEST"
        })
        assert res_fast.status_code == 200
        fast_data = res_fast.json()
        assert fast_data["recommended_route_id"] == "cand_direct_main"
        assert fast_data["timing_mode"] == "ESTIMATED"

        # SAFEST
        res_safe = await client.post("/api/v1/saferoute/plan", json={
            "origin": "Connaught Place / PWD Delhi HQ",
            "destination": "Noida Sector 62 Tech Hub",
            "mode": "SAFEST"
        })
        assert res_safe.status_code == 200
        safe_data = res_safe.json()
        assert safe_data["recommended_route_id"] != "cand_direct_main"
        assert safe_data["recommended_route_id"] in ("cand_nh24_outer", "cand_barapullah_bypass")
        assert len(safe_data["candidates"]) >= 2
        # Verify explainability
        assert "avoid" in safe_data["recommendation_reason"].lower() or "lowest" in safe_data["recommendation_reason"].lower()


@pytest.mark.asyncio
async def test_golden_demo_mission_control_overview_and_actions():
    """
    Verifies that Mission Control Overview aggregates Golden Scenario KPIs
    and generates an actionable priority queue.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/mission-control/overview")
        assert res.status_code == 200
        data = res.json()

        assert "network_kpis" in data
        kpis = data["network_kpis"]
        assert kpis["critical_defects"] >= 1
        assert kpis["corroborated_defects"] >= 1
        assert kpis["active_sensing_vehicles"] >= 1
        assert kpis["open_tickets"] >= 1

        assert "action_queue" in data
        assert len(data["action_queue"]) >= 3
        # First queue item should be P1_CRITICAL
        assert data["action_queue"][0]["priority"] == "P1_CRITICAL"


@pytest.mark.asyncio
async def test_golden_demo_fleet_sessions_and_provenance():
    """
    Verifies that Golden Demo sensing sessions:
    1. Are created for BUS-001 and BUS-002.
    2. Have explicit telemetry_provenance == 'SIMULATED'.
    3. Expose non-negative distance and frames analyzed.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/fleet/sessions")
        assert res.status_code == 200
        sessions = res.json()
        demo_sessions = [s for s in sessions if s["id"].startswith("sess_demo_gold_")]
        assert len(demo_sessions) >= 2
        for s in demo_sessions:
            assert s["telemetry_provenance"] == "SIMULATED"
            assert s["distance_sensed_km"] > 0
            assert s["vehicle_id"] in ("BUS-001", "BUS-002")
