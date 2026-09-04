"""Central ticket lifecycle state machine.

All ticket status transitions flow through this service to ensure
consistency, validation, audit trails, and SSE broadcasts.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import (
    Ticket, TicketStatus, UrbanIssue, IssueStatus, User
)
from app.api.v1.events import broadcast_event

logger = logging.getLogger(__name__)

# Valid state transitions for tickets
TICKET_TRANSITIONS = {
    TicketStatus.open: [TicketStatus.assigned],
    TicketStatus.assigned: [TicketStatus.in_progress],
    TicketStatus.in_progress: [TicketStatus.repair_reported],
    TicketStatus.repair_reported: [TicketStatus.verifying],
    TicketStatus.verifying: [TicketStatus.verified_resolved, TicketStatus.verified_unresolved],
    TicketStatus.verified_resolved: [TicketStatus.closed],
    TicketStatus.verified_unresolved: [TicketStatus.reopened],
    TicketStatus.reopened: [TicketStatus.in_progress],
    TicketStatus.closed: [],
}

# Map ticket status to corresponding issue status
TICKET_TO_ISSUE_STATUS = {
    TicketStatus.assigned: IssueStatus.assigned,
    TicketStatus.in_progress: IssueStatus.in_progress,
    TicketStatus.repair_reported: IssueStatus.repair_reported,
    TicketStatus.verifying: IssueStatus.verification_pending,
    TicketStatus.verified_resolved: IssueStatus.verified,
    TicketStatus.verified_unresolved: IssueStatus.reopened,
    TicketStatus.reopened: IssueStatus.reopened,
}


def validate_transition(current: TicketStatus, requested: TicketStatus) -> bool:
    """Check if a status transition is allowed."""
    allowed = TICKET_TRANSITIONS.get(current, [])
    return requested in allowed


async def transition_ticket(
    session: AsyncSession,
    ticket_id: str,
    new_status: TicketStatus,
    notes: str = None,
    assigned_to: str = None,
) -> Ticket:
    """
    Central ticket state transition with validation, timestamps, and broadcasts.
    
    Raises ValueError for invalid transitions.
    """
    ticket = await session.get(Ticket, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")
    
    current_status = ticket.status
    if not validate_transition(current_status, new_status):
        raise ValueError(
            f"Invalid transition: {current_status.value} -> {new_status.value}. "
            f"Allowed: {[s.value for s in TICKET_TRANSITIONS.get(current_status, [])]}"
        )
    
    import uuid
    from app.models.domain import TimelineEvent
    
    # Apply the transition
    old_status_val = ticket.status.value if hasattr(ticket.status, 'value') else ticket.status
    ticket.status = new_status
    
    # Handle assignment
    if new_status == TicketStatus.assigned and assigned_to:
        ticket.assigned_to = assigned_to
    
    # Handle timestamps
    now = datetime.now(timezone.utc)
    if new_status == TicketStatus.repair_reported:
        ticket.repair_reported_at = now
    elif new_status in (TicketStatus.verified_resolved, TicketStatus.verified_unresolved):
        ticket.verified_at = now
    
    # Sync issue status
    issue_status = TICKET_TO_ISSUE_STATUS.get(new_status)
    if issue_status:
        issue = await session.get(UrbanIssue, ticket.issue_id)
        if issue:
            issue.status = issue_status
    
    # Add timeline event
    event = TimelineEvent(
        id=f"evt_{uuid.uuid4().hex[:12]}",
        entity_id=ticket.id,
        entity_type="ticket",
        event_type="status_change",
        title=f"Status changed to {new_status.value}",
        description=notes or f"Ticket status transitioned from {old_status_val} to {new_status.value}",
        actor=assigned_to or "SYSTEM",
        metadata_json={"old_status": old_status_val, "new_status": new_status.value}
    )
    session.add(event)
    
    await session.commit()
    
    logger.info(f"Ticket {ticket_id}: {old_status_val} -> {new_status.value}")
    
    # Broadcast SSE event
    broadcast_event("TICKET_UPDATED", {
        "ticketId": ticket_id,
        "oldStatus": old_status_val,
        "newStatus": new_status.value,
        "notes": notes,
    })
    
    return ticket


async def assign_ticket(
    session: AsyncSession,
    ticket_id: str,
    assigned_to: str,
    notes: str = None,
) -> Ticket:
    """
    Assigns a ticket to an operator/engineer.
    This is a convenience wrapper around transition_ticket.
    """
    return await transition_ticket(
        session, ticket_id, TicketStatus.assigned,
        notes=notes, assigned_to=assigned_to,
    )
