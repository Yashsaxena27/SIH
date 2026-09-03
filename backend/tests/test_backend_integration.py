import pytest
import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.models.domain import (
    UrbanIssue, IssueStatus, Severity, TicketPriority, Department, Bus, Ticket, TicketStatus
)
from app.schemas.ingestion import GeoPoint, DetectionEvent, BatchDetectionRequest, BatchDetectionResponse
from app.services.priority_engine import calculate_priority

def test_security_pyjwt_token():
    # 1. Token generation
    token = create_access_token("admin@sih.gov.in")
    assert isinstance(token, str)
    assert len(token.split(".")) == 3

    # 2. Token decode
    import jwt
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == "admin@sih.gov.in"
    assert "exp" in payload

    # 3. Password hashing
    hashed = get_password_hash("securepass123")
    assert verify_password("securepass123", hashed)
    assert not verify_password("wrongpass", hashed)

def test_evidence_static_mount():
    client = TestClient(app)
    # Test health live
    res_live = client.get("/health/live")
    assert res_live.status_code == 200

    # Test evidence static endpoint
    res_evidence = client.get("/evidence/BUS001_EVT-86eb082c_1788417689.jpg")
    assert res_evidence.status_code == 200
    assert res_evidence.headers["content-type"] == "image/jpeg"

    # Test non-existent evidence returns 404
    res_missing = client.get("/evidence/non_existent_file.jpg")
    assert res_missing.status_code == 404

def test_batch_detection_schema_validation():
    now = datetime.datetime.now(datetime.timezone.utc)
    event1 = DetectionEvent(
        event_id="EVT-001",
        bus_id="BUS-001",
        timestamp=now,
        location=GeoPoint(lat=12.9716, lng=77.5946),
        detection_type="pothole",
        confidence=0.88,
        severity="high",
        evidence_url="/evidence/e1.jpg"
    )
    event2 = DetectionEvent(
        event_id="EVT-002",
        bus_id="BUS-002",
        timestamp=now,
        location=GeoPoint(lat=12.9720, lng=77.5950),
        detection_type="alligator_crack",
        confidence=0.75,
        severity="medium",
        evidence_url="/evidence/e2.jpg"
    )

    batch_req = BatchDetectionRequest(events=[event1, event2])
    assert len(batch_req.events) == 2
    assert batch_req.events[0].detection_type == "pothole"
    assert batch_req.events[1].detection_type == "alligator_crack"

def test_spatial_fusion_syntax_and_status():
    from app.services.spatial_fusion import find_nearby_issue
    import inspect
    source = inspect.getsource(find_nearby_issue)
    assert "IssueStatus.closed" not in source
    assert "IssueStatus.verified" in source

def test_priority_engine_calculation():
    now = datetime.datetime.now(datetime.timezone.utc)
    issue = UrbanIssue(
        id="iss_test",
        issue_type="pothole",
        status=IssueStatus.new,
        severity=Severity.critical,
        priority=TicketPriority.low,
        location="POINT(77.5946 12.9716)",
        first_detected_at=now,
        last_observed_at=now,
        observation_count=5,
        unique_bus_count=3,
        confidence=0.95
    )
    # Critical (50) + 3 buses (20) + 5 obs (10) = 80 -> urgent
    p = calculate_priority(issue)
    assert p == TicketPriority.urgent

def test_issue_serialization_coordinate_shape():
    from app.api.v1.issues import _serialize_issue
    import geoalchemy2
    import shapely.geometry
    
    # Create GeoAlchemy WKBElement
    geom = shapely.geometry.Point(77.5946, 12.9716) # POINT(x, y) = POINT(lng, lat)
    wkb_elem = geoalchemy2.WKBElement(geom.wkb, srid=4326)
    
    now = datetime.datetime.now(datetime.timezone.utc)
    issue = UrbanIssue(
        id="iss_coord_test_123",
        issue_type="pothole",
        status=IssueStatus.new,
        severity=Severity.high,
        priority=TicketPriority.high,
        location=wkb_elem,
        first_detected_at=now,
        last_observed_at=now,
        observation_count=2,
        unique_bus_count=2,
        confidence=0.91
    )
    
    serialized = _serialize_issue(issue)
    loc = serialized["location"]
    
    # Verify exact coordinate shape
    assert loc["lat"] == 12.9716
    assert loc["lng"] == 77.5946
    assert loc["gps"]["lat"] == 12.9716
    assert loc["gps"]["lng"] == 77.5946
    assert loc["snappedGps"]["lat"] == 12.9716
    assert loc["snappedGps"]["lng"] == 77.5946

