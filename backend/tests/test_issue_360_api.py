import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_issue_360_resolved_corridor():
    """Verify complete Issue 360 payload on a resolved defect."""
    issues_res = client.get("/api/v1/issues")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    resolved_issue = next((i for i in issues if i.get("jurisdictionStatus") == "resolved" or i.get("authority_id") is not None), None)
    assert resolved_issue is not None, "At least one resolved issue must exist in DB."
    target_id = resolved_issue["id"]

    res = client.get(f"/api/v1/issues/{target_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == target_id
    assert data["jurisdiction_status"] == "resolved"
    assert data["authority_id"] is not None

    assert "roadSegment" in data
    if data["roadSegment"] is not None:
        assert data["roadSegment"]["healthScoreProvenance"] == "decision_support_derived"
        assert "healthScore" in data["roadSegment"]

    assert "ticket" in data
    assert "verifications" in data
    assert isinstance(data["verifications"], list)

    assert "timeline" in data
    assert isinstance(data["timeline"], list)
    assert len(data["timeline"]) > 0
    first_evt = data["timeline"][0]
    assert "title" in first_evt
    assert "stage" in first_evt
    assert "timestamp" in first_evt

def test_issue_360_unresolved_defect():
    """Verify complete Issue 360 payload on an unresolved defect."""
    issues_res = client.get("/api/v1/issues")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    unresolved_issue = next((i for i in issues if i.get("jurisdictionSource") == "unresolved"), None)
    assert unresolved_issue is not None, "At least one unresolved issue must exist in DB."
    target_id = unresolved_issue["id"]

    res = client.get(f"/api/v1/issues/{target_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == target_id
    assert data["jurisdiction_source"] == "unresolved"
    assert data["authority_id"] is None
    assert data["ticket"] is None
    assert "timeline" in data
    assert isinstance(data["timeline"], list)

def test_issue_360_not_found():
    """Verify non-existent issue ID cleanly returns HTTP 404."""
    res = client.get("/api/v1/issues/iss_nonexistent_xyz123")
    assert res.status_code == 404
