from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
import shapely.wkb

from app.core.database import get_db
from app.models.domain import RoadSegment, UrbanIssue, Authority, Department, IssueStatus
from app.services.road_health import (
    calculate_segment_health,
    calculate_roads_health_batch,
    classify_risk_state,
    ACTIVE_STATUSES
)

router = APIRouter(prefix="/api/v1/roads", tags=["Road Intelligence"])


def _extract_linestring_coords(geometry_column) -> List[List[float]]:
    """Decode PostGIS WKB LINESTRING into [[lng, lat], ...] coordinates."""
    if not geometry_column:
        return []
    try:
        geom = shapely.wkb.loads(bytes(geometry_column.data))
        return [[round(pt[0], 6), round(pt[1], 6)] for pt in geom.coords]
    except Exception:
        return []


@router.get("")
async def list_roads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    risk_state: Optional[str] = Query(None, description="Filter by risk state: HEALTHY, WATCH, ELEVATED, CRITICAL"),
    road_class: Optional[str] = Query(None, description="Filter by road class, e.g. arterial, collector"),
    authority_id: Optional[str] = Query(None, description="Filter by owning authority"),
    search: Optional[str] = Query(None, description="Search by road name or ID"),
    session: AsyncSession = Depends(get_db)
):
    """
    List road segments with canonical Operational Road Health, GeoJSON geometry,
    and workflow metrics. Optimized batch aggregation eliminates N+1 queries.
    """
    query = select(RoadSegment)

    if road_class:
        query = query.where(RoadSegment.road_class.ilike(road_class.strip()))
    if authority_id:
        query = query.where(RoadSegment.authority_id == authority_id.strip())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                RoadSegment.name.ilike(term),
                RoadSegment.id.ilike(term),
                RoadSegment.owner_agency.ilike(term)
            )
        )

    # Order predictably
    query = query.order_by(RoadSegment.name.asc())

    res = await session.execute(query)
    all_matching_segments = res.scalars().all()

    if not all_matching_segments:
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

    # Batch calculate operational health for all matching segments in single query group
    all_segment_ids = [s.id for s in all_matching_segments]
    batch_health = await calculate_roads_health_batch(session, all_segment_ids)

    # Filter by risk_state in-memory if specified
    filtered_segments = []
    for s in all_matching_segments:
        h = batch_health.get(s.id)
        current_risk = h["riskState"] if h else "HEALTHY"
        if risk_state and risk_state.upper() != current_risk:
            continue
        filtered_segments.append(s)

    total_count = len(filtered_segments)
    paginated_segments = filtered_segments[skip:skip + limit]

    items = []
    for s in paginated_segments:
        h = batch_health.get(s.id)
        if not h:
            h = {
                "segmentId": s.id,
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

        coords = _extract_linestring_coords(s.geometry)

        items.append({
            "id": s.id,
            "name": s.name,
            "roadClass": s.road_class or "arterial",
            "authorityId": s.authority_id,
            "ownerAgency": s.owner_agency,
            "coordinates": coords,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "health": {
                "metricLabel": h["metricLabel"],
                "score": h["healthScore"],
                "riskState": h["riskState"],
                "explanation": h["explanation"],
                "factors": h["factors"]
            },
            "activeIssueCount": h["factors"]["activeIssueCount"],
            "corroboratedIssueCount": h["factors"]["corroboratedCount"],
            "openTicketCount": h["factors"]["openTicketCount"]
        })

    return {
        "items": items,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


@router.get("/{segment_id}")
async def get_road(
    segment_id: str,
    session: AsyncSession = Depends(get_db)
):
    """
    Get detailed road segment entity with authority, department, and health summary.
    """
    segment = await session.get(RoadSegment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail=f"Road segment '{segment_id}' not found")

    health = await calculate_segment_health(session, segment_id)
    coords = _extract_linestring_coords(segment.geometry)

    authority_name = None
    if segment.authority_id:
        auth = await session.get(Authority, segment.authority_id)
        if auth:
            authority_name = auth.name

    return {
        "id": segment.id,
        "name": segment.name,
        "roadClass": segment.road_class or "arterial",
        "authorityId": segment.authority_id,
        "authorityName": authority_name,
        "ownerAgency": segment.owner_agency,
        "coordinates": coords,
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        },
        "health": health
    }


@router.get("/{segment_id}/health")
async def get_road_health(
    segment_id: str,
    session: AsyncSession = Depends(get_db)
):
    """
    Get full Operational Road Health breakdown, contributing factors, SLA stats,
    and human-readable explanation.
    """
    segment = await session.get(RoadSegment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail=f"Road segment '{segment_id}' not found")

    return await calculate_segment_health(session, segment_id)


@router.get("/{segment_id}/issues")
async def get_road_issues(
    segment_id: str,
    status: Optional[str] = Query(None, description="Optional status filter"),
    session: AsyncSession = Depends(get_db)
):
    """
    Get all active and historical issues linked to this road segment.
    Includes metric distance to centerline, operational priority, and corroboration.
    """
    segment = await session.get(RoadSegment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail=f"Road segment '{segment_id}' not found")

    dist_expr = func.ST_Distance(
        func.Geography(UrbanIssue.location),
        func.Geography(RoadSegment.geometry)
    ).label("distance_to_centerline")

    query = (
        select(UrbanIssue, dist_expr)
        .join(RoadSegment, UrbanIssue.road_segment_id == RoadSegment.id)
        .where(UrbanIssue.road_segment_id == segment_id)
    )

    if status:
        query = query.where(UrbanIssue.status == status)

    query = query.order_by(UrbanIssue.last_observed_at.desc())

    res = await session.execute(query)
    rows = res.all()

    issues_out = []
    for issue, dist in rows:
        pt = shapely.wkb.loads(bytes(issue.location.data)) if issue.location else None
        lat = pt.y if pt else None
        lng = pt.x if pt else None

        issues_out.append({
            "id": issue.id,
            "displayId": f"ISS-{issue.id[-6:].upper()}",
            "type": issue.issue_type,
            "status": issue.status.value if hasattr(issue.status, "value") else issue.status,
            "severity": issue.severity.value if hasattr(issue.severity, "value") else issue.severity,
            "priority": issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
            "confidence": issue.confidence,
            "observationCount": issue.observation_count,
            "uniqueBusCount": issue.unique_bus_count,
            "distanceToCenterlineMeters": round(float(dist), 2) if dist is not None else None,
            "location": {
                "lat": lat,
                "lng": lng
            },
            "firstDetectedAt": issue.first_detected_at.isoformat() if issue.first_detected_at else None,
            "lastObservedAt": issue.last_observed_at.isoformat() if issue.last_observed_at else None
        })

    return {
        "segmentId": segment_id,
        "segmentName": segment.name,
        "total": len(issues_out),
        "items": issues_out
    }
