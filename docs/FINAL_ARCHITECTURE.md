# POTHOLE WALA — SYSTEM ARCHITECTURE SPECIFICATION
## Comprehensive End-to-End Technical Architecture & Data Flows

============================================================
PLATFORM: POTHOLE WALA — Infrastructure Intelligence Network
BUILD: SIH 2026 Final Release Candidate (v1.0)
DATABASE: PostgreSQL 15 + PostGIS 3.3 | CACHE: Redis 7.0
FRAMEWORK: FastAPI (Python 3.11) + React 19 (TypeScript, TailwindCSS)
============================================================

---

## 1. High-Level Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EDGE VEHICLE SENSING LAYER                              │
│                                                                             │
│   [DTC Bus BUS-001]           [DIMTS Bus BUS-002]        [PWD Survey Unit]   │
│   - 1080p Optical Cam         - 1080p Optical Cam        - Dual HD Cameras  │
│   - YOLOv8 Edge Node          - YOLOv8 Edge Node         - High-Precision   │
│   - GNSS Receiver             - GNSS Receiver              GNSS Receiver    │
└───────────────────────┬───────────────────┬───────────────────┬─────────────┘
                        │ (JSON + Frames)   │                   │
                        ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   INGESTION & SPATIAL FUSION PIPELINE                        │
│                                                                             │
│   FastAPI Ingestion Gateway (/api/v1/ingestion/telemetry)                   │
│   ├── Schema Validation & Telemetry Provenance Attribution (SIM/REPLAY/LIVE) │
│   ├── PostGIS Orthogonal Road Centerline Snapping (ST_ClosestPoint)         │
│   ├── PostGIS Spatial Cluster Matching (ST_DWithin 15m radius)              │
│   └── Multi-Bus Bayesian Corroboration & Centroid Stabilization             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STORAGE & GEOSPATIAL DATABASE                           │
│                                                                             │
│   PostgreSQL 15 + PostGIS 3.3 (port 5433)                                   │
│   ├── urban_issues (Canonical issues, Status, Severity, GIST Spatial Index) │
│   ├── detections & observations (Raw sensor detections & bus observations)  │
│   ├── road_segments (OSM polylines, ownership, IRC hierarchy, health index) │
│   ├── tickets & verifications (Municipal work orders, 3-way outcomes)       │
│   ├── inspection_sessions (Fleet sessions, distance, frames, provenance)    │
│   └── Redis 7.0 In-Memory Cache (Real-time badge counts & SSE events)       │
└───────────────────────┬──────────────────────────────────┬──────────────────┘
                        │                                  │
                        ▼                                  ▼
┌───────────────────────────────────────┐  ┌──────────────────────────────────┐
│        ANALYTICS & ENGINES            │  │     CLOSED-LOOP VERIFICATION     │
│                                       │  │                                  │
│ 1. Explainable Priority Engine        │  │ 1. Reinspection Pass Matcher     │
│    - Arterial hierarchy + Severity    │  │ 2. 3-Way Decision Gate:          │
│ 2. SafeRoute Routing Engine           │  │    - RESOLVED (Asphalt patch)    │
│    - Multi-criteria risk routing      │  │    - UNRESOLVED (Auto-reopen)    │
│ 3. Road Health Calculator             │  │    - INCONCLUSIVE (Glare/wash)   │
│    - Dynamic segment health (0-100)   │  │ 3. Append-only Override Ledger   │
└───────────────────────┬───────────────┘  └──────────────────┬───────────────┘
                        │                                     │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND APPLICATION LAYER                              │
│                                                                             │
│   React 19 + TypeScript + Vite + TailwindCSS (port 5173)                   │
│   ├── Mission Control Command Deck (/overview)                              │
│   │   ├── Unified KPIs, Prioritized Action Queue, System Diagnostics        │
│   ├── GIS Geospatial Road Intelligence (/intelligence)                      │
│   │   ├── Interactive Leaflet Map, Corridor Polylines, SafeRoute Panel      │
│   ├── Closed-Loop Verification Console (/verification)                      │
│   │   ├── 3-way outcome filters, Before/After inspection comparison         │
│   ├── Fleet & Sensor Operations Deck (/fleet)                               │
│   │   ├── Sensing vehicles, Mounted cameras, Telemetry Provenance badges    │
│   └── Global Command Palette (Ctrl+K) & Live Notification Banners           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Spatial Deduplication & Corroboration Engine
- **Centroid Snapping**: Detections within 15 meters on the same road segment are merged into a canonical `UrbanIssue`.
- **Bayesian Confidence Adjustment**:
  $$C_{\text{fused}} = 1 - \prod_{j=1}^{N} (1 - c_j)$$
  Where $c_j$ is the confidence of individual observation $j$.
- **Corroboration Flag**: Activated once $\text{unique\_bus\_count} \ge 2$, boosting issue priority in the action queue.

### 2.2 Explainable Priority Engine
Computes a composite priority score $P \in [0, 100]$:
$$P = w_s \cdot S + w_v \cdot V + w_c \cdot C + w_a \cdot A$$
- $S$: Defect severity factor (Low: 25, Medium: 60, High: 85, Critical: 100).
- $V$: Road hierarchy traffic weight (Expressway: 1.0, Arterial: 0.85, Sub-arterial: 0.65, Local: 0.40).
- $C$: Corroboration factor (Single bus: 0.7, Multi-bus corroborated: 1.0).
- $A$: Age/SLA decay factor (escalates over time until repaired).

### 2.3 Closed-Loop Verification 2.0 State Machine
```text
[new] ──► [ticket_created] ──► [in_repair] ──► [verification_pending]
                                                        │
                      ┌─────────────────────────────────┼─────────────────────────────────┐
                      ▼                                 ▼                                 ▼
                 [RESOLVED]                       [UNRESOLVED]                     [INCONCLUSIVE]
              (Confidence ≥0.85)             (Defect still detected)            (Glare, occlusion, blur)
                      │                                 │                                 │
                      ▼                                 ▼                                 ▼
             Issue Status: verified            Issue Status: reopened             Issue Status: verification_pending
             Ticket Status: closed             Ticket Status: reopened            Ticket Status: verifying
```

---

## 3. Database Schema Overview

| Table Name | Primary Key | Key Relationships / Indices | Purpose |
| :--- | :--- | :--- | :--- |
| `urban_issues` | `id` (VARCHAR) | `GIST(location)`, `road_segment_id`, `authority_id` | Canonical deduplicated defect entity |
| `detections` | `id` (VARCHAR) | `GIST(location)`, `bus_id` | Raw edge model detections |
| `observations` | `id` (VARCHAR) | `issue_id`, `detection_id`, `bus_id` | Evidence links associating buses to issues |
| `road_segments`| `id` (VARCHAR) | `GIST(geometry)`, `authority_id` | OpenStreetMap road centerlines with health index |
| `tickets` | `id` (VARCHAR) | `issue_id` (Unique), `authority_id` | Municipal work tickets dispatched to contractors |
| `verifications`| `id` (VARCHAR) | `issue_id`, `ticket_id`, `bus_id` | Reinspection outcomes (Resolved, Inconclusive) |
| `inspection_sessions` | `id` (VARCHAR) | `vehicle_id`, `camera_id` | Vehicle sensing runs with telemetry provenance |
