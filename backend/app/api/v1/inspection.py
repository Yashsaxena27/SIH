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
    try:
        import sys
        # Add root project directory if running inside backend or other subdir
        root_cand = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        if os.path.exists(os.path.join(root_cand, "ml")) and root_cand not in sys.path:
            sys.path.insert(0, root_cand)
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

from app.models.domain import InspectionJob

async def _update_job(job_id: str, updates: dict):
    async with AsyncSessionLocal() as session:
        job = await session.get(InspectionJob, job_id)
        if job:
            for k, v in updates.items():
                setattr(job, k, v)
            await session.commit()

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
    
    await _update_job(inspection_id, {
        "status": "running",
        "stage": "sampling",
        "progress": 15
    })
    
    try:

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

        video_metadata = {
            "filename": filename,
            "duration": duration,
            "fps": round(fps, 2),
            "resolution": f"{width}x{height}",
            "total_frames": total_frames,
            "sampled_frames": max(1, int(duration * sample_fps))
        }
        await _update_job(inspection_id, {"video_metadata": video_metadata})

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
            # Fire and forget update (can't easily await inside sync callback without loop trickery)
            progress_val = min(80, 15 + int(pct * 0.7))
            stage_val = "inference" if pct < 70 else "tracking"
            asyncio.create_task(_update_job(inspection_id, {"progress": progress_val, "stage": stage_val}))

        # 4. Instantiate VideoProcessor and run in background threadpool
        await _update_job(inspection_id, {"stage": "inference"})

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
        await _update_job(inspection_id, {"stage": "ingestion", "progress": 85})

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
        await _update_job(inspection_id, {
            "status": "completed",
            "stage": "complete",
            "progress": 100,
            # "events": processed_events, # We don't save events to the job DB for now to save space
            "annotated_video_url": annotated_video_url if (annotated_video_path and os.path.exists(annotated_video_path)) else None,
            "statistics": {
                "total_frames": total_frames,
                "sampled_frames": ml_result.get("sampled_frames", 0),
                "raw_detections": ml_result.get("detections_raw", 0),
                "filtered_detections": ml_result.get("detections_filtered", 0),
                "tracks": ml_result.get("tracks", 0),
                "emitted_events": len(processed_events),
                "processing_time": elapsed
            }
        })
        logger.info(f"AI Inspection {inspection_id} completed successfully in {elapsed}s. {len(processed_events)} events detected.")

    except Exception as e:
        logger.error(f"AI Inspection {inspection_id} failed: {e}", exc_info=True)
        await _update_job(inspection_id, {
            "status": "failed",
            "stage": "error",
            "progress": 100,
            "error": str(e)
        })
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

    # 4. Initialize Job record in DB
    new_job = InspectionJob(
        id=inspection_id,
        filename=video.filename,
        bus_id=bus_id,
        status="pending",
        stage="upload",
        progress=5
    )
    session.add(new_job)
    await session.commit()

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
async def get_inspection_status(inspection_id: str, session: AsyncSession = Depends(get_db)):
    """
    Returns real-time status, progress, pipeline stage, statistics, and detected events.
    """
    job = await session.get(InspectionJob, inspection_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found")
    
    return {
        "inspection_id": job.id,
        "filename": job.filename,
        "bus_id": job.bus_id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "video_metadata": job.video_metadata,
        "statistics": job.statistics,
        "annotated_video_url": job.annotated_video_url,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "events": [] # We don't return events here to save payload size, they are fetched via issues API
    }

from sqlalchemy import select
@router.get("")
async def list_recent_inspections(session: AsyncSession = Depends(get_db)):
    """
    Returns list of all recent inspection runs.
    """
    result = await session.execute(
        select(InspectionJob).order_by(InspectionJob.created_at.desc()).limit(20)
    )
    jobs = result.scalars().all()
    return [{
        "inspection_id": job.id,
        "filename": job.filename,
        "bus_id": job.bus_id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "created_at": job.created_at.isoformat() if job.created_at else None
    } for job in jobs]

@router.get("/{inspection_id}/stream")
async def stream_inspection_status(inspection_id: str):
    """
    Server-Sent Events (SSE) stream for live inspection progress.
    """
    # Quick check if exists
    async with AsyncSessionLocal() as check_session:
        job = await check_session.get(InspectionJob, inspection_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found")

    import json
    async def event_generator():
        while True:
            async with AsyncSessionLocal() as session:
                current_job = await session.get(InspectionJob, inspection_id)
                if not current_job:
                    break
                data = json.dumps({
                    "inspection_id": current_job.id,
                    "status": current_job.status,
                    "stage": current_job.stage,
                    "progress": current_job.progress,
                    "statistics": current_job.statistics,
                    "annotated_video_url": current_job.annotated_video_url
                })
                yield f"data: {data}\n\n"
                if current_job.status in ("completed", "failed"):
                    break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
