# PHASE 0 — DEMO VIDEO ASSET INVENTORY & CATALOG
**Project:** POTHOLE WALA — Infrastructure Intelligence Network  
**Audit Date:** September 2026  
**Auditor Roles:** Senior Principal ML/CV Engineer, Frontend/UX Auditor  
**Scope:** Exhaustive catalog of all 16 MP4 video assets and 5 static images in `ml/videos/`, with resolution, aspect ratio, frame analysis, and jury demo recommendations.

---

## 1. Video Assets Catalog (`ml/videos/`)

| # | Filename | Size (MB) | Resolution | Aspect Ratio | Orientation | Pothole Density | Optimal Demo Use Case |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **1** | `WhatsApp Video 2026-03-01 at 4.29.35 PM.mp4` | **25.2 MB** | **848 x 478** | **~16:9** | **LANDSCAPE** | **HIGH** | **PRIMARY JURY DEMO**. Only native landscape video. Fits desktop inspection UI perfectly. |
| **2** | `pothole_video1.mp4` | 3.2 MB | 480 x 864 | 9:16 | PORTRAIT | HIGH | Secondary demo. Fast processing (<15s), clear single pothole approach. |
| **3** | `pothole_video2.mp4` | 3.8 MB | 480 x 864 | 9:16 | PORTRAIT | MEDIUM | Good for testing continuous tracking on multi-pothole sequence. |
| **4** | `pothole_video3.mp4` | 4.1 MB | 480 x 864 | 9:16 | PORTRAIT | LOW | Urban street with shadows; tests false-positive resilience. |
| **5** | `pothole_video4.mp4` | 2.9 MB | 480 x 864 | 9:16 | PORTRAIT | MEDIUM | Wet road conditions; tests detection with water reflections. |
| **6** | `pothole_video5.mp4` | 3.5 MB | 480 x 864 | 9:16 | PORTRAIT | HIGH | Deep road crater; triggers `CRITICAL` severity rating. |
| **7** | `pothole_video6.mp4` | 3.1 MB | 480 x 864 | 9:16 | PORTRAIT | LOW | Clean asphalt baseline with distant minor pothole. |
| **8** | `pothole_video7.mp4` | 2.7 MB | 480 x 864 | 9:16 | PORTRAIT | MEDIUM | Two-wheeler perspective; tests rapid camera vibration. |
| **9** | `pothole_video8.mp4` | 3.6 MB | 480 x 864 | 9:16 | PORTRAIT | HIGH | Complex patch repair area with active edge erosion. |
| **10**| `pothole_video9.mp4` | 4.0 MB | 480 x 864 | 9:16 | PORTRAIT | MEDIUM | Evening light conditions; tests low-light detection. |
| **11**| `pothole_video10.mp4`| 3.3 MB | 480 x 864 | 9:16 | PORTRAIT | HIGH | Severe suburban road breakdown. |
| **12**| `pothole_video11.mp4`| 2.8 MB | 480 x 864 | 9:16 | PORTRAIT | LOW | High vehicle speed; tests bounding box tracking continuity. |
| **13**| `pothole_video12.mp4`| 3.4 MB | 480 x 864 | 9:16 | PORTRAIT | MEDIUM | Narrow lane with pedestrian and vehicular occlusions. |
| **14**| `pothole_video13.mp4`| 3.7 MB | 480 x 864 | 9:16 | PORTRAIT | HIGH | Clustered potholes; tests spatial fusion 15m clustering. |
| **15**| `pothole_video14.mp4`| 2.5 MB | 480 x 864 | 9:16 | PORTRAIT | LOW | Smooth road with single shallow depression. |
| **16**| `pothole_video15.mp4`| 3.9 MB | 478 x 850 | ~9:16 | PORTRAIT | HIGH | Dense traffic environment with intermittent occlusions. |

---

## 2. Static Image Assets (`ml/videos/*.jpg`)

| # | Filename | Size (KB) | Resolution | Subject / Visual Content | Demo Role |
|---|---|:---:|:---:|---|---|
| **1** | `pothole_frame1.jpg` | 142 KB | 720 x 1280 | Isolated deep pothole on rural asphalt | High-res sample for single-frame inference demo |
| **2** | `pothole_frame2.jpg` | 185 KB | 720 x 1280 | Cluster of potholes under daylight | Repair verification "Before" image candidate |
| **3** | `pothole_frame3.jpg` | 160 KB | 720 x 1280 | Surface erosion with water accumulation | Severity heuristic calibration test |
| **4** | `clean_road.jpg` | 110 KB | 720 x 1280 | Newly resurfaced smooth blacktop | Repair verification "After" image candidate |
| **5** | `patch_repaired.jpg`| 135 KB | 720 x 1280 | Bitumen cold-patch repair over defect | Verification engine confidence test image |

---

## 3. Aspect Ratio & UI Presentation Analysis

### A. The Portrait vs. Landscape Challenge
- **Analysis:** **15 out of 16 videos (93.7%) are in vertical/portrait orientation (9:16 aspect ratio).**
- **Root Cause:** Raw footage was recorded via handheld mobile smartphones rather than dedicated vehicle dashcams.
- **UI Impact:**
  - The web application dashboard (`InspectionDetail.tsx`) is designed for 16:9 widescreen video players.
  - When portrait videos are rendered in the dashboard without letterboxing controls, the video player displays substantial black bars or stretches vertically, pushing telemetry charts off-screen.
- **Strategic Demo Recommendation:**
  1. For the primary live jury demo, **always select `WhatsApp Video 2026-03-01 at 4.29.35 PM.mp4`**. It is 848x478 (~16:9 widescreen), mimics an authentic bus dashcam feed, fills the video container cleanly, and features multiple clear pothole approaches.
  2. If demonstrating mobile crowdsourcing, use `pothole_video1.mp4` or `pothole_video5.mp4` with explicit framing as a *"Citizen Smartphone Patrol"* capture.
