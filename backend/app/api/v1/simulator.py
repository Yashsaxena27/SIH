from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import datetime
import shapely.wkb
from typing import Optional

from app.core.database import get_db
from app.schemas.ingestion import DetectionEvent, GeoPoint
from app.services.ingestion import process_detection_event
from app.services.verification import process_verification_reinspection
from app.models.domain import UrbanIssue, Ticket, TicketStatus, IssueStatus

router = APIRouter(prefix="/api/v1/demo", tags=["Simulator"])

@router.post("/simulate-detection")
async def simulate_detection(
    background_tasks: BackgroundTasks,
    bus_id: str = "BUS-001",
    lat: float = 28.6139,
    lng: float = 77.2090,
    detection_type: str = "pothole",
    severity: str = "medium",
    confidence: float = 0.85,
    session: AsyncSession = Depends(get_db)
):
    event = DetectionEvent(
        event_id=f"EVT-{uuid.uuid4().hex[:8]}",
        bus_id=bus_id,
        timestamp=datetime.datetime.utcnow(),
        location=GeoPoint(lat=lat, lng=lng),
        detection_type=detection_type,
        severity=severity,
        confidence=confidence,
        evidence_url=f"/mock-evidence/{detection_type}.jpg"
    )
    
    issue = await process_detection_event(session, event)
    return {"message": "Detection simulated", "issue_id": issue.id if issue else None}

@router.post("/simulate-repair/{ticket_id}")
async def simulate_repair(ticket_id: str, session: AsyncSession = Depends(get_db)):
    ticket = await session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    issue = await session.get(UrbanIssue, ticket.issue_id)
    
    ticket.status = TicketStatus.repair_reported
    ticket.repair_reported_at = datetime.datetime.utcnow()
    
    if issue:
        issue.status = IssueStatus.verification_pending
    await session.commit()
    
    return {"message": "Repair reported, verification pending", "issue_id": issue.id if issue else None}

@router.post("/simulate-revisit/{issue_id}")
async def simulate_revisit(
    issue_id: str,
    fixed: Optional[bool] = None,
    scenario: str = "resolved",
    bus_id: str = "BUS-001",
    session: AsyncSession = Depends(get_db)
):
    issue = await session.get(UrbanIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Map legacy 'fixed' parameter if provided
    selected_scenario = scenario
    if fixed is not None:
        selected_scenario = "resolved" if fixed else "unresolved"

    if selected_scenario == "resolved":
        verification = await process_verification_reinspection(
            session=session,
            issue_id=issue.id,
            bus_id=bus_id,
            coverage_confirmed=True,
            evidence_quality="SUFFICIENT",
            new_detection=None,
            reinspection_evidence_url="/mock-evidence/reinspection-clear.jpg",
            notes="Controlled simulation: corridor coverage confirmed, zero defect observed."
        )
    elif selected_scenario == "unresolved":
        det_mock = DetectionEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8]}",
            bus_id=bus_id,
            timestamp=datetime.datetime.utcnow(),
            location=GeoPoint(lat=28.6139, lng=77.2090),
            detection_type=issue.issue_type,
            severity=issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity),
            confidence=0.92,
            evidence_url="/mock-evidence/still-broken.jpg"
        )
        verification = await process_verification_reinspection(
            session=session,
            issue_id=issue.id,
            bus_id=bus_id,
            coverage_confirmed=True,
            evidence_quality="SUFFICIENT",
            new_detection=det_mock,
            reinspection_evidence_url="/mock-evidence/still-broken.jpg",
            notes="Controlled simulation: defect remains visible upon reinspection."
        )
    elif selected_scenario == "inconclusive_coverage":
        verification = await process_verification_reinspection(
            session=session,
            issue_id=issue.id,
            bus_id=bus_id,
            coverage_confirmed=False,
            evidence_quality="SUFFICIENT",
            new_detection=None,
            notes="Controlled simulation: target corridor was not covered by bus pass."
        )
    elif selected_scenario == "inconclusive_quality":
        verification = await process_verification_reinspection(
            session=session,
            issue_id=issue.id,
            bus_id=bus_id,
            coverage_confirmed=True,
            evidence_quality="DEGRADED",
            new_detection=None,
            reinspection_evidence_url="/mock-evidence/blurry-lens.jpg",
            notes="Controlled simulation: camera lens occlusion / degraded optical quality."
        )
    elif selected_scenario == "recurrence":
        # First ensure issue is verified
        issue.status = IssueStatus.verified
        await session.commit()

        # Extract lat/lng
        lat, lng = 28.6139, 77.2090
        if issue.location:
            pt = shapely.wkb.loads(bytes(issue.location.data))
            lat, lng = pt.y, pt.x

        # Ingest detection at same coordinates
        event = DetectionEvent(
            event_id=f"EVT-REC-{uuid.uuid4().hex[:8]}",
            bus_id=bus_id,
            timestamp=datetime.datetime.utcnow(),
            location=GeoPoint(lat=lat, lng=lng),
            detection_type=issue.issue_type,
            severity=issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity),
            confidence=0.88,
            evidence_url="/mock-evidence/recurrent-pothole.jpg"
        )
        reopened_issue = await process_detection_event(session, event)
        return {
            "message": "Recurrence simulation completed",
            "scenario": "recurrence",
            "issue_id": reopened_issue.id if reopened_issue else issue.id,
            "new_status": reopened_issue.status.value if reopened_issue else "reopened"
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unknown simulation scenario: {selected_scenario}")

    await session.refresh(issue)
    return {
        "message": "Revisit simulated",
        "scenario": selected_scenario,
        "verification_id": verification.id,
        "verification_result": verification.result.value,
        "new_status": issue.status.value
    }
