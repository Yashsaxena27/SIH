import os
import sys
import time
import json
import asyncio
import cv2
import numpy as np

# Ensure root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from ml.pipeline.video_processor import VideoProcessor
from ml.core.config import settings as ml_settings
from app.core.database import AsyncSessionLocal
from app.services.ingestion import ensure_bus_exists, process_detection_event
from app.schemas.ingestion import DetectionEvent, GeoPoint
from app.models.domain import UrbanIssue, Detection, Observation, Ticket, Bus, Department
from sqlalchemy import select, func

async def validate_real_video():
    video_path = "ml/videos/test_video.mp4"
    model_path = "ml/models/best.pt"
    
    print("=" * 60)
    print("AIH-POTHOLE REAL VIDEO ML & DATABASE VALIDATION")
    print("=" * 60)
    
    # 1. Video metadata
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = round(total_frames / fps, 2)
    cap.release()
    
    print(f"\n[A] Video Properties:")
    print(f"    Path: {video_path}")
    print(f"    Total frames: {total_frames}")
    print(f"    FPS: {fps:.2f}")
    print(f"    Resolution: {width}x{height}")
    print(f"    Duration: {duration}s")
    
    # 2. Run Forensic VideoProcessor
    print(f"\n[B] Executing VideoProcessor on real video (MOCK_ML_MODE=False)...")
    ml_settings.MOCK_ML_MODE = False
    
    processor = VideoProcessor(output_path=None) # no annotated video for quick run
    
    t0 = time.time()
    result = processor.process_video(
        video_path=video_path,
        bus_id="BUS-001",
        conf_threshold=0.10,
        sample_fps=1,
        stability_frames=1,
        emit_to_backend=False
    )
    t_proc = round(time.time() - t0, 2)
    
    print(f"    Processing Time: {t_proc}s")
    print(f"    Sampled Frames: {result['sampled_frames']}")
    print(f"    Raw Detections Count: {result['detections_raw']}")
    print(f"    Tracks Created: {result['tracks']}")
    print(f"    Emitted Events Count: {result['emitted_events']}")
    
    events = result['events']
    print(f"\n[C] Emitted Events Detail:")
    for idx, ev in enumerate(events):
        print(f"    Event {idx+1}: {ev['event_id']}")
        print(f"       Class: {ev['detection_type']}")
        print(f"       Confidence: {ev['confidence']}")
        print(f"       Severity: {ev['severity']}")
        print(f"       Location: {ev['location']}")
        print(f"       Evidence URL: {ev['evidence_url']}")
        
        # Verify physical evidence file
        evidence_filename = os.path.basename(ev['evidence_url'])
        local_evidence_path = os.path.join("backend", "evidence", evidence_filename)
        exists = os.path.exists(local_evidence_path)
        size = os.path.getsize(local_evidence_path) if exists else 0
        print(f"       Physical File: {local_evidence_path} (exists={exists}, size={size} bytes)")
        assert exists and size > 0, f"Evidence file {local_evidence_path} does not exist or is empty!"

    # 3. Database Ingestion & PostGIS Spatial Fusion
    print(f"\n[D] Testing Database Ingestion & Spatial Fusion...")
    created_issues = []
    
    async with AsyncSessionLocal() as session:
        # Ensure BUS-001 exists
        await ensure_bus_exists(session, "BUS-001")
        
        # Pre-ingestion counts
        pre_det_count = await session.scalar(select(func.count()).select_from(Detection))
        pre_iss_count = await session.scalar(select(func.count()).select_from(UrbanIssue))
        pre_obs_count = await session.scalar(select(func.count()).select_from(Observation))
        
        # Ingest all events from the video
        for ev in events:
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
            ingest_res = await process_detection_event(session, detection_event)
            created_issues.append(ingest_res)
            print(f"       Ingested {ev['event_id']} -> Issue ID: {ingest_res.id} (Status: {ingest_res.status.value}, Priority: {ingest_res.priority.value if hasattr(ingest_res.priority, 'value') else ingest_res.priority})")

        await session.commit()
        
        # Post-ingestion counts
        post_det_count = await session.scalar(select(func.count()).select_from(Detection))
        post_iss_count = await session.scalar(select(func.count()).select_from(UrbanIssue))
        post_obs_count = await session.scalar(select(func.count()).select_from(Observation))
        
        print(f"\n[E] Database Row Changes:")
        print(f"    Detection Rows: {pre_det_count} -> {post_det_count} (+{post_det_count - pre_det_count})")
        print(f"    UrbanIssue Rows: {pre_iss_count} -> {post_iss_count} (+{post_iss_count - pre_iss_count})")
        print(f"    Observation Rows: {pre_obs_count} -> {post_obs_count} (+{post_obs_count - pre_obs_count})")

    # 4. Idempotency Test (Re-send the same events)
    print(f"\n[F] Idempotency Test (Sending duplicate events)...")
    async with AsyncSessionLocal() as session:
        for ev in events:
            detection_event = DetectionEvent(
                event_id=ev["event_id"], # same event_id
                bus_id=ev["bus_id"],
                timestamp=ev["timestamp"],
                location=GeoPoint(lat=ev["location"]["lat"], lng=ev["location"]["lng"]),
                detection_type=ev["detection_type"],
                confidence=ev["confidence"],
                severity=ev["severity"],
                evidence_url=ev["evidence_url"]
            )
            dup_res = await process_detection_event(session, detection_event)
            assert dup_res is None, "Duplicate event must return None (ignored)"
        await session.commit()
        
        final_det_count = await session.scalar(select(func.count()).select_from(Detection))
        assert final_det_count == post_det_count
        print(f"    [PASS] Idempotency verified: duplicate events ignored, no DB explosion.")

    # 5. Multi-Bus Lifecycle Confirmation Test (BUS-002)
    print(f"\n[G] Testing Multi-Bus Confirmation with BUS-002...")
    first_ev = events[0]
    async with AsyncSessionLocal() as session:
        await ensure_bus_exists(session, "BUS-002")
        bus2_event = DetectionEvent(
            event_id="EVT-BUS2-CONFIRM-001",
            bus_id="BUS-002",
            timestamp=first_ev["timestamp"],
            # Within 5 meters of first event (MG Road corridor)
            location=GeoPoint(lat=first_ev["location"]["lat"] + 0.00002, lng=first_ev["location"]["lng"] + 0.00002),
            detection_type=first_ev["detection_type"],
            confidence=0.12,
            severity="medium",
            evidence_url=first_ev["evidence_url"]
        )
        bus2_res = await process_detection_event(session, bus2_event)
        await session.commit()
        
        print(f"    BUS-002 Observation Result: Issue {bus2_res.id} -> Status: {bus2_res.status.value}")
        
        # Verify the issue is now CONFIRMED
        confirmed_issue = await session.get(UrbanIssue, bus2_res.id)
        print(f"    Issue Status in DB: {confirmed_issue.status.value}")
        print(f"    Observation Count: {confirmed_issue.observation_count}")
        print(f"    Unique Bus Count: {confirmed_issue.unique_bus_count}")
        assert confirmed_issue.status.value in ("confirmed", "prioritized", "ticket_created")
        assert confirmed_issue.unique_bus_count >= 2
        print(f"    [PASS] Multi-bus spatial confirmation successfully proven!")

    print("\n" + "=" * 60)
    print("ALL RUNTIME ML & DATABASE VALIDATION CHECKS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(validate_real_video())
