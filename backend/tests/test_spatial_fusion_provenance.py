import pytest
import uuid
import datetime
import random
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import UrbanIssue, Detection, Observation, Bus, Ticket

client = TestClient(app)

@pytest.mark.asyncio
async def test_spatial_fusion_within_15m_multibus():
    """
    Verify 15-meter PostGIS ST_DWithin spatial fusion.
    When two detections are within 15 meters from two different buses:
    - They fuse into a single UrbanIssue.
    - observation_count becomes 2.
    - unique_bus_count becomes 2.
    - observingBuses lists both genuine bus IDs.
    - corroborationText reflects authentic multi-pass corroboration.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    # Generate unique test location to avoid collisions
    nonce = random.randint(1000, 9999)
    base_lat = 28.80000 + (nonce * 0.0001)
    base_lng = 77.10000 + (nonce * 0.0001)
    
    evt1_id = f"evt_fuse_1_{uuid.uuid4().hex[:8]}"
    evt2_id = f"evt_fuse_2_{uuid.uuid4().hex[:8]}"
    bus1_id = f"BUS-FUSE-A-{nonce}"
    bus2_id = f"BUS-FUSE-B-{nonce}"
    issue1_id = None

    try:
        # Event 1 from BUS 1
        payload1 = {
            "event_id": evt1_id,
            "bus_id": bus1_id,
            "timestamp": now.isoformat(),
            "location": {"lat": base_lat, "lng": base_lng},
            "detection_type": "pothole",
            "confidence": 0.88,
            "severity": "high",
            "evidence_url": "/evidence/test1.jpg"
        }

        res1 = client.post("/api/v1/ingestion/detection", json=payload1)
        assert res1.status_code == 200
        issue1_id = res1.json()["issue_id"]
        assert issue1_id is not None

        # Event 2 from BUS 2 ~7 meters away (0.00005 degrees lat is ~5.5 meters)
        payload2 = {
            "event_id": evt2_id,
            "bus_id": bus2_id,
            "timestamp": (now + datetime.timedelta(minutes=5)).isoformat(),
            "location": {"lat": base_lat + 0.00005, "lng": base_lng + 0.00004},
            "detection_type": "pothole",
            "confidence": 0.93,
            "severity": "high",
            "evidence_url": "/evidence/test2.jpg"
        }

        res2 = client.post("/api/v1/ingestion/detection", json=payload2)
        assert res2.status_code == 200
        issue2_id = res2.json()["issue_id"]

        # Must fuse into the SAME issue
        assert issue1_id == issue2_id

        # Verify via Issue Details API
        res_issue = client.get(f"/api/v1/issues/{issue1_id}")
        assert res_issue.status_code == 200
        issue_data = res_issue.json()

        assert issue_data["observationCount"] == 2
        assert issue_data["uniqueBusCount"] == 2
        assert bus1_id in issue_data["observingBuses"]
        assert bus2_id in issue_data["observingBuses"]
        assert "corroborationText" in issue_data
        assert "Corroborated by 2 distinct buses across 2 passes" in issue_data["corroborationText"]

    finally:
        # Clean teardown in reverse FK dependency order
        async with AsyncSessionLocal() as session:
            if issue1_id:
                await session.execute(delete(Ticket).where(Ticket.issue_id == issue1_id))
                await session.execute(delete(Observation).where(Observation.issue_id == issue1_id))
                await session.execute(delete(UrbanIssue).where(UrbanIssue.id == issue1_id))
            await session.execute(delete(Observation).where(Observation.bus_id.in_([bus1_id, bus2_id])))
            await session.execute(delete(Detection).where(Detection.bus_id.in_([bus1_id, bus2_id])))
            await session.execute(delete(Bus).where(Bus.id.in_([bus1_id, bus2_id])))
            await session.commit()

@pytest.mark.asyncio
async def test_spatial_fusion_outside_15m_creates_separate_issue():
    """
    Verify detections beyond 15m do NOT fuse together.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    nonce = random.randint(1000, 9999)
    base_lat = 28.85000 + (nonce * 0.0001)
    base_lng = 77.20000 + (nonce * 0.0001)
    
    evt1_id = f"evt_sep_1_{uuid.uuid4().hex[:8]}"
    evt2_id = f"evt_sep_2_{uuid.uuid4().hex[:8]}"
    bus_id = f"BUS-FUSE-C-{nonce}"
    issue1_id = None
    issue2_id = None

    try:
        # Event 1
        res1 = client.post("/api/v1/ingestion/detection", json={
            "event_id": evt1_id,
            "bus_id": bus_id,
            "timestamp": now.isoformat(),
            "location": {"lat": base_lat, "lng": base_lng},
            "detection_type": "pothole",
            "confidence": 0.85,
            "severity": "medium",
            "evidence_url": "/evidence/test1.jpg"
        })
        assert res1.status_code == 200
        issue1_id = res1.json()["issue_id"]

        # Event 2 ~1.5 km away
        res2 = client.post("/api/v1/ingestion/detection", json={
            "event_id": evt2_id,
            "bus_id": bus_id,
            "timestamp": (now + datetime.timedelta(minutes=10)).isoformat(),
            "location": {"lat": base_lat + 0.012, "lng": base_lng + 0.012},
            "detection_type": "pothole",
            "confidence": 0.86,
            "severity": "medium",
            "evidence_url": "/evidence/test2.jpg"
        })
        assert res2.status_code == 200
        issue2_id = res2.json()["issue_id"]

        # Must NOT fuse
        assert issue1_id != issue2_id

    finally:
        async with AsyncSessionLocal() as session:
            issues = [i for i in [issue1_id, issue2_id] if i]
            if issues:
                await session.execute(delete(Ticket).where(Ticket.issue_id.in_(issues)))
                await session.execute(delete(Observation).where(Observation.issue_id.in_(issues)))
                await session.execute(delete(UrbanIssue).where(UrbanIssue.id.in_(issues)))
            await session.execute(delete(Observation).where(Observation.bus_id == bus_id))
            await session.execute(delete(Detection).where(Detection.bus_id == bus_id))
            await session.execute(delete(Bus).where(Bus.id == bus_id))
            await session.commit()
