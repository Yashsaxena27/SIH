from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.models.domain import Ticket, TicketStatus, Department, UrbanIssue, IssueStatus, Authority, UserRole, TimelineEvent

router = APIRouter(prefix="/api/v1/tickets", tags=["Tickets"])


@router.post("")
async def create_ticket(
    issue_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.admin, UserRole.operator, UserRole.officer]))
):
    """Create one active repair ticket for an issue, idempotently."""
    issue = await session.get(UrbanIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    existing = await session.execute(
        select(Ticket).where(
            Ticket.issue_id == issue_id,
            Ticket.status.not_in([TicketStatus.verified_resolved, TicketStatus.closed]),
        )
    )
    ticket = existing.scalar_one_or_none()
    if ticket:
        auth = await session.get(Authority, ticket.authority_id) if ticket.authority_id else None
        dept = await session.get(Department, ticket.department_id) if ticket.department_id else None
        return {
            "id": ticket.id,
            "displayId": ticket.display_id,
            "issueId": ticket.issue_id,
            "status": ticket.status.value,
            "authorityId": ticket.authority_id,
            "authorityName": auth.name if auth else None,
            "authorityCode": auth.code if auth else None,
            "departmentId": ticket.department_id,
            "departmentName": dept.name if dept else None,
            "created": False,
        }

    # Amendment 9: If issue jurisdiction is unresolved, reject ticket creation
    if not issue.authority_id or issue.jurisdiction_source == "unresolved":
        raise HTTPException(
            status_code=400,
            detail="Cannot create municipal ticket: issue jurisdiction is unresolved. Operational jurisdiction must be determined before dispatching to a department queue."
        )

    department = None
    if issue.assigned_department_id:
        department = await session.get(Department, issue.assigned_department_id)

    if not department:
        department_result = await session.execute(
            select(Department)
            .where(
                Department.authority_id == issue.authority_id,
                Department.is_active == True
            )
            .order_by(case((Department.department_type == "maintenance", 0), else_=1), Department.id)
            .limit(1)
        )
        department = department_result.scalar_one_or_none()

    if not department:
        raise HTTPException(status_code=503, detail=f"No active department configured for authority {issue.authority_id}")

    authority_id = issue.authority_id
    auth = await session.get(Authority, authority_id) if authority_id else None

    ticket = Ticket(
        id=f"tkt_{uuid.uuid4().hex[:8]}",
        display_id=f"TKT-{datetime.utcnow().year}-{issue.id[-4:].upper()}",
        issue_id=issue.id,
        department_id=department.id,
        authority_id=authority_id,
        title=f"Repair: {issue.issue_type.replace('_', ' ').title()}",
        description=f"Operator-created repair ticket for {issue.issue_type}. Confidence: {issue.confidence:.2f}",
        status=TicketStatus.open,
        priority=issue.priority,
    )
    session.add(ticket)
    issue.assigned_department_id = department.id
    issue.status = IssueStatus.ticket_created

    # Audit timeline event
    timeline_evt = TimelineEvent(
        id=f"evt_{uuid.uuid4().hex[:12]}",
        entity_id=ticket.id,
        entity_type="ticket",
        event_type="created",
        title=f"Ticket Generated ({ticket.display_id})",
        description=f"Ticket created and routed to {auth.code if auth else 'department'} queue ({department.name})",
        actor="SYSTEM",
        metadata_json={"ticket_id": ticket.id, "authority_id": authority_id, "department_id": department.id}
    )
    session.add(timeline_evt)

    await session.commit()
    return {
        "id": ticket.id,
        "displayId": ticket.display_id,
        "issueId": ticket.issue_id,
        "status": ticket.status.value,
        "authorityId": authority_id,
        "authorityName": auth.name if auth else None,
        "authorityCode": auth.code if auth else None,
        "departmentId": department.id,
        "departmentName": department.name,
        "created": True,
    }

@router.get("")
async def get_tickets(
    status: Optional[str] = None,
    authority: Optional[str] = None,
    department_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    query = select(Ticket)
    if status:
        try:
            enum_status = TicketStatus[status]
            query = query.where(Ticket.status == enum_status)
        except KeyError:
            pass # Invalid status filter

    if department_id:
        query = query.where(Ticket.department_id == department_id)

    if authority:
        if authority.upper() in ("UNRESOLVED", "UNASSIGNED"):
            query = query.where(Ticket.authority_id.is_(None))
        else:
            auth_sub = select(Authority.id).where(
                (Authority.id == authority) | (Authority.code.ilike(authority))
            )
            query = query.where(Ticket.authority_id.in_(auth_sub))
            
    result = await session.execute(query)
    tickets = result.scalars().all()

    # Prefetch departments, authorities, and issues for full metadata
    dept_res = await session.execute(select(Department))
    dept_map = {d.id: d.name for d in dept_res.scalars().all()}

    auth_res = await session.execute(select(Authority))
    auth_map = {a.id: a for a in auth_res.scalars().all()}

    issue_res = await session.execute(select(UrbanIssue))
    issue_map = {i.id: i for i in issue_res.scalars().all()}
    
    return [
        {
            "id": t.id,
            "displayId": t.display_id,
            "isDemo": bool(t.id and (t.id.startswith("tkt_demo_") or t.id.startswith("demo_"))),
            "provenance": "DEMO" if (t.id and (t.id.startswith("tkt_demo_") or t.id.startswith("demo_"))) else "REAL",
            "issueId": t.issue_id,
            "title": t.title,
            "status": t.status.value if hasattr(t.status, 'value') else t.status,
            "priority": t.priority.value if hasattr(t.priority, 'value') else t.priority,
            "severity": (issue_map[t.issue_id].severity.value if hasattr(issue_map[t.issue_id].severity, 'value') else issue_map[t.issue_id].severity) if t.issue_id in issue_map else "medium",
            "authorityId": t.authority_id,
            "authority_id": t.authority_id,
            "authorityName": auth_map[t.authority_id].name if t.authority_id in auth_map else "Delhi Public Works Department",
            "authority_name": auth_map[t.authority_id].name if t.authority_id in auth_map else "Delhi Public Works Department",
            "authorityCode": auth_map[t.authority_id].code if t.authority_id in auth_map else "PWD",
            "authority_code": auth_map[t.authority_id].code if t.authority_id in auth_map else "PWD",
            "departmentId": t.department_id,
            "department_id": t.department_id,
            "departmentName": dept_map.get(t.department_id, "Delhi-NCR Road Infrastructure"),
            "department_name": dept_map.get(t.department_id, "Delhi-NCR Road Infrastructure"),
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
    auth = await session.get(Authority, ticket.authority_id) if ticket.authority_id else (
        await session.get(Authority, dept.authority_id) if dept and dept.authority_id else None
    )
    issue = await session.get(UrbanIssue, ticket.issue_id) if ticket.issue_id else None
    
    is_demo = bool(ticket.id and (ticket.id.startswith("tkt_demo_") or ticket.id.startswith("demo_")))
    return {
        "id": ticket.id,
        "displayId": ticket.display_id,
        "isDemo": is_demo,
        "provenance": "DEMO" if is_demo else "REAL",
        "issueId": ticket.issue_id,
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value if hasattr(ticket.status, 'value') else ticket.status,
        "priority": ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority,
        "severity": (issue.severity.value if hasattr(issue.severity, 'value') else issue.severity) if issue else "medium",
        "authorityId": ticket.authority_id,
        "authority_id": ticket.authority_id,
        "authorityName": auth.name if auth else "Delhi Public Works Department",
        "authority_name": auth.name if auth else "Delhi Public Works Department",
        "authorityCode": auth.code if auth else "PWD",
        "authority_code": auth.code if auth else "PWD",
        "departmentId": ticket.department_id,
        "department_id": ticket.department_id,
        "departmentName": dept.name if dept else "Delhi-NCR Road Infrastructure",
        "department_name": dept.name if dept else "Delhi-NCR Road Infrastructure",
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
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.admin, UserRole.operator, UserRole.officer]))
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
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.admin, UserRole.operator, UserRole.officer]))
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
