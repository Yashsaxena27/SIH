# PHASE 9 SPECIFICATION & VERIFICATION: FLEET SENSING & MULTI-CAMERA RIGS
**POTHOLE WALA — Infrastructure Intelligence Network**  
**SIH 2026 Build**

---

## 1. Executive Summary

Phase 9 expands the platform from basic public transit tracking into a generalized **Distributed Infrastructure Sensing Fleet**. It models diverse civic vehicle types, multi-camera sensor rigs with specific optical mount geometry, explicit telemetry provenance modes, and automated corridor coverage gap detection.

### Core Principles & Truth Guardrails
1. **Multi-Vehicle Classification:** Supports `TRANSIT_BUS`, `PWD_INSPECTION`, and `MUNICIPAL_SERVICE_TRUCK`.
2. **Multi-Camera Normalization:** Tracks mount positions (`WINDSHIELD_CENTER`, `ROOF_FORWARD_OBLIQUE`, `HOOD_DOWNWARD_PULL`), field-of-view, resolution, and focal length.
3. **Telemetry Provenance:** Every inspection ping and session is explicitly classified into `LIVE`, `REPLAY`, `SIMULATED`, or `ESTIMATED`. The system strictly prohibits presenting simulated feeds as real-time GPS.
4. **Coverage Intelligence:** Computes corridor inspection recency and surfaces coverage gaps when corridors exceed statutory freshness thresholds (e.g., >48 hours without a valid sensor pass).

---

## 2. Architecture & Data Model

### 2.1 Database Schema Migration (`0013_fleet_sensing_sessions.py`)

- **Table `buses` enhancements:**
  - `vehicle_type`: `VARCHAR(32)` (`TRANSIT_BUS`, `PWD_INSPECTION`, `MUNICIPAL_SERVICE_TRUCK`)
  - `make_model`: `VARCHAR(128)`
  - `total_distance_km`: `FLOAT`
  - `telemetry_mode`: `VARCHAR(32)` (`LIVE`, `REPLAY`, `SIMULATED`, `ESTIMATED`)

- **New Table `cameras`:**
  - `id`: Primary key `VARCHAR(64)`
  - `bus_id`: Foreign key referencing `buses.id`
  - `mount_position`: `VARCHAR(64)` (`WINDSHIELD_CENTER`, `ROOF_FORWARD_OBLIQUE`, `HOOD_DOWNWARD_PULL`)
  - `fov_degrees`: `FLOAT`
  - `resolution`: `VARCHAR(32)` (e.g., `1080p`, `4K`)
  - `focal_length_mm`: `FLOAT`
  - `is_calibrated`: `BOOLEAN`
  - `installed_at`: `TIMESTAMP WITH TIME ZONE`

- **New Table `inspection_sessions`:**
  - `id`: Primary key `VARCHAR(64)`
  - `bus_id`: Foreign key referencing `buses.id`
  - `road_segment_id`: Foreign key referencing `road_segments.id`
  - `telemetry_provenance`: `VARCHAR(32)` (`LIVE`, `REPLAY`, `SIMULATED`, `ESTIMATED`)
  - `frames_analyzed`: `INTEGER`
  - `potholes_detected`: `INTEGER`
  - `started_at` & `ended_at`: `TIMESTAMP WITH TIME ZONE`
  - `is_active`: `BOOLEAN`

---

## 3. Fleet Intelligence Services & Endpoints

- **Service Module:** `backend/app/services/fleet_intelligence.py`
- **API Endpoints (`backend/app/api/v1/fleet.py`):**
  - `GET /api/v1/fleet/summary`: Aggregate metrics including active sensing rigs, camera counts, and simulated vs real-time ratios.
  - `GET /api/v1/fleet/buses`: Detailed list of vehicles including mounted camera rigs and telemetry provenance.
  - `GET /api/v1/fleet/sessions`: Recent inspection sessions with defect yields and provenance tags.
  - `GET /api/v1/fleet/coverage`: Corridor freshness audit identifying covered vs gap corridors.

---

## 4. Automated Backend Verification

Executed test suite: `backend/tests/test_phase9_fleet.py` (5 / 5 passed):
1. `test_fleet_summary_kpis`: Confirms vehicle counts, camera hardware counts, and telemetry provenance breakdown.
2. `test_buses_with_cameras_and_type`: Validates multi-camera associations and vehicle types (`TRANSIT_BUS`, `PWD_INSPECTION`, etc.).
3. `test_inspection_sessions_provenance_truth`: Verifies that provenance is strictly preserved (`SIMULATED` vs `LIVE`).
4. `test_corridor_coverage_intelligence`: Verifies corridor freshness status and gap detection algorithm.
5. `test_truth_audit_no_fake_multi_class_or_gps`: Confirms strict single-class pothole metrics and truthful telemetry labeling.

---

## 5. Frontend UI Verification

- **Page:** `frontend/src/pages/Fleet.tsx`
- **Features Tested:**
  - 4 Executive Fleet KPI cards: Total Sensing Vehicles, Calibrated Cameras, Active Inspection Sessions, Monitored Corridors.
  - Vehicle Rigs grid with Vehicle Type badges and multi-camera hardware specs.
  - Telemetry Provenance Badges (`LIVE`, `REPLAY`, `SIMULATED`, `ESTIMATED`).
  - Recent Inspection Sessions Table with analyzed frame counts and defect detections.
  - Corridor Coverage Intelligence Table showing pass recency and status (`COVERED` vs `GAP`).
