"""POTHOLE WALA — Operational Road Health Engine.

Canonical backend domain scoring function.
Label: "Operational Road Health"
Scale: 0.0 - 100.0 (100.0 = Healthy, 0.0 = Severe defect burden).

Risk States & Boundaries:
- HEALTHY:  [90.0, 100.0]  (e.g., 90 is HEALTHY, 89 is WATCH)
- WATCH:    [70.0, 89.9]   (e.g., 70 is WATCH, 69 is ELEVATED)
- ELEVATED: [50.0, 69.9]   (e.g., 50 is ELEVATED, 49 is CRITICAL)
- CRITICAL: [0.0, 49.9]    (e.g., < 50 is CRITICAL)

All metrics derived from normalized database records:
- UrbanIssue (active counts, severity distribution, corroboration, priority)
- Ticket (open tickets, overdue SLA tickets)
- Verification (unresolved verification states)
"""
from datetime import datetime, timezone
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.models.domain import RoadSegment, UrbanIssue, IssueStatus, Severity, TicketPriority, Ticket, TicketStatus

logger = logging.getLogger(__name__)

# Severity deduction weights
SEVERITY_WEIGHT = {
    Severity.critical: 15.0,
    Severity.high: 10.0,
    Severity.medium: 5.0,
    Severity.low: 2.0,
}

# Corroboration & workflow deduction weights
CORROBORATION_PENALTY_PER_ISSUE = 3.0
UNRESOLVED_VERIFICATION_PENALTY = 5.0
OPEN_TICKET_PENALTY = 2.0
OVERDUE_TICKET_PENALTY = 10.0

# Active issue lifecycle statuses
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

UNRESOLVED_VERIFICATION_STATUSES = [
    IssueStatus.repair_reported,
    IssueStatus.verification_pending,
    IssueStatus.reopened,
]


def classify_risk_state(score: float) -> str:
    """
    Deterministic boundary classification:
    >= 90.0: HEALTHY (90 -> HEALTHY)
    >= 70.0: WATCH   (89 -> WATCH, 70 -> WATCH)
    >= 50.0: ELEVATED (69 -> ELEVATED, 50 -> ELEVATED)
    < 50.0:  CRITICAL (49 -> CRITICAL)
    """
    if score >= 90.0:
        return "HEALTHY"
    elif score >= 70.0:
        return "WATCH"
    elif score >= 50.0:
        return "ELEVATED"
    else:
        return "CRITICAL"


def build_health_explanation(
    score: float,
    risk_state: str,
    active_count: int,
    critical_count: int,
    high_count: int,
    corroborated_count: int,
    overdue_tickets: int,
    unresolved_verifications: int
) -> str:
    """
    Produce a deterministic, human-readable explanation of why the road is in this state.
    """
    if active_count == 0 and overdue_tickets == 0:
        return "Healthy operational status: Zero active defects or outstanding repair work orders on this road corridor."

    reasons = []
    if critical_count > 0:
        reasons.append(f"{critical_count} critical defect{'s' if critical_count > 1 else ''}")
    if high_count > 0:
        reasons.append(f"{high_count} high-severity defect{'s' if high_count > 1 else ''}")
    if overdue_tickets > 0:
        reasons.append(f"{overdue_tickets} overdue municipal repair ticket{'s' if overdue_tickets > 1 else ''}")
    if unresolved_verifications > 0:
        reasons.append(f"{unresolved_verifications} pending or reopened verification{'s' if unresolved_verifications > 1 else ''}")
    if corroborated_count > 0:
        reasons.append(f"{corroborated_count} defect{'s' if corroborated_count > 1 else ''} corroborated across multiple buses")

    if not reasons and active_count > 0:
        reasons.append(f"{active_count} active road issue{'s' if active_count > 1 else ''}")

    joined = ", ".join(reasons)
    return f"{risk_state.capitalize()} operational health: Corridor carries {joined}."


async def calculate_segment_health(
    session: AsyncSession,
    segment_id: str
) -> Dict[str, Any]:
    """
    Calculate the canonical Operational Road Health score for a single segment from live records.
    """
    now_utc = datetime.now(timezone.utc)

    # 1. Active issues on this segment
    issues_res = await session.execute(
        select(UrbanIssue).where(
            and_(
                UrbanIssue.road_segment_id == segment_id,
                UrbanIssue.status.in_(ACTIVE_STATUSES)
            )
        )
    )
    active_issues = issues_res.scalars().all()

    # 2. Resolved issues for historical context
    resolved_count = await session.scalar(
        select(func.count()).select_from(UrbanIssue).where(
            and_(
                UrbanIssue.road_segment_id == segment_id,
                UrbanIssue.status == IssueStatus.verified
            )
        )
    ) or 0

    # 3. Tickets on active issues of this segment
    active_issue_ids = [i.id for i in active_issues]
    open_tickets = 0
    overdue_tickets = 0

    if active_issue_ids:
        tickets_res = await session.execute(
            select(Ticket).where(Ticket.issue_id.in_(active_issue_ids))
        )
        tickets = tickets_res.scalars().all()
        for t in tickets:
            if t.status not in (TicketStatus.closed, TicketStatus.verified_resolved):
                open_tickets += 1
                if t.due_date and t.due_date < now_utc:
                    overdue_tickets += 1

    # 4. Compute factors
    severity_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    severity_deductions = 0.0
    corroborated_count = 0
    unresolved_verifications = 0
    total_observation_volume = 0
    priority_values = []
    latest_activity = None

    priority_map = {
        TicketPriority.low: 1,
        TicketPriority.medium: 2,
        TicketPriority.high: 3,
        TicketPriority.urgent: 4
    }

    for issue in active_issues:
        sev = issue.severity if isinstance(issue.severity, Severity) else Severity(issue.severity)
        severity_breakdown[sev.value] += 1
        severity_deductions += SEVERITY_WEIGHT.get(sev, 2.0)

        if (issue.unique_bus_count and issue.unique_bus_count > 1) or (issue.observation_count and issue.observation_count > 1):
            corroborated_count += 1

        if issue.status in UNRESOLVED_VERIFICATION_STATUSES:
            unresolved_verifications += 1

        total_observation_volume += (issue.observation_count or 1)

        p = issue.priority if isinstance(issue.priority, TicketPriority) else TicketPriority(issue.priority)
        priority_values.append(priority_map.get(p, 1))

        if issue.last_observed_at:
            if latest_activity is None or issue.last_observed_at > latest_activity:
                latest_activity = issue.last_observed_at

    corroboration_deduction = corroborated_count * CORROBORATION_PENALTY_PER_ISSUE
    verification_deduction = unresolved_verifications * UNRESOLVED_VERIFICATION_PENALTY
    ticket_deduction = (open_tickets * OPEN_TICKET_PENALTY) + (overdue_tickets * OVERDUE_TICKET_PENALTY)

    total_deduction = severity_deductions + corroboration_deduction + verification_deduction + ticket_deduction
    health_score = round(max(0.0, min(100.0, 100.0 - total_deduction)), 1)
    risk_state = classify_risk_state(health_score)

    avg_priority_num = (sum(priority_values) / len(priority_values)) if priority_values else 1.0
    avg_priority_label = (
        "URGENT" if avg_priority_num >= 3.5 else
        "HIGH" if avg_priority_num >= 2.5 else
        "MEDIUM" if avg_priority_num >= 1.5 else
        "LOW"
    )

    explanation = build_health_explanation(
        score=health_score,
        risk_state=risk_state,
        active_count=len(active_issues),
        critical_count=severity_breakdown["critical"],
        high_count=severity_breakdown["high"],
        corroborated_count=corroborated_count,
        overdue_tickets=overdue_tickets,
        unresolved_verifications=unresolved_verifications
    )

    factors = {
        "activeIssueCount": len(active_issues),
        "criticalCount": severity_breakdown["critical"],
        "highCount": severity_breakdown["high"],
        "mediumCount": severity_breakdown["medium"],
        "lowCount": severity_breakdown["low"],
        "resolvedCount": resolved_count,
        "corroboratedCount": corroborated_count,
        "unresolvedVerificationCount": unresolved_verifications,
        "openTicketCount": open_tickets,
        "overdueTicketCount": overdue_tickets,
        "observationVolume": total_observation_volume,
        "distinctLocations": len(active_issues),
        "averageOperationalPriority": avg_priority_label,
        "latestIssueActivity": latest_activity.isoformat() if latest_activity else None,
        "severityDeduction": round(severity_deductions, 1),
        "corroborationDeduction": round(corroboration_deduction, 1),
        "verificationDeduction": round(verification_deduction, 1),
        "ticketDeduction": round(ticket_deduction, 1),
        "totalDeduction": round(total_deduction, 1),
    }

    return {
        "segmentId": segment_id,
        "metricLabel": "Operational Road Health",
        "healthScore": health_score,
        "riskState": risk_state,
        "explanation": explanation,
        "factors": factors
    }


async def calculate_roads_health_batch(
    session: AsyncSession,
    segment_ids: Optional[List[str]] = None
) -> Dict[str, Dict[str, Any]]:
    """
    Efficient batch aggregation for multiple segments, eliminating N+1 queries.
    """
    now_utc = datetime.now(timezone.utc)

    # 1. Fetch active issues grouped by segment
    query = select(UrbanIssue).where(UrbanIssue.status.in_(ACTIVE_STATUSES))
    if segment_ids is not None:
        query = query.where(UrbanIssue.road_segment_id.in_(segment_ids))
    else:
        query = query.where(UrbanIssue.road_segment_id.is_not(None))

    res = await session.execute(query)
    all_active_issues = res.scalars().all()

    issues_by_segment: Dict[str, List[UrbanIssue]] = {}
    for iss in all_active_issues:
        if iss.road_segment_id:
            issues_by_segment.setdefault(iss.road_segment_id, []).append(iss)

    # 2. Fetch active tickets on those issues
    active_issue_ids = [i.id for i in all_active_issues]
    tickets_by_issue: Dict[str, List[Ticket]] = {}
    if active_issue_ids:
        t_res = await session.execute(
            select(Ticket).where(Ticket.issue_id.in_(active_issue_ids))
        )
        for t in t_res.scalars().all():
            tickets_by_issue.setdefault(t.issue_id, []).append(t)

    # 3. Compute health per segment
    target_ids = segment_ids if segment_ids is not None else list(issues_by_segment.keys())
    results: Dict[str, Dict[str, Any]] = {}

    priority_map = {
        TicketPriority.low: 1,
        TicketPriority.medium: 2,
        TicketPriority.high: 3,
        TicketPriority.urgent: 4
    }

    for sid in target_ids:
        seg_issues = issues_by_segment.get(sid, [])
        sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        sev_deduction = 0.0
        corroborated_count = 0
        unresolved_verifs = 0
        obs_volume = 0
        p_nums = []
        latest_act = None

        open_tkts = 0
        overdue_tkts = 0

        for iss in seg_issues:
            sev = iss.severity if isinstance(iss.severity, Severity) else Severity(iss.severity)
            sev_counts[sev.value] += 1
            sev_deduction += SEVERITY_WEIGHT.get(sev, 2.0)

            if (iss.unique_bus_count and iss.unique_bus_count > 1) or (iss.observation_count and iss.observation_count > 1):
                corroborated_count += 1

            if iss.status in UNRESOLVED_VERIFICATION_STATUSES:
                unresolved_verifs += 1

            obs_volume += (iss.observation_count or 1)
            p = iss.priority if isinstance(iss.priority, TicketPriority) else TicketPriority(iss.priority)
            p_nums.append(priority_map.get(p, 1))

            if iss.last_observed_at:
                if latest_act is None or iss.last_observed_at > latest_act:
                    latest_act = iss.last_observed_at

            for t in tickets_by_issue.get(iss.id, []):
                if t.status not in (TicketStatus.closed, TicketStatus.verified_resolved):
                    open_tkts += 1
                    if t.due_date and t.due_date < now_utc:
                        overdue_tkts += 1

        corroboration_deduction = corroborated_count * CORROBORATION_PENALTY_PER_ISSUE
        verification_deduction = unresolved_verifs * UNRESOLVED_VERIFICATION_PENALTY
        ticket_deduction = (open_tkts * OPEN_TICKET_PENALTY) + (overdue_tkts * OVERDUE_TICKET_PENALTY)
        total_deduction = sev_deduction + corroboration_deduction + verification_deduction + ticket_deduction

        score = round(max(0.0, min(100.0, 100.0 - total_deduction)), 1)
        risk = classify_risk_state(score)

        avg_p_num = (sum(p_nums) / len(p_nums)) if p_nums else 1.0
        avg_p_label = (
            "URGENT" if avg_p_num >= 3.5 else
            "HIGH" if avg_p_num >= 2.5 else
            "MEDIUM" if avg_p_num >= 1.5 else
            "LOW"
        )

        explanation = build_health_explanation(
            score=score,
            risk_state=risk,
            active_count=len(seg_issues),
            critical_count=sev_counts["critical"],
            high_count=sev_counts["high"],
            corroborated_count=corroborated_count,
            overdue_tickets=overdue_tkts,
            unresolved_verifications=unresolved_verifs
        )

        results[sid] = {
            "segmentId": sid,
            "metricLabel": "Operational Road Health",
            "healthScore": score,
            "riskState": risk,
            "explanation": explanation,
            "factors": {
                "activeIssueCount": len(seg_issues),
                "criticalCount": sev_counts["critical"],
                "highCount": sev_counts["high"],
                "mediumCount": sev_counts["medium"],
                "lowCount": sev_counts["low"],
                "corroboratedCount": corroborated_count,
                "unresolvedVerificationCount": unresolved_verifs,
                "openTicketCount": open_tkts,
                "overdueTicketCount": overdue_tkts,
                "observationVolume": obs_volume,
                "distinctLocations": len(seg_issues),
                "averageOperationalPriority": avg_p_label,
                "latestIssueActivity": latest_act.isoformat() if latest_act else None,
                "severityDeduction": round(sev_deduction, 1),
                "corroborationDeduction": round(corroboration_deduction, 1),
                "verificationDeduction": round(verification_deduction, 1),
                "ticketDeduction": round(ticket_deduction, 1),
                "totalDeduction": round(total_deduction, 1),
            }
        }

    return results


async def recalculate_all_segment_health(session: AsyncSession) -> List[Dict[str, Any]]:
    """
    Recalculate health scores for all road segments and update their persisted score attribute.
    """
    segments_result = await session.execute(select(RoadSegment))
    segments = segments_result.scalars().all()
    segment_ids = [s.id for s in segments]

    batch_health = await calculate_roads_health_batch(session, segment_ids)

    results = []
    for segment in segments:
        data = batch_health.get(segment.id)
        if not data:
            data = {
                "segmentId": segment.id,
                "metricLabel": "Operational Road Health",
                "healthScore": 100.0,
                "riskState": "HEALTHY",
                "explanation": "Healthy operational status: Zero active defects or outstanding repair work orders on this road corridor.",
                "factors": {
                    "activeIssueCount": 0, "criticalCount": 0, "highCount": 0, "mediumCount": 0, "lowCount": 0,
                    "corroboratedCount": 0, "unresolvedVerificationCount": 0, "openTicketCount": 0, "overdueTicketCount": 0,
                    "observationVolume": 0, "distinctLocations": 0, "averageOperationalPriority": "LOW",
                    "latestIssueActivity": None, "severityDeduction": 0.0, "corroborationDeduction": 0.0,
                    "verificationDeduction": 0.0, "ticketDeduction": 0.0, "totalDeduction": 0.0
                }
            }
        segment.health_score = data["healthScore"]
        results.append(data)

    await session.commit()
    return results


async def update_segment_health_for_issue(
    session: AsyncSession,
    issue: UrbanIssue
) -> Optional[Dict[str, Any]]:
    """
    Recalculate health for the segment an issue belongs to.
    """
    if not issue.road_segment_id:
        return None

    health_data = await calculate_segment_health(session, issue.road_segment_id)
    segment = await session.get(RoadSegment, issue.road_segment_id)
    if segment:
        segment.health_score = health_data["healthScore"]
        await session.commit()

    return health_data

