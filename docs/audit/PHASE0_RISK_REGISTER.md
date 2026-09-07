# PHASE 0 — COMPREHENSIVE RISK REGISTER & THREAT MATRIX
**Project:** POTHOLE WALA — Infrastructure Intelligence Network  
**Audit Date:** September 2026  
**Auditor Roles:** Senior Principal Security Architect, Principal Reliability Engineer  
**Scope:** Exhaustive catalog of all technical, operational, security, and presentation risks ranked from P0 (Critical) to P3 (Cosmetic).

---

## 1. Risk Severity Hierarchy Definitions

- **P0 (Critical Blocker):** System crash, total security compromise, unauthenticated data destruction, or guaranteed demo failure before judges.
- **P1 (High Severity):** Major feature broken, performance degradation under moderate load, dead user flows, or architectural disconnect.
- **P2 (Medium Severity):** Inefficient resource utilization, unoptimized queries, confusing UI navigation, or missing test suites.
- **P3 (Low / Cosmetic):** Typographic inconsistencies, minor styling flaws, or redundant code files.

---

## 2. Exhaustive Risk Register

| Risk ID | Severity | Subsystem | File & Location | Description & Root Cause | Impact | Likelihood | Concrete Mitigation Strategy |
|---|:---:|---|---|---|---|:---:|---|
| **RSK-001** | **P0** | Security | `backend/app/api/v1/*.py` | **Zero API Authentication.** All 28+ endpoints lack auth dependencies or JWT validation. | Complete vulnerability to unauthorized data modification, ticket deletion, or spoofing. | HIGH | Implement FastAPI `Depends(get_current_user)` middleware enforcing JWT auth on all mutating endpoints. |
| **RSK-002** | **P0** | Ingestion | `ml/pipeline/video_processor.py:272` | **Host Windows FFMPEG Missing.** Video processor invokes `ffmpeg` directly in CLI without fallback. | Local inspection processing crashes with unhandled `RuntimeError` outside Docker. | HIGH | Either package static ffmpeg binary for Windows or gracefully fallback to webm/direct OpenCV streaming. |
| **RSK-003** | **P1** | Frontend | `frontend/src/components/common/CommandPalette.tsx:51` | **Hardcoded Mock Search Results.** Palette serves mock items linking to `/issues/1` (which 404s). | Judge clicking search result gets an immediate 404 crash screen. | HIGH | Connect Command Palette to live `/api/v1/issues?search=` backend endpoint using valid UUIDs. |
| **RSK-004** | **P1** | GIS / DB | `backend/app/services/spatial_fusion.py:36` | **PostGIS Expression Index Missing.** Query wraps `location` in `func.Geography()` bypassing geometry GiST index. | Sequential table scan on every detection frame; DB CPU spikes to 100% under video load. | HIGH | Execute Alembic migration adding functional index: `CREATE INDEX idx_urban_issues_geog_location ON urban_issues USING gist ((location::geography))`. |
| **RSK-005** | **P1** | ML Engine | `ml/models/best.pt` | **Single-Class Model Limitation.** Neural network contains solely `{0: 'pothole'}` despite multi-defect UI claims. | Jury questioning claims of crack/rutting detection will expose false claims. | HIGH | Reconcile UI copy and presentation claims to highlight pothole specialization; plan RDD2022 multi-class retrain in Phase 2. |
| **RSK-006** | **P1** | Frontend | `frontend/src/pages/IssueDetail.tsx:77` | **Missing Backend Route.** UI calls `PATCH /api/v1/issues/{id}` which does not exist in FastAPI router. | HTTP 405 Method Not Allowed when user attempts to change issue status directly. | HIGH | Add `PATCH /api/v1/issues/{id}` route to `backend/app/api/v1/issues.py` handling status updates. |
| **RSK-007** | **P1** | Frontend | `frontend/src/pages/Reports.tsx:159`, `Alerts.tsx:96` | **Dead UI Action Buttons.** "Generate Report" and "Acknowledge" buttons have no `onClick` handlers. | UI appears unresponsive and prototype-like during jury inspection. | HIGH | Wire buttons to proper mutation functions or display interactive success toasts. |
| **RSK-008** | **P1** | Realtime | `backend/app/api/v1/events.py:10` | **Redis Disconnect.** In-memory Python `set()` used for SSE broadcast while Redis 7 container runs idle. | SSE push fails silently across multi-worker Uvicorn processes or clustered containers. | MEDIUM | Connect `events.py` to Redis Pub/Sub backend using `redis-py` or `aioredis`. |
| **RSK-009** | **P1** | GIS Engine | `backend/app/services/spatial_fusion.py:45` | **Concurrency Race Condition.** No row-level locking between `find_nearby_issue` and `session.add`. | Simultaneous detections at identical coordinates create duplicate issue records. | MEDIUM | Add PostGIS spatial exclusion constraint or wrap fusion in PostgreSQL transaction with advisory locks. |
| **RSK-010** | **P2** | Seed Data | `backend/scripts/seed_demo.py` | **Geographic Seed Collision.** Legacy script seeds Bengaluru BMTC data, conflicting with Delhi golden demo. | Accidental run wipes Delhi demo and scatters issues in South India. | MEDIUM | Quarantining or deprecating `seed_demo.py`, locking `seed_golden_demo.py` as official source. |
| **RSK-011** | **P2** | ML Pipeline | `ml/pipeline/gps_simulator.py:7` | **Hardcoded Bengaluru GPS Track.** Default simulation coordinates are located in Bengaluru. | Synthetic patrol simulations land thousands of kilometers outside Delhi map bounds. | MEDIUM | Update default simulator route coordinates to follow Delhi Ring Road (`[28.5355, 77.2090]`). |
| **RSK-012** | **P2** | Testing | `frontend/package.json` | **Zero Frontend Tests.** No test runner (Vitest/Jest) or component tests configured. | Regressions in React state and routing remain undetected prior to release. | MEDIUM | Configure Vitest + React Testing Library with component smoke tests for primary routes. |
| **RSK-013** | **P2** | CI/CD | Root repository | **Missing CI Pipeline.** No `.github/workflows/` directory or automated test gating. | Untested or broken code can be pushed directly to main branch. | MEDIUM | Implement GitHub Actions workflow running `pytest`, `eslint`, and `tsc -b` on pull requests. |
| **RSK-014** | **P2** | Security | `backend/app/api/v1/inspection.py:32` | **Unrestricted File Upload.** Missing file size limits and MIME validation on video uploads. | Malicious or oversized files can exhaust server disk space. | MEDIUM | Enforce `MAX_CONTENT_LENGTH = 100MB` and validate video header magic bytes. |
| **RSK-015** | **P3** | Frontend | `frontend/src/pages/LiveMap.tsx` | **Duplicate Page Component.** Exactly identical to `Intelligence.tsx`. | Code bloat and architectural confusion. | LOW | Deprecate `LiveMap.tsx` and consolidate routing to `Intelligence.tsx`. |
| **RSK-016** | **P3** | Frontend | `frontend/src/components/layout/Sidebar.tsx:43` | **Static Navigation Badges.** Hardcoded '12' and '5' badges on Issues and Tickets links. | Cosmetic mismatch with live database counts. | LOW | Connect badges to dynamic React Query counts from `/api/v1/analytics/overview`. |
