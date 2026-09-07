# PHASE 0 — AI/CV & GIS/POSTGIS SUBSYSTEM AUDIT
**Project:** POTHOLE WALA — Infrastructure Intelligence Network  
**Audit Date:** September 2026  
**Auditor Roles:** Senior Principal ML/CV Engineer, Senior PostGIS Engineer  
**Scope:** Deep technical audit of the neural network weights, tracking algorithms, severity estimation heuristics, PostGIS spatial queries, and jurisdiction boundary resolution.

---

## 1. Machine Learning & Computer Vision Subsystem

### A. YOLO Model Weights & Architecture Inspection
- **Model File:** `ml/models/best.pt`
- **File Size:** 207,405,087 bytes (~197.8 MB)
- **Format:** PyTorch Checkpoint (ZIP Archive containing PyTorch state dict). Note: Tracked directly in Git, not Git LFS.
- **Architecture:** YOLOv8 Extra-Large/Medium detection backbone (`ultralytics.nn.tasks.DetectionModel`).
- **Class Label Inspection:**
  Direct programmatic inspection of `best.pt` via `torch.load()` reveals:
  ```python
  model['model'].names = {0: 'pothole'}
  ```
- **Ground Truth vs Marketing Claims:**
  - **TRUTH:** The model is strictly a **single-class detector** trained exclusively on `pothole`.
  - **DEFICIT:** The model has **ZERO** capability to detect road cracks (transverse, longitudinal, alligator), rutting, manhole anomalies, speed bumps, or waterlogging.
  - **Config Conflict:** `training/road_damage.yaml` references RDD2022 classes (`D00`: Longitudinal Crack, `D10`: Transverse Crack, `D20`: Alligator Crack, `D40`: Pothole), but the compiled weights file in the repository was never trained on these multi-defect labels.
  - **Benchmarks:** Evaluation metrics, confusion matrices, precision-recall curves, and validation datasets are **NOT PRESENT** in the repository.

### B. Tracking Algorithm (`ml/engine/tracker.py`)
- **Implementation:** Euclidean Centroid Tracker (`CentroidTracker`).
- **Parameters:**
  - Maximum disappearance threshold: `maxDisappeared = 30` frames.
  - Maximum association distance: `maxDistance = 50` pixels.
- **Mechanism:** Computes pairwise Euclidean distances between centroids of existing tracked objects and centroids of incoming bounding boxes using `scipy.spatial.distance.cdist`.
- **Operational Limitations:**
  - Lacks motion estimation (Kalman filtering) and appearance features (DeepSORT / ByteTrack).
  - If a bus decelerates or stops at a traffic light, or if a pothole is temporarily occluded by passing vehicles for >30 frames, the tracker loses continuity and assigns a brand-new `objectID`.

### C. Severity Estimation Heuristic (`ml/engine/severity.py`)
- **Source Code (`ml/engine/severity.py:8–27`):**
  ```python
  def estimate_severity(box: Tuple[int, int, int, int], frame_shape: Tuple[int, int]) -> SeverityLevel:
      x1, y1, x2, y2 = box
      box_area = (x2 - x1) * (y2 - y1)
      frame_area = frame_shape[0] * frame_shape[1]
      ratio = box_area / float(frame_area)
      
      if ratio > 0.15:
          return SeverityLevel.CRITICAL
      elif ratio > 0.05:
          return SeverityLevel.HIGH
      elif ratio >= 0.01:
          return SeverityLevel.MEDIUM
      else:
          return SeverityLevel.LOW
  ```
- **CRITICAL JURY RISK — Depth Estimation Claims:**
  - Any claim that POTHOLE WALA measures "pothole depth", "millimeter dimensions", or "volumetric damage" is **SCIENTIFICALLY FALSE**.
  - The calculation is a 2D bounding box surface pixel ratio.
  - **Perspective Foreshortening Vulnerability:** Due to monocular camera geometry, a small pothole directly in front of the vehicle bumper occupies a large pixel area and is classified as `CRITICAL`, whereas a dangerous 1-meter-deep crater 25 meters down the road occupies <1% of the frame and is classified as `LOW`.
  - **Presentation Directive:** Never claim 3D depth sensing to judges. Position this truthfully as *"Camera-relative 2D bounding box visual hazard ratio"*.

---

## 2. GIS & PostGIS Spatial Fusion Engine

### A. Spatial Deduplication Algorithm (`backend/app/services/spatial_fusion.py`)
- **Spatial Operation:** PostGIS `ST_DWithin` with a 15-meter geodesic buffer.
- **SQL Execution:**
  ```python
  query = select(UrbanIssue).where(
      func.ST_DWithin(
          func.Geography(UrbanIssue.location),
          func.Geography(func.ST_GeomFromText(point_wkt, 4326)),
          15.0  # 15 meter radius
      )
  ).order_by(
      func.ST_Distance(
          func.Geography(UrbanIssue.location),
          func.Geography(func.ST_GeomFromText(point_wkt, 4326))
      )
  ).limit(1)
  ```
- **Confidence Fusion:** When an existing issue is located within 15 meters, the engine executes dynamic weighted averaging:
  $$\text{conf}_{\text{new}} = \frac{(\text{conf}_{\text{old}} \times \text{count}) + \text{conf}_{\text{new\_detection}}}{\text{count} + 1}$$
- **Database Index Invalidation Flaw:**
  - The `urban_issues` table possesses a spatial GiST index on `location`:
    ```sql
    CREATE INDEX idx_urban_issues_location ON urban_issues USING gist (location);
    ```
  - The query casts `UrbanIssue.location` to `Geography`: `func.Geography(UrbanIssue.location)`.
  - **PostgreSQL cannot use the geometry GiST index on a geography cast expression.**
  - **Consequence:** PostgreSQL executes a full sequential table scan on `urban_issues` for every single detection frame processed.
  - **Required Mitigation:** Add a functional index:
    ```sql
    CREATE INDEX idx_urban_issues_geography_location ON urban_issues USING gist (cast(location as geography));
    ```

### B. Concurrency & Race Condition Vulnerability
- In `SpatialFusionService.fuse_detection()`:
  1. `find_nearby_issue()` executes a `SELECT` query.
  2. If `None` is returned, a new `UrbanIssue` is instantiated and `session.add(issue)` is invoked.
  3. `session.commit()` persists the record.
- **Vulnerability:** There is no row-level locking (`SELECT ... FOR UPDATE`) or spatial exclusion constraint. If two patrol vehicles or two video ingestion threads detect the same pothole simultaneously, both queries return `None` concurrently, resulting in two duplicate `UrbanIssue` records created 1 meter apart.

---

## 3. Jurisdiction Engine & Boundary Geofencing

### A. Spatial Boundary Polygons (`backend/app/services/jurisdiction_engine.py`)
- The system manages multi-agency routing using PostGIS `ST_Contains`:
  ```sql
  SELECT id, authority_id FROM jurisdictions
  WHERE ST_Contains(boundary, ST_GeomFromText('POINT(77.2090 28.5355)', 4326))
  LIMIT 1;
  ```
- **Configured Authorities:**
  1. **Authority 1: Public Works Department (Delhi PWD)**
     - Role: Manages primary arterial highways and major corridors.
     - Assignment: Predominantly via direct `RoadSegment.authority_id` links.
  2. **Authority 2: Municipal Corporation of Delhi (MCD Central)**
     - Role: Manages urban municipal roads and interior sectors.
     - Boundary: Configured polygon encompassing Central & South Delhi:
       `POLYGON((77.21 28.53, 77.28 28.53, 77.28 28.59, 77.21 28.59, 77.21 28.53))`
  3. **Authority 3: New Okhla Industrial Development Authority (Noida Urban)**
     - Role: Manages trans-Yamuna industrial sectors and expressways.
     - Boundary: Configured polygon encompassing Sector 18, 62, and expressway zones:
       `POLYGON((77.31 28.54, 77.39 28.54, 77.39 28.62, 77.31 28.62, 77.31 28.54))`

### B. Jurisdiction Hierarchy Truth Table

| Condition | Resolution Target | Ticket Issuance Allowed? |
|---|---|:---:|
| Detection falls on `RoadSegment` with configured `authority_id` | Assigned directly to Road Segment Authority | **YES** |
| Detection falls inside MCD Central Polygon | Assigned to Authority 2 (MCD Central) | **YES** |
| Detection falls inside Noida Polygon | Assigned to Authority 3 (Noida Authority) | **YES** |
| Detection falls outside all road segments & polygons | Status = `UNRESOLVED`, Authority = `NULL` | **NO (Blocked by API)** |

This 3-tier boundary routing is a genuine, mathematically verified architectural strength of the repository.
