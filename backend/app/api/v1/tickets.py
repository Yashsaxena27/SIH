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
    
    return {
        "total": total or 0,
        "open": open_count or 0,
        "assigned": 0,
        "inProgress": 0,
        "repairReported": 0,
        "verifying": 0,
        "resolved": resolved or 0,
        "reopened": 0,
        "slaBreached": 0,
        "averageResolutionDays": 2
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
