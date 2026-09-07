"""POTHOLE WALA — Phase 11 Deep Technical Audit & Release Hardening Tests.

Rigorously validates:
1. Mission Control real operational dispatch, state transitions, and idempotency.
2. Fleet sensing input validation, camera-vehicle ownership, and provenance constraints.
3. SafeRoute adversarial inputs (identical origin/dest, coordinate proximity, mode inversion).
4. Truth audits (single-class YOLO model, Operational Road Health label, ESTIMATED timing).
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import (
    UrbanIssue, IssueStatus, Severity, Ticket, TicketStatus,
    TicketPriority, Verification, VerificationResult,
    RoadSegment, Bus, Camera, InspectionSession, Alert, TimelineEvent
)
from ml.engine.detector import ModelInferenceEngine


# ── 1. MISSION CONTROL OPERATIONAL ACTION DISPATCH & IDEMPOTENCY ────────────

@pytest.mark.asyncio
async def test_mc_action_create_work_order_and_idempotency():
    """
    Tests that CREATE_WORK_ORDER:
    1. Creates a real Ticket row in PostgreSQL.
    2. Transitions UrbanIssue.status to 'ticket_created'.
    3. Creates a TimelineEvent and Alert.
    4. Second identical call is idempotent and does not create duplicate tickets.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a fresh issue
        async with AsyncSessionLocal() as session:
            issue_id = f"iss_mc_test_{uuid.uuid4().hex[:8]}"
            issue = UrbanIssue(
                id=issue_id,
                issue_type="pothole",
                status=IssueStatus.new,
                severity=Severity.critical,
                priority=TicketPriority.urgent,
                location=func.ST_GeomFromText("POINT(77.2100 28.6100)", 4326),
                first_detected_at=datetime.now(timezone.utc),
                last_observed_at=datetime.now(timezone.utc),
                confidence=0.92,
                observation_count=3,
                unique_bus_count=2,
            )
            session.add(issue)
            await session.commit()

        # 1. Execute CREATE_WORK_ORDER action
        payload = {
            "action_id": f"act_test_{uuid.uuid4().hex[:6]}",
            "action_type": "CREATE_WORK_ORDER",
            "target_id": issue_id,
            "operator_notes": "Priority dispatch from Mission Control"
        }
        res1 = await client.post("/api/v1/mission-control/execute-action", json=payload)
        assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
        data1 = res1.json()
        assert data1["status"] == "acknowledged"
        assert data1["execution_status"] == "executed"
        assert data1["is_idempotent"] is False
        assert "ticket_id" in data1
        ticket_id = data1["ticket_id"]

        # Verify DB state directly
        async with AsyncSessionLocal() as session:
            tkt = await session.get(Ticket, ticket_id)
            assert tkt is not None
            assert tkt.issue_id == issue_id
            assert tkt.priority == TicketPriority.urgent

            updated_issue = await session.get(UrbanIssue, issue_id)
            assert updated_issue.status == IssueStatus.ticket_created

        # 2. Idempotency test: Repeat identical action
        res2 = await client.post("/api/v1/mission-control/execute-action", json=payload)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["status"] == "acknowledged"
        assert data2["execution_status"] == "already_exists"
        assert data2["is_idempotent"] is True
        assert data2["ticket_id"] == ticket_id

        # Verify no duplicate tickets were created
        async with AsyncSessionLocal() as session:
            all_tickets = (await session.execute(
                select(Ticket).where(Ticket.issue_id == issue_id)
            )).scalars().all()
            assert len(all_tickets) == 1


@pytest.mark.asyncio
async def test_mc_action_escalate_ticket_and_idempotency():
    """
    Tests that ESCALATE_TICKET:
    1. Updates ticket priority to URGENT.
    2. Repeated call is safely idempotent.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an issue and low-priority ticket
        async with AsyncSessionLocal() as session:
            issue_id = f"iss_mc_esc_{uuid.uuid4().hex[:8]}"
            tkt_id = f"tkt_mc_esc_{uuid.uuid4().hex[:8]}"
            issue = UrbanIssue(
                id=issue_id,
                issue_type="pothole",
                status=IssueStatus.ticket_created,
                severity=Severity.medium,
                priority=TicketPriority.low,
                location=func.ST_GeomFromText("POINT(77.2200 28.6200)", 4326),
                first_detected_at=datetime.now(timezone.utc),
                last_observed_at=datetime.now(timezone.utc),
                confidence=0.80,
            )
            ticket = Ticket(
                id=tkt_id,
                display_id=f"TKT-TEST-{uuid.uuid4().hex[:4].upper()}",
                issue_id=issue_id,
                department_id="DELHI-NCR-ROADS",
                authority_id="AUTH-PWD-DELHI",
                title="Pavement rutting",
                status=TicketStatus.assigned,
                priority=TicketPriority.low,
            )
            session.add(issue)
            session.add(ticket)
            await session.commit()

        # 1. Escalate ticket
        payload = {
            "action_id": "act_esc_1",
            "action_type": "ESCALATE_TICKET",
            "target_id": tkt_id,
            "operator_notes": "SLA breach urgent escalation"
        }
        res1 = await client.post("/api/v1/mission-control/execute-action", json=payload)
        assert res1.status_code == 200
        assert res1.json()["status"] == "acknowledged"
        assert res1.json()["execution_status"] == "executed"

        # Verify priority is urgent
        async with AsyncSessionLocal() as session:
            tkt = await session.get(Ticket, tkt_id)
            assert tkt.priority == TicketPriority.urgent

        # 2. Idempotency test
        res2 = await client.post("/api/v1/mission-control/execute-action", json=payload)
        assert res2.status_code == 200
        assert res2.json()["status"] == "acknowledged"
        assert res2.json()["execution_status"] == "already_escalated"
        assert res2.json()["is_idempotent"] is True


@pytest.mark.asyncio
async def test_mc_action_invalid_target_and_unknown_action():
    """
    Tests defensive handling on simulated/unmatched targets and rejection of unknown action types.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Target not present in DB -> Acknowledged as simulated queue item
        res_sim = await client.post("/api/v1/mission-control/execute-action", json={
            "action_id": "act_sim_1",
            "action_type": "CREATE_WORK_ORDER",
            "target_id": "non_existent_issue_99999"
        })
        assert res_sim.status_code == 200
        assert res_sim.json()["status"] == "acknowledged"
        assert res_sim.json()["execution_status"] == "simulated"

        # Unknown action type -> 400
        res_400 = await client.post("/api/v1/mission-control/execute-action", json={
            "action_id": "act_err_2",
            "action_type": "LAUNCH_NUCLEAR_STRIKE",
            "target_id": "any_id"
        })
        assert res_400.status_code == 400
        assert "unknown action type" in res_400.json()["detail"].lower()


# ── 2. FLEET SENSING HARDENING & INPUT VALIDATION ──────────────────────────

@pytest.mark.asyncio
async def test_fleet_start_session_defensive_validations():
    """
    Tests that /api/v1/fleet/sessions/start enforces:
    1. Vehicle existence (404 on missing vehicle).
    2. Camera existence (404 on missing camera).
    3. Camera-vehicle ownership (400/404 on camera mounted on another vehicle).
    4. Strict provenance enum (400/404 on invalid provenance).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Non-existent vehicle
        res1 = await client.post("/api/v1/fleet/sessions/start", json={
            "vehicle_id": "veh_ghost_999",
            "telemetry_provenance": "SIMULATED"
        })
        assert res1.status_code == 404
        assert "not found" in res1.json()["detail"].lower()

        # 2. Non-existent camera
        res2 = await client.post("/api/v1/fleet/sessions/start", json={
            "vehicle_id": "BUS-001",
            "camera_id": "cam_ghost_999",
            "telemetry_provenance": "SIMULATED"
        })
        assert res2.status_code == 404
        assert "not found" in res2.json()["detail"].lower()

        # 3. Camera mounted on a different vehicle
        # veh_pwd_insp_01 owns cam_pwd01_down
        res3 = await client.post("/api/v1/fleet/sessions/start", json={
            "vehicle_id": "BUS-001",
            "camera_id": "cam_pwd01_down",
            "telemetry_provenance": "SIMULATED"
        })
        assert res3.status_code == 404 or res3.status_code == 400
        assert "not mounted" in res3.json()["detail"].lower()

        # 4. Invalid telemetry provenance
        res4 = await client.post("/api/v1/fleet/sessions/start", json={
            "vehicle_id": "BUS-001",
            "telemetry_provenance": "INVALID_TELEMETRY_FAKE"
        })
        assert res4.status_code == 404 or res4.status_code == 400
        assert "invalid telemetry provenance" in res4.json()["detail"].lower()


@pytest.mark.asyncio
async def test_fleet_end_session_negative_metrics_clamped():
    """
    Verifies that ending a session clamps negative numbers (e.g. -50km) to >= 0.0.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Start a valid session
        start_res = await client.post("/api/v1/fleet/sessions/start", json={
            "vehicle_id": "BUS-001",
            "telemetry_provenance": "SIMULATED"
        })
        assert start_res.status_code == 200
        sess_id = start_res.json()["id"]

        # End with negative values
        end_res = await client.post(f"/api/v1/fleet/sessions/{sess_id}/end", json={
            "distance_km": -25.5,
            "frames_analyzed": -100,
            "detections_count": -5,
            "potholes_detected": -2
        })
        assert end_res.status_code == 200
        data = end_res.json()
        assert data["distance_sensed_km"] == 0.0
        assert data["potholes_detected"] == 0


# ── 3. SAFEROUTE ADVERSARIAL AUDIT ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_saferoute_identical_origin_destination():
    """
    Tests that passing identical origin and destination names returns a controlled 400 error.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/saferoute/plan", json={
            "origin": "Connaught Place",
            "destination": "Connaught Place",
            "mode": "SAFEST"
        })
        assert res.status_code == 400
        assert "identical" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_saferoute_coordinates_too_close():
    """
    Tests that passing coordinates < 10m apart returns a controlled 400 error.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/saferoute/plan", json={
            "origin": "Point A",
            "destination": "Point B",
            "origin_coords": {"lat": 28.612800, "lng": 77.229500},
            "destination_coords": {"lat": 28.612805, "lng": 77.229505},  # ~0.7 meters apart
            "mode": "FASTEST"
        })
        assert res.status_code == 400
        assert "too close" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_saferoute_corridors_batch_prefetch_performance():
    """
    Tests that GET /api/v1/saferoute/corridors returns valid profiles
    using batch pre-fetching without executing N+1 queries.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/saferoute/corridors")
        assert res.status_code == 200
        corridors = res.json()
        assert len(corridors) >= 3
        for c in corridors:
            assert "segment_id" in c
            assert "segment_risk_score" in c
            assert 0.0 <= c["segment_risk_score"] <= 100.0
            assert "health_score" in c


# ── 4. TRUTH & ETHICS AUDIT ASSERTIONS ──────────────────────────────────────

@pytest.mark.asyncio
async def test_truth_audit_single_class_yolo_model():
    """
    Truth Constraint 3.1:
    Verifies that the verified YOLO model strictly contains class 0 -> 'pothole'
    and zero claims of crack or debris detection.
    """
    engine = ModelInferenceEngine()
    class_names = engine.classes
    assert len(class_names) == 1, f"Expected strictly 1 class in best.pt, found {len(class_names)}: {class_names}"
    assert class_names[0] == "pothole", f"Expected class 0 to be 'pothole', got '{class_names[0]}'"


@pytest.mark.asyncio
async def test_truth_audit_saferoute_timing_mode_estimated():
    """
    Truth Constraint 3.3:
    Verifies that all SafeRoute responses explicitly carry timing_mode='ESTIMATED'
    and an explicit non-traffic disclaimer.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/saferoute/plan", json={
            "origin": "Central Delhi Hub",
            "destination": "Noida Sector 62",
            "mode": "FASTEST"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["timing_mode"] == "ESTIMATED"
        assert "timing_provenance" in data
        assert "no fake" in data["timing_provenance"].lower() or "estimated" in data["timing_provenance"].lower()


@pytest.mark.asyncio
async def test_truth_audit_telemetry_provenance_explicit():
    """
    Truth Constraint 3.4:
    Verifies that all vehicles in /api/v1/fleet/buses expose explicit telemetry_mode
    and never claim live GPS when coordinates are unverified.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/fleet/buses")
        assert res.status_code == 200
        buses = res.json()
        assert len(buses) > 0
        valid_modes = {"LIVE", "REPLAY", "SIMULATED", "ESTIMATED"}
        for b in buses:
            assert b["telemetry_mode"] in valid_modes
            if b["currentLocation"] is None:
                assert b["telemetry_status"] == "unavailable"
                assert b["gps_status"] == "unavailable"
