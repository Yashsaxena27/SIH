import os
import asyncio
import pytest
import httpx

from app.main import app
from app.core.database import engine

@pytest.mark.asyncio
async def test_real_video_web_e2e_pipeline():
    video_path = "ml/videos/test_video.mp4"
    assert os.path.exists(video_path), f"Real video missing at {video_path}"

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Upload video via HTTP multipart
        with open(video_path, "rb") as f:
            response = await client.post(
                "/api/v1/inspection/video",
                files={"video": ("test_video.mp4", f, "video/mp4")},
                data={
                    "bus_id": "BUS-001",
                    "sample_fps": "1",
                    "conf_threshold": "0.10",
                    "stability_frames": "1",
                    "generate_annotated": "false" # keep test fast
                }
            )

        assert response.status_code == 200
        upload_res = response.json()
        assert "inspection_id" in upload_res
        insp_id = upload_res["inspection_id"]

        # 2. Wait for the background task to complete (polling status)
        max_wait = 30
        elapsed = 0
        final_status = None

        while elapsed < max_wait:
            status_res = await client.get(f"/api/v1/inspection/{insp_id}")
            assert status_res.status_code == 200
            job_data = status_res.json()
            if job_data["status"] in ("completed", "failed"):
                final_status = job_data
                break
            await asyncio.sleep(0.5)
            elapsed += 0.5

        assert final_status is not None, f"Inspection {insp_id} did not complete within {max_wait}s"
        assert final_status["status"] == "completed", f"Inspection failed with error: {final_status.get('error')}"

        # 3. Verify statistics
        stats = final_status["statistics"]
        assert stats["total_frames"] == 331
        assert stats["sampled_frames"] >= 10
        assert stats["emitted_events"] >= 1

        # 4. Verify events
        events = final_status["events"]
        assert len(events) >= 1
        for ev in events:
            assert ev["detection_type"] == "pothole"
            assert ev["confidence"] >= 0.10
            assert ev["bus_id"] == "BUS-001"
            assert "lat" in ev["location"]
            assert "lng" in ev["location"]
            # Bengaluru bounds
            assert 12.0 <= ev["location"]["lat"] <= 13.5
            assert 77.0 <= ev["location"]["lng"] <= 78.0
            assert ev["evidence_url"].startswith("/evidence/")
            assert ev["issue_id"] is not None

        # 5. Verify the issue exists via API
        first_issue_id = events[0]["issue_id"]
        issue_get_res = await client.get(f"/api/v1/issues/{first_issue_id}")
        assert issue_get_res.status_code == 200
        issue_data = issue_get_res.json()
        assert issue_data["type"] == "pothole"
        assert issue_data["observationCount"] >= 1

        # 6. Verify GET /api/v1/issues returns the issue
        issues_res = await client.get("/api/v1/issues")
        assert issues_res.status_code == 200
        all_issues = issues_res.json()
        assert any(i["id"] == first_issue_id for i in all_issues)

        # 7. Verify GET /api/v1/analytics/roads/summary
        analytics_res = await client.get("/api/v1/analytics/roads/summary")
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()
        assert analytics_data["totalDefects"] >= 1
        assert "segmentDistribution" in analytics_data

        print(f"\n[PASS] E2E Real Video Inspection Test Succeeded with {len(events)} detected potholes!")
