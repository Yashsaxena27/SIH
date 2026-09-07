import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.schemas.ingestion import DetectionEvent
from app.models.domain import Detection, Observation, UrbanIssue, Severity, IssueStatus, Bus, Ticket, TicketStatus, TimelineEvent, Alert
from app.services.spatial_fusion import find_nearby_issue, find_nearby_verified_issue
from app.services.lifecycle import transition_issue_state
from app.services.road_segment_linker import link_issue_to_segment
from app.services.road_health import update_segment_health_for_issue
from app.api.v1.events import broadcast_event

async def ensure_bus_exists(session: AsyncSession, bus_id: str) -> Bus:
    """
    Ensures the bus exists to prevent FK integrity violations.
    Auto-registers newly reporting edge buses for resilient field operations.
    """
    bus = await session.get(Bus, bus_id)
    if not bus:
        cleaned = bus_id.replace('-', '').upper()
        suffix = cleaned[-6:] if len(cleaned) >= 6 else cleaned.ljust(6, 'X')
        reg_num = f"DL-01-{suffix}"
        existing_reg = await session.execute(select(Bus).where(Bus.registration_number == reg_num))
        if existing_reg.scalar_one_or_none():
            reg_num = f"DL-01-{uuid.uuid4().hex[:6].upper()}"
        bus = Bus(
            id=bus_id,
            registration_number=reg_num,
            operator="DTC-EDGE",
            status="online",
            camera_status="online",
            gps_status="online",
            edge_ai_status="online"
        )
        session.add(bus)
        await session.flush()
    return bus

async def process_detection_event(session: AsyncSession, event: DetectionEvent):
    """
    Core pipeline for ingesting an ML observation from a bus.
    """
    # 0. Ensure Bus Foreign Key exists
    await ensure_bus_exists(session, event.bus_id)
    
    # 1. Idempotency Check
    existing_detection = await session.execute(
        select(Detection).where(Detection.event_id == event.event_id)
    )
    existing_det = existing_detection.scalar_one_or_none()
    if existing_det:
        obs = await session.execute(
            select(Observation).where(Observation.detection_id == existing_det.id).limit(1)
        )
        obs_row = obs.scalar_one_or_none()
        if obs_row:
            return await session.get(UrbanIssue, obs_row.issue_id)
        return None

    # 2. Acquire spatial advisory transaction locks to serialize concurrent ingestions
    # Discretize coordinates into spatial buckets (~45m per cell)
    step = 0.0004
    lat_b = int(round(event.location.lat / step))
    lng_b = int(round(event.location.lng / step))
    # Lock current and immediate neighbor buckets in sorted order to prevent deadlocks
    lock_keys = sorted([
        f"fusion_{event.detection_type}_{lat_b + dy}_{lng_b + dx}"
        for dy in (-1, 0, 1)
        for dx in (-1, 0, 1)
    ])
    for lk in lock_keys:
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:k))"),
            {"k": lk}
        )

    # 3. Save Raw Detection
    detection_id = f"det_{uuid.uuid4().hex[:12]}"
    point_wkt = f"POINT({event.location.lng} {event.location.lat})"
    
    detection = Detection(
        id=detection_id,
        event_id=event.event_id,
        bus_id=event.bus_id,
        timestamp=event.timestamp,
        location=point_wkt,
        detection_type=event.detection_type,
        confidence=event.confidence,
        severity=event.severity,
        evidence_url=event.evidence_url,
        processing_status="processing"
    )
    session.add(detection)
    
    # 4. Spatial Fusion with row-level lock
    nearby_issue = await find_nearby_issue(
        session, event.location, event.detection_type, for_update=True
    )

    if nearby_issue:
        # Fuse with existing issue
        issue = nearby_issue
        issue.observation_count += 1
        issue.last_observed_at = event.timestamp
        # Update confidence (e.g. running average or max)
        issue.confidence = max(issue.confidence, event.confidence)
        
        # Check unique bus
        existing_bus_obs = await session.execute(
            select(Observation).where(
                Observation.issue_id == issue.id,
                Observation.bus_id == event.bus_id
            ).limit(1)
        )
        if not existing_bus_obs.scalar_one_or_none():
            issue.unique_bus_count += 1
            
        # Link to road segment if not yet linked
        if not issue.road_segment_id:
            await link_issue_to_segment(session, issue, point_wkt)
            
    else:
        # Check for recurrence against recently verified issues
        verified_issue = await find_nearby_verified_issue(
            session, event.location, event.detection_type, for_update=True
        )
        if verified_issue:
            # Defect Recurrence Detected: Reopen the EXISTING verified UrbanIssue!
            issue = verified_issue
            issue.status = IssueStatus.reopened
            issue.observation_count += 1
            issue.last_observed_at = event.timestamp
            issue.confidence = max(issue.confidence, event.confidence)
            
            # Check unique bus
            existing_bus_obs = await session.execute(
                select(Observation).where(
                    Observation.issue_id == issue.id,
                    Observation.bus_id == event.bus_id
                ).limit(1)
            )
            if not existing_bus_obs.scalar_one_or_none():
                issue.unique_bus_count += 1
                
            # Reopen associated ticket if present
            ticket_res = await session.execute(
                select(Ticket).where(Ticket.issue_id == issue.id)
            )
            ticket = ticket_res.scalar_one_or_none()
            if ticket:
                ticket.status = TicketStatus.reopened
                
            # Create Timeline Event
            session.add(TimelineEvent(
                id=f"evt_{uuid.uuid4().hex[:12]}",
                entity_id=issue.id,
                entity_type="issue",
                event_type="recurrence_detected",
                title="Defect Recurrence Detected — Issue Reopened",
                description=f"New defect detected within 15m of previously verified location by bus {event.bus_id}.",
                actor="SYSTEM_SPATIAL_FUSION",
                metadata_json={"detection_id": detection.id, "bus_id": event.bus_id}
            ))
            
            # Create Alert
            session.add(Alert(
                id=f"alt_{uuid.uuid4().hex[:12]}",
                alert_type="defect_recurrence",
                severity="high",
                title=f"Defect Recurrence: {issue.id}",
                message=f"Defect re-emerged on road segment {issue.road_segment_id or 'unassigned'} after verification.",
                related_entity_id=issue.id,
                related_entity_type="urban_issue"
            ))
        else:
            # Create new issue
            issue_id = f"iss_{uuid.uuid4().hex[:12]}"
            issue = UrbanIssue(
                id=issue_id,
                issue_type=event.detection_type,
                status=IssueStatus.new,
                severity=event.severity,
                location=point_wkt,
                first_detected_at=event.timestamp,
                last_observed_at=event.timestamp,
                observation_count=1,
                unique_bus_count=1,
                confidence=event.confidence
            )
            session.add(issue)
            await session.flush()  # Ensure issue.id is available
            await link_issue_to_segment(session, issue, point_wkt)

    # 4. Save Validated Observation
    observation = Observation(
        id=f"obs_{uuid.uuid4().hex[:12]}",
        issue_id=issue.id,
        detection_id=detection.id,
        bus_id=event.bus_id,
        timestamp=event.timestamp,
        evidence_url=event.evidence_url,
        confidence=event.confidence
    )
    session.add(observation)
    
    # 5. Lifecycle & Priority transitions
    await transition_issue_state(session, issue)

    detection.processing_status = "fused"
    # Persist the active issue burden immediately so Road Health reflects new detections
    # before a later repair verification recalculates the same segment.
    await update_segment_health_for_issue(session, issue)
    await session.commit()
    
    # Fire realtime event to frontend
    broadcast_event("NEW_DETECTION", {
        "eventId": event.event_id,
        "issueId": issue.id,
        "type": event.detection_type,
        "location": {"lat": event.location.lat, "lng": event.location.lng}
    })
    broadcast_event("ISSUE_UPDATED", {"issueId": issue.id})
    
    return issue
