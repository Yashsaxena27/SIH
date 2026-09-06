import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from geoalchemy2.elements import WKBElement
import shapely.geometry

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.domain import Bus

client = TestClient(app)

def test_fleet_buses_null_telemetry_truthful():
    """Verify buses with no active GPS stream report current_location=None and telemetry_status='unavailable'."""
    res = client.get("/api/v1/fleet/buses")
    assert res.status_code == 200
    buses = res.json()
    assert len(buses) > 0

    # Every seeded bus currently has NULL current_location
    for bus in buses:
        assert bus["current_location"] is None
        assert bus["telemetry_status"] == "unavailable"
        assert "route_name" in bus
        assert "route_code" in bus

@pytest.mark.asyncio
async def test_fleet_bus_with_real_coordinates():
    """Verify that when a bus acquires genuine GPS coordinates, they serialize accurately."""
    async with AsyncSessionLocal() as session:
        # Fetch one bus and temporarily set coordinates
        stmt = select(Bus).limit(1)
        res = await session.execute(stmt)
        bus = res.scalar_one_or_none()
        assert bus is not None
        
        orig_location = bus.current_location
        try:
            # Set genuine coordinate POINT(lng lat)
            point = shapely.geometry.Point(77.2167, 28.6289)
            bus.current_location = WKBElement(point.wkb, srid=4326)
            await session.commit()

            # Query API
            api_res = client.get("/api/v1/fleet/buses")
            assert api_res.status_code == 200
            bus_list = api_res.json()
            matching = next((b for b in bus_list if b["id"] == bus.id), None)
            assert matching is not None
            assert matching["current_location"] is not None
            assert round(matching["current_location"]["lat"], 4) == 28.6289
            assert round(matching["current_location"]["lng"], 4) == 77.2167
            assert matching["telemetry_status"] == "available"
        finally:
            # Revert to NULL
            bus.current_location = orig_location
            await session.commit()

def test_fleet_routes_endpoint():
    """Verify routes endpoint returns genuine route structures with waypoints."""
    res = client.get("/api/v1/fleet/routes")
    assert res.status_code == 200
    routes = res.json()
    assert isinstance(routes, list)
    for route in routes:
        assert "id" in route
        assert "name" in route
        assert "code" in route
        assert "waypoints" in route
        assert isinstance(route["waypoints"], list)
