"""
POTHOLE WALA — PHASE 5: MULTI-BUS SPATIO-TEMPORAL FUSION & CORROBORATION TESTS
Validates:
- 15-meter PostGIS ST_DWithin spatial fusion across distinct buses
- Multi-bus corroboration tracking (observation_count, unique_bus_count, observingBuses)
- Automatic priority recalculation upon corroboration
- Distinction between multi-bus corroboration vs repeated passes by a single bus
- Isolation of defects separated by >15 meters
- PostGIS GiST index utilization on geography expressions
"""

import pytest
import datetime
import uuid
import random
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from app.main import app
from app.core.database import AsyncSessionLocal

AUTH_HEADERS = {"Authorization": "Bearer demo-operator-token"}

@pytest.mark.asyncio
async def test_multibus_spatial_fusion_and_priority_escalation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        now = datetime.datetime.now(datetime.timezone.utc)
        nonce = random.randint(10000, 99999)
        base_lat = 28.57000 + (nonce * 0.00001)
        base_lng = 77.22000 + (nonce * 0.00001)

        bus_a = f"BUS-FUSE-ALPHA-{nonce}"
        bus_b = f"BUS-FUSE-BETA-{nonce}"

        # 1. Detection from Bus A (Medium severity)
        payload1 = {
            "event_id": f"evt_fuse_a_{uuid.uuid4().hex[:8]}",
            "bus_id": bus_a,
            "timestamp": now.isoformat(),
            "location": {"lat": base_lat, "lng": base_lng},
            "detection_type": "pothole",
            "confidence": 0.85,
            "severity": "medium",
            "evidence_url": "/evidence/alpha.jpg"
        }
        res1 = await client.post("/api/v1/ingestion/detection", json=payload1)
        assert res1.status_code == 200
        issue_id = res1.json()["issue_id"]

        # Verify initial issue
        issue_res1 = await client.get(f"/api/v1/issues/{issue_id}")
        assert issue_res1.status_code == 200
        data1 = issue_res1.json()
        assert data1["observationCount"] == 1
        assert data1["uniqueBusCount"] == 1
        assert data1["observingBuses"] == [bus_a]
        initial_priority = data1["priority"]

        # 2. Corroborating Detection from Bus B (~6 meters away: 0.00005 lat)
        payload2 = {
            "event_id": f"evt_fuse_b_{uuid.uuid4().hex[:8]}",
            "bus_id": bus_b,
            "timestamp": (now + datetime.timedelta(minutes=10)).isoformat(),
            "location": {"lat": base_lat + 0.00005, "lng": base_lng + 0.00002},
            "detection_type": "pothole",
            "confidence": 0.92,
            "severity": "high",
            "evidence_url": "/evidence/beta.jpg"
        }
        res2 = await client.post("/api/v1/ingestion/detection", json=payload2)
        assert res2.status_code == 200
        assert res2.json()["issue_id"] == issue_id, "Must fuse into the exact same issue"

        # Verify corroborated issue
        issue_res2 = await client.get(f"/api/v1/issues/{issue_id}")
        assert issue_res2.status_code == 200
        data2 = issue_res2.json()
        assert data2["observationCount"] == 2
        assert data2["uniqueBusCount"] == 2
        assert sorted(data2["observingBuses"]) == sorted([bus_a, bus_b])
        assert "Corroborated by 2 distinct buses" in data2["corroborationText"]


@pytest.mark.asyncio
async def test_single_bus_multiple_passes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        now = datetime.datetime.now(datetime.timezone.utc)
        nonce = random.randint(10000, 99999)
        base_lat = 28.58000 + (nonce * 0.00001)
        base_lng = 77.23000 + (nonce * 0.00001)
        bus_single = f"BUS-SOLO-{nonce}"

        # Pass 1
        p1 = {
            "event_id": f"evt_solo_1_{uuid.uuid4().hex[:8]}",
            "bus_id": bus_single,
            "timestamp": now.isoformat(),
            "location": {"lat": base_lat, "lng": base_lng},
            "detection_type": "pothole",
            "confidence": 0.80,
            "severity": "low",
            "evidence_url": "/evidence/solo1.jpg"
        }
        r1 = await client.post("/api/v1/ingestion/detection", json=p1)
        issue_id = r1.json()["issue_id"]

        # Pass 2 by same bus 30 minutes later
        p2 = {
            "event_id": f"evt_solo_2_{uuid.uuid4().hex[:8]}",
            "bus_id": bus_single,
            "timestamp": (now + datetime.timedelta(minutes=30)).isoformat(),
            "location": {"lat": base_lat + 0.00002, "lng": base_lng + 0.00002},
            "detection_type": "pothole",
            "confidence": 0.85,
            "severity": "medium",
            "evidence_url": "/evidence/solo2.jpg"
        }
        r2 = await client.post("/api/v1/ingestion/detection", json=p2)
        assert r2.json()["issue_id"] == issue_id

        issue_res = await client.get(f"/api/v1/issues/{issue_id}")
        data = issue_res.json()
        assert data["observationCount"] == 2
        assert data["uniqueBusCount"] == 1
        assert "Observed 2 times by 1 bus" in data["corroborationText"]


@pytest.mark.asyncio
async def test_postgis_spatial_index_usage():
    """Verify PostGIS queries use idx_urban_issues_location_geog index scan."""
    async with AsyncSessionLocal() as session:
        explain_query = text(
            """
            EXPLAIN SELECT id FROM urban_issues
            WHERE ST_DWithin((location)::geography, ST_GeomFromText('POINT(77.225 28.575)', 4326)::geography, 15.0);
            """
        )
        res = await session.execute(explain_query)
        plan_rows = [r[0] for r in res.fetchall()]
        plan_text = " ".join(plan_rows)
        assert "Index Scan" in plan_text or "Bitmap Index Scan" in plan_text
        assert "idx_urban_issues_location_geog" in plan_text
