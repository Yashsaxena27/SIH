import os
import sqlite3
import numpy as np
import pytest

from ml.engine.detector import ModelInferenceEngine
from ml.pipeline.gps_simulator import get_gps_for_frame, BENGALURU_ROUTE
from ml.pipeline.evidence_store import LocalEvidenceStore
from ml.pipeline.client import BackendClient
from ml.pipeline.video_processor import VideoProcessor

def test_model_inference_and_class_mapping():
    engine = ModelInferenceEngine()
    assert not engine.mock_mode, "Engine fell back to mock mode"
    assert engine.model is not None, "Model failed to load"
    
    # 4 classes verified
    assert len(engine.classes) == 4
    assert engine.DAMAGE_TYPE_MAP["D40"] == "pothole"
    assert engine.DAMAGE_TYPE_MAP["D00"] == "longitudinal_crack"
    assert engine.DAMAGE_TYPE_MAP["D10"] == "transverse_crack"
    assert engine.DAMAGE_TYPE_MAP["D20"] == "alligator_crack"

    # Prediction on test frame
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128
    dets = engine.predict_frame(frame)
    assert isinstance(dets, list)

def test_bengaluru_gps_simulator():
    lat0, lng0 = get_gps_for_frame(0, 100)
    assert lat0 == 12.9716 and lng0 == 77.5946

    lat_end, lng_end = get_gps_for_frame(99, 100)
    assert abs(lat_end - 12.9400) < 0.001
    assert abs(lng_end - 77.6300) < 0.001

    # Bounds check
    for i in range(10):
        lat, lng = get_gps_for_frame(i * 10, 100)
        assert 12.0 < lat < 14.0
        assert 77.0 < lng < 78.0

def test_evidence_store_abstraction(tmp_path):
    storage_dir = str(tmp_path / "evidence")
    store = LocalEvidenceStore(storage_dir=storage_dir, base_url="/evidence")
    
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[50:150, 50:150] = 255
    
    url = store.save_crop(frame, (50, 50, 150, 150), {"bus_id": "BUS-TEST", "event_id": "EVT-TEST"})
    assert url.startswith("/evidence/BUSTEST_EVT-TEST_")
    assert url.endswith(".jpg")
    
    filename = url.split("/")[-1]
    saved_file = os.path.join(storage_dir, filename)
    assert os.path.exists(saved_file)
    assert os.path.getsize(saved_file) > 0

def test_offline_sqlite_buffering(tmp_path):
    db_path = str(tmp_path / "test_buffer.db")
    client = BackendClient(db_path=db_path)
    
    event = {
        "event_id": "EVT-UNIT-01",
        "bus_id": "BUS-01",
        "timestamp": "2026-09-03T12:00:00",
        "location": {"lat": 12.9716, "lng": 77.5946},
        "detection_type": "pothole",
        "confidence": 0.89,
        "severity": "high",
        "evidence_url": "/evidence/sample.jpg"
    }
    
    # Offline transmission buffers locally
    success = client.send_detection(event)
    assert success is False
    assert client.get_unsynced_count() == 1
    
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT event_id, synced FROM event_buffer WHERE event_id = ?", ("EVT-UNIT-01",)).fetchone()
        assert row is not None
        assert row[0] == "EVT-UNIT-01"
        assert row[1] == 0

def test_video_processor_e2e(tmp_path):
    output_video = str(tmp_path / "out.mp4")
    evidence_dir = str(tmp_path / "evidence")
    store = LocalEvidenceStore(storage_dir=evidence_dir, base_url="/evidence")
    
    vp = VideoProcessor(output_path=output_video, evidence_store=store)
    # Process mock video with mock ML mode enabled for deterministic box generation
    os.environ["MOCK_ML_MODE"] = "true"
    vp.detector.mock_mode = True
    
    res = vp.process_video("mock_input.mp4", bus_id="BUS-001")
    assert res["status"] == "success"
    assert res["total_frames"] > 0
    assert res["emitted_events"] > 0
    
    # Verify event structure
    first_event = res["events"][0]
    assert first_event["bus_id"] == "BUS-001"
    assert 12.0 < first_event["location"]["lat"] < 14.0
    assert 77.0 < first_event["location"]["lng"] < 78.0
    assert first_event["severity"] in ["low", "medium", "high", "critical"]
    assert first_event["evidence_url"].startswith("/evidence/")
