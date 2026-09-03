"""
Edge / Video Pipeline — Bus Camera Simulation
Reads a dashcam video, runs AI detection, attaches GPS, and buffers events offline.
"""

import cv2
import os
from datetime import datetime, timedelta
from ultralytics import YOLO
from gps_simulator import get_gps_for_frame
from offline_buffer import init_database, save_event, sync_to_backend, get_event_count

# Configuration
VIDEO_PATH = "test_video.mp4"
MODEL_PATH = r"runs\detect\train\weights\best.pt"
CONFIDENCE_THRESHOLD = 0.3       # Minimum confidence to count as a detection
SAMPLE_INTERVAL_SEC = 1          # Sample 1 frame per second
CROPPED_FRAMES_DIR = "cropped_detections"

# Class names from our training
CLASS_NAMES = {0: "D00", 1: "D10", 2: "D20", 3: "D40"}
CLASS_LABELS = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole"
}

# Simulated network status (True = online, False = offline)
NETWORK_ONLINE = False  # Start offline to demonstrate buffering!

def get_severity(bbox_area, frame_area):
    """Estimate damage severity based on bounding box size relative to the frame."""
    ratio = bbox_area / frame_area
    if ratio > 0.05:
        return "large"
    elif ratio > 0.02:
        return "medium"
    else:
        return "small"

def run_pipeline():
    """Main edge pipeline: read video -> detect -> attach GPS -> buffer events."""
    
    # Initialize the offline buffer database
    init_database()
    
    # Create folder to save cropped detection images
    os.makedirs(CROPPED_FRAMES_DIR, exist_ok=True)
    
    # Load the trained YOLO model
    print(f"\n[PIPELINE] Loading AI model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    
    # Open the video
    print(f"[PIPELINE] Opening video: {VIDEO_PATH}")
    cap = cv2.VideoCapture(VIDEO_PATH)
    
    if not cap.isOpened():
        print("[ERROR] Cannot open video file!")
        return
    
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_area = frame_width * frame_height
    duration_sec = total_frames / fps
    
    # How many frames to skip between samples
    sample_every_n_frames = fps * SAMPLE_INTERVAL_SEC
    
    print(f"[PIPELINE] Video info: {total_frames} frames, {fps} FPS, {duration_sec:.1f} seconds")
    print(f"[PIPELINE] Sampling 1 frame every {SAMPLE_INTERVAL_SEC} second(s)")
    print(f"[PIPELINE] Network status: {'ONLINE' if NETWORK_ONLINE else 'OFFLINE (buffering locally)'}")
    print(f"\n{'='*60}")
    print(f"  STARTING BUS CAMERA SIMULATION")
    print(f"{'='*60}\n")
    
    # Simulate a start time for the bus journey
    start_time = datetime.now()
    frame_count = 0
    detection_count = 0
    sampled_frame_index = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Only process every Nth frame (1 per second)
        if frame_count % sample_every_n_frames != 0:
            continue
        
        sampled_frame_index += 1
        
        # Get simulated GPS coordinates for this point in the video
        lat, lng = get_gps_for_frame(frame_count, total_frames)
        
        # Get simulated timestamp
        elapsed = timedelta(seconds=frame_count / fps)
        timestamp = (start_time + elapsed).strftime("%Y-%m-%dT%H:%M:%S")
        
        # Run AI detection on this frame
        results = model.predict(source=frame, verbose=False, conf=CONFIDENCE_THRESHOLD)
        
        # Process each detection in this frame
        for result in results:
            boxes = result.boxes
            if boxes is None or len(boxes) == 0:
                continue
            
            for box in boxes:
                cls_id = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Calculate severity
                bbox_area = (x2 - x1) * (y2 - y1)
                severity = get_severity(bbox_area, frame_area)
                
                # Get class name
                damage_class = CLASS_NAMES.get(cls_id, f"Unknown_{cls_id}")
                damage_label = CLASS_LABELS.get(damage_class, damage_class)
                
                # Save cropped detection image
                cropped = frame[y1:y2, x1:x2]
                crop_filename = f"detection_{detection_count}_{damage_class}.jpg"
                crop_path = os.path.join(CROPPED_FRAMES_DIR, crop_filename)
                if cropped.size > 0:
                    cv2.imwrite(crop_path, cropped)
                
                detection_count += 1
                
                # Create the event
                event = {
                    "timestamp": timestamp,
                    "latitude": lat,
                    "longitude": lng,
                    "class": damage_class,
                    "confidence": round(confidence, 3),
                    "severity": severity,
                    "frame_image": crop_filename
                }
                
                print(f"[DETECTION #{detection_count}] {damage_label} | Confidence: {confidence:.2f} | Severity: {severity} | GPS: ({lat}, {lng})")
                
                # Save to local buffer (offline mode)
                save_event(event)
    
    cap.release()
    
    # Print summary
    total_events, unsynced = get_event_count()
    print(f"\n{'='*60}")
    print(f"  BUS CAMERA SIMULATION COMPLETE")
    print(f"{'='*60}")
    print(f"  Total frames processed: {sampled_frame_index}")
    print(f"  Total detections: {detection_count}")
    print(f"  Events in local buffer: {total_events} ({unsynced} unsynced)")
    print(f"  Cropped images saved to: {CROPPED_FRAMES_DIR}/")
    
    # Simulate coming back online and syncing
    print(f"\n[NETWORK] Simulating bus entering network zone...")
    print(f"[NETWORK] Network status changed: OFFLINE -> ONLINE")
    sync_to_backend()

if __name__ == "__main__":
    run_pipeline()