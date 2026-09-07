"""Spatial linking of issues to road segments using PostGIS.

Implements candidate tolerance (50m) and ambiguity delta (<=5m) guardrails.
Conceptual states:
- UNMATCHED: 0 candidates within 50m tolerance
- MATCHED: 1 candidate within 50m, or nearest candidate is > 5m closer than runner-up
- AMBIGUOUS: 2+ candidates within 50m whose distance delta is <= 5m (MUST NOT receive road_segment_id)
"""
from dataclasses import dataclass
import logging
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.domain import RoadSegment, UrbanIssue

logger = logging.getLogger(__name__)

# Spatial tolerance constants
CANDIDATE_SEARCH_TOLERANCE_METERS = 50.0
AMBIGUITY_DELTA_THRESHOLD_METERS = 5.0


@dataclass
class RoadMatchResult:
    state: str  # "MATCHED" | "UNMATCHED" | "AMBIGUOUS"
    segment_id: Optional[str]
    segment_name: Optional[str]
    road_class: Optional[str]
    authority_id: Optional[str]
    distance_meters: Optional[float]
    second_distance_meters: Optional[float]
    delta_meters: Optional[float]
    candidate_count: int
    reason: str


async def match_road_segment(
    session: AsyncSession,
    point_wkt: str,
    tolerance_meters: float = CANDIDATE_SEARCH_TOLERANCE_METERS,
    ambiguity_delta: float = AMBIGUITY_DELTA_THRESHOLD_METERS
) -> RoadMatchResult:
    """
    Evaluate candidate road segments for a given point coordinate.
    Uses PostGIS ST_DWithin and ST_Distance on geography for metric accuracy.
    """
    # Query up to 3 candidates within tolerance, ordered by metric distance
    dist_expr = func.ST_Distance(
        func.Geography(RoadSegment.geometry),
        func.Geography(func.ST_GeomFromText(point_wkt, 4326))
    ).label("distance")

    query = select(RoadSegment, dist_expr).where(
        func.ST_DWithin(
            func.Geography(RoadSegment.geometry),
            func.Geography(func.ST_GeomFromText(point_wkt, 4326)),
            tolerance_meters
        )
    ).order_by(dist_expr.asc()).limit(3)

    result = await session.execute(query)
    rows = result.all()
    candidate_count = len(rows)

    # Rule 1: 0 candidates within tolerance -> UNMATCHED
    if candidate_count == 0:
        return RoadMatchResult(
            state="UNMATCHED",
            segment_id=None,
            segment_name=None,
            road_class=None,
            authority_id=None,
            distance_meters=None,
            second_distance_meters=None,
            delta_meters=None,
            candidate_count=0,
            reason=f"No road segment candidate within {tolerance_meters:.1f}m tolerance"
        )

    seg1, d1 = rows[0][0], float(rows[0][1])

    # Rule 2: Exactly 1 candidate within tolerance -> MATCHED
    if candidate_count == 1:
        return RoadMatchResult(
            state="MATCHED",
            segment_id=seg1.id,
            segment_name=seg1.name,
            road_class=seg1.road_class,
            authority_id=seg1.authority_id,
            distance_meters=round(d1, 2),
            second_distance_meters=None,
            delta_meters=None,
            candidate_count=1,
            reason=f"Single road segment candidate ({seg1.name}) matched at {d1:.1f}m"
        )

    # Rule 3: 2+ candidates within tolerance -> evaluate distance delta
    seg2, d2 = rows[1][0], float(rows[1][1])
    delta = round(d2 - d1, 2)

    if delta <= ambiguity_delta:
        # Ambiguous match at intersection or parallel segment -> MUST NOT receive road_segment_id
        return RoadMatchResult(
            state="AMBIGUOUS",
            segment_id=None,
            segment_name=None,
            road_class=None,
            authority_id=None,
            distance_meters=round(d1, 2),
            second_distance_meters=round(d2, 2),
            delta_meters=delta,
            candidate_count=candidate_count,
            reason=(
                f"Ambiguous candidates within {tolerance_meters:.1f}m: '{seg1.name}' ({d1:.1f}m) and "
                f"'{seg2.name}' ({d2:.1f}m) differ by {delta:.1f}m <= {ambiguity_delta:.1f}m threshold"
            )
        )
    else:
        # Dominant candidate significantly closer (> ambiguity_delta)
        return RoadMatchResult(
            state="MATCHED",
            segment_id=seg1.id,
            segment_name=seg1.name,
            road_class=seg1.road_class,
            authority_id=seg1.authority_id,
            distance_meters=round(d1, 2),
            second_distance_meters=round(d2, 2),
            delta_meters=delta,
            candidate_count=candidate_count,
            reason=(
                f"Matched to '{seg1.name}' ({d1:.1f}m); alternative '{seg2.name}' "
                f"is {delta:.1f}m further away (> {ambiguity_delta:.1f}m delta threshold)"
            )
        )


async def find_nearest_segment(
    session: AsyncSession,
    point_wkt: str,
    max_distance: float = CANDIDATE_SEARCH_TOLERANCE_METERS
) -> Optional[RoadSegment]:
    """
    Backward-compatible finder: returns the matched RoadSegment entity only if unambiguously matched.
    """
    match = await match_road_segment(session, point_wkt, tolerance_meters=max_distance)
    if match.state == "MATCHED" and match.segment_id:
        return await session.get(RoadSegment, match.segment_id)
    return None


async def link_issue_to_segment(
    session: AsyncSession,
    issue: UrbanIssue,
    point_wkt: str
) -> Optional[str]:
    """
    Link an issue to its road segment according to Phase 6 matching rules.
    Preserves None for UNMATCHED or AMBIGUOUS states.
    Returns segment_id if MATCHED, None otherwise.
    """
    match = await match_road_segment(session, point_wkt)
    if match.state == "MATCHED" and match.segment_id:
        issue.road_segment_id = match.segment_id
        logger.info(f"Issue {issue.id} MATCHED to road segment {match.segment_id} ({match.segment_name})")
        return match.segment_id
    elif match.state == "AMBIGUOUS":
        issue.road_segment_id = None
        logger.warning(f"Issue {issue.id} spatial match is AMBIGUOUS: {match.reason}")
        return None
    else:
        issue.road_segment_id = None
        logger.debug(f"Issue {issue.id} UNMATCHED: {match.reason}")
        return None

