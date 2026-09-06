"""Deterministic Department and Jurisdiction Engine.

Resolves an issue location to:
1. RoadSegment ownership (highest priority asset-level assignment).
2. Spatial jurisdiction polygon containment (PostGIS ST_Contains).
3. Explicit "unresolved" state when outside known boundaries.
"""

from dataclasses import dataclass
from typing import Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.models.domain import UrbanIssue, RoadSegment, Jurisdiction, Authority, Department

logger = logging.getLogger(__name__)


@dataclass
class JurisdictionResolution:
    status: str  # "resolved" | "unresolved"
    authority_id: Optional[str]
    authority_name: Optional[str]
    authority_code: Optional[str]
    jurisdiction_id: Optional[str]
    jurisdiction_name: Optional[str]
    department_id: Optional[str]
    department_name: Optional[str]
    source: str  # "road_segment_ownership" | "jurisdiction_boundary" | "configured_prototype_boundary" | "unresolved"


async def resolve_issue_jurisdiction(
    session: AsyncSession,
    point_wkt: str,
    road_segment_id: Optional[str] = None,
    issue_type: Optional[str] = None
) -> JurisdictionResolution:
    """
    Deterministic jurisdiction & authority resolver.
    
    Priority Order:
    1. RoadSegment Ownership (takes precedence over polygon containment).
    2. PostGIS Polygon Spatial Query against jurisdictions table.
    3. Unresolved Fallback (if no segment owner and outside all jurisdiction boundaries).
    """

    # Priority 1: RoadSegment Ownership
    if road_segment_id:
        seg_res = await session.execute(
            select(RoadSegment).where(RoadSegment.id == road_segment_id)
        )
        segment = seg_res.scalar_one_or_none()
        if segment and segment.authority_id:
            auth_res = await session.execute(
                select(Authority).where(Authority.id == segment.authority_id)
            )
            authority = auth_res.scalar_one_or_none()
            if authority:
                # Find matching active department under this authority
                dept_res = await session.execute(
                    select(Department)
                    .where(Department.authority_id == authority.id, Department.is_active == True)
                    .order_by(case((Department.department_type == "maintenance", 0), else_=1), Department.id.asc())
                    .limit(1)
                )
                department = dept_res.scalar_one_or_none()
                return JurisdictionResolution(
                    status="resolved",
                    authority_id=authority.id,
                    authority_name=authority.name,
                    authority_code=authority.code,
                    jurisdiction_id=None,
                    jurisdiction_name=segment.owner_agency or f"{authority.code} Road Asset",
                    department_id=department.id if department else None,
                    department_name=department.name if department else None,
                    source="road_segment_ownership"
                )

    # Priority 2: PostGIS Polygon Containment Query
    jur_query = (
        select(Jurisdiction, Authority)
        .join(Authority, Jurisdiction.authority_id == Authority.id)
        .where(
            Jurisdiction.is_active == True,
            func.ST_Contains(
                Jurisdiction.boundary,
                func.ST_GeomFromText(point_wkt, 4326)
            )
        )
        .limit(1)
    )
    jur_res = await session.execute(jur_query)
    match = jur_res.first()

    if match:
        jurisdiction, authority = match
        # Match department under this authority
        dept_res = await session.execute(
            select(Department)
            .where(Department.authority_id == authority.id, Department.is_active == True)
            .order_by(case((Department.department_type == "maintenance", 0), else_=1), Department.id.asc())
            .limit(1)
        )
        department = dept_res.scalar_one_or_none()

        source = (
            "configured_prototype_boundary"
            if jurisdiction.boundary_type == "configured_prototype_boundary"
            else "jurisdiction_boundary"
        )

        return JurisdictionResolution(
            status="resolved",
            authority_id=authority.id,
            authority_name=authority.name,
            authority_code=authority.code,
            jurisdiction_id=jurisdiction.id,
            jurisdiction_name=jurisdiction.name,
            department_id=department.id if department else None,
            department_name=department.name if department else None,
            source=source
        )

    # Fallback: Unresolved
    return JurisdictionResolution(
        status="unresolved",
        authority_id=None,
        authority_name=None,
        authority_code=None,
        jurisdiction_id=None,
        jurisdiction_name=None,
        department_id=None,
        department_name=None,
        source="unresolved"
    )
