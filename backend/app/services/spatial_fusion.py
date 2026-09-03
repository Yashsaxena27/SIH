import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from geoalchemy2.elements import WKTElement

from app.models.domain import UrbanIssue, IssueStatus
from app.schemas.ingestion import GeoPoint

logger = logging.getLogger(__name__)

# Default radius in meters for fusing detections into the same issue
FUSION_RADIUS_METERS = 15.0

async def find_nearby_issue(
    session: AsyncSession,
    location: GeoPoint,
    issue_type: str,
    radius_meters: float = FUSION_RADIUS_METERS
) -> Optional[UrbanIssue]:
    """
    Find an existing active UrbanIssue of the same type within the given radius.
    Uses PostGIS ST_DWithin on geography/geometry types.
    """
    
    # Create a WKT element for the incoming point
    point_wkt = f"POINT({location.lng} {location.lat})"
    
    # We cast to geography to do distance in meters natively, 
    # assuming the column is geometry(POINT, 4326).
    query = select(UrbanIssue).where(
        and_(
            UrbanIssue.issue_type == issue_type,
            UrbanIssue.status.notin_([IssueStatus.verified, IssueStatus.closed]),
            # ST_DWithin with geography handles meter distances natively
            func.ST_DWithin(
                func.Geography(UrbanIssue.location),
                func.Geography(func.ST_GeomFromText(point_wkt, 4326)),
                radius_meters
            )
        )
    ).order_by(
        # Order by closest issue
        func.ST_Distance(
            func.Geography(UrbanIssue.location),
            func.Geography(func.ST_GeomFromText(point_wkt, 4326))
        )
    ).limit(1)

    result = await session.execute(query)
    return result.scalar_one_or_none()
