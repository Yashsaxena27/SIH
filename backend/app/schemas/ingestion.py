from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class GeoPoint(BaseModel):
    lat: float
    lng: float

class DetectionEvent(BaseModel):
    event_id: str
    bus_id: str
    timestamp: datetime
    location: GeoPoint
    detection_type: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    severity: str
    evidence_url: Optional[str] = None

class BatchDetectionRequest(BaseModel):
    events: List[DetectionEvent]

class BatchDetectionResult(BaseModel):
    event_id: str
    status: str # "success", "skipped", "error"
    issue_id: Optional[str] = None
    error: Optional[str] = None

class BatchDetectionResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    results: List[BatchDetectionResult]
