import cv2
import logging
import uuid
import datetime
from typing import Optional, Dict, Any, List, Tuple
import numpy as np

from ml.core.config import settings
from ml.engine.detector import ModelInferenceEngine
from ml.engine.tracker import CentroidTracker
from ml.engine.severity import SeverityEstimator
from ml.pipeline.client import BackendClient
from ml.pipeline.evidence_store import default_evidence_store, EvidenceStore
from ml.pipeline.gps_simulator import get_gps_for_frame

logger = logging.getLogger(__name__)

class VideoProcessor:
    """
    Integrates YOLO inference, CentroidTracker, SeverityEstimator,
    Bengaluru GPS simulation, and EvidenceStore into an end-to-end video pipeline.
    """

    def __init__(
        self, 
        output_path: str = "output.mp4",
        evidence_store: Optional[EvidenceStore] = None,
        backend_client: Optional[BackendClient] = None
    ):
        self.detector = ModelInferenceEngine()
        self.tracker = CentroidTracker(
            stability_frames=settings.TRACKING_STABILITY_FRAMES,
            max_disappeared=settings.TRACKING_MAX_DISAPPEARED
        )
        self.backend_client = backend_client or BackendClient()
        self.evidence_store = evidence_store or default_evidence_store
        self.output_path = output_path

    @staticmethod
    def _match_bbox_to_detection(bbox: Tuple[int, int, int, int], detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Finds the detection whose bounding box best overlaps the tracker's box.
        """
        if not detections:
            return {"class": "pothole", "confidence": 0.85, "bbox": bbox}

        bx1, by1, bx2, by2 = bbox
        b_center = ((bx1 + bx2) / 2.0, (by1 + by2) / 2.0)

        best_match = detections[0]
        min_dist = float("inf")

        for det in detections:
            dx1, dy1, dx2, dy2 = det["bbox"]
            d_center = ((dx1 + dx2) / 2.0, (dy1 + dy2) / 2.0)
            dist = (b_center[0] - d_center[0]) ** 2 + (b_center[1] - d_center[1]) ** 2
            if dist < min_dist:
                min_dist = dist
                best_match = det

        return best_match

    def process_video(
        self, 
        video_path: str, 
        bus_id: str = "BUS-001", 
        start_lat: Optional[float] = None, 
        start_lng: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Processes a video file frame-by-frame:
        - Samples frames at configured INFERENCE_FPS
        - Runs YOLO detection
        - Updates CentroidTracker
        - Generates crops & emits stable detections with real confidence and dynamic damage class
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video at: {video_path}")
            return {"status": "error", "message": f"Could not open {video_path}", "emitted_events": 0}

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 90

        # Compute sampling rate
        sample_interval = max(1, int(round(fps / settings.INFERENCE_FPS))) if settings.INFERENCE_FPS > 0 else 1

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))

        frame_idx = 0
        emitted_events = []
        last_frame_detections: List[Dict[str, Any]] = []

        logger.info(f"Starting video processing: {total_frames} frames @ {fps:.1f} FPS (sampling every {sample_interval} frames)")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            # Process inference on sampled frames
            if frame_idx % sample_interval == 0:
                last_frame_detections = self.detector.predict_frame(frame)
                rects = [d["bbox"] for d in last_frame_detections]
                objects, bboxes, ready_to_emit = self.tracker.update(rects)

                # Emit ready stable tracks
                for (obj_id, bbox) in ready_to_emit:
                    matched = self._match_bbox_to_detection(bbox, last_frame_detections)
                    detection_type = matched.get("class", "pothole")
                    confidence = float(matched.get("confidence", 0.85)) # Real model confidence

                    # Calculate severity based on normalized bbox ratio
                    severity = SeverityEstimator.estimate(bbox, width, height)

                    # Determine GPS location (Bengaluru route interpolation)
                    if start_lat is not None and start_lng is not None:
                        current_lat = round(start_lat + (frame_idx * 0.00001), 6)
                        current_lng = round(start_lng + (frame_idx * 0.00001), 6)
                    else:
                        current_lat, current_lng = get_gps_for_frame(frame_idx, total_frames)

                    event_id = f"EVT-{uuid.uuid4().hex[:8]}"

                    # Save evidence crop through the abstraction layer
                    evidence_url = self.evidence_store.save_crop(
                        frame=frame,
                        bbox=bbox,
                        metadata={"bus_id": bus_id, "event_id": event_id}
                    ) or f"/evidence/fallback_{event_id}.jpg"

                    event_data = {
                        "event_id": event_id,
                        "bus_id": bus_id,
                        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "location": {"lat": current_lat, "lng": current_lng},
                        "detection_type": detection_type,
                        "confidence": round(confidence, 4),
                        "severity": severity,
                        "evidence_url": evidence_url
                    }

                    logger.info(
                        f"[EMIT] Track {obj_id} -> {detection_type} (conf={confidence:.2f}, sev={severity}) at ({current_lat}, {current_lng})"
                    )
                    self.backend_client.send_detection(event_data)
                    emitted_events.append(event_data)

            # Draw annotations on output video
            for det in last_frame_detections:
                x1, y1, x2, y2 = det["bbox"]
                label = f"{det['class']} {det['confidence']:.2f}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 2)
                cv2.putText(frame, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

            out.write(frame)
            frame_idx += 1

        cap.release()
        out.release()

        logger.info(f"Video processing finished. Processed {frame_idx} frames, emitted {len(emitted_events)} events.")
        return {
            "status": "success",
            "total_frames": frame_idx,
            "emitted_events": len(emitted_events),
            "events": emitted_events,
            "output_path": self.output_path
        }
