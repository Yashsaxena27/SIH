import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class SeverityEstimator:
    @staticmethod
    def estimate_metrics(bbox: List[int], frame_width: int, frame_height: int) -> Dict[str, Any]:
        """
        Estimates defect severity and camera-relative visual metrics.
        
        CRITICAL TRUTHFULNESS CONTRACT:
        Monocular dashcam imagery cannot measure absolute physical depth (cm/mm)
        without calibrated stereo baselines or LiDAR.
        We report camera-relative visual extent (% of frame area) and categorical severity.
        """
        x1, y1, x2, y2 = bbox
        box_w = max(1, x2 - x1)
        box_h = max(1, y2 - y1)
        box_area = box_w * box_h
        frame_area = max(1, frame_width * frame_height)
        
        ratio = box_area / float(frame_area)
        
        if ratio > 0.15:
            severity = "critical"
        elif ratio > 0.05:
            severity = "high"
        elif ratio >= 0.01:
            severity = "medium"
        else:
            severity = "low"
            
        return {
            "severity": severity,
            "visual_extent_ratio": round(ratio, 4),
            "visual_extent_pct": round(ratio * 100.0, 2),
            "box_width": box_w,
            "box_height": box_h,
            "measurement_method": "camera_relative_visual_extent",
            "physical_depth_claim": "uncalibrated_monocular_camera"
        }

    @classmethod
    def estimate(cls, bbox: List[int], frame_width: int, frame_height: int) -> str:
        """
        Backward-compatible string severity returning low/medium/high/critical.
        """
        return cls.estimate_metrics(bbox, frame_width, frame_height)["severity"]
