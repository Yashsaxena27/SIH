import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.ingestion import DetectionEvent
from app.models.domain import Detection, Observation, UrbanIssue, Severity, IssueStatus, Bus
from app.services.spatial_fusion import find_nearby_issue
from app.services.lifecycle import transition_issue_state
from app.services.road_segment_linker import link_issue_to_segment
from app.api.v1.events import broadcast_event

async def ensure_bus_exists(session: AsyncSession, bus_id: str) -> Bus:
    """
    Ensures the bus exists to prevent FK integrity violations.
    Auto-registers newly reporting edge buses for resilient field operations.
    """
    bus = await session.get(Bus, bus_id)
    if not bus:
        reg_num = f"KA-01-{bus_id.replace('-', '')[:6]}"
        bus = Bus(
            id=bus_id,
            registration_number=reg_num,
            operator="BMTC-EDGE",
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
    if existing_detection.scalar_one_or_none():
        return # Already processed

    # 2. Save Raw Detection
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
    
    # 3. Spatial Fusion
    nearby_issue = await find_nearby_issue(
        session, event.location, event.detection_type
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
