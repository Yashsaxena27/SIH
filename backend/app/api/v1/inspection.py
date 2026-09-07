import os
import time
import uuid
import tempfile
import asyncio
import logging
import shutil
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
try:
    import cv2
except ImportError:
    cv2 = None

from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.auth import get_current_user, require_role, AuthenticatedUser
from app.models.domain import UserRole
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

# Video Library resolution
candidate_video_dirs = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "videos")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "videos")),
    "/app/ml/videos"
]
VIDEOS_DIR = next((d for d in candidate_video_dirs if os.path.isdir(d)), candidate_video_dirs[0])

def probe_video_file(filepath: str) -> dict:
    meta = {
        "width": 640,
        "height": 480,
        "fps": 30.0,
        "total_frames": 1,
        "duration": 0.0,
        "resolution": "640x480"
    }
    if cv2 is not None and os.path.isfile(filepath):
        try:
            cap = cv2.VideoCapture(filepath)
            if cap.isOpened():
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
                fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
                frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
                dur = round(frames / fps, 2) if fps > 0 else 0.0
                meta = {
                    "width": w,
                    "height": h,
                    "fps": round(fps, 2),
                    "total_frames": frames,
                    "duration": dur,
                    "resolution": f"{w}x{h}"
                }
            cap.release()
        except Exception as e:
            logger.warning(f"Could not probe video {filepath}: {e}")
    return meta

from app.models.domain import InspectionJob

import threading
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

def run_inspection_isolated_thread(
    inspection_id: str,
    temp_video_path: str,
    filename: str,
    bus_id: str,
    sample_fps: int,
    conf_threshold: float,
    stability_frames: int,
    generate_annotated: bool,
    route_id: str,
    route_name: str,
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    capture_started_at: str
):
    """
    Isolated synchronous wrapper that runs the entire inspection in a new event loop
    with a detached database connection pool to avoid FastAPI test lifecycle crashes.
    """
    def _worker():
        asyncio.run(_isolated_async_inspection(
            inspection_id, temp_video_path, filename, bus_id, sample_fps,
            conf_threshold, stability_frames, generate_annotated, route_id, route_name,
            start_lat, start_lng, end_lat, end_lng, capture_started_at
        ))
        
    t = threading.Thread(target=_worker, daemon=True)
    t.start()


async def _isolated_async_inspection(
    inspection_id: str, temp_video_path: str, filename: str, bus_id: str,
    sample_fps: int, conf_threshold: float, stability_frames: int,
    generate_annotated: bool, route_id: str, route_name: str,
    start_lat: float, start_lng: float, end_lat: float, end_lng: float,
    capture_started_at: str
):
    # 1. Create fully isolated DB engine and sessionmaker
    isolated_engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        echo=False,
        future=True
    )
    IsolatedSessionLocal = async_sessionmaker(isolated_engine, expire_on_commit=False)

    async def _isolated_update_job(updates: dict):
        try:
            async with IsolatedSessionLocal() as session:
                job = await session.get(InspectionJob, inspection_id)
                if job:
                    for k, v in updates.items():
                        setattr(job, k, v)
                    await session.commit()
        except Exception as e:
            logger.warning(f"Failed to update job {inspection_id}: {e}")

    start_time = time.time()
    await _isolated_update_job({
        "status": "running",
        "stage": "sampling",
        "progress": 15
    })
    
    try:
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
            "sampled_frames": max(1, int(duration * sample_fps)),
            "route_id": route_id,
            "route_name": route_name,
            "start_point": {"lat": start_lat, "lng": start_lng},
            "end_point": {"lat": end_lat, "lng": end_lng},
            "capture_started_at": capture_started_at,
            "location_source": "INTERPOLATED_FROM_CONFIGURED_ROUTE",
            "location_confidence": "demo_route"
        }
        await _isolated_update_job({"video_metadata": video_metadata})

        annotated_video_url = None
        annotated_video_path = None
        if generate_annotated:
            evidence_dir = ml_settings.RESOLVED_EVIDENCE_DIR if ml_settings else os.path.join(os.getcwd(), "evidence")
            os.makedirs(evidence_dir, exist_ok=True)
            annotated_video_filename = f"annotated_{inspection_id}.mp4"
            annotated_video_path = os.path.join(evidence_dir, annotated_video_filename)
            annotated_video_url = f"/evidence/{annotated_video_filename}"

        loop = asyncio.get_running_loop()

        def on_progress(pct: int, stage: str, cur_frame: int, tot_frames: int):
            progress_val = min(80, 15 + int(pct * 0.7))
            stage_val = "inference" if pct < 70 else "tracking"
            try:
                asyncio.run_coroutine_threadsafe(
                    _isolated_update_job({"progress": progress_val, "stage": stage_val}),
                    loop
                )
            except Exception:
                pass

        await _isolated_update_job({"stage": "inference"})

        processor = VideoProcessor(output_path=annotated_video_path)
        
        ml_result = await asyncio.to_thread(
            processor.process_video,
            video_path=temp_video_path,
            bus_id=bus_id,
            conf_threshold=conf_threshold,
            sample_fps=sample_fps,
            stability_frames=stability_frames,
            progress_callback=on_progress,
            emit_to_backend=False,
            start_lat=start_lat,
            start_lng=start_lng,
            end_lat=end_lat,
            end_lng=end_lng
        )

        if ml_result["status"] == "error":
            raise ValueError(ml_result.get("error") or "ML video processing encountered an error")

        raw_events = ml_result.get("events", [])
        processed_events = []
        
        # Spatial Fusion and DB ingestion
        async with IsolatedSessionLocal() as session:
            await ensure_bus_exists(session, bus_id)
            
            for event_data in raw_events:
                detection_event = DetectionEvent(**event_data)
                result_issue = await process_detection_event(session, detection_event)
                if result_issue:
                    event_data["issue_id"] = result_issue.id
                    event_data["issue_status"] = result_issue.status
                    event_data["issue_priority"] = result_issue.priority
                processed_events.append(event_data)

        events_to_persist = processed_events or [
            {
                **ev,
                "inspection_id": inspection_id,
                "route_id": route_id,
                "route_name": route_name,
                "location_source": "INTERPOLATED_FROM_CONFIGURED_ROUTE",
                "location_confidence": "demo_route",
            }
            for ev in raw_events
        ]

        elapsed = round(time.time() - start_time, 2)
        await _isolated_update_job({
            "status": "completed",
            "stage": "complete",
            "progress": 100,
            "events": events_to_persist,
            "annotated_video_url": annotated_video_url if (annotated_video_path and os.path.exists(annotated_video_path)) else None,
            "statistics": {
                "total_frames": total_frames,
                "sampled_frames": ml_result.get("sampled_frames", 0),
                "raw_detections": ml_result.get("detections_raw", 0),
                "filtered_detections": ml_result.get("detections_filtered", 0),
                "tracks": ml_result.get("tracks", 0),
                "emitted_events": len(events_to_persist),
                "processing_time": elapsed
            }
        })
        logger.info(f"AI Inspection {inspection_id} completed successfully in {elapsed}s.")

    except Exception as e:
        logger.error(f"AI Inspection {inspection_id} failed: {e}", exc_info=True)
        await _isolated_update_job({
            "status": "failed",
            "stage": "error",
            "progress": 100,
            "error": str(e)
        })
    finally:
        await isolated_engine.dispose()
        if os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except Exception:
                pass


class LibraryInspectionRequest(BaseModel):
    video_filename: str = "test_video.mp4"
    bus_id: str = "BUS-001"
    sample_fps: int = 1
    conf_threshold: float = 0.10
    stability_frames: int = 1
    generate_annotated: bool = True
    route_id: str = "DEL-NCR-01"
    route_name: str = "Delhi - Noida Corridor"
    start_lat: float = 28.6139
    start_lng: float = 77.2090
    end_lat: float = 28.5355
    end_lng: float = 77.3910
    capture_started_at: Optional[str] = ""


@router.get("/videos")
async def list_library_videos():
    """
    Returns verified video library assets with truthful technical metadata
    and default bus/corridor transit associations.
    """
    videos = []
    if not os.path.isdir(VIDEOS_DIR):
        return videos

    for root, _, files in os.walk(VIDEOS_DIR):
        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext in ALLOWED_EXTENSIONS:
                abs_path = os.path.join(root, fname)
                rel_path = os.path.relpath(abs_path, VIDEOS_DIR).replace("\\", "/")
                size_bytes = os.path.getsize(abs_path)
                meta = probe_video_file(abs_path)

                if "clean_road" in fname:
                    bus_id = "BUS-002"
                    route_id = "DEL-NCR-02"
                    route_name = "Ring Road Express"
                    start_lat, start_lng = 28.6139, 77.2090
                    end_lat, end_lng = 28.6250, 77.2200
                    desc = "Clean road baseline test asset (0 defects expected)."
                    tag = "Baseline Calibration"
                else:
                    bus_id = "BUS-001"
                    route_id = "DEL-NCR-01"
                    route_name = "Delhi - Noida Corridor"
                    start_lat, start_lng = 28.6139, 77.2090
                    end_lat, end_lng = 28.5355, 77.3910
                    desc = "Delhi-Noida corridor run with road distress (potholes & cracks)."
                    tag = "Road Distress Asset"

                videos.append({
                    "filename": fname,
                    "rel_path": rel_path,
                    "video_url": f"/videos/{rel_path}",
                    "size_bytes": size_bytes,
                    "duration": meta["duration"],
                    "fps": meta["fps"],
                    "resolution": meta["resolution"],
                    "width": meta["width"],
                    "height": meta["height"],
                    "total_frames": meta["total_frames"],
                    "default_bus_id": bus_id,
                    "default_route_id": route_id,
                    "default_route_name": route_name,
                    "default_start_lat": start_lat,
                    "default_start_lng": start_lng,
                    "default_end_lat": end_lat,
                    "default_end_lng": end_lng,
                    "description": desc,
                    "status_label": tag,
                    "metadata_source": "configured_route_context"
                })
    return videos


@router.post("/library")
async def run_library_inspection(
    payload: LibraryInspectionRequest,
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.admin, UserRole.operator, UserRole.officer]))
):
    """
    Triggers real YOLO AI road inspection directly on an existing video library asset.
    """
    # Strict directory traversal protection
    clean_name = os.path.splitdrive(payload.video_filename)[1].lstrip(r"\/")
    clean_name = os.path.normpath(clean_name).lstrip(r"\/")
    real_videos_dir = os.path.abspath(VIDEOS_DIR)
    source_video_path = os.path.abspath(os.path.join(real_videos_dir, clean_name))

    if not source_video_path.startswith(real_videos_dir + os.sep) and source_video_path != real_videos_dir:
        raise HTTPException(status_code=400, detail="Invalid video path traversal")

    if not os.path.isfile(source_video_path):
        # Fallback: search by basename in subdirectories of VIDEOS_DIR
        base_target = os.path.basename(clean_name)
        candidate = None
        for root, _, files in os.walk(real_videos_dir):
            if base_target in files:
                candidate = os.path.join(root, base_target)
                break
        if candidate and os.path.isfile(candidate):
            source_video_path = candidate
        else:
            raise HTTPException(status_code=404, detail=f"Library video '{payload.video_filename}' not found")

    await ensure_bus_exists(session, payload.bus_id)

    inspection_id = f"INSP-{uuid.uuid4().hex[:8].upper()}"
    temp_dir = os.path.join(tempfile.gettempdir(), "aih_pothole_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_video_path = os.path.join(temp_dir, f"{inspection_id}_{os.path.basename(source_video_path)}")

    # Copy file so worker cleanup will not affect the library asset
    shutil.copyfile(source_video_path, temp_video_path)

    new_job = InspectionJob(
        id=inspection_id,
        filename=os.path.basename(source_video_path),
        bus_id=payload.bus_id,
        status="pending",
        stage="upload",
        progress=5
    )
    session.add(new_job)
    await session.commit()

    run_inspection_isolated_thread(
        inspection_id,
        temp_video_path,
        os.path.basename(source_video_path),
        payload.bus_id,
        payload.sample_fps,
        payload.conf_threshold,
        payload.stability_frames,
        payload.generate_annotated,
        payload.route_id,
        payload.route_name,
        payload.start_lat,
        payload.start_lng,
        payload.end_lat,
        payload.end_lng,
        payload.capture_started_at or "not_provided"
    )

    return {
        "inspection_id": inspection_id,
        "status": "pending",
        "message": f"AI road inspection initiated for library video '{payload.video_filename}'."
    }


@router.post("/video")
async def upload_inspection_video(
    video: UploadFile = File(...),
    bus_id: str = Form("BUS-001"),
    sample_fps: int = Form(1),
    conf_threshold: float = Form(0.10),
    stability_frames: int = Form(1),
    generate_annotated: bool = Form(True),
    route_id: str = Form("DEL-NCR-01"),
    route_name: str = Form("Delhi - Noida Corridor"),
    start_lat: float = Form(28.6139),
    start_lng: float = Form(77.2090),
    end_lat: float = Form(28.5355),
    end_lng: float = Form(77.3910),
    capture_started_at: str = Form(""),
    session: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_role([UserRole.admin, UserRole.operator, UserRole.officer]))
):
    """
    Accepts road inspection video upload and triggers real YOLO AI inspection in the background.
    Returns inspection_id immediately for polling or streaming status.
    """
    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    await ensure_bus_exists(session, bus_id)

    inspection_id = f"INSP-{uuid.uuid4().hex[:8].upper()}"
    temp_dir = os.path.join(tempfile.gettempdir(), "aih_pothole_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Path traversal protection: sanitize filename and use random UUID suffix
    original_name = os.path.basename(video.filename or "upload.mp4")
    safe_disk_filename = f"{inspection_id}_{uuid.uuid4().hex[:8]}{ext}"
    temp_video_path = os.path.join(temp_dir, safe_disk_filename)

    bytes_written = 0
    with open(temp_video_path, "wb") as f:
        while chunk := await video.read(1024 * 1024):  
            bytes_written += len(chunk)
            if bytes_written > MAX_UPLOAD_SIZE:
                f.close()
                if os.path.exists(temp_video_path):
                    os.remove(temp_video_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"Video file exceeds maximum allowed size"
                )
            f.write(chunk)

    new_job = InspectionJob(
        id=inspection_id,
        filename=original_name,
        bus_id=bus_id,
        status="pending",
        stage="upload",
        progress=5
    )
    session.add(new_job)
    await session.commit()

    # Launch fully isolated worker thread
    run_inspection_isolated_thread(
        inspection_id,
        temp_video_path,
        original_name,
        bus_id,
        sample_fps,
        conf_threshold,
        stability_frames,
        generate_annotated,
        route_id,
        route_name,
        start_lat,
        start_lng,
        end_lat,
        end_lng,
        capture_started_at or "not_provided"
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
        "events": job.events or [],
        "annotated_video_url": job.annotated_video_url,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
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
