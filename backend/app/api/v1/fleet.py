from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import shapely.wkb

from app.core.database import get_db
from app.models.domain import Bus, Route

router = APIRouter(prefix="/api/v1/fleet", tags=["Fleet"])


def _serialize_bus(b: Bus, route_map: dict) -> dict:
    loc = None
    telemetry_status = "unavailable"
    
    if b.current_location is not None:
        try:
            pt = shapely.wkb.loads(bytes(b.current_location.data))
            loc = {"lat": pt.y, "lng": pt.x}
            telemetry_status = "available"
        except Exception:
            loc = None
            telemetry_status = "unavailable"

    route = route_map.get(b.route_id) if b.route_id else None
    route_name = route.name if route else None
    route_code = route.display_code if route else None

    last_seen_str = b.last_seen.isoformat() if b.last_seen else None
    gps_status = "available" if loc is not None else "unavailable"

    return {
        "id": b.id,
        "bus_id": b.id,
        "registrationNumber": b.registration_number,
        "registration_number": b.registration_number,
        "operator": b.operator,
        "status": b.status,
        "routeId": b.route_id,
        "route_id": b.route_id,
        "routeName": route_name,
        "route_name": route_name,
        "routeCode": route_code,
        "route_code": route_code,
        "currentLocation": loc,
        "current_location": loc,
        "telemetryStatus": telemetry_status,
        "telemetry_status": telemetry_status,
        "lastSeen": last_seen_str,
        "last_seen": last_seen_str,
        "cameraStatus": b.camera_status,
        "gpsStatus": gps_status,
        "gps_status": gps_status,
        "edgeAiStatus": b.edge_ai_status,
    }


@router.get("/buses")
async def get_buses(session: AsyncSession = Depends(get_db)):
    """
    Returns fleet nodes with strict truthful telemetry disclosure.
    When genuine live GPS is absent, currentLocation is null and telemetryStatus is 'unavailable'.
    """
    routes_res = await session.execute(select(Route))
    route_map = {r.id: r for r in routes_res.scalars().all()}

    buses_res = await session.execute(select(Bus).order_by(Bus.id.asc()))
    buses = buses_res.scalars().all()

    return [_serialize_bus(b, route_map) for b in buses]


@router.get("/buses/{bus_id}")
async def get_bus(bus_id: str, session: AsyncSession = Depends(get_db)):
    bus = await session.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    routes_res = await session.execute(select(Route))
    route_map = {r.id: r for r in routes_res.scalars().all()}

    return _serialize_bus(bus, route_map)


@router.get("/routes")
async def get_routes(session: AsyncSession = Depends(get_db)):
    """
    Returns configured transit routes with PostGIS linestring geometries.
    """
    result = await session.execute(select(Route).order_by(Route.id.asc()))
    routes = result.scalars().all()

    serialized = []
    for r in routes:
        waypoints = []
        if r.geometry is not None:
            try:
                line = shapely.wkb.loads(bytes(r.geometry.data))
                waypoints = [{"lat": pt[1], "lng": pt[0]} for pt in line.coords]
            except Exception:
                waypoints = []

        serialized.append({
            "id": r.id,
            "code": r.display_code,
            "display_code": r.display_code,
            "displayCode": r.display_code,
            "name": r.name,
            "isActive": r.is_active,
            "waypoints": waypoints,
            "geometryType": "LINESTRING" if waypoints else None,
            "corridorType": "configured_corridor"
        })

    return serialized
