import pytest
from ml.engine.severity import SeverityEstimator
from ml.engine.tracker import CentroidTracker

def test_severity_estimator():
    # 100x100 box in a 1000x1000 frame (1% area)
    # Area ratio: 10000 / 1000000 = 0.01 -> medium
    assert SeverityEstimator.estimate([0, 0, 100, 100], 1000, 1000) == "medium"
    
    # 500x500 box (25% area) -> critical
    assert SeverityEstimator.estimate([0, 0, 500, 500], 1000, 1000) == "critical"

def test_centroid_tracker():
    tracker = CentroidTracker(stability_frames=3, max_disappeared=5)
    
    # Frame 1
    objs, bboxes, ready = tracker.update([[10, 10, 30, 30]])
    assert len(objs) == 1
    assert len(ready) == 0
    
    # Frame 2
    objs, bboxes, ready = tracker.update([[12, 12, 32, 32]])
    assert len(ready) == 0
    
    # Frame 3
    objs, bboxes, ready = tracker.update([[15, 15, 35, 35]])
    assert len(ready) == 1 # Now it's stable and emitted
    
    # Frame 4
    objs, bboxes, ready = tracker.update([[15, 15, 35, 35]])
    assert len(ready) == 0 # Already emitted, should not emit duplicate
