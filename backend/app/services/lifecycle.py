from datetime import datetime
import uuid
from sqlalchemy import select, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import UrbanIssue, Ticket, TicketStatus, IssueStatus, Department
from app.services.priority_engine import calculate_priority
import logging

logger = logging.getLogger(__name__)

async def transition_issue_state(session: AsyncSession, issue: UrbanIssue) -> UrbanIssue:
    """
    Evaluates an issue and moves its state forward if criteria are met.
    """
    
    # Recalculate priority
    new_priority = calculate_priority(issue)
    issue.priority = new_priority

    # Deterministic spatial jurisdiction and authority routing
    if not issue.authority_id or not issue.assigned_department_id:
        point_wkt = None
        if isinstance(issue.location, str):
            point_wkt = issue.location
        elif hasattr(issue.location, 'x') and hasattr(issue.location, 'y'):
            point_wkt = f"POINT({issue.location.x} {issue.location.y})"
        elif hasattr(issue.location, 'data'):
            import shapely.wkb
            try:
                pt = shapely.wkb.loads(bytes(issue.location.data))
                point_wkt = f"POINT({pt.x} {pt.y})"
            except Exception as e:
                logger.warning(f"Could not parse issue location for jurisdiction resolution: {e}")

        if point_wkt:
            from app.services.jurisdiction_engine import resolve_issue_jurisdiction
            res = await resolve_issue_jurisdiction(
                session=session,
                point_wkt=point_wkt,
                road_segment_id=issue.road_segment_id,
                issue_type=issue.issue_type
            )
            issue.authority_id = res.authority_id
            issue.jurisdiction_id = res.jurisdiction_id
            issue.jurisdiction_source = res.source
            if res.department_id:
                issue.assigned_department_id = res.department_id
    
    # 1. NEW -> CONFIRMED
    # Rule: If observed by >1 unique bus, or observation_count >= 3
    if issue.status == IssueStatus.new:
        if issue.unique_bus_count > 1 or issue.observation_count >= 3:
            issue.status = IssueStatus.confirmed

    # 2. CONFIRMED -> PRIORITIZED
    # Rule: Once priority hits a certain threshold (e.g. medium)
    if issue.status == IssueStatus.confirmed:
        if issue.priority in ['medium', 'high', 'urgent']:
            issue.status = IssueStatus.prioritized

    # 3. PRIORITIZED -> TICKET_CREATED
    # Automatically create a ticket for high/urgent issues for the prototype demo
    if issue.status == IssueStatus.prioritized:
        if issue.priority in ['high', 'urgent']:
            if issue.assigned_department_id:
                ticket = Ticket(
                    id=f"tkt_{uuid.uuid4().hex[:8]}",
                    display_id=f"TKT-{datetime.utcnow().year}-{issue.id[-4:].upper()}",
                    issue_id=issue.id,
                    department_id=issue.assigned_department_id,
                    authority_id=issue.authority_id,
                    title=f"Repair: {issue.issue_type.replace('_', ' ').title()}",
                    description=f"Auto-generated ticket for {issue.issue_type}. Confidence: {issue.confidence:.2f}",
                    status=TicketStatus.open,
                    priority=issue.priority
                )
                session.add(ticket)
                issue.status = IssueStatus.ticket_created
            else:
                logger.warning(f"Issue {issue.id} has no assigned department (jurisdiction {issue.jurisdiction_source}); holding at 'prioritized'.")

    # 4. REPAIR_REPORTED -> VERIFICATION_PENDING
    if issue.status == IssueStatus.repair_reported:
        issue.status = IssueStatus.verification_pending

    return issue
