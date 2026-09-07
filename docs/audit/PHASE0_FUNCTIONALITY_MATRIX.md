# PHASE 0 — FUNCTIONALITY MATRIX & END-TO-END FLOW AUDIT
**Project:** POTHOLE WALA — Infrastructure Intelligence Network  
**Audit Date:** September 2026  
**Auditor Roles:** Senior Principal Software Architect, Backend Systems Architect, Frontend/UX Auditor  
**Scope:** Complete trace of all 8 core workflows and exhaustive catalogue of all 28+ backend API endpoints.

---

## 1. End-to-End User Flows & Data Lifecycles

### Flow 1: Video Upload & Inspection Processing
- **Trigger:** Frontend user uploads video via `POST /api/v1/inspections/upload` or runs CLI video processor.
- **Backend Flow:**
  1. `backend/app/api/v1/inspection.py:32` receives `multipart/form-data` file.
  2. Generates UUID `job_id`, creates `InspectionJob` in DB with status `PENDING`.
  3. Saves raw video to `uploads/{job_id}_input.mp4`.
  4. Spawns asynchronous background worker `process_video_task`.
  5. Worker initializes `VideoProcessor` (`ml/pipeline/video_processor.py`), iterates frames at sampled intervals.
  6. YOLOv8x runs inference on frames; detections pass through `CentroidTracker` and `SeverityEstimator`.
  7. Detections are dispatched to `SpatialFusionService`.
  8. OpenCV draws bounding boxes and overlays; output frames are saved to temporary file.
  9. `ffmpeg` transcode command is invoked to generate H.264 browser-compatible `.mp4`.
  10. Job status updated to `COMPLETED` or `FAILED`.
- **Status & Failure Modes:**
  - Works inside Docker container where `ffmpeg` package is installed.
  - *Fails on Windows native host:* Lacks `ffmpeg` executable in PATH; throws unhandled `RuntimeError: Annotated video requires ffmpeg for browser-compatible H.264 encoding`.

---

### Flow 2: Spatial Fusion & Deduplication
- **Trigger:** Ingestion of raw detection point from dashcam edge node via `POST /api/v1/ingest/detection`.
- **Backend Flow:**
  1. Detection coordinates `(longitude, latitude)`, confidence, class name, and severity received.
  2. `SpatialFusionService.fuse_detection()` (`spatial_fusion.py:27`):
     - Executes PostGIS spatial query:
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
     - **Match Found (<= 15 meters):** Existing issue updated. Confidence recalculated as running average:
       $$\text{conf}_{\text{new}} = \frac{(\text{conf}_{\text{old}} \times N) + \text{conf}_{\text{curr}}}{N + 1}$$
       `detection_count` incremented, `last_seen_at` updated. Linked `Detection` record created with `issue_id = issue.id`.
     - **No Match Found (> 15 meters):** New `UrbanIssue` entity initialized.
       - Dispatches to `JurisdictionEngine` for authority mapping.
       - Dispatches to `RoadSegmentLinker` for nearest road segment attachment.
       - Saves new issue and primary `Detection` record.
- **Status & Bottlenecks:**
  - PostGIS fusion logic is mathematically sound and functional.
  - *Bottleneck:* The query wraps `UrbanIssue.location` in `func.Geography()`. Because the database index is a standard GiST index on `geometry`, PostgreSQL cannot utilize the index and executes a sequential scan of all `urban_issues`.

---

### Flow 3: Multi-Agency Jurisdiction Routing
- **Trigger:** Generation of a new `UrbanIssue` or ticket assignment request.
- **Backend Flow:**
  1. `JurisdictionEngine.resolve_jurisdiction(location, road_segment_id)` (`jurisdiction_engine.py:32`):
     - **Step 1 (Asset Ownership):** If `road_segment_id` is supplied and has an explicit `authority_id`, assign directly to that authority.
     - **Step 2 (Spatial Polygon Boundary):** Execute PostGIS polygon containment:
       ```sql
       SELECT authority_id FROM jurisdictions
       WHERE ST_Contains(boundary, ST_GeomFromText('POINT(77.215 28.540)', 4326))
       LIMIT 1;
       ```
       Matches configured polygons for:
       - **Authority 1:** Public Works Department (Delhi PWD)
       - **Authority 2:** Municipal Corporation of Delhi (MCD Central)
       - **Authority 3:** New Okhla Industrial Development Authority (Noida Urban)
     - **Step 3 (Fallback):** If point falls outside all jurisdiction boundaries, status is set to `unresolved`.
  2. Safety Rule: `POST /api/v1/tickets` enforces that issues with `authority_id = NULL` or `unresolved` jurisdiction cannot have work orders issued until manually reconciled.

---

### Flow 4: Work Order & SLA Ticketing Lifecycle
- **Trigger:** Automated generation from critical issues or manual creation by authority officer via `POST /api/v1/tickets`.
- **Backend Flow:**
  1. Validates authority jurisdiction assignment.
  2. Computes ticket priority score:
     $$\text{Priority} = (\text{Severity Score} \times 0.4) + (\text{Traffic Factor} \times 0.3) + (\text{Citizen Complaint Count} \times 0.3)$$
  3. Establishes dynamic SLA deadline:
     - `CRITICAL`: 24 Hours
     - `HIGH`: 48 Hours
     - `MEDIUM`: 7 Days
     - `LOW`: 14 Days
  4. Status transitions follow state machine: `OPEN` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `VERIFIED`.

---

### Flow 5: Repair Verification Flow
- **Trigger:** Contractor submits repair photographic evidence via `POST /api/v1/verifications/submit`.
- **Backend Flow:**
  1. `VerificationService.verify_repair()` (`verification.py:24`):
     - Receives `ticket_id`, post-repair image URL/upload, and inspector notes.
     - Fetches baseline detection image associated with `UrbanIssue`.
     - Runs computer vision comparison (structural similarity / absence of defect contour).
     - Assigns verification confidence score (0.00 – 1.00).
     - If confidence exceeds threshold (default 0.75): Ticket status set to `VERIFIED`, `UrbanIssue` status updated to `RESOLVED`, road segment health score dynamically updated.
- **Status:** Fully functional in backend with complete test coverage in `test_verifications.py`.

---

### Flow 6: Realtime SSE Event Push
- **Trigger:** State change in backend (e.g. `issue_created`, `ticket_updated`, `inspection_progress`).
- **Backend Flow:**
  1. `backend/app/api/v1/events.py` manages an in-memory `set()` of `asyncio.Queue` subscribers.
  2. Services call `broadcast_event(event_type, payload)`.
  3. Client connected to `GET /api/v1/events` receives JSON SSE payload:
     ```json
     event: issue_created
     data: {"issue_id": "iss_...", "latitude": 28.54, "longitude": 77.21, "severity": "CRITICAL"}
     ```
  4. Frontend `realtime.ts` receives event, triggers React Query cache invalidation and map marker re-render.
- **Defect Identified:** Uses in-memory Python `set()`. Does NOT connect to Redis Pub/Sub, breaking realtime notifications if Uvicorn runs with multiple workers (`workers > 1`).

---

### Flow 7: Citizen Complaint Flow
- **Trigger:** Citizen reports defect via `POST /api/v1/complaints`.
- **Backend Flow:**
  1. Receives citizen description, optional image URL, and GPS coordinates.
  2. Runs PostGIS `ST_DWithin` check (25m radius) against existing `urban_issues`.
  3. If matching issue found: Increments citizen complaint counter on `UrbanIssue` and escalates ticket priority score.
  4. If no matching issue found: Creates unverified citizen report ticket pending road inspector patrol validation.
- **Defect Identified:** `complaints.py:33` has hardcoded fallback `authority_id = 1` if jurisdiction resolution fails.

---

### Flow 8: Spatial Analytics & Road Health Calculation
- **Trigger:** Dashboard requests `/api/v1/analytics/overview` or `/api/v1/analytics/road-health`.
- **Backend Flow:**
  1. `RoadHealthService` aggregates active issues along each `RoadSegment.geometry`.
  2. Calculates composite Pavement Condition Index (PCI) deduction:
     $$\text{PCI} = 100 - \sum (\text{Severity Weight} \times \text{Defect Count})$$
  3. Returns road segment health rating: `GOOD` (>80), `FAIR` (50–80), `POOR` (<50).
  4. `/api/v1/analytics/heatmaps` returns hexbin spatial clusters for Leaflet heatmap overlay.

---

## 2. Exhaustive API Endpoints Catalogue (28+ Endpoints)

| # | HTTP Verb | Path | Request Payload | Response Type | Auth Required | DB Interactions | Verification Status |
|---|:---:|---|---|---|:---:|---|:---:|
| 1 | `GET` | `/health` | None | JSON `{"status": "ok"}` | No | None | Verified Working |
| 2 | `GET` | `/api/v1/issues` | Query: `status, severity, authority_id, limit, offset` | List[`UrbanIssueResponse`] | **No (P0)** | `urban_issues` SELECT | Verified Working |
| 3 | `GET` | `/api/v1/issues/{id}` | Path: `id` (string) | `UrbanIssueDetailResponse` | **No (P0)** | `urban_issues`, `detections` SELECT | Verified Working |
| 4 | `GET` | `/api/v1/issues/{id}/detections`| Path: `id` (string) | List[`DetectionResponse`] | **No (P0)** | `detections` SELECT | Verified Working |
| 5 | `GET` | `/api/v1/issues/nearby` | Query: `latitude, longitude, radius_meters` | List[`UrbanIssueResponse`] | **No (P0)** | PostGIS `ST_DWithin` SELECT | Verified Working |
| 6 | `POST` | `/api/v1/tickets` | `TicketCreate` (issue_id, title, priority) | `TicketResponse` | **No (P0)** | `tickets`, `urban_issues` INSERT/UPDATE | Verified Working |
| 7 | `GET` | `/api/v1/tickets` | Query: `status, authority_id, priority, limit` | List[`TicketResponse`] | **No (P0)** | `tickets` SELECT | Verified Working |
| 8 | `GET` | `/api/v1/tickets/{id}` | Path: `id` (string) | `TicketDetailResponse` | **No (P0)** | `tickets`, `verifications` SELECT | Verified Working |
| 9 | `PATCH` | `/api/v1/tickets/{id}` | `TicketUpdate` (status, assigned_contractor) | `TicketResponse` | **No (P0)** | `tickets` UPDATE | Verified Working |
| 10 | `POST` | `/api/v1/verifications/submit`| `VerificationCreate` (ticket_id, image, notes)| `VerificationResponse` | **No (P0)** | `verifications`, `tickets` INSERT/UPDATE | Verified Working |
| 11 | `GET` | `/api/v1/verifications/{id}`| Path: `id` (string) | `VerificationResponse` | **No (P0)** | `verifications` SELECT | Verified Working |
| 12 | `GET` | `/api/v1/verifications/ticket/{ticket_id}`| Path: `ticket_id` | List[`VerificationResponse`] | **No (P0)** | `verifications` SELECT | Verified Working |
| 13 | `POST` | `/api/v1/inspections/upload`| `multipart/form-data` (file, route_id) | `InspectionJobResponse` | **No (P0)** | `inspection_jobs` INSERT | Verified Working (Docker) |
| 14 | `GET` | `/api/v1/inspections/jobs` | Query: `status, limit, offset` | List[`InspectionJobResponse`] | **No (P0)** | `inspection_jobs` SELECT | Verified Working |
| 15 | `GET` | `/api/v1/inspections/jobs/{id}`| Path: `id` (UUID string) | `InspectionJobResponse` | **No (P0)** | `inspection_jobs` SELECT | Verified Working |
| 16 | `GET` | `/api/v1/inspections/jobs/{id}/stream`| Path: `id` | Video stream (video/mp4) | **No (P0)** | Disk file read | Verified (Requires H.264) |
| 17 | `POST` | `/api/v1/ingest/detection`| `DetectionIngestRequest` (lat, lon, conf, etc.)| `DetectionIngestResponse`| **No (P0)** | `detections`, `urban_issues` FUSION | Verified Working |
| 18 | `GET` | `/api/v1/authorities` | Query: `limit, offset` | List[`AuthorityResponse`] | **No (P0)** | `authorities` SELECT | Verified Working |
| 19 | `GET` | `/api/v1/authorities/{id}` | Path: `id` (integer) | `AuthorityDetailResponse` | **No (P0)** | `authorities`, `jurisdictions` SELECT | Verified Working |
| 20 | `POST` | `/api/v1/complaints` | `ComplaintCreate` (description, lat, lon) | `ComplaintResponse` | **No (P0)** | `complaints`, `urban_issues` INSERT | Verified Working |
| 21 | `GET` | `/api/v1/complaints` | Query: `status, authority_id, limit` | List[`ComplaintResponse`] | **No (P0)** | `complaints` SELECT | Verified Working |
| 22 | `GET` | `/api/v1/fleet/vehicles` | None | List[`VehicleTelematics`] | **No (P0)** | In-memory / DB SELECT | Verified Working |
| 23 | `GET` | `/api/v1/fleet/routes` | None | List[`FleetRoute`] | **No (P0)** | `road_segments` SELECT | Verified Working |
| 24 | `GET` | `/api/v1/analytics/overview`| Query: `authority_id` | `AnalyticsOverviewResponse` | **No (P0)** | Aggregations across tables | Verified Working |
| 25 | `GET` | `/api/v1/analytics/road-health`| Query: `authority_id` | List[`RoadSegmentHealth`] | **No (P0)** | `road_segments`, `urban_issues` | Verified Working |
| 26 | `GET` | `/api/v1/analytics/heatmaps`| Query: `bounds, resolution` | List[`HeatmapHexbin`] | **No (P0)** | PostGIS spatial clustering | Verified Working |
| 27 | `POST` | `/api/v1/simulator/start` | `SimulatorConfigRequest` | JSON `{"status": "running"}` | **No (P0)** | Background task trigger | Verified Working |
| 28 | `POST` | `/api/v1/simulator/stop` | None | JSON `{"status": "stopped"}` | **No (P0)** | Background task cancellation | Verified Working |
| 29 | `GET` | `/api/v1/events` | None | SSE Stream (`text/event-stream`) | **No (P0)** | In-memory Queue subscriber | Verified Working (Single worker)|

> **CRITICAL ROUTE GAP IDENTIFIED:**  
> Frontend `IssueDetail.tsx:77` attempts to call `PATCH /api/v1/issues/{id}` to update issue status.  
> **No such endpoint exists in `backend/app/api/v1/issues.py`**. The backend returns HTTP `405 Method Not Allowed`, breaking direct issue status mutations from the UI.
