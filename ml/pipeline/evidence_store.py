import os
import time
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Tuple
import cv2
import numpy as np

from ml.core.config import settings

logger = logging.getLogger(__name__)

class EvidenceStore(ABC):
    """
    Abstract interface for evidence image storage.
    Decouples ML crop generation from specific storage backends (Local Disk, S3, GCS).
    """

    @abstractmethod
    def save_crop(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], metadata: Dict[str, Any]) -> Optional[str]:
        """
        Saves a cropped image and returns a public URL or path string.
        """
        pass

    @abstractmethod
    def get_url(self, filename: str) -> str:
        """
        Returns the accessible URL for a given evidence filename.
        """
        pass


class LocalEvidenceStore(EvidenceStore):
    """
    Local filesystem storage implementation for demo and testing.
    Served via FastAPI's StaticFiles mount at /evidence.
    """

    def __init__(self, storage_dir: Optional[str] = None, base_url: str = "/evidence"):
        self.storage_dir = storage_dir or settings.RESOLVED_EVIDENCE_DIR
        self.base_url = base_url.rstrip("/")
        os.makedirs(self.storage_dir, exist_ok=True)
        logger.info(f"LocalEvidenceStore initialized at '{self.storage_dir}' serving via '{self.base_url}'")

    def save_crop(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], metadata: Dict[str, Any]) -> Optional[str]:
        """
        Crops bbox from frame, writes to storage_dir, and returns relative URL.
        """
        if frame is None or frame.size == 0:
            return None

        h, w = frame.shape[:2]
        x1, y1, x2, y2 = [int(v) for v in bbox]

        # Clamp bounding box inside frame
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(x1 + 1, min(w, x2))
        y2 = max(y1 + 1, min(h, y2))

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        bus_id = metadata.get("bus_id", "BUS").replace("-", "").replace(" ", "")
        event_id = metadata.get("event_id", uuid.uuid4().hex[:8])
        timestamp = int(time.time())

        # Collision-safe filename
        filename = f"{bus_id}_{event_id}_{timestamp}.jpg"
        file_path = os.path.join(self.storage_dir, filename)

        try:
            success = cv2.imwrite(file_path, crop)
            if not success:
                logger.error(f"Failed to write evidence image to {file_path}")
                return None
            return f"{self.base_url}/{filename}"
        except Exception as e:
            logger.error(f"Exception saving evidence image: {e}")
            return None

    def get_url(self, filename: str) -> str:
        return f"{self.base_url}/{filename}"

# Default store singleton for the ML pipeline
default_evidence_store = LocalEvidenceStore()
