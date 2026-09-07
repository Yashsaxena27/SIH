"""POTHOLE WALA — SafeRoute REST API Endpoints.

Provides risk-aware route planning, multi-candidate comparison, and
corridor presets.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

from app.core.database import get_db
from app.core.auth import get_current_user, AuthenticatedUser
from app.services.saferoute_engine import plan_saferoute, get_saferoute_presets, get_segment_risk_profile
from app.models.domain import RoadSegment
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/saferoute", tags=["SafeRoute"])


class RoutePlanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    origin: str = Field(..., description="Origin location or corridor name")
    destination: str = Field(..., description="Destination location or corridor name")
    mode: str = Field("SAFEST", description="Routing mode: FASTEST, SAFEST, or BALANCED")
    corridor_set: Optional[str] = Field("delhi_ncr", description="Network corridor set: delhi_ncr or bangalore")
    origin_coords: Optional[Dict[str, float]] = None
    destination_coords: Optional[Dict[str, float]] = None


@router.get("/presets")
async def list_presets():
    """
    Returns configured municipal showcase origin/destination corridor presets.
    """
    return get_saferoute_presets()


@router.post("/plan")
async def calculate_saferoute(
    request: RoutePlanRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Computes multi-candidate routes between origin and destination,
    evaluates deterministic infrastructure risk from active defects,
    and returns recommendations based on decision mode (FASTEST, SAFEST, BALANCED).
    """
    try:
        orig_coords = None
        if request.origin_coords and "lat" in request.origin_coords and "lng" in request.origin_coords:
            orig_coords = (request.origin_coords["lat"], request.origin_coords["lng"])

        dest_coords = None
        if request.destination_coords and "lat" in request.destination_coords and "lng" in request.destination_coords:
            dest_coords = (request.destination_coords["lat"], request.destination_coords["lng"])

        result = await plan_saferoute(
            session=session,
            origin_name=request.origin,
            destination_name=request.destination,
            mode=request.mode,
            origin_coords=orig_coords,
            destination_coords=dest_coords,
            corridor_set=request.corridor_set or "delhi_ncr"
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SafeRoute calculation error: {str(exc)}")


@router.get("/corridors")
async def get_corridor_risk_profiles(session: AsyncSession = Depends(get_db)):
    """
    Returns all road network segments with their current operational risk scores
    and contributing factor breakdowns.
    Uses batch pre-fetching to prevent N+1 database queries.
    """
    from app.models.domain import UrbanIssue, Verification, VerificationResult
    from app.services.saferoute_engine import ACTIVE_ISSUE_STATUSES
    from sqlalchemy import func

    res = await session.execute(select(RoadSegment).order_by(RoadSegment.name.asc()))
    segments = res.scalars().all()

    # 1. Batch fetch all active issues on segments
    issues_res = await session.execute(
        select(UrbanIssue)
        .where(UrbanIssue.road_segment_id.isnot(None))
        .where(UrbanIssue.status.in_(ACTIVE_ISSUE_STATUSES))
    )
    all_issues = issues_res.scalars().all()
    issues_by_seg: Dict[str, List[Any]] = {}
    for iss in all_issues:
        issues_by_seg.setdefault(iss.road_segment_id, []).append(iss)

    # 2. Batch fetch unresolved verifications count by issue_id
    verif_res = await session.execute(
        select(Verification.issue_id, func.count(Verification.id))
        .where(Verification.result.in_([VerificationResult.unresolved, VerificationResult.inconclusive]))
        .group_by(Verification.issue_id)
    )
    verifs_by_issue = dict(verif_res.all())

    profiles = []
    for s in segments:
        seg_issues = issues_by_seg.get(s.id, [])
        unresolved_count = sum(verifs_by_issue.get(iss.id, 0) for iss in seg_issues)
        prof = await get_segment_risk_profile(
            session=session,
            segment=s,
            prefetched_issues=seg_issues,
            prefetched_unresolved_count=unresolved_count
        )
        # Exclude raw coordinates for lighter payload
        prof_clean = {k: v for k, v in prof.items() if k != "coordinates"}
        profiles.append(prof_clean)

    return profiles
