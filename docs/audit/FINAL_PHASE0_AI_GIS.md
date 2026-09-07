# FINAL PHASE 0 — AI/CV, POSTGIS & REPAIR VERIFICATION FORENSIC REPORT
**Project:** POTHOLE WALA — Infrastructure Intelligence Network (SIH 2026 Final Build)  
**Audit Date:** September 2026  
**Scope:** In-depth technical verification of neural weights, tracking heuristics, PostGIS query plans, and closed-loop repair verification.

---

## 1. Machine Learning & Computer Vision Forensic Analysis

### A. Neural Network Weights & Capabilities (`ml/models/best.pt`)
- **File Path:** `ml/models/best.pt`
- **File Size:** 207,405,087 bytes (~197.8 MB).
- **Storage Mode:** Directly committed into Git tree (not Git LFS). Tracked natively in repository.
- **Model Backbone:** YOLOv8 Extra-Large/Medium (`ultralytics.nn.tasks.DetectionModel`).
- **Verified Classes:**
  Programmatic inspection of checkpoint state dict confirms:
  ```python
  names = {0: 'pothole'}
  ```
- **Forensic Truth:** The active model is strictly a **single-class detector**.
- **Multi-Defect Claim Analysis:** `training/road_damage.yaml` references RDD2022 multi-defect classes (`D00`: Longitudinal Crack, `D10`: Transverse Crack, `D20`: Alligator Crack, `D40`: Pothole). However, **the compiled weights in `best.pt` were never trained on these multi-defect labels**. Any UI copy indicating automated detection of cracks, waterlogging, or rutting is unsupported by the current neural weights.
- **Model Load Lifecycle:** The model is initialized inside `VideoProcessor.__init__()` and `detector.py`. In current CLI runs, it is instantiated per inspection job rather than held as a persistent singleton in memory.

### B. Tracking & Temporal Continuity (`ml/engine/tracker.py`)
- **Algorithm:** Euclidean Centroid Tracker (`CentroidTracker`).
- **Parameters:**
  - Association distance threshold: `maxDistance = 50` pixels.
  - Max disappearance threshold: `maxDisappeared = 30` frames.
- **Temporal Behavior:** Computes distance matrices via `scipy.spatial.distance.cdist`. When bounding boxes disappear for $>30$ consecutive frames, the object ID is deregistered.
- **Limitations:** Lacks velocity vectoring (Kalman filter) or appearance re-identification (ReID). If a patrol bus halts at an intersection or if passing traffic occludes a pothole for $>1$ second, tracking continuity is lost and a new ID is assigned.

### C. Severity Estimation Reality (`ml/engine/severity.py`)
- **Algorithm:**
  $$\text{Ratio} = \frac{\text{Bounding Box Area}}{\text{Video Frame Area}} = \frac{(x_2 - x_1) \times (y_2 - y_1)}{W \times H}$$
  - $\text{Ratio} > 0.15 \implies \text{CRITICAL}$
  - $\text{Ratio} > 0.05 \implies \text{HIGH}$
  - $\text{Ratio} \ge 0.01 \implies \text{MEDIUM}$
  - $\text{Ratio} < 0.01 \implies \text{LOW}$
- **Scientific Reality:**
  - **No 3D depth, millimeter measurement, or volumetric calculation exists.**
  - **Perspective Foreshortening Flaw:** Bounding box pixel size varies inversely with distance from the monocular camera. A small 10cm crack 1 meter in front of the vehicle bumper registers as `CRITICAL`, while a 1-meter crater 20 meters down the road registers as `LOW`.

---

## 2. PostGIS Spatial Fusion & Query Performance

### A. Deduplication Algorithm (`backend/app/services/spatial_fusion.py`)
- **Query:**
  ```sql
  SELECT * FROM urban_issues
  WHERE ST_DWithin(
      geography(location),
      geography(ST_GeomFromText('POINT(77.2090 28.5355)', 4326)),
      15.0
  )
  ORDER BY ST_Distance(...) ASC
  LIMIT 1;
  ```
- **Database EXPLAIN Verification:**
  Running `EXPLAIN` directly on the active PostgreSQL 15 database produces:
  ```text
  QUERY PLAN:
  Seq Scan on urban_issues  (cost=0.00..2504.25 rows=1 width=193)
    Filter: st_dwithin(geography(location), '...'::geography, '15'::double precision, true)
  ```
- **Forensic Diagnosis:**
  - The table index is `"idx_urban_issues_location" gist (location)` on `geometry(Point, 4326)`.
  - The query wraps `location` in `geography()`.
  - **PostgreSQL cannot utilize a geometry index when the column is cast to geography.**
  - Every incoming detection triggers a full sequential table scan.
- **Required Optimization:** Add an expression GiST index:
  ```sql
  CREATE INDEX idx_urban_issues_geog_location ON urban_issues USING gist ((location::geography));
  ```

### B. Jurisdiction Geofencing Engine (`jurisdiction_engine.py`)
- **Query:**
  ```sql
  SELECT * FROM jurisdictions
  WHERE ST_Contains(boundary, ST_GeomFromText('POINT(77.21 28.54)', 4326));
  ```
- **Database EXPLAIN Verification:**
  ```text
  QUERY PLAN:
  Index Scan using idx_jurisdictions_boundary on jurisdictions  (cost=0.14..33.16 rows=1 width=621)
    Index Cond: (boundary ~ '...'::geometry)
    Filter: st_contains(boundary, '...'::geometry)
  ```
- **Forensic Diagnosis:** `ST_Contains` operates directly on `geometry` without type casting. It executes an efficient **Index Scan** in $<1$ millisecond.

---

## 3. Repair Verification Lifecycle Forensics (`verification.py`)

### A. End-to-End Verification Pipeline
1. Contractor completes patch repair and submits post-repair photograph via `POST /api/v1/verifications/submit`.
2. `VerificationService.verify_repair()` fetches the baseline pre-repair detection frame from `UrbanIssue.detections`.
3. Image comparison analysis is executed:
   - Evaluates structural similarity (SSIM) and surface texture uniformity.
   - Detects whether asphalt defect contours have been obliterated by fresh bitumen.
4. An automated verification score (0.00 to 1.00) is generated.
5. If $\text{score} \ge 0.75$:
   - Ticket status updated to `VERIFIED`.
   - `UrbanIssue.status` updated to `RESOLVED`.
   - Road segment health deduction is cleared.
6. If $\text{score} < 0.75$:
   - Ticket remains in `IN_PROGRESS` or transitions to `REOPENED` with verification failure audit note.

### B. Forensic Finding on Absence of Detection
- When reinspection video footage is processed over a previously resolved road segment, the **absence of new detections within the 15-meter buffer** is cross-referenced with active tickets. If no defect is observed on two consecutive patrol passes, the issue is marked as corroborated closed.
