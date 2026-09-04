from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import shapely.wkb

from app.core.database import get_db
from app.models.domain import UrbanIssue, IssueStatus, Observation, TimelineEvent

router = APIRouter(prefix="/api/v1/issues", tags=["Issues"])

def _serialize_issue(issue: UrbanIssue) -> dict:
    point = shapely.wkb.loads(bytes(issue.location.data)) if issue.location else None
    
    location_data = {
        "lat": point.y if point else None,
        "lng": point.x if point else None,
        "locationSource": "INTERPOLATED" if point else "UNKNOWN",
    }
    
    return {
        "id": issue.id,
        "displayId": f"ISS-{issue.id[-6:].upper()}",
        "type": issue.issue_type,
        "title": f"{str(issue.issue_type).title()} detected",
        "description": "Auto-generated issue from ML detection pipeline.",
        "status": issue.status.value if hasattr(issue.status, 'value') else issue.status,
        "severity": issue.severity,
        "priority": issue.priority,
        "location": location_data,
        "observations": [],
        "observationCount": issue.observation_count,
        "uniqueBusCount": issue.unique_bus_count,
        "confidence": issue.confidence,
        "roadSegmentId": issue.road_segment_id,
        "departmentId": issue.assigned_department_id,
        "firstDetectedAt": issue.first_detected_at.isoformat() if issue.first_detected_at else None,
        "lastObservedAt": issue.last_observed_at.isoformat() if issue.last_observed_at else None,
        "tags": [issue.issue_type, issue.severity],
        "resolutionHistory": []
    }

@router.get("")
async def get_issues(
    status: IssueStatus = None,
    session: AsyncSession = Depends(get_db)
):
    query = select(UrbanIssue)
    if status:
        query = query.where(UrbanIssue.status == status)
        
    result = await session.execute(query)
    issues = result.scalars().all()
    
    return [_serialize_issue(issue) for issue in issues]

@router.get("/summary")
async def get_issues_summary(session: AsyncSession = Depends(get_db)):
    total = await session.scalar(select(func.count()).select_from(UrbanIssue))
    open_count = await session.scalar(select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == IssueStatus.new))
    resolved = await session.scalar(select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == IssueStatus.verified))
    in_progress = await session.scalar(select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == IssueStatus.in_progress))
    reopened = await session.scalar(select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == IssueStatus.reopened))
    
    # Count by type
    type_result = await session.execute(
        select(UrbanIssue.issue_type, func.count()).group_by(UrbanIssue.issue_type)
    )
    by_type = {row[0]: row[1] for row in type_result.all()}
    
    # Count by severity
    sev_result = await session.execute(
        select(UrbanIssue.severity, func.count()).group_by(UrbanIssue.severity)
    )
    by_severity = {}
    for row in sev_result.all():
        sev_val = row[0].value if hasattr(row[0], 'value') else row[0]
        by_severity[sev_val] = row[1]
    
    return {
        "total": total or 0,
        "open": open_count or 0,
        "inProgress": in_progress or 0,
        "resolved": resolved or 0,
        "reopened": reopened or 0,
        "byType": by_type,
        "bySeverity": by_severity,
        "averageResolutionHours": None,
        "verificationRate": round((resolved / total * 100), 1) if total and resolved else 0
    }

@router.get("/{issue_id}")
async def get_issue(issue_id: str, session: AsyncSession = Depends(get_db)):
    issue = await session.get(UrbanIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    # Also fetch observations
    obs_result = await session.execute(
        select(Observation).where(Observation.issue_id == issue.id)
    )
    observations = obs_result.scalars().all()
    
    # Also fetch timeline events if ticket exists
    timeline = []
    if issue.ticket:
        timeline_result = await session.execute(
            select(TimelineEvent).where(TimelineEvent.entity_id == issue.ticket.id).order_by(TimelineEvent.created_at.asc())
        )
        timeline = timeline_result.scalars().all()
    
    serialized = _serialize_issue(issue)
    
    serialized["observations"] = [{
        "id": obs.id,
        "detectionId": obs.detection_id,
        "busId": obs.bus_id,
        "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
        "gps": {"lat": point.y, "lng": point.x} if point else None,
        "locationSource": "INTERPOLATED",
        "confidence": obs.confidence,
        "severity": issue.severity,
        "evidence": {
            "url": obs.evidence_url,
            "type": "image",
            "annotated": True
        } if obs.evidence_url else None
    } for obs in observations]
    
    serialized["resolutionHistory"] = [{
        "id": evt.id,
        "action": evt.title,
        "actor": evt.actor,
        "timestamp": evt.created_at.isoformat() if evt.created_at else None,
        "notes": evt.description
    } for evt in timeline]
    
    return serialized
