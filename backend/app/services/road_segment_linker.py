"""Spatial linking of issues to road segments using PostGIS."""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.elements import WKTElement

from app.models.domain import RoadSegment, UrbanIssue

logger = logging.getLogger(__name__)

# Maximum distance in meters to consider a road segment as "nearby"
MAX_SEGMENT_DISTANCE_METERS = 100.0


async def find_nearest_segment(
    session: AsyncSession,
    point_wkt: str,
    max_distance: float = MAX_SEGMENT_DISTANCE_METERS
) -> Optional[RoadSegment]:
    """
    Find the nearest road segment to a given point within max_distance meters.
    Uses PostGIS ST_Distance on geography for meter-accurate distance.
    """
    query = select(RoadSegment).where(
        func.ST_DWithin(
            func.Geography(RoadSegment.geometry),
            func.Geography(func.ST_GeomFromText(point_wkt, 4326)),
            max_distance
        )
    ).order_by(
        func.ST_Distance(
            func.Geography(RoadSegment.geometry),
            func.Geography(func.ST_GeomFromText(point_wkt, 4326))
        )
    ).limit(1)

    result = await session.execute(query)
    return result.scalar_one_or_none()


async def link_issue_to_segment(
    session: AsyncSession,
    issue: UrbanIssue,
    point_wkt: str
) -> Optional[str]:
    """
    Link an issue to its nearest road segment.
    Returns the segment ID if found, None otherwise.
    """
    if issue.road_segment_id:
        return issue.road_segment_id  # Already linked
    
    segment = await find_nearest_segment(session, point_wkt)
    if segment:
        issue.road_segment_id = segment.id
        logger.info(f"Issue {issue.id} linked to road segment {segment.id} ({segment.name})")
        return segment.id
    else:
        logger.debug(f"No road segment found within {MAX_SEGMENT_DISTANCE_METERS}m of issue {issue.id}")
        return None
