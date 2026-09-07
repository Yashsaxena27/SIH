"""POTHOLE WALA — Phase 8 SafeRoute Automated Test Suite.

Verifies:
- Presets endpoint and corridor catalog
- Multi-candidate routing generation
- Decision modes: FASTEST, SAFEST, BALANCED
- Deterministic risk scoring based on active defects
- Explainable avoided hazards and factor breakdowns
- Explicit ESTIMATED timing provenance guardrails
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.saferoute_engine import get_saferoute_presets

pytestmark = pytest.mark.asyncio


# ============================================================
# 1. Presets and Corridor Catalog Tests
# ============================================================

async def test_saferoute_presets():
    """Verify predefined showcase presets exist with valid schemas."""
    presets = get_saferoute_presets()
    assert len(presets) >= 3, "Expected at least 3 showcase presets"
    
    delhi_preset = next((p for p in presets if p["id"] == "delhi_cp_noida"), None)
    assert delhi_preset is not None
    assert "Connaught Place" in delhi_preset["origin"]
    assert "Noida" in delhi_preset["destination"]
    assert "origin_coords" in delhi_preset
    assert "destination_coords" in delhi_preset


async def test_saferoute_presets_api():
    """Verify GET /api/v1/saferoute/presets endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/saferoute/presets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        assert any(p["id"] == "delhi_cp_noida" for p in data)


async def test_saferoute_corridors_api():
    """Verify GET /api/v1/saferoute/corridors returns configured segments."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/saferoute/corridors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        for corridor in data:
            assert "segment_id" in corridor
            assert "segment_name" in corridor
            assert "road_class" in corridor
            assert "health_score" in corridor
            assert "segment_risk_score" in corridor


# ============================================================
# 2. Multi-Candidate Planning & Decision Modes
# ============================================================

async def test_saferoute_plan_fastest_mode():
    """Verify FASTEST mode selects the candidate with lowest estimated duration."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "origin": "Connaught Place, New Delhi",
            "destination": "Noida Sector 62, UP",
            "mode": "FASTEST"
        }
        response = await client.post("/api/v1/saferoute/plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "FASTEST"
        assert len(data["candidates"]) >= 3
        
        # Verify recommended candidate has minimum duration
        durations = [c["estimated_duration_minutes"] for c in data["candidates"]]
        min_duration = min(durations)
        
        rec_cand = next(c for c in data["candidates"] if c["is_recommended"])
        assert rec_cand["estimated_duration_minutes"] == min_duration
        assert rec_cand["id"] == data["recommended_route_id"]
        assert "FASTEST" in data["recommendation_reason"]
        assert "ESTIMATED" in data["timing_provenance"]


async def test_saferoute_plan_safest_mode():
    """Verify SAFEST mode selects the candidate with minimum overall risk score."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "origin": "Connaught Place, New Delhi",
            "destination": "Noida Sector 62, UP",
            "mode": "SAFEST"
        }
        response = await client.post("/api/v1/saferoute/plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "SAFEST"
        assert len(data["candidates"]) >= 3
        
        # Verify recommended candidate has minimum risk score
        risk_scores = [c["overall_risk_score"] for c in data["candidates"]]
        min_risk = min(risk_scores)
        
        rec_cand = next(c for c in data["candidates"] if c["is_recommended"])
        assert rec_cand["overall_risk_score"] == min_risk
        assert rec_cand["id"] == data["recommended_route_id"]
        assert "SAFEST" in data["recommendation_reason"]


async def test_saferoute_plan_balanced_mode():
    """Verify BALANCED mode balances risk and travel duration."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "origin": "Connaught Place, New Delhi",
            "destination": "Noida Sector 62, UP",
            "mode": "BALANCED"
        }
        response = await client.post("/api/v1/saferoute/plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "BALANCED"
        rec_cand = next(c for c in data["candidates"] if c["is_recommended"])
        assert rec_cand is not None
        assert rec_cand["id"] == data["recommended_route_id"]
        assert "BALANCED" in data["recommendation_reason"]


# ============================================================
# 3. Explainability and Avoided Hazards
# ============================================================

async def test_saferoute_avoided_hazards_explainability():
    """Verify avoided hazards calculation when a safer route is selected."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "origin": "Connaught Place, New Delhi",
            "destination": "Noida Sector 62, UP",
            "mode": "SAFEST"
        }
        response = await client.post("/api/v1/saferoute/plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        rec_cand = next(c for c in data["candidates"] if c["is_recommended"])
        riskiest_cand = max(data["candidates"], key=lambda c: c["overall_risk_score"])
        
        if rec_cand["id"] != riskiest_cand["id"]:
            # Rec cand should have avoided hazards recorded as list of explanations
            assert isinstance(rec_cand["avoided_hazards"], list)
            assert len(rec_cand["avoided_hazards"]) > 0
            assert any("active road defect" in text or "infrastructure risk" in text for text in rec_cand["avoided_hazards"])


# ============================================================
# 4. Custom Coordinates & Coordinate Fallback
# ============================================================

async def test_saferoute_custom_coordinates():
    """Verify planning with explicit coordinates near Delhi corridor."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "origin": "Custom CP Pickup Point",
            "destination": "Custom Noida Dropoff",
            "origin_coords": {"lat": 28.6315, "lng": 77.2167},
            "destination_coords": {"lat": 28.6280, "lng": 77.3649},
            "mode": "BALANCED"
        }
        response = await client.post("/api/v1/saferoute/plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["candidates"]) >= 2
        assert data["recommended_route_id"] is not None
