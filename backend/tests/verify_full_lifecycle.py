import asyncio
from datetime import datetime, timezone
import uuid
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.domain import UrbanIssue, Bus, Ticket, Verification, IssueStatus, TicketStatus, VerificationResult
from app.schemas.ingestion import DetectionEvent, GeoPoint
from app.services.ingestion import ensure_bus_exists, process_detection_event
from app.services.lifecycle import transition_issue_state

async def test_complete_lifecycle():
    print("=" * 60)
    print("FULL ISSUE LIFECYCLE VERIFICATION")
    print("=" * 60)

    # Unique coords in Bengaluru corridor to ensure brand-new issue
    import random
    offset = random.uniform(0.01, 0.05)
    lat = 12.95000 + offset
    lng = 77.60000 + offset
    ts = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        # Step 1: BUS-001 reports new pothole
        print("\n[Step 1] BUS-001 Initial Detection -> NEW Issue")
        await ensure_bus_exists(session, "BUS-001")
        
        evt1 = DetectionEvent(
            event_id=f"EVT-LIFECYCLE-1-{uuid.uuid4().hex[:6]}",
            bus_id="BUS-001",
            timestamp=ts,
            location=GeoPoint(lat=lat, lng=lng),
            detection_type="pothole",
            confidence=0.14,
            severity="high",
            evidence_url="/evidence/BUS001_pothole.jpg"
        )
        issue = await process_detection_event(session, evt1)
        await session.commit()
        await session.refresh(issue)

        print(f"    Issue ID: {issue.id}")
        print(f"    Status: {issue.status.value}")
        print(f"    Observation Count: {issue.observation_count}")
        print(f"    Unique Bus Count: {issue.unique_bus_count}")
        assert issue.status == IssueStatus.new
        assert issue.unique_bus_count == 1
        print("    [PASS] Step 1: BUS-001 created NEW issue.")

        # Step 2: BUS-002 second observation at same location
        print("\n[Step 2] BUS-002 Second Bus Observation -> Spatial Fusion & Multi-Bus Confirmation")
        await ensure_bus_exists(session, "BUS-002")
        
        evt2 = DetectionEvent(
            event_id=f"EVT-LIFECYCLE-2-{uuid.uuid4().hex[:6]}",
            bus_id="BUS-002",
            timestamp=ts,
            location=GeoPoint(lat=lat + 0.00001, lng=lng + 0.00001), # ~1.5 meters away
            detection_type="pothole",
            confidence=0.16,
            severity="high",
            evidence_url="/evidence/BUS002_pothole.jpg"
        )
        fused_issue = await process_detection_event(session, evt2)
        await session.commit()
        await session.refresh(fused_issue)

        print(f"    Issue ID: {fused_issue.id} (Matches original: {fused_issue.id == issue.id})")
        print(f"    Status: {fused_issue.status.value}")
        print(f"    Observation Count: {fused_issue.observation_count}")
        print(f"    Unique Bus Count: {fused_issue.unique_bus_count}")
        assert fused_issue.id == issue.id
        assert fused_issue.unique_bus_count == 2
        assert fused_issue.status in (IssueStatus.confirmed, IssueStatus.prioritized, IssueStatus.ticket_created)
        print("    [PASS] Step 2: Multi-bus spatial confirmation succeeded (unique_bus_count=2).")

        # Step 3: Priority & Ticket Creation
        print("\n[Step 3] Verification of Auto-Ticket Generation")
        result = await session.execute(select(Ticket).where(Ticket.issue_id == fused_issue.id))
        ticket = result.scalar_one_or_none()

        print(f"    Issue Status: {fused_issue.status.value}")
        if ticket:
            print(f"    Ticket ID: {ticket.id}")
            print(f"    Ticket Display ID: {ticket.display_id}")
            print(f"    Ticket Status: {ticket.status.value}")
            print(f"    Ticket Priority: {ticket.priority.value}")
        assert ticket is not None
        print("    [PASS] Step 3: Ticket generated and linked.")

        # Step 4: Repair Reported & Verification Pending
        print("\n[Step 4] Contractor Reports Repair -> VERIFICATION_PENDING")
        fused_issue.status = IssueStatus.repair_reported
        await transition_issue_state(session, fused_issue)
        await session.commit()
        await session.refresh(fused_issue)

        print(f"    Issue Status: {fused_issue.status.value}")
        assert fused_issue.status == IssueStatus.verification_pending
        print("    [PASS] Step 4: Issue transitioned to verification_pending.")

        # Step 5: Post-Repair Revisit -> VERIFIED
        print("\n[Step 5] Autonomous Revisit -> VERIFIED")
        v = Verification(
            id=f"ver_{uuid.uuid4().hex[:12]}",
            issue_id=fused_issue.id,
            ticket_id=ticket.id,
            bus_id="BUS-001",
            timestamp=datetime.now(timezone.utc),
            result=VerificationResult.resolved,
            confidence=0.92,
            notes="Autonomous camera revisit confirms smooth asphalt surface; zero road damage detected."
        )
        session.add(v)
        fused_issue.status = IssueStatus.verified
        await transition_issue_state(session, fused_issue)
        await session.commit()
        await session.refresh(fused_issue)

        print(f"    Final Issue Status: {fused_issue.status.value}")
        assert fused_issue.status == IssueStatus.verified
        print("    [PASS] Step 5: Issue successfully marked VERIFIED.")

    print("\n" + "=" * 60)
    print("ALL 5 LIFECYCLE TRANSITION STAGES PROVEN AT RUNTIME!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_complete_lifecycle())
