import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import UrbanIssue, RoadSegment
from app.services.jurisdiction_engine import resolve_issue_jurisdiction

client = TestClient(app)

@pytest.mark.asyncio
async def test_road_segment_ownership_priority_over_polygon():
    """
    CRITICAL RULE: If valid road ownership exists, it MUST take precedence over
    generic jurisdiction polygon resolution.
    SEG-DEL-NCR-01 is owned by AUTH-PWD-DELHI, but falls geographically within
    the Central Delhi MCD prototype polygon.
    """
    async with AsyncSessionLocal() as session:
        # Verify SEG-DEL-NCR-01 ownership in DB
        res = await session.execute(select(RoadSegment).where(RoadSegment.id == "SEG-DEL-NCR-01"))
        seg = res.scalar_one_or_none()
        assert seg is not None
        assert seg.authority_id == "AUTH-PWD-DELHI"

        # Point on Connaught Place (geographically inside MCD polygon)
        point_wkt = "POINT(77.2167 28.6289)"

        # Case A: With road_segment_id = SEG-DEL-NCR-01
        resolution = await resolve_issue_jurisdiction(
            session,
            point_wkt=point_wkt,
            road_segment_id="SEG-DEL-NCR-01",
            issue_type="pothole"
        )

        assert resolution.authority_id == "AUTH-PWD-DELHI"
        assert resolution.authority_code == "PWD"
        assert resolution.source == "road_segment_ownership"
        assert resolution.status == "resolved"

@pytest.mark.asyncio
async def test_polygon_fallback_when_no_road_segment():
    """
    When no road segment ownership exists, point within Delhi Central polygon
    resolves to AUTH-MCD-CENTRAL with source 'configured_prototype_boundary'.
    """
    async with AsyncSessionLocal() as session:
        # Point in Connaught Place (Delhi Central polygon)
        point_wkt = "POINT(77.2167 28.6289)"

        resolution = await resolve_issue_jurisdiction(
            session,
            point_wkt=point_wkt,
            road_segment_id=None,
            issue_type="pothole"
        )

        assert resolution.authority_id == "AUTH-MCD-CENTRAL"
        assert resolution.authority_code == "MCD"
        assert resolution.jurisdiction_id == "JUR-DEL-CENTRAL"
        assert resolution.source == "configured_prototype_boundary"
        assert resolution.status == "resolved"

@pytest.mark.asyncio
async def test_noida_polygon_resolution():
    """
    Point within Sector 18 Noida polygon resolves to AUTH-NOIDA with
    source 'configured_prototype_boundary'.
    """
    async with AsyncSessionLocal() as session:
        # Point in Noida Sector 18 (inside Noida polygon)
        point_wkt = "POINT(77.3250 28.5700)"

        resolution = await resolve_issue_jurisdiction(
            session,
            point_wkt=point_wkt,
            road_segment_id=None,
            issue_type="pothole"
        )

        assert resolution.authority_id == "AUTH-NOIDA"
        assert resolution.authority_code == "NOIDA"
        assert resolution.jurisdiction_id == "JUR-NOIDA-URBAN"
        assert resolution.source == "configured_prototype_boundary"
        assert resolution.status == "resolved"

@pytest.mark.asyncio
async def test_unresolved_fallback_for_outside_points():
    """
    When a point is outside all configured jurisdiction polygons and has no
    road segment ownership, jurisdiction status must be 'unresolved' and source 'unresolved'.
    """
    async with AsyncSessionLocal() as session:
        # Point in Bangalore (outside Delhi/Noida prototype boundaries)
        point_wkt = "POINT(77.5946 12.9716)"

        resolution = await resolve_issue_jurisdiction(
            session,
            point_wkt=point_wkt,
            road_segment_id=None,
            issue_type="pothole"
        )

        assert resolution.authority_id is None
        assert resolution.department_id is None
        assert resolution.jurisdiction_id is None
        assert resolution.source == "unresolved"
        assert resolution.status == "unresolved"

def test_issue_jurisdiction_endpoint():
    """Verify GET /api/v1/issues/{id}/jurisdiction returns complete provenance."""
    # First get an issue
    res = client.get("/api/v1/issues")
    assert res.status_code == 200
    data = res.json()
    issues = data if isinstance(data, list) else data.get("items", [])
    assert len(issues) > 0
    test_issue_id = issues[0]["id"]

    res_jur = client.get(f"/api/v1/issues/{test_issue_id}/jurisdiction")
    assert res_jur.status_code == 200
    jur_data = res_jur.json()
    assert "issue_id" in jur_data or "issueId" in jur_data
    assert "jurisdiction_status" in jur_data or "jurisdictionStatus" in jur_data
    assert "jurisdiction_source" in jur_data or "source" in jur_data
    src = jur_data.get("jurisdiction_source") or jur_data.get("source")
    assert src in [
        "road_segment_ownership",
        "configured_prototype_boundary",
        "jurisdiction_boundary",
        "unresolved"
    ]
