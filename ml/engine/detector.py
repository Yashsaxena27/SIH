import numpy as np
import logging
from typing import List, Dict, Any, Optional

from ml.core.config import settings

import threading

logger = logging.getLogger(__name__)

_MODEL_CACHE: Dict[str, Any] = {}
_MODEL_LOCK = threading.Lock()

def get_yolo_model(model_path: str):
    """
    Thread-safe process-level singleton for YOLO model weights.
    Avoids expensive repeated disk I/O and torch deserialization per video job.
    """
    if model_path in _MODEL_CACHE:
        return _MODEL_CACHE[model_path]
    with _MODEL_LOCK:
        if model_path not in _MODEL_CACHE:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model into process cache from {model_path}")
            _MODEL_CACHE[model_path] = YOLO(model_path)
    return _MODEL_CACHE[model_path]


class ModelInferenceEngine:
    """
    Inference engine for the shipped YOLOv8 pothole model, with taxonomy
    normalization retained for compatible model artifacts and explicit mock mode.
    """
    
    # RDD2022 standard taxonomy to backend detection taxonomy
    DAMAGE_TYPE_MAP: Dict[str, str] = {
        "D00": "longitudinal_crack",
        "D10": "transverse_crack",
        "D20": "alligator_crack",
        "D40": "pothole",
    }

    def __init__(self):
        self.mock_mode = settings.MOCK_ML_MODE
        self.model = None
        self.classes: Dict[int, str] = {}
        
        if not self.mock_mode:
            try:
                resolved_path = settings.RESOLVED_MODEL_PATH
                self.model = get_yolo_model(resolved_path)
                self.classes = getattr(self.model, "names", {})
                logger.info(f"YOLO model ready from process cache. Detected classes: {self.classes}")
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}")
                raise RuntimeError(
                    f"Real ML model could not be loaded from {settings.RESOLVED_MODEL_PATH}"
                ) from e

    def predict_frame(self, frame: np.ndarray, conf: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Runs inference on a single OpenCV BGR frame.
        Returns a list of all detected road damage defects:
        [{"class": "pothole", "raw_class": "D40", "class_id": 3, "confidence": 0.82, "bbox": [x1, y1, x2, y2]}]
        """
        if self.mock_mode:
            return self._mock_predict(frame)
            
        conf_val = conf if conf is not None else settings.CONFIDENCE_THRESHOLD
        results = self.model(
            frame, 
            conf=conf_val, 
            iou=settings.IOU_THRESHOLD, 
            device=settings.DEVICE, 
            verbose=False
        )
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Retrieve raw class from the model's runtime metadata
                raw_class = self.classes.get(cls_id, f"unknown_{cls_id}")
                
                # Normalize class name to backend taxonomy
                if raw_class in self.DAMAGE_TYPE_MAP:
                    detection_type = self.DAMAGE_TYPE_MAP[raw_class]
                elif str(raw_class).lower() == "pothole":
                    detection_type = "pothole"
                else:
                    detection_type = "unknown_damage"
                
                detections.append({
                    "class": detection_type,
                    "raw_class": raw_class,
                    "class_id": cls_id,
                    "confidence": conf,
                    "bbox": [int(x1), int(y1), int(x2), int(y2)]
                })
        return detections
        
    def _mock_predict(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Deterministic mock detection for offline CI testing or fallback.
        """
        h, w = frame.shape[:2]
        avg_brightness = np.mean(frame)
        if avg_brightness < 20: 
            return []
            
        return [{
            "class": "pothole",
            "raw_class": "D40",
            "class_id": 3,
            "confidence": 0.92,
            "bbox": [int(w * 0.4), int(h * 0.6), int(w * 0.6), int(h * 0.8)]
        }]
