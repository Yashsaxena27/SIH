from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.core.database import get_db
from app.models.domain import Complaint, ComplaintSource, ComplaintStatus, UrbanIssue

router = APIRouter(prefix="/api/v1/complaints", tags=["Complaints"])

class ComplaintCreate(BaseModel):
    title: str
    description: Optional[str] = None
    source: str
    urban_issue_id: Optional[str] = None

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    urban_issue_id: Optional[str] = None

@router.post("")
async def create_complaint(body: ComplaintCreate, session: AsyncSession = Depends(get_db)):
    try:
        source_enum = ComplaintSource[body.source]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid source: {body.source}")
        
    if body.urban_issue_id:
        issue = await session.get(UrbanIssue, body.urban_issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="UrbanIssue not found")
            
    complaint = Complaint(
        id=f"comp_{uuid.uuid4().hex[:12]}",
        title=body.title,
        description=body.description,
        source=source_enum,
        status=ComplaintStatus.linked_to_issue if body.urban_issue_id else ComplaintStatus.open,
        urban_issue_id=body.urban_issue_id
    )
    
    session.add(complaint)
    await session.commit()
    
    return {
        "id": complaint.id,
        "title": complaint.title,
        "status": complaint.status.value,
        "source": complaint.source.value,
        "urbanIssueId": complaint.urban_issue_id
    }

@router.get("")
async def list_complaints(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Complaint).order_by(Complaint.created_at.desc()))
    complaints = result.scalars().all()
    
    return [{
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "source": c.source.value if hasattr(c.source, 'value') else c.source,
        "status": c.status.value if hasattr(c.status, 'value') else c.status,
        "urbanIssueId": c.urban_issue_id,
        "createdAt": c.created_at.isoformat() if c.created_at else None
    } for c in complaints]

@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str, session: AsyncSession = Depends(get_db)):
    complaint = await session.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    return {
        "id": complaint.id,
        "title": complaint.title,
        "description": complaint.description,
        "source": complaint.source.value if hasattr(complaint.source, 'value') else complaint.source,
        "status": complaint.status.value if hasattr(complaint.status, 'value') else complaint.status,
        "urbanIssueId": complaint.urban_issue_id,
        "createdAt": complaint.created_at.isoformat() if complaint.created_at else None
    }
