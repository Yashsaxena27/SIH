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
            # Dynamically query active maintenance department to ensure valid Foreign Key
            dept_query = select(Department).where(Department.is_active == True).order_by(
                case((Department.department_type == 'maintenance', 0), else_=1),
                Department.id.asc()
            ).limit(1)
            dept_result = await session.execute(dept_query)
            dept = dept_result.scalar_one_or_none()

            if dept:
                ticket = Ticket(
                    id=f"tkt_{uuid.uuid4().hex[:8]}",
                    display_id=f"TKT-{datetime.utcnow().year}-{issue.id[-4:].upper()}",
                    issue_id=issue.id,
                    department_id=dept.id,
                    title=f"Repair: {issue.issue_type.replace('_', ' ').title()}",
                    description=f"Auto-generated ticket for {issue.issue_type}. Confidence: {issue.confidence:.2f}",
                    status=TicketStatus.open,
                    priority=issue.priority
                )
                session.add(ticket)
                issue.status = IssueStatus.ticket_created
            else:
                logger.warning("No active department found in database; holding issue at 'prioritized'.")

    # 4. REPAIR_REPORTED -> VERIFICATION_PENDING
    if issue.status == IssueStatus.repair_reported:
        issue.status = IssueStatus.verification_pending

    return issue
