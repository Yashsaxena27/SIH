# FINAL PHASE 0 — DEMO ASSET INVENTORY, ACTION AUDIT & PRESENTATION GUIDE
**Project:** POTHOLE WALA — Infrastructure Intelligence Network (SIH 2026 Final Build)  
**Audit Date:** September 2026  
**Scope:** Exhaustive catalog of media assets in `ml/videos/`, forensic button/action audit, and judge presentation walkthrough.

---

## 1. Video & Image Asset Inventory (`ml/videos/`)

| # | Filename | Size | Resolution | Orientation | Lighting | Road Type / Hazards | Recommended Demo Role |
|---|---|:---:|:---:|:---:|:---:|---|---|
| **1** | `WhatsApp Video 2026-03-01 at 4.29.35 PM.mp4` | **25.2 MB** | **848 x 478** | **LANDSCAPE (16:9)** | Daylight | Multi-lane asphalt; multiple potholes | **PRIMARY JURY DEMO**. Widescreen aspect fits dashboard UI. |
| **2** | `pothole_video1.mp4` | 3.2 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Urban road; isolated sharp pothole | Fast upload demo (<15s processing). |
| **3** | `pothole_video2.mp4` | 3.8 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Suburban corridor; sequence of potholes | Tracking continuity demo. |
| **4** | `pothole_video3.mp4` | 4.1 MB | 480 x 864 | PORTRAIT (9:16) | Sunlight / Shadows | Tree shadows; false-positive resilience | Robustness testing. |
| **5** | `pothole_video4.mp4` | 2.9 MB | 480 x 864 | PORTRAIT (9:16) | Overcast / Wet | Wet bitumen surface; puddle reflections | Wet road resilience. |
| **6** | `pothole_video5.mp4` | 3.5 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Severe road erosion; deep crater | Triggers `CRITICAL` severity rating. |
| **7** | `pothole_video6.mp4` | 3.1 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Clean road with distant minor depression | Baseline negative control. |
| **8** | `pothole_video7.mp4` | 2.7 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Two-wheeler vibration; rapid movement | Motion blur testing. |
| **9** | `pothole_video8.mp4` | 3.6 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Edge crumbling near road shoulder | Shoulder defect detection. |
| **10**| `pothole_video9.mp4` | 4.0 MB | 480 x 864 | PORTRAIT (9:16) | Dusk / Low Light | Evening street lighting | Low-light detection test. |
| **11**| `pothole_video10.mp4`| 3.3 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Broken asphalt road | Cluster detection test. |
| **12**| `pothole_video11.mp4`| 2.8 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | High-speed vehicle approach | Fast tracking test. |
| **13**| `pothole_video12.mp4`| 3.4 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Heavy traffic; vehicular occlusions | Occlusion recovery test. |
| **14**| `pothole_video13.mp4`| 3.7 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Clustered defects on single lane | Spatial fusion 15m radius test. |
| **15**| `pothole_video14.mp4`| 2.5 MB | 480 x 864 | PORTRAIT (9:16) | Daylight | Newly surfaced road with tiny flaw | False-positive check. |
| **16**| `pothole_video15.mp4`| 3.9 MB | 478 x 850 | PORTRAIT (9:16) | Daylight | Mixed urban traffic | Dense background noise test. |

### Static Calibration Frames (`ml/videos/*.jpg`)
- `pothole_frame1.jpg` (720x1280): High-resolution single defect for inference inspection.
- `pothole_frame2.jpg` (720x1280): Daylight pothole cluster for verification "Before" baseline.
- `clean_road.jpg` (720x1280): Pristine blacktop for verification "After" repair.
- `patch_repaired.jpg` (720x1280): Bitumen patch for CV similarity confidence testing.

---

## 2. Forensic Button & Action Audit

| Button / Clickable Element | Page / Component | Attached Handler | Target Backend API | State Persistence | Operational Status |
|---|---|---|---|---|:---:|
| **Generate Report** | `Reports.tsx:159` | **NONE** | None | None | **DEAD BUTTON** |
| **Acknowledge** | `Alerts.tsx:96` | **NONE** | None | None | **DEAD BUTTON** |
| **Settings Category Cards** | `Settings.tsx:116` | **NONE** | None | None | **DEAD INTERACTIONS** |
| **Search Result Click** | `CommandPalette.tsx:75` | `navigate('/issues/1')` | `/api/v1/issues/1` | None | **CRASHES (404 Not Found)** |
| **Mark In Progress / Resolve** | `IssueDetail.tsx:77` | `api.updateIssue` | `PATCH /api/v1/issues/{id}` | DB | **CRASHES (405 Method Not Allowed)** |
| **Assign Ticket** | `Tickets.tsx` | `handleAssign` | `PATCH /api/v1/tickets/{id}` | PostgreSQL | **WORKING** |
| **Verify / Reject** | `VerificationDetail.tsx` | `handleVerify` | `POST /api/v1/verifications/submit` | PostgreSQL | **WORKING** |
| **Reset Demo** | `TopBar.tsx` / `Settings.tsx` | `handleReset` | `POST /api/v1/simulator/reset` | PostgreSQL | **WORKING** |
| **Start / Stop Demo** | `EdgeMonitoring.tsx` | `toggleSimulator` | `POST /api/v1/simulator/start` | In-Memory | **WORKING** |
| **Upload Video** | `Inspections.tsx` | `handleDrop` | `POST /api/v1/inspections/upload` | PostgreSQL + Disk | **WORKING in Docker; Fails on Win host** |

---

## 3. High-Impact Presentation Script (5-Minute Winning Path)

1. **Minute 0:00 – 1:00 (Visual Impact):**
   - Present `http://localhost:5173` pre-seeded with Delhi-NCR golden demo.
   - Show live map with 100 urban issues, colored by severity, distributed across Delhi PWD, MCD Central, and Noida Authority.
2. **Minute 1:00 – 2:15 (PostGIS Spatial Fusion & Routing):**
   - Click an issue marker on Ring Road.
   - Show how 4 separate bus passes over the same location were fused into 1 record via `ST_DWithin(15m)` with confidence updated to 92%.
   - Show automated polygon boundary assignment (`ST_Contains`).
3. **Minute 2:15 – 3:30 (Live Video & Edge AI Pipeline):**
   - Open Inspections (`/inspections`).
   - Play the widescreen demonstration video (`WhatsApp Video 2026-03-01 at 4.29.35 PM.mp4`).
   - Highlight YOLOv8 bounding boxes, centroid tracking IDs, and camera-relative hazard severity.
4. **Minute 3:30 – 4:30 (Work Order & Verification Lifecycle):**
   - Open Tickets (`/tickets`) and Verifications (`/verifications`).
   - Demonstrate a completed work order with side-by-side Before (crater) and After (bitumen patch) photographic evidence validated by computer vision confidence scoring (`0.88 - VERIFIED`).
5. **Minute 4:30 – 5:00 (Executive Health & Impact):**
   - Open Analytics (`/analytics`). Show Pavement Condition Index (PCI) ratings by road segment and live PostGIS hexbin heatmaps.
