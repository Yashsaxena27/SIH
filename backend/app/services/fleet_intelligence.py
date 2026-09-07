"""POTHOLE WALA — Fleet Multi-Camera & Distributed Sensing Intelligence Service.

Core Capabilities:
1. Generalized sensing fleet management (buses, PWD survey units, service trucks).
2. Multi-camera mount and calibration normalization.
3. Explicit inspection session provenance (LIVE, REPLAY, SIMULATED, ESTIMATED).
4. Municipal road network coverage intelligence (gap detection & pass recency).
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_

from app.models.domain import Bus, Camera, InspectionSession, RoadSegment, Observation, UrbanIssue


async def get_fleet_summary(session: AsyncSession) -> Dict[str, Any]:
    """Aggregates high-level fleet sensing KPIs, vehicle breakdown, and coverage health."""
    # 1. Vehicle counts and breakdown
    veh_res = await session.execute(select(Bus))
    vehicles = veh_res.scalars().all()
    
    total_vehicles = len(vehicles)
    bus_count = sum(1 for v in vehicles if (v.vehicle_type or 'bus') == 'bus')
    inspection_count = sum(1 for v in vehicles if v.vehicle_type == 'inspection_vehicle')
    service_count = sum(1 for v in vehicles if v.vehicle_type == 'service_vehicle')
    active_vehicles = sum(1 for v in vehicles if v.status == 'active')
    
    total_survey_km = round(sum(v.total_distance_km or 0.0 for v in vehicles), 1)

    # 2. Camera statistics
    cam_res = await session.execute(select(Camera))
    cameras = cam_res.scalars().all()
    total_cameras = len(cameras)
    active_cameras = sum(1 for c in cameras if c.status == 'active')
    calibrated_cameras = sum(1 for c in cameras if c.calibration_status == 'calibrated')

    # 3. Inspection Sessions statistics
    sess_res = await session.execute(select(InspectionSession).order_by(desc(InspectionSession.started_at)))
    sessions = sess_res.scalars().all()
    total_sessions = len(sessions)
    active_sessions = sum(1 for s in sessions if s.status == 'active')

    # Provenance breakdown
    provenance_counts = {
        "LIVE": sum(1 for s in sessions if s.telemetry_provenance == 'LIVE'),
        "REPLAY": sum(1 for s in sessions if s.telemetry_provenance == 'REPLAY'),
        "SIMULATED": sum(1 for s in sessions if s.telemetry_provenance == 'SIMULATED'),
        "ESTIMATED": sum(1 for s in sessions if s.telemetry_provenance == 'ESTIMATED'),
    }

    # 4. Coverage summary
    seg_res = await session.execute(select(RoadSegment))
    segments = seg_res.scalars().all()
    total_corridors = len(segments)

    # Corridors covered recently in sessions
    covered_seg_ids = set()
    for s in sessions:
        if s.road_segments_covered and isinstance(s.road_segments_covered, list):
            for seg_id in s.road_segments_covered:
                covered_seg_ids.add(seg_id)

    covered_count = len(covered_seg_ids)
    gap_count = max(0, total_corridors - covered_count)
    coverage_rate_pct = round((covered_count / max(1, total_corridors)) * 100.0, 1)

    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "vehicle_breakdown": {
            "public_buses": bus_count,
            "pwd_inspection_vehicles": inspection_count,
            "municipal_service_trucks": service_count,
        },
        "total_cameras": total_cameras,
        "active_cameras": active_cameras,
        "calibrated_cameras": calibrated_cameras,
        "total_survey_km": total_survey_km,
        "sessions": {
            "total_count": total_sessions,
            "active_count": active_sessions,
            "provenance_breakdown": provenance_counts,
        },
        "coverage": {
            "total_corridors": total_corridors,
            "sensed_corridors": covered_count,
            "coverage_gaps": gap_count,
            "coverage_rate_pct": coverage_rate_pct,
        },
        "telemetry_guarantee": "Strict provenance attribution: Simulated/Replay data explicitly identified.",
    }


async def get_fleet_vehicles(
    session: AsyncSession,
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Returns vehicles with attached cameras and current operational status."""
    stmt = select(Bus).order_by(Bus.registration_number.asc())
    if vehicle_type:
        stmt = stmt.where(Bus.vehicle_type == vehicle_type)
    if status:
        stmt = stmt.where(Bus.status == status)

    res = await session.execute(stmt)
    vehicles = res.scalars().all()

    # Pre-fetch all cameras
    cam_res = await session.execute(select(Camera))
    all_cameras = cam_res.scalars().all()
    cam_map = {}
    for c in all_cameras:
        cam_map.setdefault(c.vehicle_id, []).append(c)

    results = []
    for v in vehicles:
        v_cams = cam_map.get(v.id, [])
        cams_data = [
            {
                "id": c.id,
                "mount_position": c.mount_position,
                "orientation": c.orientation,
                "resolution": c.resolution,
                "fps": c.fps,
                "status": c.status,
                "calibration_status": c.calibration_status,
                "last_health_check": c.last_health_check.isoformat() if c.last_health_check else None,
            }
            for c in v_cams
        ]

        results.append({
            "id": v.id,
            "registration_number": v.registration_number,
            "operator": v.operator or "Delhi Transport Corporation",
            "vehicle_type": v.vehicle_type or "bus",
            "make_model": v.make_model or "Standard Transit Unit",
            "status": v.status or "offline",
            "camera_status": v.camera_status or "offline",
            "gps_status": v.gps_status or "offline",
            "edge_ai_status": v.edge_ai_status or "offline",
            "total_distance_km": v.total_distance_km or 0.0,
            "telemetry_mode": v.telemetry_mode or "SIMULATED",
            "last_seen": v.last_seen.isoformat() if v.last_seen else None,
            "camera_count": len(cams_data),
            "cameras": cams_data,
        })

    return results


async def get_fleet_sessions(
    session: AsyncSession,
    limit: int = 50,
    vehicle_id: Optional[str] = None,
    provenance: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Returns inspection sessions with telemetry provenance."""
    stmt = select(InspectionSession).order_by(desc(InspectionSession.started_at)).limit(limit)
    if vehicle_id:
        stmt = stmt.where(InspectionSession.vehicle_id == vehicle_id)
    if provenance:
        stmt = stmt.where(InspectionSession.telemetry_provenance == provenance)

    res = await session.execute(stmt)
    sessions = res.scalars().all()

    # Pre-fetch vehicles
    veh_res = await session.execute(select(Bus))
    veh_map = {v.id: v for v in veh_res.scalars().all()}

    results = []
    for s in sessions:
        veh = veh_map.get(s.vehicle_id)
        results.append({
            "id": s.id,
            "vehicle_id": s.vehicle_id,
            "vehicle_registration": veh.registration_number if veh else s.vehicle_id,
            "vehicle_type": veh.vehicle_type if veh else "bus",
            "camera_id": s.camera_id,
            "route_id": s.route_id,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "status": s.status,
            "telemetry_provenance": s.telemetry_provenance,
            "distance_sensed_km": s.distance_sensed_km or 0.0,
            "frames_analyzed": s.frames_analyzed or 0,
            "detections_count": s.detections_count or 0,
            "potholes_detected": s.potholes_detected or 0,
            "road_segments_covered": s.road_segments_covered or [],
        })

    return results


async def start_inspection_session(
    session: AsyncSession,
    vehicle_id: str,
    camera_id: Optional[str] = None,
    route_id: Optional[str] = None,
    telemetry_provenance: str = "SIMULATED"
) -> Dict[str, Any]:
    """Starts a new active distributed sensing session with defensive validation."""
    # 1. Verify vehicle exists
    veh = await session.get(Bus, vehicle_id)
    if not veh:
        raise ValueError(f"Vehicle {vehicle_id} not found.")

    # 2. Verify camera exists and belongs to vehicle
    if camera_id:
        cam = await session.get(Camera, camera_id)
        if not cam:
            raise ValueError(f"Camera {camera_id} not found.")
        if cam.vehicle_id != vehicle_id:
            raise ValueError(f"Camera {camera_id} is not mounted on vehicle {vehicle_id}.")

    # 3. Verify route if specified
    if route_id:
        from app.models.domain import Route
        rt = await session.get(Route, route_id)
        if not rt:
            raise ValueError(f"Route {route_id} not found.")

    # 4. Strict telemetry provenance validation
    valid_provenances = {"LIVE", "REPLAY", "SIMULATED", "ESTIMATED"}
    norm_prov = (telemetry_provenance or "SIMULATED").upper().strip()
    if norm_prov not in valid_provenances:
        raise ValueError(f"Invalid telemetry provenance '{telemetry_provenance}'. Must be one of: {', '.join(sorted(valid_provenances))}.")

    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    now_utc = datetime.now(timezone.utc)

    new_sess = InspectionSession(
        id=session_id,
        vehicle_id=vehicle_id,
        camera_id=camera_id,
        route_id=route_id,
        started_at=now_utc,
        status="active",
        telemetry_provenance=norm_prov,
        distance_sensed_km=0.0,
        frames_analyzed=0,
        detections_count=0,
        potholes_detected=0,
        road_segments_covered=[]
    )
    session.add(new_sess)

    # Mark vehicle as active
    veh.status = "active"
    veh.last_seen = now_utc

    await session.commit()
    await session.refresh(new_sess)

    return {
        "id": new_sess.id,
        "vehicle_id": new_sess.vehicle_id,
        "camera_id": new_sess.camera_id,
        "started_at": new_sess.started_at.isoformat(),
        "status": new_sess.status,
        "telemetry_provenance": new_sess.telemetry_provenance,
    }


async def end_inspection_session(
    session: AsyncSession,
    session_id: str,
    distance_km: float = 0.0,
    frames_analyzed: int = 0,
    detections_count: int = 0,
    potholes_detected: int = 0,
    road_segments_covered: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Closes an active inspection session and updates vehicle odometer defensively."""
    sess = await session.get(InspectionSession, session_id)
    if not sess:
        raise ValueError(f"Session {session_id} not found.")

    # Defensive bounds clamping (protects against negative metrics or corruption)
    clamped_dist = max(0.0, float(distance_km or 0.0))
    clamped_frames = max(0, int(frames_analyzed or 0))
    clamped_dets = max(0, int(detections_count or 0))
    clamped_potholes = max(0, int(potholes_detected or 0))

    now_utc = datetime.now(timezone.utc)
    sess.ended_at = now_utc
    sess.status = "completed"
    sess.distance_sensed_km = clamped_dist
    sess.frames_analyzed = clamped_frames
    sess.detections_count = clamped_dets
    sess.potholes_detected = clamped_potholes
    if road_segments_covered:
        sess.road_segments_covered = road_segments_covered

    # Update vehicle odometer defensively
    veh = await session.get(Bus, sess.vehicle_id)
    if veh:
        veh.total_distance_km = (veh.total_distance_km or 0.0) + clamped_dist
        veh.last_seen = now_utc

    await session.commit()
    await session.refresh(sess)

    return {
        "id": sess.id,
        "status": sess.status,
        "ended_at": sess.ended_at.isoformat(),
        "distance_sensed_km": sess.distance_sensed_km,
        "potholes_detected": sess.potholes_detected,
    }


async def get_coverage_intelligence(session: AsyncSession) -> Dict[str, Any]:
    """
    Evaluates municipal road network sensing coverage:
    - Analyzes recent passes across corridors
    - Detects sensing blind spots / coverage gaps (> 7 days without observation pass)
    """
    # 1. Fetch all road segments
    seg_res = await session.execute(select(RoadSegment).order_by(RoadSegment.name.asc()))
    segments = seg_res.scalars().all()

    # 2. Fetch all inspection sessions
    sess_res = await session.execute(
        select(InspectionSession).order_by(desc(InspectionSession.started_at))
    )
    sessions = sess_res.scalars().all()

    # Track segment pass timestamps
    seg_passes = {}
    for s in sessions:
        if s.road_segments_covered and isinstance(s.road_segments_covered, list):
            for sid in s.road_segments_covered:
                if sid not in seg_passes or s.started_at > seg_passes[sid]:
                    seg_passes[sid] = s.started_at

    now = datetime.now(timezone.utc)
    corridor_health_list = []
    gap_count = 0

    for s in segments:
        last_pass = seg_passes.get(s.id)
        if last_pass:
            if last_pass.tzinfo is None:
                last_pass = last_pass.replace(tzinfo=timezone.utc)
            # Guard against sensor clock skew (future timestamps clamped to 0.0)
            if last_pass > now:
                days_ago = 0.0
            else:
                days_ago = round((now - last_pass).total_seconds() / 86400.0, 1)
            if days_ago <= 2.0:
                coverage_status = "RECENT"
            elif days_ago <= 7.0:
                coverage_status = "ACCEPTABLE"
            else:
                coverage_status = "GAP"
                gap_count += 1
        else:
            days_ago = None
            coverage_status = "NEVER_SENSED"
            gap_count += 1

        corridor_health_list.append({
            "segment_id": s.id,
            "segment_name": s.name,
            "road_class": s.road_class or "arterial",
            "health_score": s.health_score or 100.0,
            "coverage_status": coverage_status,
            "days_since_last_pass": days_ago,
            "last_sensed_at": last_pass.isoformat() if last_pass else None,
        })

    total_count = len(segments)
    active_coverage_count = total_count - gap_count

    return {
        "total_corridors": total_count,
        "actively_covered_corridors": active_coverage_count,
        "coverage_gap_corridors": gap_count,
        "coverage_percentage": round((active_coverage_count / max(1, total_count)) * 100.0, 1),
        "gap_threshold_days": 7,
        "corridors": corridor_health_list,
    }
