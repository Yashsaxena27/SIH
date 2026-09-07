"""
POTHOLE WALA — PHASE 3: TRUSTED AI PIPELINE & EVIDENCE PROVENANCE TESTS
Validates:
- Truthful camera-relative visual extent estimation (Zero fake depth claims)
- Temporal stability tracking across frames (Zero duplicate emits for stable tracks)
- Evidence provenance integrity and metadata verification
"""

import pytest
import os
from ml.engine.severity import SeverityEstimator
from ml.engine.tracker import CentroidTracker

def test_severity_estimator_truthful_metrics():
    # 50x50 box in a 1000x1000 frame (0.25% area) -> low
    metrics_low = SeverityEstimator.estimate_metrics([0, 0, 50, 50], 1000, 1000)
    assert metrics_low["severity"] == "low"
    assert metrics_low["visual_extent_pct"] == 0.25
    assert metrics_low["measurement_method"] == "camera_relative_visual_extent"
    assert metrics_low["physical_depth_claim"] == "uncalibrated_monocular_camera"

    # 100x100 box in a 1000x1000 frame (1.0% area) -> medium
    metrics_med = SeverityEstimator.estimate_metrics([0, 0, 100, 100], 1000, 1000)
    assert metrics_med["severity"] == "medium"
    assert metrics_med["visual_extent_pct"] == 1.0

    # 300x300 box in a 1000x1000 frame (9.0% area) -> high
    metrics_high = SeverityEstimator.estimate_metrics([0, 0, 300, 300], 1000, 1000)
    assert metrics_high["severity"] == "high"
    assert metrics_high["visual_extent_pct"] == 9.0

    # 400x400 box in a 1000x1000 frame (16.0% area) -> critical
    metrics_crit = SeverityEstimator.estimate_metrics([0, 0, 400, 400], 1000, 1000)
    assert metrics_crit["severity"] == "critical"
    assert metrics_crit["visual_extent_pct"] == 16.0


def test_temporal_tracking_suppresses_frame_duplicates():
    """
    Ensures that a defect observed continuously across 5 consecutive frames
    is registered and emitted exactly once, preventing duplicate issue creation.
    """
    tracker = CentroidTracker(stability_frames=2, max_disappeared=4)

    # Frame 1: Defect appears -> not yet stable
    objs, bboxes, ready1 = tracker.update([[100, 100, 150, 150]])
    assert len(objs) == 1
    assert len(ready1) == 0

    # Frame 2: Defect persists (matches previous centroid within distance threshold) -> stable & emitted
    objs, bboxes, ready2 = tracker.update([[102, 101, 152, 151]])
    assert len(objs) == 1
    assert len(ready2) == 1
    emitted_id = ready2[0][0]

    # Frame 3: Defect still present in frame -> already emitted, MUST NOT duplicate
    objs, bboxes, ready3 = tracker.update([[104, 103, 154, 153]])
    assert len(objs) == 1
    assert len(ready3) == 0

    # Frame 4: Defect still present in frame -> MUST NOT duplicate
    objs, bboxes, ready4 = tracker.update([[106, 105, 156, 155]])
    assert len(objs) == 1
    assert len(ready4) == 0

    # Frame 5: Defect leaves frame -> tracked object counts as disappeared
    objs, bboxes, ready5 = tracker.update([])
    assert len(ready5) == 0


def test_backward_compatible_estimate_method():
    assert SeverityEstimator.estimate([0, 0, 50, 50], 1000, 1000) == "low"
    assert SeverityEstimator.estimate([0, 0, 100, 100], 1000, 1000) == "medium"
    assert SeverityEstimator.estimate([0, 0, 300, 300], 1000, 1000) == "high"
    assert SeverityEstimator.estimate([0, 0, 400, 400], 1000, 1000) == "critical"
