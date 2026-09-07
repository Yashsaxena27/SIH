"""
Tests for Phase 17: Golden Demo Data.

Verifies:
1. Deterministic Seeding and Idempotency.
2. Scenario A: Fully Resolved Issue (PWD Road Segment Ownership -> Closed Ticket -> Resolved Verification -> Verified Issue).
3. Scenario B: Active Municipal Ticket (MCD Central Polygon Containment -> Open Ticket).
4. Scenario C: Unresolved Jurisdiction Safety (Outside Boundaries -> Ticket Creation Blocked with HTTP 400).
5. Scenario D: Failed Verification & Reopened Ticket (NOIDA Sector -> Unresolved Verification -> Reopened Ticket & Issue).
6. Safe Reset Isolation (deletes ONLY Golden Demo records without harming operational data).
7. Analytics Integration (Golden records naturally counted by database-derived endpoints).
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import (
    UrbanIssue,
    Detection,
    Observation,
    Ticket,
    Verification,
    RoadSegment,
    Authority,
    Department,
    IssueStatus,
    TicketStatus,
    VerificationResult,
)
from scripts.seed_golden_demo import seed_golden_demo, reset_golden_demo


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_golden_demo_seed_and_idempotency():
    """Ensure seeding creates records and running a second time does not duplicate them."""
    # First seed run
    created, updated, skipped = await seed_golden_demo()
    assert created["issues"] in (0, 4)  # 4 if fresh, 0 if already seeded

    # Second seed run (idempotency check)
    created2, updated2, skipped2 = await seed_golden_demo()
    assert created2["issues"] == 0
    assert created2["detections"] == 0
    assert created2["observations"] == 0
    assert created2["tickets"] == 0
    assert created2["verifications"] == 0
    assert updated2["issues"] == 4
    assert updated2["tickets"] == 3
    assert updated2["verifications"] == 2


@pytest.mark.asyncio
async def test_scenario_a_fully_resolved(client):
    """
    Scenario A: PWD Road Segment Ownership -> Ticket -> Repair -> Verification = resolved -> Issue resolved.
    """
    async with AsyncSessionLocal() as session:
        issue = await session.get(UrbanIssue, "iss_demo_gold_a")
        assert issue is not None
        assert issue.authority_id == "AUTH-PWD-DELHI"
        assert issue.road_segment_id == "SEG-DEL-NCR-01"
        assert issue.jurisdiction_source == "road_segment_ownership"
        assert issue.status == IssueStatus.verified
        assert issue.confidence == 0.92

        ticket = await session.get(Ticket, "tkt_demo_gold_a")
        assert ticket is not None
        assert ticket.status == TicketStatus.closed
        assert ticket.authority_id == "AUTH-PWD-DELHI"
        assert ticket.department_id == "DELHI-NCR-ROADS"
        assert ticket.repair_reported_at is not None
        assert ticket.verified_at is not None

        verification = await session.get(Verification, "ver_demo_gold_a")
        assert verification is not None
        assert verification.result == VerificationResult.resolved
        assert verification.confidence == 0.94
        assert verification.before_evidence_url is not None
        assert verification.after_evidence_url is not None

    # Test API 360 payload
    resp = client.get("/api/v1/issues/iss_demo_gold_a/360")
    assert resp.status_code == 200
    data = resp.json()
    assert data["isDemo"] is True
    assert data["provenance"] == "DEMO"
    assert "DEMO" in data["tags"]
    assert data["authorityId"] == "AUTH-PWD-DELHI"
    assert data["jurisdictionSource"] == "road_segment_ownership"
    assert data["ticket"]["status"] == "closed"
    assert data["verification"]["result"] == "resolved"
    assert len(data["timeline"]) >= 3


@pytest.mark.asyncio
async def test_scenario_b_active_ticket(client):
    """
    Scenario B: MCD Central Polygon Containment -> Active Municipal Ticket in open status.
    """
    async with AsyncSessionLocal() as session:
        issue = await session.get(UrbanIssue, "iss_demo_gold_b")
        assert issue is not None
        assert issue.authority_id == "AUTH-MCD-CENTRAL"
        assert issue.jurisdiction_id == "JUR-DEL-CENTRAL"
        assert issue.jurisdiction_source == "configured_prototype_boundary"
        assert issue.status == IssueStatus.ticket_created

        ticket = await session.get(Ticket, "tkt_demo_gold_b")
        assert ticket is not None
        assert ticket.status == TicketStatus.open
        assert ticket.authority_id == "AUTH-MCD-CENTRAL"
        assert ticket.department_id == "MCD-CENTRAL-MAINT"

    # Test Ticket API
    resp = client.get("/api/v1/tickets/tkt_demo_gold_b")
    assert resp.status_code == 200
    tkt_data = resp.json()
    assert tkt_data["isDemo"] is True
    assert tkt_data["authorityCode"] == "MCD"
    assert tkt_data["status"] == "open"


@pytest.mark.asyncio
async def test_scenario_c_unresolved_blocks_ticket(client):
    """
    Scenario C: Unresolved Jurisdiction Safety -> Attempting to create ticket returns HTTP 400.
    """
    async with AsyncSessionLocal() as session:
        issue = await session.get(UrbanIssue, "iss_demo_gold_c")
        assert issue is not None
        assert issue.authority_id is None
        assert issue.jurisdiction_source == "unresolved"
        assert issue.status == IssueStatus.new

        # Ensure no ticket exists initially for Scenario C
        t_res = await session.execute(
            select(Ticket).where(Ticket.issue_id == "iss_demo_gold_c")
        )
        assert t_res.scalar_one_or_none() is None

    # Attempt to dispatch ticket for unresolved issue via API (authenticated operator)
    resp = client.post(
        "/api/v1/tickets?issue_id=iss_demo_gold_c",
        headers={"Authorization": "Bearer demo-operator-token"}
    )
    assert resp.status_code == 400
    assert "issue jurisdiction is unresolved" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_scenario_d_failed_verification_reopened(client):
    """
    Scenario D: Failed Reinspection -> Verification = unresolved -> Reopened ticket & issue.
    """
    async with AsyncSessionLocal() as session:
        issue = await session.get(UrbanIssue, "iss_demo_gold_d")
        assert issue is not None
        assert issue.authority_id == "AUTH-NOIDA"
        assert issue.jurisdiction_source == "configured_prototype_boundary"
        assert issue.status == IssueStatus.reopened

        ticket = await session.get(Ticket, "tkt_demo_gold_d")
        assert ticket is not None
        assert ticket.status == TicketStatus.reopened
        assert ticket.authority_id == "AUTH-NOIDA"

        verification = await session.get(Verification, "ver_demo_gold_d")
        assert verification is not None
        assert verification.result == VerificationResult.unresolved

    resp = client.get("/api/v1/tickets/tkt_demo_gold_d")
    assert resp.status_code == 200
    assert resp.json()["status"] == "reopened"
    assert resp.json()["authorityCode"] == "NOIDA"


@pytest.mark.asyncio
async def test_safe_reset_and_reseed():
    """
    Ensure reset removes ONLY Golden Demo records without deleting baseline or operational data.
    """
    async with AsyncSessionLocal() as session:
        # Pre-reset baseline counts
        total_issues_pre = await session.scalar(select(func.count(UrbanIssue.id)))
        golden_issues_pre = await session.scalar(
            select(func.count(UrbanIssue.id)).where(UrbanIssue.id.like("iss_demo_gold_%"))
        )
        assert golden_issues_pre == 4

    # Perform safe reset
    await reset_golden_demo()

    async with AsyncSessionLocal() as session:
        golden_issues_post = await session.scalar(
            select(func.count(UrbanIssue.id)).where(UrbanIssue.id.like("iss_demo_gold_%"))
        )
        assert golden_issues_post == 0

        golden_tickets_post = await session.scalar(
            select(func.count(Ticket.id)).where(Ticket.id.like("tkt_demo_gold_%"))
        )
        assert golden_tickets_post == 0

        total_issues_post = await session.scalar(select(func.count(UrbanIssue.id)))
        assert total_issues_post == total_issues_pre - 4  # ONLY the 4 golden issues were removed

    # Re-seed to restore Golden Demo data
    created, updated, skipped = await seed_golden_demo()
    assert created["issues"] == 4
    assert created["tickets"] == 3
    assert created["verifications"] == 2


def test_analytics_reflects_golden_demo(client):
    """
    Ensure Analytics automatically reflects Golden Demo data without special-case logic.
    """
    resp = client.get("/api/v1/analytics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["provenance"] == "CURRENT_DATABASE_SNAPSHOT"
    assert data["totalIssues"] >= 4
    assert data["totalTickets"] >= 3
    assert data["totalVerifications"] >= 2

    # Check authority distribution includes PWD, MCD, NOIDA, and unresolved
    auth_resp = client.get("/api/v1/analytics/authorities")
    assert auth_resp.status_code == 200
    auth_data = auth_resp.json()
    auth_ids = {a["authorityId"] for a in auth_data["authorities"]}
    assert "AUTH-PWD-DELHI" in auth_ids
    assert "AUTH-MCD-CENTRAL" in auth_ids
    assert "AUTH-NOIDA" in auth_ids
    assert "unresolved" in auth_ids
