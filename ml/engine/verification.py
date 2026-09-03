import logging
import datetime
import uuid

from ml.pipeline.client import BackendClient

logger = logging.getLogger(__name__)

class VerificationEngine:
    def __init__(self):
        self.backend_client = BackendClient()
        
    def check_revisit(self, issue_id: str, new_detections: list) -> bool:
        """
        Analyzes detections at a known issue location (revisit) to determine 
        if the defect is still present.
        """
        
        # If new_detections is empty, the bus saw nothing -> FIXED
        if len(new_detections) == 0:
            logger.info(f"No defects detected at {issue_id}. Submitting verification: RESOLVED.")
            self.backend_client.send_verification(issue_id, event_data=None)
            return True
            
        # Defect still present
        logger.warning(f"Defect STILL DETECTED at {issue_id}. Submitting verification: UNRESOLVED.")
        
        # We grab the highest confidence detection
        best_det = max(new_detections, key=lambda d: d["confidence"])
        
        event_data = {
            "event_id": f"EVT-VER-{uuid.uuid4().hex[:8]}",
            "bus_id": "BUS-VER",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "location": {"lat": 12.9716, "lng": 77.5946}, # Bengaluru MG Road
            "detection_type": best_det["class"],
            "confidence": best_det["confidence"],
            "severity": "medium", 
            "evidence_url": "/media/evidence/unresolved.jpg"
        }
        
        self.backend_client.send_verification(issue_id, event_data=event_data)
        return False
