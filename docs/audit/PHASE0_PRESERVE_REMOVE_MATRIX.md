# PHASE 0 — PRESERVE, ENHANCE, REWORK & REMOVE MATRIX
**Project:** POTHOLE WALA — Infrastructure Intelligence Network  
**Audit Date:** September 2026  
**Auditor Roles:** Senior Principal Software Architect, Senior Engineering Manager  
**Scope:** Actionable triage matrix categorizing every file, service, and UI component for Phase 1 execution.

---

## 1. Classification Categories

- **PRESERVE AS-IS:** Rock-solid, production-ready code with full functional correctness. Do not alter.
- **PRESERVE & ENHANCE:** Sound core architectural logic that requires targeted optimizations, index additions, or error handling.
- **REWORK / FIX:** Broken logic, missing backend endpoints, dead UI buttons, or unauthenticated routes requiring direct remediation.
- **MERGE / CONSOLIDATE:** Duplicate or redundant components that should be merged into a single authoritative module.
- **REMOVE / PURGE:** Obsolete, conflicting, or dangerous legacy code and mock fixtures.

---

## 2. Exhaustive Repository Triage Matrix

| Component / File Path | Current Status | Triage Action | Detailed Rationale & Phase 1 Execution Plan |
|---|---|:---:|---|
| `backend/app/services/spatial_fusion.py` | Working PostGIS spatial fusion | **PRESERVE & ENHANCE** | Core 15m `ST_DWithin` deduplication is mathematically sound. Add functional expression index on `geography(location)` and concurrency locks. |
| `backend/app/services/jurisdiction_engine.py`| Working 3-tier boundary routing | **PRESERVE AS-IS** | PostGIS `ST_Contains` hierarchy for PWD, MCD Central, and Noida is flawless. Maintain as primary governance engine. |
| `backend/app/services/ticket_lifecycle.py` | Working SLA state machine | **PRESERVE AS-IS** | Complete priority scoring formula and multi-tier SLA deadlines are robust and fully tested. |
| `backend/app/services/verification.py` | Working before/after CV scoring | **PRESERVE & ENHANCE** | Repair verification flow is solid. Enhance image comparison resilience under severe perspective angle shifts. |
| `backend/app/services/road_health.py` | Working PCI calculation | **PRESERVE AS-IS** | Correctly deduces road segment health scores based on aggregated defect counts. |
| `backend/scripts/seed_golden_demo.py` | Official Delhi-NCR golden demo | **PRESERVE AS-IS** | Highly coherent 100-issue dataset centered on Delhi. Lock as the sole authoritative demonstration seed. |
| `backend/app/api/v1/issues.py` | Missing PATCH route | **REWORK / FIX** | Add `PATCH /api/v1/issues/{id}` endpoint to resolve HTTP 405 error triggered by `IssueDetail.tsx`. Wire auth dependencies. |
| `backend/app/api/v1/*.py` (All Routers) | Completely unauthenticated | **REWORK / FIX** | Integrate JWT authentication dependencies (`Depends(get_current_user)`) across mutating endpoints to close P0 security gap. |
| `backend/app/api/v1/events.py` | In-memory Python SSE queue | **REWORK / FIX** | Replace in-memory `set()` with Redis Pub/Sub backend to enable true multi-worker scaling and utilize active Redis container. |
| `backend/app/api/v1/complaints.py` | Hardcoded fallback `authority_id=1` | **REWORK / FIX** | Remove hardcoded fallback; properly set unassigned complaints to `unresolved` state. |
| `ml/pipeline/video_processor.py` | Crashes on Windows (no ffmpeg) | **REWORK / FIX** | Implement graceful transcoding check, bundle static Windows ffmpeg binary or fallback to direct webm stream output. |
| `ml/models/best.pt` | Single-class YOLOv8 weights | **PRESERVE AS-IS** | Model performs well on potholes. Preserve weights for Phase 0/1; reconcile UI claims to accurately reflect single-class scope. |
| `ml/engine/tracker.py` | Centroid Euclidean tracker | **PRESERVE & ENHANCE** | Effective for slow vehicle speeds. Add basic Kalman filter velocity prediction in Phase 2 to prevent ID switching on stops. |
| `ml/engine/severity.py` | 2D pixel ratio heuristic | **PRESERVE & ENHANCE** | Retain formula for visual hazard scoring; rebrand UI copy truthfully to avoid false "3D depth measurement" claims. |
| `ml/pipeline/gps_simulator.py` | Bengaluru coordinates | **REWORK / FIX** | Update default interpolation coordinates from Bengaluru to Delhi Ring Road (`[28.5355, 77.2090]`). |
| `frontend/src/components/common/CommandPalette.tsx`| Hardcoded mock results | **REWORK / FIX** | Replace mock array with live backend search query against `/api/v1/issues?search=`, eliminating 404 navigation errors. |
| `frontend/src/components/layout/Sidebar.tsx` | Hardcoded badges '12' & '5' | **REWORK / FIX** | Connect badge counts to dynamic React Query hooks fetching live ticket and issue metrics. |
| `frontend/src/components/layout/TopBar.tsx` | Static alerts & dead buttons | **REWORK / FIX** | Connect notification dropdown to realtime SSE event hook; wire "Mark all read" to dismiss notifications. |
| `frontend/src/pages/Reports.tsx` | "Generate Report" dead button | **REWORK / FIX** | Wire button to export CSV/PDF or trigger PDF download modal with active road health metrics. |
| `frontend/src/pages/Alerts.tsx` | "Acknowledge" dead button | **REWORK / FIX** | Wire acknowledge button to update alert status in local state and emit acknowledgement toast. |
| `frontend/src/pages/Settings.tsx` | 6 inert category cards | **REWORK / FIX** | Implement tabbed settings view allowing configuration of notification thresholds and map layer defaults. |
| `frontend/src/pages/LiveMap.tsx` | 100% duplicate of `Intelligence.tsx`| **MERGE / CONSOLIDATE** | Remove `LiveMap.tsx` and redirect route `/live-map` to `Intelligence.tsx` to eliminate redundant code. |
| `frontend/src/pages/Traffic.tsx` | Dummy Phase 2 placeholder | **MERGE / CONSOLIDATE** | Either hide from navigation or integrate real road congestion overlay onto main Intelligence map. |
| `backend/scripts/seed_demo.py` | Conflicting Bengaluru demo seed | **REMOVE / PURGE** | Delete or quarantine to eliminate risk of wiping Delhi golden demo data and scattering coordinates in Karnataka. |
| `backend/scripts/seed.py` | Minimal legacy seed script | **REMOVE / PURGE** | Obsolete prototype script superseded by `seed_golden_demo.py`. |
| `mock_input.mp4` & `annotated_output.mp4`| Root directory test artifacts | **REMOVE / PURGE** | Move to `ml/videos/fixtures/` to keep workspace root clean and standardized. |
