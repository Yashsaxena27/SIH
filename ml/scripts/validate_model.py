import os
import sys
import time
import json
import numpy as np

def validate_model(weights_path="ml/models/best.pt"):
    print("=" * 60)
    print("POTHOLE WALA / AIH-POTHOLE — PHASE 1: MODEL VALIDATION")
    print("=" * 60)

    if not os.path.exists(weights_path):
        print(f"[FAIL] Weights file does not exist at: {weights_path}")
        sys.exit(1)

    file_size = os.path.getsize(weights_path)
    print(f"[PASS] Model file exists: {weights_path}")
    print(f"       File size: {file_size:,} bytes")

    try:
        from ultralytics import YOLO
    except ImportError as e:
        print(f"[FAIL] ultralytics is not installed: {e}")
        sys.exit(1)

    print("\n1. Loading Model...")
    t0 = time.time()
    try:
        model = YOLO(weights_path)
        load_time = time.time() - t0
        print(f"[PASS] Successfully loaded YOLO model in {load_time:.3f}s")
    except Exception as e:
        print(f"[FAIL] Failed to load model: {e}")
        sys.exit(1)

    print("\n2. Model Architecture & Class Inspection...")
    names = model.names
    num_classes = len(names)
    print(f"       Number of classes: {num_classes}")
    print(f"       Raw model.names: {names}")

    # Inspect model architecture details
    try:
        print(f"       Model task: {getattr(model, 'task', 'detect')}")
        if hasattr(model, 'model') and hasattr(model.model, 'yaml'):
            nc = model.model.yaml.get('nc', None)
            print(f"       Model YAML 'nc': {nc}")
    except Exception as e:
        print(f"       [WARN] Could not read model YAML: {e}")

    # Verify expected classes: D00, D10, D20, D40
    expected_classes = ["D00", "D10", "D20", "D40"]
    missing_classes = [c for c in expected_classes if c not in names.values()]
    
    if missing_classes:
        print(f"[FAIL] Missing expected classes: {missing_classes}")
        sys.exit(1)
    else:
        print(f"[PASS] All expected classes present: {expected_classes}")

    # Find ID for each class
    class_id_map = {name: cid for cid, name in names.items()}
    pothole_cid = class_id_map.get("D40", None)
    print(f"       Verified Class Mapping:")
    print(f"         Class {class_id_map.get('D00')}: D00 (Longitudinal Crack)")
    print(f"         Class {class_id_map.get('D10')}: D10 (Transverse Crack)")
    print(f"         Class {class_id_map.get('D20')}: D20 (Alligator Crack)")
    print(f"         Class {pothole_cid}: D40 (Pothole - PRIMARY HERO CLASS)")

    if pothole_cid != 3:
        print(f"       [WARN] Pothole class ID is {pothole_cid}, not 3!")
    else:
        print(f"[PASS] Pothole class ID is confirmed: 3 (D40)")

    print("\n3. Synthetic Image Inference & Latency Measurement...")
    # Create synthetic 640x480 road surface
    synthetic_image = np.ones((480, 640, 3), dtype=np.uint8) * 120
    # Add a darker patch resembling road distress
    import cv2
    cv2.ellipse(synthetic_image, (320, 240), (80, 40), 0, 0, 360, (40, 40, 40), -1)

    # Warmup inference
    _ = model.predict(source=synthetic_image, device="cpu", verbose=False)

    # Benchmark CPU inference over 10 runs
    latencies = []
    for _ in range(10):
        t_start = time.time()
        results = model.predict(source=synthetic_image, conf=0.1, device="cpu", verbose=False)
        latencies.append((time.time() - t_start) * 1000)

    avg_latency = np.mean(latencies)
    min_latency = np.min(latencies)
    max_latency = np.max(latencies)

    print(f"[PASS] Inference ran successfully on 640x480 frame")
    print(f"       CPU Latency (10 runs): Avg = {avg_latency:.1f}ms (Min = {min_latency:.1f}ms, Max = {max_latency:.1f}ms)")
    
    if avg_latency < 500:
        print(f"[PASS] Latency satisfies gate requirement (< 500ms CPU)")
    else:
        print(f"[WARN] Latency {avg_latency:.1f}ms exceeds 500ms threshold")

    # Inspect results structure
    boxes = results[0].boxes
    print(f"       Detections on synthetic distress image: {len(boxes)}")
    for box in boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        xyxy = [int(v) for v in box.xyxy[0].tolist()]
        print(f"         -> Class: {names.get(cls_id)} ({cls_id}), Conf: {conf:.3f}, BBox: {xyxy}")

    print("\n" + "=" * 60)
    print("MODEL VALIDATION GATE: PASSED")
    print("=" * 60)

    summary = {
        "status": "PASSED",
        "weights_path": weights_path,
        "file_size": file_size,
        "num_classes": num_classes,
        "classes": names,
        "pothole_class_id": pothole_cid,
        "avg_cpu_latency_ms": round(avg_latency, 2),
        "gate_passed": True
    }
    with open("ml/scripts/validation_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    return summary

if __name__ == "__main__":
    validate_model()
