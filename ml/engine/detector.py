import numpy as np
import logging
from typing import List, Dict, Any

from ml.core.config import settings

logger = logging.getLogger(__name__)

class ModelInferenceEngine:
    def __init__(self):
        self.mock_mode = settings.MOCK_ML_MODE
        self.model = None
        self.classes = {0: "pothole"}
        
        if not self.mock_mode:
            try:
                from ultralytics import YOLO
                logger.info(f"Loading YOLO model from {settings.MODEL_PATH}")
                self.model = YOLO(settings.MODEL_PATH)
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}")
                logger.warning("Falling back to MOCK mode!")
                self.mock_mode = True

    def predict_frame(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Runs inference on a single OpenCV BGR frame.
        Returns a list of detections: [{"class": "pothole", "confidence": 0.8, "bbox": [x1, y1, x2, y2]}]
        """
        if self.mock_mode:
            return self._mock_predict(frame)
            
        results = self.model(frame, conf=settings.CONFIDENCE_THRESHOLD, iou=settings.IOU_THRESHOLD, verbose=False)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                class_name = self.model.names.get(cls_id, "unknown")
                if class_name == "pothole" or cls_id == 0:
                    detections.append({
                        "class": "pothole",
                        "confidence": conf,
                        "bbox": [int(x1), int(y1), int(x2), int(y2)]
                    })
        return detections
        
    def _mock_predict(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Returns a deterministic fake bounding box for testing the pipeline without a real model.
        We'll just simulate a box in the bottom center of the frame, moving slightly.
        """
        h, w = frame.shape[:2]
        
        # We can use a simple trick based on a hash of the frame or just random if we want, 
        # but for demo video let's just make it appear reliably in the bottom half.
        # Actually, let's just return a static box for simplicity, or None if it's too dark.
        avg_brightness = np.mean(frame)
        if avg_brightness < 20: 
            return [] # Too dark
            
        return [{
            "class": "pothole",
            "confidence": 0.92,
            "bbox": [int(w*0.4), int(h*0.6), int(w*0.6), int(h*0.8)]
        }]
