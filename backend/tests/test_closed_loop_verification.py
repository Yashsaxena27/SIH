import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_verifications_list_enriched():
    """Verify GET /verifications returns enriched audit records with real field evidence and no fabricated confidence."""
    res = client.get("/api/v1/verifications")
    assert res.status_code == 200
    verifications = res.json()
    assert isinstance(verifications, list)
    assert len(verifications) > 0, "Database should contain seeded or recorded verifications."

    for v in verifications:
        assert "id" in v
        assert "issueId" in v
        assert "result" in v
        # Confidence must be either a valid float between 0 and 1 or None (never fabricated string or dummy default)
        if v["confidence"] is not None:
            assert isinstance(v["confidence"], (float, int))
            assert 0.0 <= v["confidence"] <= 1.0

        # Enriched fields
        assert "authorityName" in v
        assert "departmentName" in v
        assert "beforeEvidenceUrl" in v
        assert "afterEvidenceUrl" in v

def test_verification_detail_and_not_found():
    """Verify GET /verifications/{id} returns single verification or HTTP 404."""
    # List first
    res = client.get("/api/v1/verifications")
    assert res.status_code == 200
    v_list = res.json()
    target_id = v_list[0]["id"]

    # Detail
    res_single = client.get(f"/api/v1/verifications/{target_id}")
    assert res_single.status_code == 200
    data = res_single.json()
    assert data["id"] == target_id

    # 404 check
    res_404 = client.get("/api/v1/verifications/ver_nonexistent_999999")
    assert res_404.status_code == 404

def test_authorities_api():
    """Verify GET /authorities returns all registered municipal authorities with prototype provenance."""
    res = client.get("/api/v1/authorities")
    assert res.status_code == 200
    authorities = res.json()
    assert isinstance(authorities, list)
    assert len(authorities) >= 3

    codes = {a["code"] for a in authorities}
    assert "PWD" in codes
    assert "MCD" in codes
    assert "NOIDA" in codes

    for a in authorities:
        assert "boundaryType" in a
        assert "boundaryProvenance" in a
        assert "isConfiguredPrototype" in a
        assert "departments" in a
        assert isinstance(a["departments"], list)
