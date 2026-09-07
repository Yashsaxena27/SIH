from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
import shapely.wkb

from app.core.database import get_db
from app.models.domain import Bus, Route, Camera
from app.services.fleet_intelligence import (
    get_fleet_summary,
    get_fleet_vehicles,
    get_fleet_sessions,
    start_inspection_session,
    end_inspection_session,
    get_coverage_intelligence,
)

router = APIRouter(prefix="/api/v1/fleet", tags=["Fleet"])


class StartSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vehicle_id: str
    camera_id: Optional[str] = None
    route_id: Optional[str] = None
    telemetry_provenance: str = "SIMULATED"


class EndSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    distance_km: float = 0.0
    frames_analyzed: int = 0
    detections_count: int = 0
    potholes_detected: int = 0
    road_segments_covered: Optional[List[str]] = None


def _serialize_bus(b: Bus, route_map: dict, cam_map: Optional[dict] = None) -> dict:
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

    cams = (cam_map.get(b.id, []) if cam_map else [])
    cams_serialized = [
        {
            "id": c.id,
            "mountPosition": c.mount_position,
            "mount_position": c.mount_position,
            "orientation": c.orientation,
            "resolution": c.resolution,
            "fps": c.fps,
            "status": c.status,
            "calibrationStatus": c.calibration_status,
            "calibration_status": c.calibration_status,
        }
        for c in cams
    ]

    return {
        "id": b.id,
        "bus_id": b.id,
        "vehicleId": b.id,
        "vehicle_id": b.id,
        "registrationNumber": b.registration_number,
        "registration_number": b.registration_number,
        "operator": b.operator,
        "status": b.status,
        "vehicleType": b.vehicle_type or "bus",
        "vehicle_type": b.vehicle_type or "bus",
        "makeModel": b.make_model or "Transit Vehicle",
        "make_model": b.make_model or "Transit Vehicle",
        "totalDistanceKm": b.total_distance_km or 0.0,
        "total_distance_km": b.total_distance_km or 0.0,
        "telemetryMode": b.telemetry_mode or "SIMULATED",
        "telemetry_mode": b.telemetry_mode or "SIMULATED",
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
        "cameras": cams_serialized,
        "cameraCount": len(cams_serialized),
        "camera_count": len(cams_serialized),
    }


@router.get("/summary")
async def get_summary(session: AsyncSession = Depends(get_db)):
    """Returns aggregated fleet KPIs, vehicle breakdown, camera counts, and coverage."""
    return await get_fleet_summary(session)


@router.get("/buses")
async def get_buses(session: AsyncSession = Depends(get_db)):
    """
    Returns fleet nodes with strict truthful telemetry disclosure and multi-camera data.
    When genuine live GPS is absent, currentLocation is null and telemetryStatus is 'unavailable'.
    """
    routes_res = await session.execute(select(Route))
    route_map = {r.id: r for r in routes_res.scalars().all()}

    cam_res = await session.execute(select(Camera))
    cameras = cam_res.scalars().all()
    cam_map = {}
    for c in cameras:
        cam_map.setdefault(c.vehicle_id, []).append(c)

    buses_res = await session.execute(select(Bus).order_by(Bus.id.asc()))
    buses = buses_res.scalars().all()

    return [_serialize_bus(b, route_map, cam_map) for b in buses]


@router.get("/buses/{bus_id}")
async def get_bus(bus_id: str, session: AsyncSession = Depends(get_db)):
    bus = await session.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    routes_res = await session.execute(select(Route))
    route_map = {r.id: r for r in routes_res.scalars().all()}

    cam_res = await session.execute(select(Camera).where(Camera.vehicle_id == bus_id))
    cameras = cam_res.scalars().all()
    cam_map = {bus_id: cameras}

    return _serialize_bus(bus, route_map, cam_map)


@router.get("/sessions")
async def list_sessions(
    limit: int = Query(50, ge=1, le=200),
    vehicle_id: Optional[str] = None,
    provenance: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    """Returns inspection sessions with explicit telemetry provenance."""
    return await get_fleet_sessions(session, limit=limit, vehicle_id=vehicle_id, provenance=provenance)


@router.post("/sessions/start")
async def start_session(
    request: StartSessionRequest,
    session: AsyncSession = Depends(get_db)
):
    """Initiates an active distributed sensing session."""
    try:
        return await start_inspection_session(
            session=session,
            vehicle_id=request.vehicle_id,
            camera_id=request.camera_id,
            route_id=request.route_id,
            telemetry_provenance=request.telemetry_provenance,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))


@router.post("/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    request: EndSessionRequest,
    session: AsyncSession = Depends(get_db)
):
    """Finalizes an active distributed sensing session and updates stats."""
    try:
        return await end_inspection_session(
            session=session,
            session_id=session_id,
            distance_km=request.distance_km,
            frames_analyzed=request.frames_analyzed,
            detections_count=request.detections_count,
            potholes_detected=request.potholes_detected,
            road_segments_covered=request.road_segments_covered,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))


@router.get("/coverage")
async def get_network_coverage(session: AsyncSession = Depends(get_db)):
    """Returns municipal road network distributed sensing coverage and gap analysis."""
    return await get_coverage_intelligence(session)


@router.get("/routes")
async def get_routes(session: AsyncSession = Depends(get_db)):
    """Returns configured transit routes with PostGIS linestring geometries."""
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
