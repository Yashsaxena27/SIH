from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.domain import Ticket, TicketStatus, Department, UrbanIssue

router = APIRouter(prefix="/api/v1/tickets", tags=["Tickets"])

@router.get("")
async def get_tickets(status: str = None, session: AsyncSession = Depends(get_db)):
    query = select(Ticket)
    if status:
        try:
            enum_status = TicketStatus[status]
            query = query.where(Ticket.status == enum_status)
        except KeyError:
            pass # Invalid status filter
            
    result = await session.execute(query)
    tickets = result.scalars().all()

    # Prefetch departments and issues for full metadata
    dept_res = await session.execute(select(Department))
    dept_map = {d.id: d.name for d in dept_res.scalars().all()}

    issue_res = await session.execute(select(UrbanIssue))
    issue_map = {i.id: i for i in issue_res.scalars().all()}
    
    return [
        {
            "id": t.id,
            "displayId": t.display_id,
            "issueId": t.issue_id,
            "title": t.title,
            "status": t.status.value if hasattr(t.status, 'value') else t.status,
            "priority": t.priority.value if hasattr(t.priority, 'value') else t.priority,
            "severity": (issue_map[t.issue_id].severity.value if hasattr(issue_map[t.issue_id].severity, 'value') else issue_map[t.issue_id].severity) if t.issue_id in issue_map else "medium",
            "departmentId": t.department_id,
            "departmentName": dept_map.get(t.department_id, "BBMP Road Infrastructure"),
            "slaStatus": "on_track",
            "createdAt": t.created_at.isoformat() if t.created_at else None,
            "updatedAt": t.updated_at.isoformat() if t.updated_at else None
        }
        for t in tickets
    ]

@router.get("/summary")
async def get_ticket_summary(session: AsyncSession = Depends(get_db)):
    total = await session.scalar(select(func.count()).select_from(Ticket))
    open_count = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.open))
    resolved = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status.in_([TicketStatus.verified_resolved, TicketStatus.closed])))
    
    assigned_count = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.assigned))
    in_progress_count = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.in_progress))
    repair_reported_count = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.repair_reported))
    verifying_count = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.verifying))
    reopened_count = await session.scalar(select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.reopened))
    
    return {
        "total": total or 0,
        "open": open_count or 0,
        "assigned": assigned_count or 0,
        "inProgress": in_progress_count or 0,
        "repairReported": repair_reported_count or 0,
        "verifying": verifying_count or 0,
        "resolved": resolved or 0,
        "reopened": reopened_count or 0,
        "slaBreached": 0,
        "averageResolutionDays": None
    }

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, session: AsyncSession = Depends(get_db)):
    ticket = await session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    dept = await session.get(Department, ticket.department_id) if ticket.department_id else None
    issue = await session.get(UrbanIssue, ticket.issue_id) if ticket.issue_id else None
    
    return {
        "id": ticket.id,
        "displayId": ticket.display_id,
        "issueId": ticket.issue_id,
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value if hasattr(ticket.status, 'value') else ticket.status,
        "priority": ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority,
        "severity": (issue.severity.value if hasattr(issue.severity, 'value') else issue.severity) if issue else "medium",
        "departmentId": ticket.department_id,
        "departmentName": dept.name if dept else "BBMP Road Infrastructure",
        "slaStatus": "on_track",
        "createdAt": ticket.created_at.isoformat() if ticket.created_at else None,
        "updatedAt": ticket.updated_at.isoformat() if ticket.updated_at else None
    }

from pydantic import BaseModel
from typing import Optional
from app.services.ticket_lifecycle import transition_ticket, assign_ticket, validate_transition, TICKET_TRANSITIONS
from app.models.domain import IssueStatus


class TicketStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class TicketAssignment(BaseModel):
    assigned_to: str
    notes: Optional[str] = None


@router.put("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    body: TicketStatusUpdate,
    session: AsyncSession = Depends(get_db)
):
    """Transition a ticket to a new status with validation."""
    try:
        new_status = TicketStatus[body.status]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    
    try:
        ticket = await transition_ticket(
            session, ticket_id, new_status, notes=body.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    return {
        "id": ticket.id,
        "status": ticket.status.value,
        "message": f"Status updated to {ticket.status.value}"
    }


@router.post("/{ticket_id}/assign")
async def assign_ticket_endpoint(
    ticket_id: str,
    body: TicketAssignment,
    session: AsyncSession = Depends(get_db)
):
    """Assign a ticket to an operator (demo/operator assignment)."""
    try:
        ticket = await assign_ticket(
            session, ticket_id, body.assigned_to, notes=body.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    return {
        "id": ticket.id,
        "status": ticket.status.value,
        "assignedTo": ticket.assigned_to,
        "message": f"Ticket assigned to {body.assigned_to}"
    }


@router.get("/{ticket_id}/transitions")
async def get_valid_transitions(
    ticket_id: str,
    session: AsyncSession = Depends(get_db)
):
    """Returns the valid next statuses for a ticket."""
    ticket = await session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    allowed = TICKET_TRANSITIONS.get(ticket.status, [])
    return {
        "ticketId": ticket.id,
        "currentStatus": ticket.status.value,
        "allowedTransitions": [s.value for s in allowed]
    }

