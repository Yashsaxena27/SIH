from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import shapely.wkb

from app.core.database import get_db
from app.models.domain import UrbanIssue, IssueStatus, Observation

router = APIRouter(prefix="/api/v1/issues", tags=["Issues"])

def _serialize_issue(issue: UrbanIssue) -> dict:
    point = shapely.wkb.loads(bytes(issue.location.data)) if issue.location else None
    
    return {
        "id": issue.id,
        "displayId": f"ISS-{issue.id[-6:].upper()}",
        "type": issue.issue_type,
        "title": f"{str(issue.issue_type).title()} detected",
        "description": "Auto-generated issue from ML detection pipeline.",
        "status": issue.status.value if hasattr(issue.status, 'value') else issue.status,
        "severity": issue.severity,
        "priority": issue.priority,
        "location": {
            "lat": point.y if point else None,
            "lng": point.x if point else None,
            "gps": {"lat": point.y, "lng": point.x} if point else {"lat": 0, "lng": 0},
            "snappedGps": {"lat": point.y, "lng": point.x} if point else {"lat": 0, "lng": 0},
        },
        "observations": [], # In a real endpoint, we would join and fetch these
        "observationCount": issue.observation_count,
        "uniqueBusCount": issue.unique_bus_count,
        "confidence": issue.confidence,
        "firstDetectedAt": issue.first_detected_at.isoformat() if issue.first_detected_at else None,
        "lastObservedAt": issue.last_observed_at.isoformat() if issue.last_observed_at else None,
        "departmentId": "dept_roads", # Stub
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
    # Calculate simple stats
    total = await session.scalar(select(func.count()).select_from(UrbanIssue))
    open_count = await session.scalar(select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == IssueStatus.new))
    resolved = await session.scalar(select(func.count()).select_from(UrbanIssue).where(UrbanIssue.status == IssueStatus.verified))
    
    return {
        "total": total or 0,
        "open": open_count or 0,
        "inProgress": 0,
        "resolved": resolved or 0,
        "reopened": 0,
        "byType": {"pothole": total or 0},
        "bySeverity": {"high": 0, "medium": total or 0, "low": 0},
        "averageResolutionHours": 24,
        "verificationRate": 100 if resolved else 0
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
    
    serialized = _serialize_issue(issue)
    
    serialized["observations"] = [{
        "id": obs.id,
        "detectionId": obs.detection_id,
        "busId": obs.bus_id,
        "routeId": "ROUTE-1", # stub
        "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
        "gps": {"lat": 0, "lng": 0}, # Would use obs location
        "confidence": obs.confidence,
        "severity": issue.severity,
        "evidence": {
            "url": obs.evidence_url or "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400",
            "type": "image",
            "annotated": True
        }
    } for obs in observations]
    
    return serialized
