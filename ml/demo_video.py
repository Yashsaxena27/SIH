import argparse
import logging
import os
import cv2
import numpy as np

from ml.pipeline.video_processor import VideoProcessor
from ml.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_mock_video(output_path="mock_input.mp4"):
    """
    Creates a simple mock video simulating a road surface with a dark patch (pothole).
    """
    logger.info("Generating mock video...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, 30.0, (640, 480))
    
    # Background (gray road)
    bg = np.ones((480, 640, 3), dtype=np.uint8) * 120
    
    for i in range(90): # 3 seconds
        frame = bg.copy()
        
        # Pothole moves down the frame (simulating bus moving forward)
        y = 200 + int((i/90.0) * 200)
        x = 320
        
        cv2.ellipse(frame, (x, y), (60, 20), 0, 0, 360, (50, 50, 50), -1)
        out.write(frame)
        
    out.release()
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run ML pipeline on a video.")
    parser.add_argument("--video", type=str, help="Path to input video")
    parser.add_argument("--bus-id", type=str, default="BUS-DEMO")
    parser.add_argument("--lat", type=float, default=28.6139)
    parser.add_argument("--lng", type=float, default=77.2090)
    args = parser.parse_args()
    
    video_path = args.video
    if not video_path:
        video_path = create_mock_video()
        
    if not os.path.exists(video_path):
        logger.error(f"Video {video_path} not found.")
        exit(1)
        
    processor = VideoProcessor(output_path="annotated_output.mp4")
    processor.process_video(video_path, args.bus_id, args.lat, args.lng)
