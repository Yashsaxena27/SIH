from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_db
from app.schemas.ingestion import DetectionEvent
from app.models.domain import UrbanIssue
from app.services.ingestion import process_detection_event
from app.services.verification import process_verification_revisit

router = APIRouter(prefix="/api/v1/ingestion", tags=["Ingestion"])
logger = logging.getLogger(__name__)

@router.post("/detection")
async def ingest_detection(
    event: DetectionEvent,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db)
):
    """
    Receives a structured DetectionEvent from the ML layer.
    """
    try:
        issue = await process_detection_event(session, event)
        return {"status": "success", "event_id": event.event_id, "issue_id": issue.id if issue else None}
    except Exception as e:
        logger.error(f"Failed to ingest detection: {e}")
        raise HTTPException(status_code=500, detail="Failed to process detection")

@router.post("/verification/{issue_id}")
async def ingest_verification(
    issue_id: str,
    event: DetectionEvent = None, # Optional if fixed
    session: AsyncSession = Depends(get_db)
):
    """
    Receives a verification observation from the ML layer.
    If event is None, it implies the bus saw no defect (Fixed).
    """
    issue = await session.get(UrbanIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    try:
        updated_issue = await process_verification_revisit(session, issue, event)
        return {"status": "success", "issue_id": updated_issue.id, "new_status": updated_issue.status}
    except Exception as e:
        logger.error(f"Failed to process verification: {e}")
        raise HTTPException(status_code=500, detail="Failed to process verification")
