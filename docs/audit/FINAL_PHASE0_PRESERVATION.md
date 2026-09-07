# FINAL PHASE 0 — PRESERVATION, REWORK & RESTRICTION MATRIX
**Project:** POTHOLE WALA — Infrastructure Intelligence Network (SIH 2026 Final Build)  
**Audit Date:** September 2026  
**Scope:** Strict classification of codebase assets into preservation tiers and presentation restrictions for Phases 1 through 5.

---

## 1. Preservation & Action Classification

### A. MUST PRESERVE (Core Architectural Assets — Do Not Alter Core Logic)
1. **`backend/app/services/spatial_fusion.py`:**
   The 15-meter PostGIS `ST_DWithin` spatial fusion algorithm, confidence weighted averaging, and linked observation persistence.
2. **`backend/app/services/jurisdiction_engine.py`:**
   The 3-tier boundary routing engine (`ST_Contains` on MCD Central and Noida Urban polygons).
3. **`backend/app/services/ticket_lifecycle.py`:**
   The municipal work order state machine, priority scoring algorithm, and SLA deadline calculations.
4. **`backend/app/services/verification.py`:**
   The closed-loop repair verification service comparing pre-repair and post-repair imagery.
5. **`backend/app/services/road_health.py`:**
   The Pavement Condition Index (PCI) deduction formula based on defect counts and severities.
6. **`backend/scripts/seed_golden_demo.py`:**
   The 100-issue, 531-observation Delhi-NCR demonstration dataset. The authoritative demonstration seed.
7. **`ml/models/best.pt`:**
   The compiled YOLOv8x neural weights. Highly tuned for pothole detection.
8. **`ml/engine/tracker.py`:**
   The Euclidean CentroidTracker algorithm with 30-frame persistence.
9. **`ml/pipeline/client.py`:**
   The edge SQLite offline buffer (`events_buffer.db`) and auto-drain HTTP client.
10. **`docker-compose.yml` & Container Stack:**
    The 4-service Docker Compose topology (PostGIS 15 on 5433, Redis 7 on 6379, FastAPI on 8000, Vite on 5173).

---

### B. SAFE TO REWORK (Sound Concepts Requiring Bug Fixes / Wiring)
1. **`backend/app/api/v1/issues.py`:**
   Add missing `PATCH /api/v1/issues/{id}` endpoint to allow legal status mutations from the UI.
2. **`backend/app/api/v1/*.py` (All Routers):**
   Add JWT authentication dependencies (`Depends(get_current_user)`) across mutating endpoints.
3. **`backend/app/api/v1/events.py`:**
   Connect SSE broadcasting to Redis 7 Pub/Sub instead of in-memory Python `set()`.
4. **`backend/app/api/v1/complaints.py`:**
   Remove silent fallback `authority_id = 1`; preserve `unresolved` state for out-of-boundary reports.
5. **`frontend/src/components/common/CommandPalette.tsx`:**
   Replace static mock array with debounced live API search against `/api/v1/issues?search=`.
6. **`frontend/src/components/layout/Sidebar.tsx` & `TopBar.tsx`:**
   Replace hardcoded badge counts (`12`, `5`, `3`) with dynamic counts from `/api/v1/analytics/overview`.
7. **`frontend/src/pages/Reports.tsx` & `Alerts.tsx`:**
   Wire dead action buttons to live report export and alert acknowledgement handlers.
8. **`ml/pipeline/video_processor.py`:**
   Implement graceful transcoding check or fallback to avoid crashes on Windows hosts lacking ffmpeg.
9. **`ml/pipeline/gps_simulator.py`:**
   Update default coordinates from Bengaluru (`12.97°N`) to Delhi Ring Road (`28.53°N`).
10. **Database Spatial Index:**
    Add expression index `CREATE INDEX idx_urban_issues_geog_location ON urban_issues USING gist ((location::geography))` to fix $O(N)$ sequential scans.

---

### C. MERGE CANDIDATES (Duplicate & Fragmented Components)
1. **`frontend/src/pages/LiveMap.tsx`:**
   Merge into `Intelligence.tsx` (it is an identical 100% clone). Redirect route `/live-map` to `/intelligence`.
2. **`frontend/src/pages/Traffic.tsx`:**
   Consolidate into `Intelligence.tsx` as a toggleable traffic congestion overlay rather than an empty placeholder page.

---

### D. REMOVE AFTER DEPENDENCY CHECK (Conflicting or Obsolete Code)
1. **`backend/scripts/seed_demo.py`:**
   Legacy Bengaluru BMTC script that truncates all tables and scatters coordinates in South India.
2. **`backend/scripts/seed.py`:**
   Obsolete minimal seed script superseded by `seed_golden_demo.py`.
3. **Root Artifacts (`mock_input.mp4`, `annotated_output.mp4`):**
   Relocate to `ml/videos/fixtures/` to standardize workspace root.

---

### E. MUST NOT CLAIM (Strict Honesty Rules for Team & Presenters)
1. **DO NOT CLAIM 3D Depth Measurement:**
   The system calculates a 2D bounding box area ratio ($box / frame$). There is no LiDAR, stereo camera, or depth sensor. Present truthfully as *"Camera-relative 2D visual hazard extent"*.
2. **DO NOT CLAIM Multi-Defect Detection:**
   The neural network (`best.pt`) was trained strictly on `{0: 'pothole'}`. Do not claim crack or rutting detection until a multi-class model is trained.
3. **DO NOT CLAIM Live Government API Integration:**
   Jurisdictions are configured prototype polygons stored in PostGIS, not live state PWD APIs.
4. **DO NOT CLAIM Real-Time Bus Fleet GPS:**
   Vehicle positions are synthetic telemetry generated along real Delhi road coordinates.
