from datetime import datetime
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import UrbanIssue, Ticket, TicketStatus, IssueStatus
from app.services.priority_engine import calculate_priority

async def transition_issue_state(session: AsyncSession, issue: UrbanIssue) -> UrbanIssue:
    """
    Evaluates an issue and moves its state forward if criteria are met.
    """
    
    # Recalculate priority
    new_priority = calculate_priority(issue)
    issue.priority = new_priority
    
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
            # Mock department assignment (in a real system, spatial intersection with wards would determine this)
            department_id = "dept_road" 
            
            ticket = Ticket(
                id=f"tkt_{uuid.uuid4().hex[:8]}",
                display_id=f"TKT-{datetime.utcnow().year}-{issue.id[-4:].upper()}",
                issue_id=issue.id,
                department_id=department_id,
                title=f"Repair: {issue.issue_type.title()} at {issue.location}",
                description=f"Auto-generated ticket for {issue.issue_type}. Confidence: {issue.confidence}",
                status=TicketStatus.open,
                priority=issue.priority
            )
            session.add(ticket)
            issue.status = IssueStatus.ticket_created

    # Other transitions like REPAIR_REPORTED -> VERIFICATION_PENDING
    # are triggered by specific municipal officer actions or verification pipeline.

    return issue
