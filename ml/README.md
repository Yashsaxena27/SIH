# ML Layer - AI-powered Mobile Urban Intelligence Network

This module encapsulates the Computer Vision (CV) pipeline. It handles video frame extraction, object detection (via YOLOv8), temporal tracking (Centroid tracking), severity estimation, and backend integration.

## Architecture
- **Inference Engine (`engine/detector.py`)**: Runs YOLOv8 object detection or a Mock detector when `MOCK_ML_MODE=true`.
- **Temporal Tracker (`engine/tracker.py`)**: A centroid-based tracker that groups consecutive frame bounding boxes into a single stable track.
- **Severity Estimator (`engine/severity.py`)**: Estimates severity based on the relative bounding box size against the frame.
- **Pipeline (`pipeline/video_processor.py`)**: Combines the components, drawing annotations and emitting `DetectionEvent`s via `client.py`.

## Setup
```bash
cd ml
pip install -r requirements.txt
```

## Running the SIH Demo
To demonstrate the full pipeline (Video -> ML -> Tracking -> API Event):
```bash
# Creates a mock video if none provided and runs inference
python demo_video.py --video my_dashcam.mp4 --bus-id BUS-001
```

## Training a Real Model
We use Ultralytics YOLOv8 for ease of use and edge performance.
1. Download a pothole dataset in YOLO format (COCO can be converted).
2. Validate it:
   ```bash
   python training/dataset_validator.py /path/to/dataset
   ```
3. Train it:
   ```bash
   python training/train.py --data /path/to/dataset/data.yaml --epochs 50
   ```
4. Move the resulting `best.pt` to `models/pothole_v1.pt` and set `MOCK_ML_MODE=false`.

## Verification 
The `engine/verification.py` handles closed-loop verification. If a bus drives through a resolved location and detects nothing, it emits an empty verification event (Verified). If it detects the pothole again, it emits an unresolved event, reopening the ticket in the backend.

## Edge Deployment Readiness
The `ml` package operates as a completely independent client. It does not touch the database. It only issues HTTP POST requests to `http://localhost:8000/api/v1/ingestion/detection`. This allows the ML layer to be packaged onto an NVIDIA Jetson or similar edge device seamlessly.
