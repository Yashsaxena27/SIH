import os
import cv2
import numpy as np
from ultralytics import YOLO
import json

def diagnose(video_path="ml/videos/test_video.mp4", model_path="ml/models/best.pt", conf_thresh=0.25):
    print(f"=== REAL VIDEO ML FORENSIC DIAGNOSTIC ===")
    print(f"Video: {video_path}")
    print(f"Model: {model_path}")
    print(f"Configured confidence threshold: {conf_thresh}")
    
    if not os.path.exists(video_path):
        print(f"ERROR: Video not found at {video_path}")
        return
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found at {model_path}")
        return

    # 1. Inspect Video Properties
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    print(f"\n[1] Video Properties:")
    print(f"    Total Frames: {total_frames}")
    print(f"    FPS: {fps:.2f}")
    print(f"    Resolution: {width}x{height} (Vertical: {height > width})")
    print(f"    Duration: {duration:.2f} seconds")

    # 2. Load Model
    model = YOLO(model_path)
    print(f"\n[2] Model Info:")
    print(f"    Names: {model.names}")
    
    # 3. Frame Sampling (Sample every 30 frames ~ 1 FPS)
    sample_interval = max(1, int(round(fps)))
    print(f"\n[3] Sampling Strategy: Every {sample_interval} frames (~1 FPS)")

    sampled_frames_count = 0
    frames_with_raw_detections = 0
    total_raw_detections = 0
    raw_by_class = {"D00": 0, "D10": 0, "D20": 0, "D40": 0, "Other": 0}
    raw_confidences = []
    
    # Detections after configured conf_thresh
    filtered_detections = []
    
    # Also evaluate ALL frames vs sampled frames
    all_frames_raw_dets = 0
    all_frames_confidences = []

    frame_idx = 0
    sampled_detections_per_frame = {}

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        is_sampled = (frame_idx % sample_interval == 0)

        # Run inference with conf=0.01 to see absolute raw output
        results = model(frame, conf=0.01, verbose=False)
        boxes = results[0].boxes

        if len(boxes) > 0:
            all_frames_raw_dets += len(boxes)
            for box in boxes:
                all_frames_confidences.append(float(box.conf[0].item()))

        if is_sampled:
            sampled_frames_count += 1
            frame_dets = []
            if len(boxes) > 0:
                frames_with_raw_detections += 1
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    cls_name = model.names.get(cls_id, str(cls_id))
                    
                    total_raw_detections += 1
                    raw_confidences.append(conf)
                    if cls_name in raw_by_class:
                        raw_by_class[cls_name] += 1
                    else:
                        raw_by_class["Other"] += 1

                    bbox = [int(v) for v in box.xyxy[0].tolist()]
                    det_info = {
                        "frame_idx": frame_idx,
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": conf,
                        "bbox": bbox
                    }
                    frame_dets.append(det_info)

                    if conf >= conf_thresh:
                        filtered_detections.append(det_info)

            sampled_detections_per_frame[frame_idx] = frame_dets

        frame_idx += 1

    cap.release()

    print(f"\n[4] RAW INFERENCE DIAGNOSTIC (at sample rate 1 FPS):")
    print(f"    A. Sampled frames count: {sampled_frames_count}")
    print(f"    B. Frames with raw detections (conf >= 0.01): {frames_with_raw_detections}")
    print(f"    C. Total raw detections: {total_raw_detections}")
    print(f"    D. Raw detections by class: {raw_by_class}")
    
    if raw_confidences:
        confs = np.array(raw_confidences)
        print(f"    E. Confidences on sampled frames:")
        print(f"       Min: {confs.min():.4f}")
        print(f"       Max: {confs.max():.4f}")
        print(f"       Mean: {confs.mean():.4f}")
        print(f"       Median: {np.median(confs):.4f}")
        print(f"       75th percentile: {np.percentile(confs, 75):.4f}")
        print(f"       90th percentile: {np.percentile(confs, 90):.4f}")
    else:
        print(f"    E. Confidences: NONE on sampled frames")

    removed_by_thresh = total_raw_detections - len(filtered_detections)
    print(f"    F. Number removed by threshold ({conf_thresh}): {removed_by_thresh}")
    print(f"    G. Number of detections after filtering: {len(filtered_detections)}")
    for d in filtered_detections:
        print(f"       - Frame {d['frame_idx']}: {d['class_name']} ({d['confidence']:.3f}) at {d['bbox']}")

    print(f"\n[5] ALL-FRAMES SCAN (checking if sampling missed detections):")
    print(f"    Total frames: {total_frames}")
    print(f"    All frames raw detections (conf >= 0.01): {all_frames_raw_dets}")
    if all_frames_confidences:
        all_confs = np.array(all_frames_confidences)
        print(f"    All frames Confidences -> Min: {all_confs.min():.4f}, Max: {all_confs.max():.4f}, Mean: {all_confs.mean():.4f}")
        print(f"    Detections with conf >= 0.10: {(all_confs >= 0.10).sum()}")
        print(f"    Detections with conf >= 0.15: {(all_confs >= 0.15).sum()}")
        print(f"    Detections with conf >= 0.20: {(all_confs >= 0.20).sum()}")
        print(f"    Detections with conf >= 0.25: {(all_confs >= 0.25).sum()}")

    # 6. Tracker Simulation
    print(f"\n[6] TRACKER & SEVERITY & EVENT TRACE:")
    from ml.engine.tracker import CentroidTracker
    from ml.engine.severity import SeverityEstimator

    # Test with current default stability_frames
    for stability in [1, 2, 3, 5]:
        tracker = CentroidTracker(stability_frames=stability)
        tracks_created = 0
        tracks_confirmed = 0
        events_emitted = []

        for f_idx in sorted(sampled_detections_per_frame.keys()):
            # Filter by conf_thresh
            dets = [d for d in sampled_detections_per_frame[f_idx] if d["confidence"] >= conf_thresh]
            rects = [d["bbox"] for d in dets]
            objects, bboxes, ready_to_emit = tracker.update(rects)
            tracks_created = tracker.next_object_id
            
            for obj_id, bbox in ready_to_emit:
                tracks_confirmed += 1
                sev = SeverityEstimator.estimate(bbox, width, height)
                events_emitted.append({"obj_id": obj_id, "bbox": bbox, "frame": f_idx, "severity": sev})

        print(f"    [Stability={stability}] Tracks Created: {tracks_created} | Tracks Confirmed: {tracks_confirmed} | Events Emitted: {len(events_emitted)}")
        for ev in events_emitted:
            print(f"        -> Obj {ev['obj_id']} at frame {ev['frame']}: severity={ev['severity']}")

    # Save diagnostic summary
    summary = {
        "total_frames": total_frames,
        "sampled_frames": sampled_frames_count,
        "frames_with_raw_detections": frames_with_raw_detections,
        "total_raw_detections": total_raw_detections,
        "raw_by_class": raw_by_class,
        "conf_threshold": conf_thresh,
        "filtered_detections_count": len(filtered_detections),
        "filtered_detections": filtered_detections,
        "all_frames_raw_dets": all_frames_raw_dets
    }
    with open("ml/scripts/diagnostic_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

if __name__ == "__main__":
    diagnose()
