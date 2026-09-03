from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.domain import Bus, Route

router = APIRouter(prefix="/api/v1/fleet", tags=["Fleet"])

@router.get("/buses")
async def get_buses(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Bus))
    buses = result.scalars().all()
    return [
        {
            "id": b.id,
            "registrationNumber": b.registration_number,
            "operator": b.operator,
            "status": b.status,
            "cameraStatus": b.camera_status,
            "gpsStatus": b.gps_status,
            "edgeAiStatus": b.edge_ai_status,
            "lastSeen": b.last_seen
        }
        for b in buses
    ]

@router.get("/buses/{bus_id}")
async def get_bus(bus_id: str, session: AsyncSession = Depends(get_db)):
    bus = await session.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return {
        "id": bus.id,
        "registrationNumber": bus.registration_number,
        "operator": bus.operator,
        "status": bus.status
    }

@router.get("/routes")
async def get_routes(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Route))
    routes = result.scalars().all()
    return [
        {
            "id": r.id,
            "displayCode": r.display_code,
            "name": r.name,
            "isActive": r.is_active
        }
        for r in routes
    ]
