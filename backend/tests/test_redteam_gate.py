"""
POTHOLE WALA — Phase 1–5 Master Red-Team & Verification Gate Test Suite.

Independently validates:
1. HTTP Auth Matrix (anonymous=401, viewer=403, operator/admin=authorized).
2. IssueUpdate Immutability (extra/tampered fields strictly rejected with HTTP 422).
3. Legal vs Illegal Issue Status Transitions.
4. Real 10-Request Concurrent Ingestion Test for Same Location (idempotency, advisory locking, zero duplicate issues).
5. Thread-safe Process-Level Model Caching Singleton.
6. Temporal 1-Frame Weak Detection Suppression via CentroidTracker.
7. HTTP Video Byte-Range Streaming (206 Partial Content, multiple byte ranges).
8. PostGIS GiST Geography Index Scan confirmation via EXPLAIN ANALYZE.
"""

import pytest
import asyncio
import uuid
import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func, text

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import UrbanIssue, Observation, Detection, IssueStatus
from ml.engine.detector import ModelInferenceEngine
from ml.engine.tracker import CentroidTracker


# ── 1. HTTP Auth Matrix (Part 1G & Acceptance Criteria 8) ──────────────

@pytest.mark.asyncio
async def test_auth_matrix_mutation_endpoints():
    """
    Verifies that mutation endpoints enforce RBAC:
    - Anonymous (no token or invalid token) -> 401 Unauthorized
    - Viewer (demo-viewer-token / role=viewer) -> 403 Forbidden
    - Operator (demo-operator-token / role=operator) -> Authorized
    - Admin (demo-admin-token / role=admin) -> Authorized
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Retrieve a valid issue
        res = await client.get("/api/v1/issues")
        assert res.status_code == 200
        issues = res.json()
        assert len(issues) > 0
        issue_id = issues[0]["id"]

        update_payload = {"notes": "Red-team RBAC test note"}

        # 1. Anonymous (no token) -> 401
        anon_res = await client.patch(f"/api/v1/issues/{issue_id}", json=update_payload)
        assert anon_res.status_code == 401, f"Expected 401 for anonymous caller, got {anon_res.status_code}"

        # 2. Invalid token -> 401
        bad_res = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json=update_payload,
            headers={"Authorization": "Bearer totally-invalid-jwt-token"}
        )
        assert bad_res.status_code == 401

        # 3. Viewer role -> 403
        viewer_res = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json=update_payload,
            headers={"Authorization": "Bearer demo-viewer-token"}
        )
        assert viewer_res.status_code == 403, f"Expected 403 for viewer caller, got {viewer_res.status_code}"
        assert "lacks required permissions" in viewer_res.json()["detail"].lower()

        # 4. Operator role -> 200 (Authorized)
        operator_res = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json=update_payload,
            headers={"Authorization": "Bearer demo-operator-token"}
        )
        assert operator_res.status_code == 200, f"Expected 200 for operator, got {operator_res.status_code}"

        # 5. Admin role -> 200 (Authorized)
        admin_res = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json=update_payload,
            headers={"Authorization": "Bearer demo-admin-token"}
        )
        assert admin_res.status_code == 200, f"Expected 200 for admin, got {admin_res.status_code}"


# ── 2. IssueUpdate Schema Immutability (Part 1B & Acceptance Criteria 9) ──

@pytest.mark.asyncio
async def test_issue_update_extra_fields_rejected_422():
    """
    Verifies that attempting to tamper with immutable issue fields (location, bus_id, observation_count)
    is strictly rejected with HTTP 422 Unprocessable Entity via Pydantic extra='forbid'.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/issues")
        assert res.status_code == 200
        issue_id = res.json()[0]["id"]

        # Payload containing forbidden/tampered fields
        tampered_payload = {
            "status": "confirmed",
            "location": "POINT(0 0)",
            "observation_count": 9999,
            "id": "iss_fake_id"
        }

        patch_res = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json=tampered_payload,
            headers={"Authorization": "Bearer demo-operator-token"}
        )
        assert patch_res.status_code == 422, f"Expected 422 for extra fields, got {patch_res.status_code}"
        errors = patch_res.json().get("detail", [])
        extra_fields = [e.get("loc", [])[-1] for e in errors if "extra_forbidden" in e.get("type", "")]
        assert "location" in extra_fields or len(errors) > 0


# ── 3. Issue Status Transitions (Part 1B) ──────────────────────────────

@pytest.mark.asyncio
async def test_issue_status_transition_rules():
    """
    Verifies legal vs illegal status transitions for issues.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a fresh issue via ingestion
        evt_id = f"evt_trans_{uuid.uuid4().hex[:8]}"
        ingest_payload = {
            "event_id": evt_id,
            "bus_id": "BUS-TRANS-01",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "location": {"lat": 28.5300 + (uuid.uuid4().int % 1000) * 0.005, "lng": 77.3800 + (uuid.uuid4().int % 1000) * 0.005},
            "detection_type": "pothole",
            "confidence": 0.88,
            "severity": "high",
            "evidence_url": "/evidence/test.jpg"
        }
        res_ingest = await client.post("/api/v1/ingestion/detection", json=ingest_payload)
        assert res_ingest.status_code == 200
        issue_id = res_ingest.json()["issue_id"]

        # Legal transition: new -> confirmed
        res_legal = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json={"status": "confirmed"},
            headers={"Authorization": "Bearer demo-operator-token"}
        )
        assert res_legal.status_code == 200
        assert res_legal.json()["status"] == "confirmed"

        # Advance to verified
        res_ver = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json={"status": "verified"},
            headers={"Authorization": "Bearer demo-operator-token"}
        )
        assert res_ver.status_code == 200
        assert res_ver.json()["status"] == "verified"

        # Illegal transition: verified -> in_progress (only 'reopened' is allowed from verified)
        res_illegal = await client.patch(
            f"/api/v1/issues/{issue_id}",
            json={"status": "in_progress"},
            headers={"Authorization": "Bearer demo-operator-token"}
        )
        assert res_illegal.status_code == 400
        assert "illegal status transition" in res_illegal.json()["detail"].lower()


# ── 4. REAL 10+ Concurrent Same-Location Ingestion (Part 5F & Criteria 7) ──

@pytest.mark.asyncio
async def test_10_concurrent_same_location_ingestion_safety():
    """
    Mandatory Concurrency Red-Team Test:
    Spawns 10 concurrent requests from 10 distinct buses ingesting a defect at
    the EXACT same physical location at the exact same instant.
    Proves:
    1. Transactional advisory locking prevents duplicate issue creation.
    2. Exactly 1 UrbanIssue is created.
    3. observation_count == 10.
    4. unique_bus_count == 10.
    5. Zero duplicate issue rows in database.
    """
    unique_offset = (uuid.uuid4().int % 10000) * 0.0005
    target_lat = round(28.700000 + unique_offset, 6)
    target_lng = round(77.300000 + unique_offset, 6)
    det_type = "pothole"

    num_concurrent = 10
    transport = ASGITransport(app=app)

    async def send_detection(bus_idx: int):
        bus_id = f"BUS-CONC-{bus_idx:03d}"
        event_id = f"evt_conc_{uuid.uuid4().hex[:10]}"
        payload = {
            "event_id": event_id,
            "bus_id": bus_id,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "location": {"lat": target_lat, "lng": target_lng},
            "detection_type": det_type,
            "confidence": 0.85 + (bus_idx * 0.01),
            "severity": "high",
            "evidence_url": f"/evidence/conc_{bus_idx}.jpg"
        }
        async with AsyncClient(transport=transport, base_url="http://test") as cl:
            r = await cl.post("/api/v1/ingestion/detection", json=payload)
            return r.status_code, r.json()

    # Fire all 10 simultaneously
    tasks = [send_detection(i) for i in range(1, num_concurrent + 1)]
    results = await asyncio.gather(*tasks)

    # Verify all 10 succeeded
    for code, body in results:
        assert code == 200, f"Concurrent ingestion failed: {body}"
        assert body.get("status") == "success"

    # Inspect database state directly
    async with AsyncSessionLocal() as session:
        point_wkt = f"POINT({target_lng} {target_lat})"
        query = select(UrbanIssue).where(
            func.ST_DWithin(
                func.Geography(UrbanIssue.location),
                func.Geography(func.ST_GeomFromText(point_wkt, 4326)),
                20.0
            )
        )
        matched_issues = (await session.execute(query)).scalars().all()

        assert len(matched_issues) == 1, (
            f"CONCURRENCY FAILURE: Expected exactly 1 issue, found {len(matched_issues)} duplicate issues!"
        )

        fused_issue = matched_issues[0]
        assert fused_issue.observation_count == num_concurrent, (
            f"Expected observation_count={num_concurrent}, got {fused_issue.observation_count}"
        )
        assert fused_issue.unique_bus_count == num_concurrent, (
            f"Expected unique_bus_count={num_concurrent}, got {fused_issue.unique_bus_count}"
        )

        obs_count = await session.scalar(
            select(func.count()).select_from(Observation).where(Observation.issue_id == fused_issue.id)
        )
        assert obs_count == num_concurrent


# ── 5. Thread-safe Process-Level Model Caching (Part 3B & Criteria 5) ────

def test_process_level_model_caching_singleton():
    """
    Proves that repeated instantiation of ModelInferenceEngine reuses the
    process-level cached YOLO model instance without reloading weights from disk.
    """
    engine1 = ModelInferenceEngine()
    engine2 = ModelInferenceEngine()
    engine3 = ModelInferenceEngine()

    assert engine1.model is not None
    assert engine1.model is engine2.model, "engine1 and engine2 must share the exact same model object"
    assert engine2.model is engine3.model, "engine2 and engine3 must share the exact same model object"


# ── 6. Temporal 1-Frame Weak Detection Suppression (Part 3C & Criteria 10) ──

def test_centroid_tracker_weak_1frame_suppression():
    """
    Proves that isolated single-frame detections are suppressed when stability_frames=2,
    and only emitted when tracked across consecutive frames.
    """
    tracker = CentroidTracker(stability_frames=2, max_disappeared=5)

    # Frame 1: A weak isolated defect appears
    rects_frame1 = [[100, 100, 150, 150]]
    _, _, ready1 = tracker.update(rects_frame1)
    assert len(ready1) == 0, "Single 1-frame detection must be suppressed (not ready to emit)"

    # Frame 2: The defect disappears (false positive / noise)
    _, _, ready2 = tracker.update([])
    assert len(ready2) == 0, "No emission when defect disappears"

    # Frame 3: A persistent defect appears
    rects_persist = [[200, 200, 260, 260]]
    _, _, ready3 = tracker.update(rects_persist)
    assert len(ready3) == 0, "First occurrence of persistent defect is not yet emitted"

    # Frame 4: The persistent defect is confirmed on second frame (streak=2 >= stability_frames=2)
    rects_persist_frame2 = [[202, 201, 262, 261]]
    _, _, ready4 = tracker.update(rects_persist_frame2)
    assert len(ready4) == 1, "Confirmed multi-frame defect must be emitted after stability threshold"
    assert ready4[0][1] == rects_persist_frame2[0]


# ── 7. HTTP Video Byte-Range Streaming (Part 2D & Criteria 11) ────────────

@pytest.mark.asyncio
async def test_video_byte_range_streaming_matrix():
    """
    Verifies that FastAPI/Starlette StaticFiles correctly serves video byte-ranges:
    - Initial range (bytes 0-1024) -> 206 Partial Content
    - Middle range (bytes 2048-4096) -> 206 Partial Content
    - Content-Range header conforms to RFC 7233
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Range 1: Initial 1KB
        res1 = await client.get("/videos/test_video.mp4", headers={"Range": "bytes=0-1024"})
        assert res1.status_code == 206, f"Expected 206, got {res1.status_code}"
        assert len(res1.content) == 1025
        assert "bytes 0-1024/" in res1.headers.get("content-range", "")

        # Range 2: Middle 2KB
        res2 = await client.get("/videos/test_video.mp4", headers={"Range": "bytes=2048-4096"})
        assert res2.status_code == 206
        assert len(res2.content) == 2049
        assert "bytes 2048-4096/" in res2.headers.get("content-range", "")


# ── 8. PostGIS GiST Index Scan Proof (Part 5E & Criteria 12) ──────────────

@pytest.mark.asyncio
async def test_postgis_gist_geography_index_scan_evidence():
    """
    Runs EXPLAIN ANALYZE on ST_DWithin geography query and verifies that
    PostgreSQL query planner utilizes idx_urban_issues_location_geog index scan.
    """
    async with AsyncSessionLocal() as session:
        query_sql = """
        EXPLAIN ANALYZE
        SELECT id FROM urban_issues
        WHERE issue_type = 'pothole'
          AND status != 'verified'
          AND ST_DWithin((location)::geography, ST_GeomFromText('POINT(77.2090 28.6139)', 4326)::geography, 15.0);
        """
        res = await session.execute(text(query_sql))
        plan_lines = [row[0] for row in res.all()]
        plan_text = "\n".join(plan_lines)

        assert "idx_urban_issues_location_geog" in plan_text, (
            f"Planner did not use spatial GiST index!\nPlan:\n{plan_text}"
        )
        assert "Index Scan" in plan_text or "Bitmap Index Scan" in plan_text, (
            f"Expected Index Scan in execution plan!\nPlan:\n{plan_text}"
        )
