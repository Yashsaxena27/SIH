import pytest
import io
from fastapi.testclient import TestClient
from app.main import app

def test_inspection_api_endpoints():
    client = TestClient(app)

    # 1. List inspections (empty initially)
    res_list = client.get("/api/v1/inspection")
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)

    # 2. Reject invalid video extension
    fake_file = io.BytesIO(b"fake txt content")
    res_bad = client.post(
        "/api/v1/inspection/video",
        files={"video": ("test.txt", fake_file, "text/plain")},
        data={"bus_id": "BUS-001"}
    )
    assert res_bad.status_code == 400
    assert "Invalid video format" in res_bad.json()["detail"]

    # 3. Accept valid video upload
    # Create small valid mp4 header bytes
    fake_mp4 = io.BytesIO(b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free")
    res_upload = client.post(
        "/api/v1/inspection/video",
        files={"video": ("sample_test.mp4", fake_mp4, "video/mp4")},
        data={"bus_id": "BUS-001"}
    )
    assert res_upload.status_code == 200
    data = res_upload.json()
    assert "inspection_id" in data
    assert data["status"] == "pending"
    insp_id = data["inspection_id"]

    # 4. Check inspection status
    res_status = client.get(f"/api/v1/inspection/{insp_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["inspection_id"] == insp_id
    assert "stage" in status_data
    assert "progress" in status_data
