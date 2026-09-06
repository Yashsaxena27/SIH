import pytest
import uuid
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import select, delete

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import Authority, Jurisdiction, Ticket, UrbanIssue, Department, TicketStatus, TicketPriority

client = TestClient(app)

@pytest.mark.asyncio
async def test_multi_authority_seed_entities():
    """Verify seeded authorities and prototype boundaries exist in the database."""
    async with AsyncSessionLocal() as session:
        # Check Authorities
        auth_res = await session.execute(select(Authority))
        authorities = {a.id: a for a in auth_res.scalars().all()}
        assert "AUTH-PWD-DELHI" in authorities
        assert "AUTH-MCD-CENTRAL" in authorities
        assert "AUTH-NOIDA" in authorities

        pwd = authorities["AUTH-PWD-DELHI"]
        assert pwd.code == "PWD"
        assert pwd.authority_type == "state_pwd"

        mcd = authorities["AUTH-MCD-CENTRAL"]
        assert mcd.code == "MCD"
        assert mcd.authority_type == "municipal_corporation"

        noida = authorities["AUTH-NOIDA"]
        assert noida.code == "NOIDA"
        assert noida.authority_type == "development_authority"

        # Check Jurisdictions
        jur_res = await session.execute(select(Jurisdiction))
        jurisdictions = {j.id: j for j in jur_res.scalars().all()}
        assert "JUR-DEL-CENTRAL" in jurisdictions
        assert "JUR-NOIDA-URBAN" in jurisdictions

        # Check prototype boundary disclosure
        for jur in jurisdictions.values():
            assert jur.boundary_type == "configured_prototype_boundary"

@pytest.mark.asyncio
async def test_ticket_creation_with_authority_routing():
    """
    Verify creating a ticket correctly captures authority routing,
    and GET /api/v1/tickets serializes authority metadata.
    """
    ticket_id = f"tkt_test_{uuid.uuid4().hex[:8]}"
    issue_id = None
    try:
        async with AsyncSessionLocal() as session:
            # Pick a department and issue
            dept_res = await session.execute(
                select(Department).where(Department.authority_id == "AUTH-PWD-DELHI").limit(1)
            )
            dept = dept_res.scalar_one_or_none()
            assert dept is not None

            # Create test issue with PWD authority and valid location geometry
            now = datetime.datetime.now(datetime.timezone.utc)
            issue_id = f"iss_tkt_{uuid.uuid4().hex[:8]}"
            issue = UrbanIssue(
                id=issue_id,
                issue_type="pothole",
                location="POINT(77.2167 28.6289)",
                first_detected_at=now,
                last_observed_at=now,
                authority_id="AUTH-PWD-DELHI",
                assigned_department_id=dept.id,
                jurisdiction_source="road_segment_ownership",
                status="confirmed",
                severity="critical",
                priority="urgent",
                confidence=0.95
            )
            session.add(issue)
            await session.flush()

            # Create ticket referencing this issue
            ticket = Ticket(
                id=ticket_id,
                display_id=f"TKT-TEST-{ticket_id[-4:].upper()}",
                issue_id=issue_id,
                department_id=dept.id,
                authority_id="AUTH-PWD-DELHI",
                title="Emergency Pothole Repair - PWD Route",
                description="Test ticket for PWD authority routing",
                status=TicketStatus.open,
                priority=TicketPriority.urgent
            )
            session.add(ticket)
            await session.commit()

        # Query tickets API
        res = client.get("/api/v1/tickets")
        assert res.status_code == 200
        tickets = res.json()
        matching = next((t for t in tickets if t["id"] == ticket_id), None)
        assert matching is not None
        assert matching["authority_id"] == "AUTH-PWD-DELHI"
        assert matching["authority_code"] == "PWD"
        assert "Delhi Public Works Department" in matching["authority_name"]

        # Query single ticket API
        res_single = client.get(f"/api/v1/tickets/{ticket_id}")
        assert res_single.status_code == 200
        single_data = res_single.json()
        assert single_data["authority_id"] == "AUTH-PWD-DELHI"
        assert single_data["authority_code"] == "PWD"

    finally:
        async with AsyncSessionLocal() as session:
            await session.execute(delete(Ticket).where(Ticket.id == ticket_id))
            if issue_id:
                await session.execute(delete(UrbanIssue).where(UrbanIssue.id == issue_id))
            await session.commit()

def test_unresolved_jurisdiction_tracking():
    """Verify issues outside boundaries have explicit unresolved status and source."""
    res = client.get("/api/v1/issues")
    assert res.status_code == 200
    data = res.json()
    issues = data if isinstance(data, list) else data.get("items", [])
    
    # Verify that unresolved issues exist and carry explicit unresolved provenance
    unresolved = [i for i in issues if i.get("jurisdictionStatus") == "unresolved" or i.get("authorityId") is None]
    assert len(unresolved) > 0

    for u in unresolved:
        assert u.get("authorityId") is None
        assert u.get("jurisdictionSource") == "unresolved"
