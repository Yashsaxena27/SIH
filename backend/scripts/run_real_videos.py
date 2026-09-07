import os
import time
from ml.pipeline.video_processor import VideoProcessor

videos = [
    "ml/videos/test_video.mp4",
    "ml/videos/video_2026-09-07_19-08-41.mp4",
    "ml/videos/video_2026-09-07_19-08-52.mp4",
]

out_dir = "/app/evidence/annotated_runs"
os.makedirs(out_dir, exist_ok=True)

results = []
for v in videos:
    print(f"=== Processing Real Video: {v} ===")
    assert os.path.isfile(v), f"Missing {v}"
    out_video = os.path.join(out_dir, f"annotated_{os.path.basename(v)}")
    
    t0 = time.time()
    vp = VideoProcessor(output_path=out_video)
    res = vp.process_video(
        video_path=v,
        bus_id="BUS-001",
        start_lat=28.6139,
        start_lng=77.2090,
        end_lat=28.5355,
        end_lng=77.3910,
        conf_threshold=0.10,
        sample_fps=2,
        stability_frames=1,
        emit_to_backend=False
    )
    t_elapsed = time.time() - t0
    
    status = res.get("status")
    total_frames = res.get("total_frames")
    sampled = res.get("sampled_frames")
    duration = res.get("duration")
    raw_det = res.get("detections_raw")
    emitted = res.get("emitted_events")
    video_exists = os.path.isfile(out_video)
    size_bytes = os.path.getsize(out_video) if video_exists else 0
    
    print(f"Status: {status}")
    print(f"Total frames: {total_frames}, Sampled: {sampled}")
    print(f"Duration: {duration}s, Elapsed: {t_elapsed:.2f}s")
    print(f"Raw detections: {raw_det}, Emitted events: {emitted}")
    print(f"Annotated output: {out_video} (exists={video_exists}, size={size_bytes} bytes)")
    print()
    
    results.append({
        "video": v,
        "status": status,
        "total_frames": total_frames,
        "sampled_frames": sampled,
        "duration": duration,
        "processing_time": t_elapsed,
        "raw_detections": raw_det,
        "emitted_events": emitted,
        "output_size_bytes": size_bytes
    })

print("=== REAL VIDEO RUNS COMPLETED SUCCESSFULLY ===")
import json
print(json.dumps(results, indent=2))
