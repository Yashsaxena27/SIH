import httpx
import logging
from typing import Dict, Any

from ml.core.config import settings

logger = logging.getLogger(__name__)

class BackendClient:
    def __init__(self):
        self.base_url = settings.BACKEND_URL
        
    def send_detection(self, event_data: Dict[str, Any]) -> bool:
        """
        Sends a DetectionEvent to the FastAPI backend.
        event_data must match backend's DetectionEvent schema.
        """
        url = f"{self.base_url}/ingestion/detection"
        try:
            # We use a synchronous POST for simplicity in the video loop.
            # In a real edge device, this might use an async queue.
            response = httpx.post(url, json=event_data, timeout=5.0)
            if response.status_code == 200:
                logger.info(f"Successfully sent detection {event_data['event_id']}")
                return True
            else:
                logger.error(f"Backend rejected detection: {response.status_code} {response.text}")
                return False
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to backend: {e}")
            return False

    def send_verification(self, issue_id: str, event_data: Dict[str, Any] = None) -> bool:
        """
        Sends a verification revisit event.
        """
        url = f"{self.base_url}/ingestion/verification/{issue_id}"
        try:
            payload = event_data if event_data else None
            response = httpx.post(url, json=payload, timeout=5.0)
            if response.status_code == 200:
                logger.info(f"Successfully sent verification for {issue_id}")
                return True
            return False
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to backend for verification: {e}")
            return False
