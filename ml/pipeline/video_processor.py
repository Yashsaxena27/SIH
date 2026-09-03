import cv2
import logging
import uuid
import datetime

from ml.engine.detector import ModelInferenceEngine
from ml.engine.tracker import CentroidTracker
from ml.engine.severity import SeverityEstimator
from ml.pipeline.client import BackendClient

logger = logging.getLogger(__name__)

class VideoProcessor:
    def __init__(self, output_path="output.mp4"):
        self.detector = ModelInferenceEngine()
        self.tracker = CentroidTracker()
        self.backend_client = BackendClient()
        self.output_path = output_path
        
    def process_video(self, video_path: str, bus_id: str, start_lat: float, start_lng: float):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video {video_path}")
            return
            
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))
        
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # Run inference
            detections = self.detector.predict_frame(frame)
            
            # Extract bounding boxes for tracker
            rects = [d["bbox"] for d in detections]
            
            # Update tracker
            objects, bboxes, ready_to_emit = self.tracker.update(rects)
            
            # Emit mature tracks to backend
            for (obj_id, bbox) in ready_to_emit:
                severity = SeverityEstimator.estimate(bbox, width, height)
                
                # We simulate slight movement in GPS for demo
                current_lat = start_lat + (frame_idx * 0.00001)
                current_lng = start_lng + (frame_idx * 0.00001)
                
                event_data = {
                    "event_id": f"EVT-{uuid.uuid4().hex[:8]}",
                    "bus_id": bus_id,
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "location": {"lat": current_lat, "lng": current_lng},
                    "detection_type": "pothole",
                    "confidence": 0.85, # Simplification, should track actual conf
                    "severity": severity,
                    "evidence_url": f"/media/evidence/track_{obj_id}.jpg"
                }
                
                logger.info(f"Emitting stable track {obj_id} to backend...")
                self.backend_client.send_detection(event_data)
                
                # Save evidence crop (optional)
                # x1, y1, x2, y2 = bbox
                # cv2.imwrite(f"evidence_track_{obj_id}.jpg", frame[y1:y2, x1:x2])

            # Draw annotations
            for obj_id, centroid in objects.items():
                box = bboxes[obj_id]
                x1, y1, x2, y2 = box
                
                text = f"ID {obj_id}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                cv2.circle(frame, (centroid[0], centroid[1]), 4, (0, 255, 0), -1)

            out.write(frame)
            frame_idx += 1
            
        cap.release()
        out.release()
        logger.info(f"Video processing complete. Output saved to {self.output_path}")
