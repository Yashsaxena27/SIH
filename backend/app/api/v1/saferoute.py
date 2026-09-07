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
    """
    res = await session.execute(select(RoadSegment).order_by(RoadSegment.name.asc()))
    segments = res.scalars().all()

    profiles = []
    for s in segments:
        prof = await get_segment_risk_profile(session, s)
        # Exclude raw coordinates for lighter payload
        prof_clean = {k: v for k, v in prof.items() if k != "coordinates"}
        profiles.append(prof_clean)

    return profiles
