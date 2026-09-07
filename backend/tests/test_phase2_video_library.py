"""
POTHOLE WALA — PHASE 2: VIDEO / MEDIA / DEMO LIBRARY RELIABILITY TESTS
Tests:
- Library asset cataloging with truthful technical metadata
- Subdirectory video asset resolution (e.g. fixtures/clean_road_frame.mp4)
- HTTP byte-range video streaming (206 Partial Content)
- Path traversal rejection
- Clean road baseline calibration run (0 defects expected)
- Non-existent video 404 handling
"""

import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

AUTH_HEADERS = {"Authorization": "Bearer demo-operator-token"}

@pytest.mark.asyncio
async def test_list_library_videos():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/inspection/videos")
        assert res.status_code == 200
        videos = res.json()
        assert isinstance(videos, list)
        assert len(videos) >= 2

        fnames = [v["filename"] for v in videos]
        assert "clean_road_frame.mp4" in fnames
        assert "test_video.mp4" in fnames

        # Check clean road baseline asset metadata
        clean_vid = next(v for v in videos if v["filename"] == "clean_road_frame.mp4")
        assert clean_vid["default_bus_id"] == "BUS-002"
        assert clean_vid["default_route_id"] == "DEL-NCR-02"
        assert clean_vid["duration"] > 0
        assert clean_vid["fps"] > 0
        assert "Baseline" in clean_vid["status_label"]

        # Check distress test asset metadata
        test_vid = next(v for v in videos if v["filename"] == "test_video.mp4")
        assert test_vid["default_bus_id"] == "BUS-001"
        assert test_vid["default_route_id"] == "DEL-NCR-01"
        assert test_vid["duration"] > 0
        assert test_vid["fps"] > 0
        assert "Distress" in test_vid["status_label"]


@pytest.mark.asyncio
async def test_video_static_range_streaming():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request partial byte range
        res = await client.get("/videos/test_video.mp4", headers={"Range": "bytes=0-1024"})
        assert res.status_code == 206
        assert "bytes 0-1024/" in res.headers.get("content-range", "")
        assert "video/mp4" in res.headers.get("content-type", "")

        # Request partial byte range for nested fixture
        res2 = await client.get("/videos/fixtures/clean_road_frame.mp4", headers={"Range": "bytes=0-512"})
        assert res2.status_code == 206
        assert "bytes 0-512/" in res2.headers.get("content-range", "")


@pytest.mark.asyncio
async def test_library_path_traversal_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "video_filename": "../../etc/passwd",
            "bus_id": "BUS-001"
        }
        res = await client.post("/api/v1/inspection/library", json=payload, headers=AUTH_HEADERS)
        assert res.status_code in (400, 404)


@pytest.mark.asyncio
async def test_library_video_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "video_filename": "non_existent_highway_video_99999.mp4",
            "bus_id": "BUS-001"
        }
        res = await client.post("/api/v1/inspection/library", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 404
        assert "not found" in res.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_clean_road_baseline_inspection_lifecycle():
    """
    Executes a real library inspection run on clean_road_frame.mp4.
    Validates:
    - Successful job launch
    - Status polling through completion
    - Truthful baseline calibration: 0 defects emitted
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "video_filename": "clean_road_frame.mp4",
            "bus_id": "BUS-002",
            "sample_fps": 1,
            "conf_threshold": 0.15,
            "stability_frames": 1,
            "generate_annotated": False,
            "route_id": "DEL-NCR-02",
            "route_name": "Ring Road Express",
            "start_lat": 28.6139,
            "start_lng": 77.2090,
            "end_lat": 28.6250,
            "end_lng": 77.2200
        }
        res = await client.post("/api/v1/inspection/library", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        insp_id = data["inspection_id"]
        assert insp_id.startswith("INSP-")

        # Poll status
        final_job = None
        for _ in range(25):
            await asyncio.sleep(0.5)
            status_res = await client.get(f"/api/v1/inspection/{insp_id}")
            assert status_res.status_code == 200
            jdata = status_res.json()
            if jdata["status"] in ("completed", "failed"):
                final_job = jdata
                break

        assert final_job is not None, f"Inspection {insp_id} did not finish in time"
        assert final_job["status"] == "completed", f"Job failed: {final_job.get('error')}"
        assert final_job["statistics"] is not None
        # Clean road baseline should detect 0 potholes
        assert len(final_job.get("events", [])) == 0
