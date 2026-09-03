from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import datetime

from app.core.database import get_db
from app.schemas.ingestion import DetectionEvent, GeoPoint
from app.services.ingestion import process_detection_event
from app.services.verification import process_verification_revisit
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
    
    # Run in background or foreground based on preference
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
    
    issue.status = IssueStatus.verification_pending
    await session.commit()
    
    return {"message": "Repair reported, verification pending", "issue_id": issue.id}

@router.post("/simulate-revisit/{issue_id}")
async def simulate_revisit(
    issue_id: str,
    fixed: bool = True,
    bus_id: str = "BUS-002",
    session: AsyncSession = Depends(get_db)
):
    issue = await session.get(UrbanIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if fixed:
        # Bus passes by and sees no defect
        await process_verification_revisit(session, issue, new_detection=None)
    else:
        # Bus passes by and STILL sees the defect
        # Extract lat/lng from postgis Point geometry (simplified for demo)
        # Assuming we just mock the location of the previous issue
        event = DetectionEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8]}",
            bus_id=bus_id,
            timestamp=datetime.datetime.utcnow(),
            location=GeoPoint(lat=28.6139, lng=77.2090), # Fallback mock
            detection_type=issue.issue_type,
            severity=issue.severity.value,
            confidence=0.92,
            evidence_url=f"/mock-evidence/still-broken.jpg"
        )
        await process_verification_revisit(session, issue, new_detection=event)
        
    return {"message": "Revisit simulated", "new_status": issue.status}
