import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

class SeverityEstimator:
    @staticmethod
    def estimate(bbox: List[int], frame_width: int, frame_height: int) -> str:
        """
        Estimates pothole severity based on the relative size of the bounding box
        compared to the frame dimensions. This is a heuristic placeholder for a true depth model.
        """
        x1, y1, x2, y2 = bbox
        box_area = (x2 - x1) * (y2 - y1)
        frame_area = frame_width * frame_height
        
        ratio = box_area / float(frame_area)
        
        if ratio > 0.15:
            return "critical"
        elif ratio > 0.05:
            return "high"
        elif ratio > 0.01:
            return "medium"
        else:
            return "low"
