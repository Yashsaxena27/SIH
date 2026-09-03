import os
import time
import uuid
import tempfile
import asyncio
import logging
from typing import Dict, Any, List, Optional
try:
    import cv2
except ImportError:
    cv2 = None

from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.services.ingestion import ensure_bus_exists, process_detection_event
from app.schemas.ingestion import DetectionEvent, GeoPoint

try:
    from ml.pipeline.video_processor import VideoProcessor
    from ml.core.config import settings as ml_settings
except ImportError:
    VideoProcessor = None
    ml_settings = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/inspection", tags=["AI Road Inspection"])

# Configurable safeguards
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB max video
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}

# In-memory thread-safe state store for active inspections
inspection_jobs: Dict[str, Dict[str, Any]] = {}

async def run_inspection_background(
    inspection_id: str,
    temp_video_path: str,
    filename: str,
    bus_id: str,
    sample_fps: int,
    conf_threshold: float,
    stability_frames: int,
    generate_annotated: bool
):
    """
    Background worker that runs YOLO detection, tracking, severity, GPS,
    evidence cropping, PostGIS ingestion, and lifecycle updates.
    """
    start_time = time.time()
    job = inspection_jobs.get(inspection_id)
    if not job:
        return

    try:
        job["status"] = "running"
        job["stage"] = "sampling"
        job["progress"] = 15

        # 1. Inspect video metadata
        if cv2 is None or VideoProcessor is None:
            raise ValueError("Video inspection requires OpenCV (cv2) and ML pipeline packages.")

        cap = cv2.VideoCapture(temp_video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open uploaded video: {filename}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        duration = round(total_frames / fps, 2) if fps > 0 else 0.0
        cap.release()

        job["video_metadata"] = {
            "filename": filename,
            "duration": duration,
            "fps": round(fps, 2),
            "resolution": f"{width}x{height}",
            "total_frames": total_frames,
            "sampled_frames": max(1, int(duration * sample_fps))
        }

        # 2. Output annotated video path
        annotated_video_url = None
        annotated_video_path = None
        if generate_annotated:
            evidence_dir = ml_settings.RESOLVED_EVIDENCE_DIR if ml_settings else os.path.join(os.getcwd(), "evidence")
            os.makedirs(evidence_dir, exist_ok=True)
            annotated_video_filename = f"annotated_{inspection_id}.mp4"
            annotated_video_path = os.path.join(evidence_dir, annotated_video_filename)
            annotated_video_url = f"/evidence/{annotated_video_filename}"

        # 3. Define progress callback
        def on_progress(pct: int, stage: str, cur_frame: int, tot_frames: int):
            job["progress"] = min(80, 15 + int(pct * 0.7))
            job["stage"] = "inference" if pct < 70 else "tracking"

        # 4. Instantiate VideoProcessor and run in background threadpool
        job["stage"] = "inference"
        processor = VideoProcessor(output_path=annotated_video_path)
        
        # Execute processing in threadpool so asyncio loop remains responsive to polling
        ml_result = await asyncio.to_thread(
            processor.process_video,
            video_path=temp_video_path,
            bus_id=bus_id,
            conf_threshold=conf_threshold,
            sample_fps=sample_fps,
            stability_frames=stability_frames,
            progress_callback=on_progress,
            emit_to_backend=False
        )

        if ml_result["status"] == "error":
            raise ValueError(ml_result.get("error") or "ML video processing encountered an error")

        raw_events = ml_result.get("events", [])
        job["stage"] = "ingestion"
        job["progress"] = 85

        # 5. Persist events safely into PostgreSQL/PostGIS through existing lifecycle
        processed_events = []
        async with AsyncSessionLocal() as session:
            # Ensure bus exists in database
            await ensure_bus_exists(session, bus_id)

            for ev in raw_events:
                detection_event = DetectionEvent(
                    event_id=ev["event_id"],
                    bus_id=ev["bus_id"],
                    timestamp=ev["timestamp"],
                    location=GeoPoint(lat=ev["location"]["lat"], lng=ev["location"]["lng"]),
                    detection_type=ev["detection_type"],
                    confidence=ev["confidence"],
                    severity=ev["severity"],
                    evidence_url=ev["evidence_url"]
                )

                # Process detection through PostGIS spatial fusion and lifecycle
                ingestion_result = await process_detection_event(session, detection_event)
                
                ev_data = dict(ev)
                if ingestion_result:
                    ev_data["issue_id"] = ingestion_result.id
                    ev_data["issue_status"] = ingestion_result.status.value if hasattr(ingestion_result.status, 'value') else ingestion_result.status
                    ev_data["issue_priority"] = ingestion_result.priority.value if hasattr(ingestion_result.priority, 'value') else ingestion_result.priority
                processed_events.append(ev_data)

            await session.commit()

        # 6. Finalize inspection status
        elapsed = round(time.time() - start_time, 2)
        job["status"] = "completed"
        job["stage"] = "complete"
        job["progress"] = 100
        job["events"] = processed_events
        job["annotated_video_url"] = annotated_video_url if (annotated_video_path and os.path.exists(annotated_video_path)) else None
        job["statistics"] = {
            "total_frames": total_frames,
            "sampled_frames": ml_result.get("sampled_frames", 0),
            "raw_detections": ml_result.get("detections_raw", 0),
            "filtered_detections": ml_result.get("detections_filtered", 0),
            "tracks": ml_result.get("tracks", 0),
            "emitted_events": len(processed_events),
            "processing_time": elapsed
        }
        logger.info(f"AI Inspection {inspection_id} completed successfully in {elapsed}s. {len(processed_events)} events detected.")

    except Exception as e:
        logger.error(f"AI Inspection {inspection_id} failed: {e}", exc_info=True)
        job["status"] = "failed"
        job["stage"] = "error"
        job["progress"] = 100
        job["error"] = str(e)
    finally:
        # 7. Clean up temporary uploaded video file
        if os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except Exception as e:
                logger.warning(f"Could not remove temp video {temp_video_path}: {e}")

@router.post("/video")
async def upload_inspection_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    bus_id: str = Form("BUS-001"),
    sample_fps: int = Form(1),
    conf_threshold: float = Form(0.10),
    stability_frames: int = Form(1),
    generate_annotated: bool = Form(True),
    session: AsyncSession = Depends(get_db)
):
    """
    Accepts road inspection video upload and triggers real YOLO AI inspection in the background.
    Returns inspection_id immediately for polling or streaming status.
    """
    # 1. Validate file extension
    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Ensure Bus exists in PostgreSQL
    await ensure_bus_exists(session, bus_id)

    inspection_id = f"INSP-{uuid.uuid4().hex[:8].upper()}"
    temp_dir = os.path.join(tempfile.gettempdir(), "aih_pothole_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_video_path = os.path.join(temp_dir, f"{inspection_id}_{video.filename}")

    # 3. Stream upload chunk-by-chunk with MAX_UPLOAD_SIZE check
    bytes_written = 0
    with open(temp_video_path, "wb") as f:
        while chunk := await video.read(1024 * 1024):  # 1MB chunks
            bytes_written += len(chunk)
            if bytes_written > MAX_UPLOAD_SIZE:
                f.close()
                if os.path.exists(temp_video_path):
                    os.remove(temp_video_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"Video file exceeds maximum allowed size of {MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
                )
            f.write(chunk)

    # 4. Initialize Job record
    inspection_jobs[inspection_id] = {
        "inspection_id": inspection_id,
        "filename": video.filename,
        "bus_id": bus_id,
        "status": "pending",
        "stage": "upload",
        "progress": 5,
        "video_metadata": None,
        "statistics": None,
        "events": [],
        "annotated_video_url": None,
        "error": None,
        "created_at": time.time()
    }

    # 5. Dispatch background task
    background_tasks.add_task(
        run_inspection_background,
        inspection_id,
        temp_video_path,
        video.filename,
        bus_id,
        sample_fps,
        conf_threshold,
        stability_frames,
        generate_annotated
    )

    return {
        "inspection_id": inspection_id,
        "status": "pending",
        "message": "Video uploaded successfully. AI inspection pipeline initiated."
    }

@router.get("/{inspection_id}")
async def get_inspection_status(inspection_id: str):
    """
    Returns real-time status, progress, pipeline stage, statistics, and detected events.
    """
    job = inspection_jobs.get(inspection_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found")
    return job

@router.get("")
async def list_recent_inspections():
    """
    Returns list of all recent inspection runs.
    """
    sorted_jobs = sorted(
        inspection_jobs.values(),
        key=lambda x: x.get("created_at", 0),
        reverse=True
    )
    return sorted_jobs[:20]

@router.get("/{inspection_id}/stream")
async def stream_inspection_status(inspection_id: str):
    """
    Server-Sent Events (SSE) stream for live inspection progress.
    """
    job = inspection_jobs.get(inspection_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found")

    import json
    async def event_generator():
        while True:
            current_job = inspection_jobs.get(inspection_id)
            if not current_job:
                break
            data = json.dumps(current_job)
            yield f"data: {data}\n\n"
            if current_job["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
