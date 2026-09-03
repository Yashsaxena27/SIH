from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.domain import Ticket, TicketStatus

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
    
    return [
        {
            "id": t.id,
            "displayId": t.display_id,
            "issueId": t.issue_id,
            "title": t.title,
            "status": t.status.value if hasattr(t.status, 'value') else t.status,
            "priority": t.priority,
            "departmentId": t.department_id,
            "createdAt": t.created_at,
            "updatedAt": t.updated_at
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
        
    return {
        "id": ticket.id,
        "displayId": ticket.display_id,
        "issueId": ticket.issue_id,
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status,
        "priority": ticket.priority,
        "departmentId": ticket.department_id,
        "createdAt": ticket.created_at,
        "updatedAt": ticket.updated_at
    }
