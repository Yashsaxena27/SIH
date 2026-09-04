import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.ingestion import DetectionEvent
from app.models.domain import UrbanIssue, Ticket, Verification, VerificationResult, IssueStatus, TicketStatus

async def process_verification_revisit(session: AsyncSession, issue: UrbanIssue, new_detection: DetectionEvent = None):
    """
    Handles closed-loop verification when a bus revisits a REPAIR_REPORTED location.
    
    If new_detection is provided, it means the defect is still present.
    If no new_detection is provided (but the bus passed by), we assume it's fixed.
    For this SIH prototype, we'll explicitly trigger this via the simulator.
    """
    
    # 1. Ensure issue is in the right state
    if issue.status != IssueStatus.verification_pending:
        # Issue is not ready for verification
        return issue
        
    from sqlalchemy import select as sa_select
    ticket_result = await session.execute(
        sa_select(Ticket).where(Ticket.issue_id == issue.id)
    )
    ticket = ticket_result.scalar_one_or_none()
    if not ticket:
        return issue

    verification_id = f"ver_{uuid.uuid4().hex[:12]}"

    if new_detection:
        # The bus still detected the pothole
        verification = Verification(
            id=verification_id,
            issue_id=issue.id,
            ticket_id=ticket.id,
            bus_id=new_detection.bus_id,
            timestamp=new_detection.timestamp,
            result=VerificationResult.unresolved,
            confidence=new_detection.confidence,
            after_evidence_url=new_detection.evidence_url,
            notes="Defect still detected after reported repair."
        )
        session.add(verification)
        
        # Transition back to reopened
        issue.status = IssueStatus.reopened
        ticket.status = TicketStatus.reopened
        
    else:
        # The bus passed by and did NOT detect the pothole. Verify as resolved.
        # Note: In real life, we need a 'clear observation' event from the edge.
        import datetime
        timestamp = datetime.datetime.utcnow()
        verification = Verification(
            id=verification_id,
            issue_id=issue.id,
            ticket_id=ticket.id,
            bus_id="SYSTEM",  # Placeholder
            timestamp=timestamp,
            result=VerificationResult.resolved,
            confidence=0.99,
            notes="No defect detected on revisit."
        )
        session.add(verification)
        
        # Complete the loop
        issue.status = IssueStatus.verified
        ticket.status = TicketStatus.verified_resolved
        ticket.verified_at = timestamp
        
    await session.commit()
    return issue
