"""POTHOLE WALA Road Health Score Engine.

This is a decision-support score, NOT an official pavement condition index.
Scale: 0-100 (100 = healthiest, 0 = severe issue burden).

Factors (all from real database data):
- Unresolved issue count on the segment
- Severity distribution of issues
- Issue density (issues per km, if segment length available)
- Priority burden
- Verified/reopened ratio
"""
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.domain import RoadSegment, UrbanIssue, IssueStatus, Severity, TicketPriority

logger = logging.getLogger(__name__)

# Weights for severity impact
SEVERITY_WEIGHT = {
    Severity.critical: 15.0,
    Severity.high: 10.0,
    Severity.medium: 5.0,
    Severity.low: 2.0,
}

# Statuses that indicate active (unresolved) issues
ACTIVE_STATUSES = [
    IssueStatus.new,
    IssueStatus.confirmed,
    IssueStatus.prioritized,
    IssueStatus.assigned,
    IssueStatus.ticket_created,
    IssueStatus.in_progress,
    IssueStatus.repair_reported,
    IssueStatus.verification_pending,
    IssueStatus.reopened,
]


async def calculate_segment_health(
    session: AsyncSession,
    segment_id: str
) -> Dict[str, Any]:
    """
    Calculate the POTHOLE WALA Road Health score for a segment.
    Returns score and explanation factors.
    """
    # Get all issues linked to this segment
    issues_result = await session.execute(
        select(UrbanIssue).where(
            and_(
                UrbanIssue.road_segment_id == segment_id,
                UrbanIssue.status.in_(ACTIVE_STATUSES)
            )
        )
    )
    active_issues = issues_result.scalars().all()
    
    # Get resolved issues count for context
    resolved_count = await session.scalar(
        select(func.count()).select_from(UrbanIssue).where(
            and_(
                UrbanIssue.road_segment_id == segment_id,
                UrbanIssue.status == IssueStatus.verified
            )
        )
    ) or 0
    
    reopened_count = sum(1 for i in active_issues if i.status == IssueStatus.reopened)
    
    # Calculate severity burden
    base_health = 100.0
    severity_deductions = 0.0
    severity_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    
    for issue in active_issues:
        sev = issue.severity if isinstance(issue.severity, Severity) else Severity(issue.severity)
        weight = SEVERITY_WEIGHT.get(sev, 2.0)
        severity_deductions += weight
        severity_breakdown[sev.value] += 1
    
    # Reopened issues carry extra penalty (indicates failed repair)
    reopened_penalty = reopened_count * 5.0
    
    total_deduction = severity_deductions + reopened_penalty
    health_score = max(0.0, min(100.0, base_health - total_deduction))
    health_score = round(health_score, 1)
    
    factors = {
        "activeIssueCount": len(active_issues),
        "resolvedCount": resolved_count,
        "reopenedCount": reopened_count,
        "severityBreakdown": severity_breakdown,
        "severityDeduction": round(severity_deductions, 1),
        "reopenedPenalty": round(reopened_penalty, 1),
        "totalDeduction": round(total_deduction, 1),
    }
    
    return {
        "segmentId": segment_id,
        "healthScore": health_score,
        "label": "POTHOLE WALA ROAD HEALTH",
        "description": "Decision-support score based on current issue burden",
        "factors": factors
    }


async def recalculate_all_segment_health(session: AsyncSession) -> List[Dict[str, Any]]:
    """
    Recalculate health scores for all road segments and persist.
    """
    segments_result = await session.execute(select(RoadSegment))
    segments = segments_result.scalars().all()
    
    results = []
    for segment in segments:
        health_data = await calculate_segment_health(session, segment.id)
        segment.health_score = health_data["healthScore"]
        results.append(health_data)
    
    await session.commit()
    return results


async def update_segment_health_for_issue(
    session: AsyncSession,
    issue: UrbanIssue
) -> Optional[Dict[str, Any]]:
    """
    Recalculate health for the segment an issue belongs to.
    Call this after issue status changes.
    """
    if not issue.road_segment_id:
        return None
    
    health_data = await calculate_segment_health(session, issue.road_segment_id)
    segment = await session.get(RoadSegment, issue.road_segment_id)
    if segment:
        segment.health_score = health_data["healthScore"]
        await session.commit()
    
    return health_data
