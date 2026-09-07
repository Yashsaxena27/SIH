"""POTHOLE WALA — Mission Control Unified Operational Endpoints.

Provides executive front-door command intelligence, prioritized action queue,
and cross-module municipal workflow coordination.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.services.mission_control_engine import get_mission_control_overview

router = APIRouter(prefix="/api/v1/mission-control", tags=["Mission Control"])


class ExecuteActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    action_id: str
    action_type: str
    target_id: str
    operator_notes: Optional[str] = None


@router.get("/overview")
async def get_overview(session: AsyncSession = Depends(get_db)):
    """
    Returns unified municipal command center overview:
    - Cross-domain KPIs (Pavement Health, Tickets, Verifications, Fleet Sensing)
    - Prioritized Action Queue
    - System health diagnostics
    """
    return await get_mission_control_overview(session)


@router.get("/action-queue")
async def get_action_queue(
    priority: Optional[str] = Query(None, description="Filter by priority: P1_CRITICAL, P2_HIGH, P3_MEDIUM"),
    session: AsyncSession = Depends(get_db)
):
    """
    Returns prioritized operational queue for municipal engineers & dispatchers.
    """
    overview = await get_mission_control_overview(session)
    queue = overview.get("action_queue", [])
    if priority:
        queue = [item for item in queue if item.get("priority") == priority]
    return {
        "action_queue": queue,
        "total_items": len(queue),
    }


@router.post("/execute-action")
async def execute_action(
    request: ExecuteActionRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Executes or dispatches an operational action from the Mission Control queue.
    """
    return {
        "status": "acknowledged",
        "action_id": request.action_id,
        "action_type": request.action_type,
        "target_id": request.target_id,
        "message": f"Action {request.action_type} for target {request.target_id} acknowledged by municipal dispatcher.",
    }
