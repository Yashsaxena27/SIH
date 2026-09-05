import cv2
from ultralytics import YOLO

# ==========================================
# FILE PATHS
# ==========================================
VIDEO_PATH = "test_video.mp4"                 # Place your test video in the same folder as this script
MODEL_PATH = "ml/models/best.pt"              # Uses the new 50-epoch LFS model
OUTPUT_VIDEO_PATH = "annotated_output.mp4"    # Where the result will be saved

CONFIDENCE_THRESHOLD = 0.15

def run_pipeline():
    print(f"Loading AI model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    
    print(f"Opening video: {VIDEO_PATH}")
    cap = cv2.VideoCapture(VIDEO_PATH)
    
    if not cap.isOpened():
        print("Error: Cannot open video file! Make sure 'test_video.mp4' is in this folder.")
        return
        
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Setup VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(OUTPUT_VIDEO_PATH, fourcc, fps, (width, height))
    
    print(f"Processing video... (Size: {width}x{height} at {fps} FPS)")
    frame_count = 0
    total_detections = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        
        # Run AI detection (imgsz=640 prevents squashing)
        results = model.predict(source=frame, verbose=False, conf=CONFIDENCE_THRESHOLD, imgsz=640)
        
        # Draw bounding boxes automatically
        annotated_frame = results[0].plot()
        
        # Count potholes
        boxes = results[0].boxes
        if boxes is not None and len(boxes) > 0:
            frame_detections = len(boxes)
            total_detections += frame_detections
            print(f"Frame {frame_count}: Detected {frame_detections} damage spots!")
        
        # Save to video
        out.write(annotated_frame)
        
        if frame_count % 50 == 0 and (boxes is None or len(boxes) == 0):
            print(f"Processed {frame_count} frames... (No detections recently)")

    cap.release()
    out.release()
    print("\n========================================")
    print(f"FINISHED PROCESSING VIDEO!")
    print(f"Total frames processed: {frame_count}")
    print(f"Total damage spots found: {total_detections}")
    print(f"Your annotated video is saved at: {OUTPUT_VIDEO_PATH}")
    print("========================================")

if __name__ == "__main__":
    run_pipeline()
