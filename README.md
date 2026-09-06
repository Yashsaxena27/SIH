# POTHOLE WALA

## 1. Project Overview
Pothole Wala is an AI-powered Mobile Urban Intelligence Network built for the Smart India Hackathon. It transforms standard public transit buses into an automated road inspection network by ingesting dashcam footage, identifying road defects via machine learning, and mapping these insights on a unified dashboard. It actively closes the loop by routing issues to appropriate civic authorities (e.g., MCD, PWD) and using subsequent bus drives to automatically verify repairs.

## 2. Key Features
- AI road defect detection
- Dashcam/video inspection
- YOLOv8 inference
- Annotated video extraction
- Evidence generation (bounding box crops)
- Geospatial mapping
- Spatial fusion (15m clustering for multi-bus deduplication)
- Issue lifecycle management
- Jurisdiction routing
- Authority/department routing
- Ticket workflow
- Verification / closed loop lifecycle
- Analytics and decision-support metrics
- Road health calculations
- Fleet monitoring
- Deterministic Golden Demo scenarios

## 3. System Architecture

Frontend (React + Vite)
→ FastAPI (Python Backend)
→ ML pipeline (YOLOv8, OpenCV)
→ PostgreSQL/PostGIS (Spatial Database)
→ Evidence Generation
→ Jurisdiction & Authority Resolution
→ Ticket Routing
→ Closed-loop Verification
→ Real-time Analytics

## 4. End-to-End Data Pipeline

Video (Dashcam MP4)
→ Frame extraction
→ YOLOv8 Object Detection
→ Temporal Tracking & Detection Event
→ Spatial fusion (15m PostGIS ST_DWithin clustering)
→ Urban Issue Entity
→ Evidence Image & Annotated Video
→ Jurisdiction Resolution (Point-in-Polygon vs Segment)
→ Authority Routing (MCD / PWD)
→ Municipal Ticket Creation
→ Automated Re-inspection (Verification via subsequent drive-by)
→ Analytics Aggregation

## 5. Technology Stack
*   **Machine Learning / Computer Vision:** YOLOv8 (PyTorch), OpenCV, Python
*   **Backend:** FastAPI, SQLAlchemy 2.0 (Async), Alembic, Uvicorn
*   **Database:** PostgreSQL 15, PostGIS (Geospatial extension)
*   **Frontend:** React 18, Vite, TypeScript, TailwindCSS, Radix UI, Leaflet (Maps)
*   **Infrastructure:** Docker, Docker Compose

## 6. Running the Project

**1. Copy Environment Configs:**
```bash
cp .env.demo.example .env
cp frontend/.env.demo.example frontend/.env.local
```

**2. Boot the Infrastructure (PostgreSQL/PostGIS, Redis, Backend, Frontend):**
```bash
docker-compose up -d --build
```

**3. Seed the Golden Demo Data:**
*(This provides a deterministic, reliable starting state for the SIH demo with scenarios A, B, C, and D).*
```bash
docker exec -it aih-pothole-backend-1 python scripts/seed_golden_demo.py --reset
```

The application will be available at `http://localhost:5173`.

## 7. Video Inspection
- **Video Library**: Ingests authentic dashcam footage from transit fleets.
- **Custom Upload**: Allows operators to manually trigger inspections from MP4 files.
- **AI Inspection**: Runs async object detection against YOLOv8.
- **Raw footage**: Plays back the original video alongside detections.
- **AI annotated footage**: Generates H.264 browser-compatible MP4s highlighting detections with bounding boxes.
- **Detections & Evidence**: Extracts cropped `.jpg` frames for immediate visual proof of the defect.
- **Map synchronization**: Drops real-time pins on the map at the exact coordinates of the defect based on fleet telemetry.

## 8. Maps / GIS
The project heavily utilizes **PostGIS** for spatial data processing.
- `ST_DWithin` is used to cluster duplicate detections (e.g., multiple buses reporting the same pothole) within a 15-meter radius into a single consolidated `UrbanIssue`.
- `ST_Contains` handles resolving GPS point intersections with configured jurisdiction polygons.
- Leaflet is used on the React frontend to visually render these spatial features, road segments, and real-time fleet locations.

## 9. Issue / Ticket / Verification Lifecycle
1.  **Urban Issue**: Formed from spatial fusion of raw observations. Starts as `open`.
2.  **Ticket**: Once jurisdiction is resolved, a ticket is dispatched to the corresponding authority. The issue moves to `assigned` or `in_progress`.
3.  **Repair Reported**: The municipal body flags the ticket as repaired.
4.  **Verification**: The system schedules a reinspection. The next fleet bus passing the coordinates runs its camera.
5.  **Verified Resolved / Reopened**: If no defect is found, the loop closes. If the defect persists, the ticket is reopened.

## 10. Authority / Jurisdiction
The jurisdiction engine prioritizes absolute ownership.
1.  **Road-Segment Ownership Priority:** If a defect falls precisely on a surveyed road segment owned by a specific authority (e.g., PWD Highways), it is routed there immediately.
2.  **Geographic Polygon Fallback:** If not on a known segment, it falls back to the encompassing geographic jurisdiction (e.g., MCD Zones or Noida polygons).
3.  **Configured Prototype Boundaries:** The Delhi-NCR region relies on configured prototype boundaries for the SIH demo context.
4.  **Unresolved:** Defects outside all known boundaries are safely tracked as unresolved without failing.

## 11. Demo Data
To ensure a truthful and reliable presentation, data is categorized:
-   **Real model inference:** Genuine YOLOv8 detections from real dashcam MP4s (not synthetic moving dots).
-   **Database-backed data:** Analytics metrics directly query the live PostgreSQL tables without hardcoded fallbacks.
-   **Deterministic golden demo data:** Prefixed records (e.g., `iss_demo_gold_a`) seeded via `seed_golden_demo.py` to reliably demonstrate the A-to-Z lifecycle.
-   **Configured prototype data:** Boundaries and authorities specifically created to benchmark the Delhi-NCR context.
-   **Unavailable live GPS:** Fleet buses without live hardware gracefully report as 'Offline' rather than fabricating fake telemetry.

## 12. Current Limitations
-   **Live Hardware GPS:** Hardware GPS units are not physically connected. Missing telemetry accurately registers as 'Unavailable'.
-   **Jurisdiction Boundaries:** The jurisdiction polygons currently mapped are configured prototype boundaries rather than official government surveying data.
-   **Model Classes:** The shipped `best.pt` model is heavily tuned for high-confidence Pothole detection, currently sacrificing multi-class breadth to maximize accuracy for the primary SIH problem statement.
-   **Government APIs:** Ticket routing operates seamlessly internally but is not yet bridging live REST APIs of civic bodies.

## 13. SIH Demo Flow
Recommended 5-10 minute pitch sequence:
1.  **Video upload** (Edge Monitoring)
2.  **AI inspection** (Observe processing progress)
3.  **Annotated video** (Playback with YOLO HUD)
4.  **Detection & Evidence** (Inspect extracted frames)
5.  **Map & Issue 360** (See the defect on the Intelligence Map, demonstrating 15m PostGIS fusion)
6.  **Jurisdiction & Ticket** (Show deterministic routing to MCD/PWD)
7.  **Verification** (Demonstrate the closed-loop reinspection passing/failing)
8.  **Analytics** (Review real-time PostgreSQL road intelligence)

## 14. Repository Structure
```
POTHOLE-WALA/
├── backend/            # FastAPI, SQLAlchemy, PostGIS backend
├── frontend/           # React, Vite, Tailwind UI
├── ml/                 # YOLOv8 pipeline, OpenCV, Video Processing
├── docker-compose.yml  # Infrastructure configuration
└── README.md           # This document
```
