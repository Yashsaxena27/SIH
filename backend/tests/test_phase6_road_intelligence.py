import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import RoadSegment, UrbanIssue, IssueStatus, Severity, TicketPriority, Ticket, TicketStatus, Authority
from app.services.road_segment_linker import (
    match_road_segment,
    link_issue_to_segment,
    RoadMatchResult,
    CANDIDATE_SEARCH_TOLERANCE_METERS,
    AMBIGUITY_DELTA_THRESHOLD_METERS
)
from app.services.road_health import (
    calculate_segment_health,
    calculate_roads_health_batch,
    classify_risk_state,
    build_health_explanation
)

pytestmark = pytest.mark.asyncio


# ============================================================
# 1. Spatial Matching & Tolerance Boundary Tests
# ============================================================

async def test_road_matching_boundaries_and_deltas():
    """
    Test deterministic spatial matching:
    - Candidate within 50m tolerance -> MATCHED
    - Candidate outside 50m tolerance -> UNMATCHED
    - Two candidates with delta <= 5.0m -> AMBIGUOUS (segment_id = None)
    - Two candidates with delta > 5.0m -> MATCHED to closer candidate
    """
    async with AsyncSessionLocal() as session:
        # Create 2 test segments near origin for precise metric distance testing
        # Segment 1: Horizontal along lat=28.600000, from lng=77.200000 to lng=77.210000
        # Segment 2: Parallel horizontal along lat=28.600100 (approx 11.1 meters north)
        seg1_id = "test_seg_match_1"
        seg2_id = "test_seg_match_2"

        await session.execute(delete(RoadSegment).where(RoadSegment.id.in_([seg1_id, seg2_id])))
        await session.commit()

        seg1 = RoadSegment(
            id=seg1_id,
            name="Test Corridor Alpha",
            road_class="arterial",
            geometry="SRID=4326;LINESTRING(77.200000 28.600000, 77.210000 28.600000)",
            health_score=100.0
        )
        seg2 = RoadSegment(
            id=seg2_id,
            name="Test Corridor Beta",
            road_class="collector",
            geometry="SRID=4326;LINESTRING(77.200000 28.600200, 77.210000 28.600200)",
            health_score=100.0
        )
        session.add_all([seg1, seg2])
        await session.commit()

        try:
            # Case A: Point directly on seg1 (lat=28.600000, lng=77.205000) -> distance ~ 0m
            # Seg2 is ~22.2m north (delta > 5m)
            pt_on_seg1 = "POINT(77.205000 28.600000)"
            res_a = await match_road_segment(session, pt_on_seg1)
            assert res_a.state == "MATCHED"
            assert res_a.segment_id == seg1_id
            assert res_a.distance_meters is not None and res_a.distance_meters < 1.0

            # Case B: Point far away (> 50m tolerance) from both segments
            # lat=28.605000 (~555m north of both)
            pt_far = "POINT(77.205000 28.605000)"
            res_b = await match_road_segment(session, pt_far)
            assert res_b.state == "UNMATCHED"
            assert res_b.segment_id is None
            assert res_b.candidate_count == 0
            assert "within 50.0m tolerance" in res_b.reason

            # Case C: Ambiguous midpoint between seg1 and seg2
            # seg1 is at lat=28.600000, seg2 is at lat=28.600200.
            # Point at lat=28.600100 is equidistant (~11.1m from both, delta = 0.0m <= 5.0m)
            pt_mid = "POINT(77.205000 28.600100)"
            res_c = await match_road_segment(session, pt_mid)
            assert res_c.state == "AMBIGUOUS"
            # Critical Guardrail 3: AMBIGUOUS matches MUST NOT receive a road_segment_id
            assert res_c.segment_id is None
            assert res_c.delta_meters is not None and res_c.delta_meters <= 5.0
            assert "Ambiguous candidates" in res_c.reason

            # Test link_issue_to_segment preserves None on AMBIGUOUS
            dummy_issue = UrbanIssue(
                id="test_iss_ambiguous_gate",
                issue_type="pothole",
                status=IssueStatus.new,
                severity=Severity.low,
                location=pt_mid,
                first_detected_at=datetime.now(timezone.utc),
                last_observed_at=datetime.now(timezone.utc)
            )
            linked_id = await link_issue_to_segment(session, dummy_issue, pt_mid)
            assert linked_id is None
            assert dummy_issue.road_segment_id is None

            # Case D: Just above 5.0m delta threshold
            # Position point such that d1 ~ 5m and d2 ~ 11m (delta ~ 6m > 5m)
            # lat=28.600045 (approx 5m from seg1, ~17m from seg2)
            pt_clear = "POINT(77.205000 28.600045)"
            res_d = await match_road_segment(session, pt_clear)
            assert res_d.state == "MATCHED"
            assert res_d.segment_id == seg1_id
            assert res_d.delta_meters is not None and res_d.delta_meters > 5.0

        finally:
            await session.execute(delete(RoadSegment).where(RoadSegment.id.in_([seg1_id, seg2_id])))
            await session.commit()


# ============================================================
# 2. Road Health Score Boundary & Classification Tests
# ============================================================

async def test_operational_road_health_boundaries():
    """
    Test strict score boundary values:
    90, 89, 70, 69, 50, 49
    """
    assert classify_risk_state(100.0) == "HEALTHY"
    assert classify_risk_state(95.0) == "HEALTHY"
    assert classify_risk_state(90.0) == "HEALTHY"

    assert classify_risk_state(89.9) == "WATCH"
    assert classify_risk_state(89.0) == "WATCH"
    assert classify_risk_state(80.0) == "WATCH"
    assert classify_risk_state(70.0) == "WATCH"

    assert classify_risk_state(69.9) == "ELEVATED"
    assert classify_risk_state(69.0) == "ELEVATED"
    assert classify_risk_state(60.0) == "ELEVATED"
    assert classify_risk_state(50.0) == "ELEVATED"

    assert classify_risk_state(49.9) == "CRITICAL"
    assert classify_risk_state(49.0) == "CRITICAL"
    assert classify_risk_state(25.0) == "CRITICAL"
    assert classify_risk_state(0.0) == "CRITICAL"


async def test_road_health_multi_factor_calculation():
    """
    Test that road health is deterministically computed from normalized records:
    - Active issues severity deductions
    - Corroboration deductions
    - Unresolved verification deductions
    - Overdue ticket deductions
    """
    async with AsyncSessionLocal() as session:
        seg_id = "test_seg_health_eval"
        iss_crit = "test_iss_crit"
        iss_high = "test_iss_high"
        iss_corrob = "test_iss_corrob"
        tkt_overdue = "test_tkt_overdue"

        # Cleanup
        await session.execute(delete(Ticket).where(Ticket.id == tkt_overdue))
        await session.execute(delete(UrbanIssue).where(UrbanIssue.road_segment_id == seg_id))
        await session.execute(delete(RoadSegment).where(RoadSegment.id == seg_id))
        await session.commit()

        seg = RoadSegment(
            id=seg_id,
            name="Ring Road Expressway",
            road_class="arterial",
            geometry="SRID=4326;LINESTRING(77.2000 28.6000, 77.2100 28.6000)",
            health_score=100.0
        )
        session.add(seg)

        now = datetime.now(timezone.utc)
        past_due = now - timedelta(days=2)

        # 1. Critical issue (deduction: 15)
        issue1 = UrbanIssue(
            id=iss_crit,
            issue_type="pothole",
            status=IssueStatus.assigned,
            severity=Severity.critical,
            priority=TicketPriority.urgent,
            location="POINT(77.2050 28.6000)",
            road_segment_id=seg_id,
            first_detected_at=now,
            last_observed_at=now,
            observation_count=1,
            unique_bus_count=1
        )
        # 2. High issue with unresolved verification (deduction: 10 + 5 = 15)
        issue2 = UrbanIssue(
            id=iss_high,
            issue_type="pothole",
            status=IssueStatus.repair_reported,
            severity=Severity.high,
            priority=TicketPriority.high,
            location="POINT(77.2060 28.6000)",
            road_segment_id=seg_id,
            first_detected_at=now,
            last_observed_at=now,
            observation_count=1,
            unique_bus_count=1
        )
        # 3. Medium issue corroborated across 3 buses (deduction: 5 + 3 = 8)
        issue3 = UrbanIssue(
            id=iss_corrob,
            issue_type="pothole",
            status=IssueStatus.confirmed,
            severity=Severity.medium,
            priority=TicketPriority.medium,
            location="POINT(77.2070 28.6000)",
            road_segment_id=seg_id,
            first_detected_at=now,
            last_observed_at=now,
            observation_count=6,
            unique_bus_count=3
        )
        session.add_all([issue1, issue2, issue3])
        await session.flush()

        # 4. Overdue ticket on critical issue (deduction: 2 open + 10 overdue = 12)
        ticket1 = Ticket(
            id=tkt_overdue,
            display_id="TKT-OVERDUE-01",
            issue_id=iss_crit,
            department_id="dept_e34839c8",
            title="Emergency Patchwork",
            status=TicketStatus.assigned,
            priority=TicketPriority.urgent,
            due_date=past_due
        )
        session.add(ticket1)
        await session.commit()

        try:
            # Expected deductions:
            # - Severity: 15 (crit) + 10 (high) + 5 (med) = 30.0
            # - Corroboration: 1 issue corroborated = 3.0
            # - Unresolved verification: 1 issue repair_reported = 5.0
            # - Tickets: 1 open (2.0) + 1 overdue (10.0) = 12.0
            # Total deduction = 30 + 3 + 5 + 12 = 50.0
            # Score = 100.0 - 50.0 = 50.0 -> ELEVATED
            health = await calculate_segment_health(session, seg_id)

            assert health["segmentId"] == seg_id
            assert health["metricLabel"] == "Operational Road Health"
            assert health["healthScore"] == 50.0
            assert health["riskState"] == "ELEVATED"

            factors = health["factors"]
            assert factors["activeIssueCount"] == 3
            assert factors["criticalCount"] == 1
            assert factors["highCount"] == 1
            assert factors["mediumCount"] == 1
            assert factors["corroboratedCount"] == 1
            assert factors["unresolvedVerificationCount"] == 1
            assert factors["openTicketCount"] == 1
            assert factors["overdueTicketCount"] == 1
            assert factors["severityDeduction"] == 30.0
            assert factors["totalDeduction"] == 50.0

            # Explanation should be human-readable and contain key factors
            explanation = health["explanation"]
            assert "Elevated operational health" in explanation
            assert "1 critical defect" in explanation
            assert "1 high-severity defect" in explanation
            assert "1 overdue municipal repair ticket" in explanation

        finally:
            await session.execute(delete(Ticket).where(Ticket.id == tkt_overdue))
            await session.execute(delete(UrbanIssue).where(UrbanIssue.road_segment_id == seg_id))
            await session.execute(delete(RoadSegment).where(RoadSegment.id == seg_id))
            await session.commit()


# ============================================================
# 3. Road Intelligence API Contract Tests
# ============================================================

async def test_road_intelligence_api_contracts():
    """
    Test API contracts:
    - GET /api/v1/roads
    - GET /api/v1/roads/{id}
    - GET /api/v1/roads/{id}/health
    - GET /api/v1/roads/{id}/issues
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List roads
        res_list = await client.get("/api/v1/roads?limit=5")
        assert res_list.status_code == 200
        data_list = res_list.json()
        assert "items" in data_list
        assert "total" in data_list
        assert len(data_list["items"]) > 0

        first_road = data_list["items"][0]
        assert "id" in first_road
        assert "name" in first_road
        assert "roadClass" in first_road
        assert "geometry" in first_road
        assert first_road["geometry"]["type"] == "LineString"
        assert "health" in first_road
        assert "riskState" in first_road["health"]
        assert "factors" in first_road["health"]

        target_id = first_road["id"]

        # 2. Get single road
        res_single = await client.get(f"/api/v1/roads/{target_id}")
        assert res_single.status_code == 200
        data_single = res_single.json()
        assert data_single["id"] == target_id
        assert "health" in data_single
        assert "coordinates" in data_single

        # 3. Get road health
        res_health = await client.get(f"/api/v1/roads/{target_id}/health")
        assert res_health.status_code == 200
        data_health = res_health.json()
        assert data_health["segmentId"] == target_id
        assert "healthScore" in data_health
        assert "riskState" in data_health
        assert "explanation" in data_health

        # 4. Get road issues
        res_issues = await client.get(f"/api/v1/roads/{target_id}/issues")
        assert res_issues.status_code == 200
        data_issues = res_issues.json()
        assert data_issues["segmentId"] == target_id
        assert "items" in data_issues

        # 5. Nonexistent road returns 404
        res_404 = await client.get("/api/v1/roads/nonexistent_corridor_id")
        assert res_404.status_code == 404
