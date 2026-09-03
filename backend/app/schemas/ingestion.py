from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

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
