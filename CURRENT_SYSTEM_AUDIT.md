# SIH26124 Current System Audit

## Scope and method

This audit is based on repository inspection, targeted pytest runs, Python compilation,
the Vite production build, and the configured PostgreSQL demo database. It distinguishes
runtime evidence from README or presentation claims.

## Architecture that is actually present

- **Frontend:** React/Vite/TypeScript pages under `frontend/src`, with API services and
  optional mock services selected by `VITE_USE_MOCK_DATA`.
- **Backend:** FastAPI routes under `backend/app/api/v1`, SQLAlchemy async persistence,
  PostGIS geometries, background inspection processing, and SSE event broadcasting.
- **ML:** Ultralytics inference, centroid tracking, severity estimation, local evidence
  crops, GPS interpolation, and an offline SQLite event buffer.
- **Lifecycle:** ingestion creates `Detection`, `Observation`, and `UrbanIssue` records;
  lifecycle services drive priority/ticket/verification behavior.
- **Deployment:** Docker Compose provisions PostGIS, Redis, backend, and frontend.
  Redis is provisioned but the current SSE broadcaster is process-local.

## Findings

| Area | Runtime finding | Evidence | Severity | Recommendation |
|---|---|---|---|---|
| Video results | Inspection status previously returned `events: []` unconditionally. | `backend/app/api/v1/inspection.py`, status route | Critical | Persist processed events on `InspectionJob` and return them. Implemented in migration `0005_inspection_events`. |
| Issue evidence | Issue detail referenced an undefined `point` variable and did not load detection geometry. | `backend/app/api/v1/issues.py` detail route | High | Load linked detections and serialize GPS/evidence safely. Implemented. |
| Map geography | Main intelligence map defaulted to Bengaluru. | `frontend/src/components/ui/IntelligenceMap.tsx` | High | Default showcase center is now Delhi-NCR; remaining seed/demo content needs migration. |
| ML taxonomy | Loaded model exposes one class in the local runtime, not four. | `ml/tests/test_integration.py::test_model_inference_and_class_mapping` | High | Do not claim four-class runtime support until a validated four-class artifact is installed. |
| Video fixture | Integration expected a missing `mock_input.mp4`. | `ml/tests/test_integration.py::test_video_processor_e2e` | Medium | Added an explicit mock-mode-only synthetic fixture path; real missing uploads still fail. |
| Frontend mode | Mock data is controlled by `VITE_USE_MOCK_DATA`; Docker sets it false. | `frontend/src/services/core/config.ts`, `docker-compose.yml` | High | Keep false for the live demo and visibly label any fallback/demo dataset. |
| Realtime | SSE uses an in-memory global client set. | `backend/app/api/v1/events.py` | Medium | Replace with Redis pub/sub for multi-worker deployment. Single-process demo is supported. |
| GPS | Video processor uses deterministic interpolation when no source GPS is supplied. | `ml/pipeline/video_processor.py`, `gps_simulator.py` | Medium | Expose route metadata and label interpolated locations in the UI. |
| Security | Demo JWT fallback and default database credentials exist in compose/config. | `backend/app/core/config.py`, `docker-compose.yml` | High | Use production secrets and database credentials outside demo mode. |

## What is real vs mocked

**Real in the configured path:** file upload, OpenCV metadata inspection, YOLO invocation
when the model loads, tracking, evidence crop writing, event ingestion, spatial fusion,
database issue creation, and annotated video generation.

**Controlled/demo support:** route GPS interpolation, seeded lifecycle records, local
evidence storage, the mock video fixture, and frontend mock services when explicitly enabled.

**Not verified:** live government integrations, external authority APIs, multi-worker
realtime delivery, and a validated four-class model in this checkout.

## Validation snapshot

- `python -m pytest ml/tests/test_integration.py::test_video_processor_e2e -q`: **passed**.
- `python -m compileall backend/app ml -q`: **passed**.
- `frontend/npm run build`: **passed** after `npm ci`.
- Inspection API route test reaches the database but remains sensitive to Starlette/
  asyncpg event-loop behavior when `TestClient` runs background work.
- Full backend integration has unrelated environment failures: bcrypt/passlib runtime
  incompatibility and an expected fixture image that is absent.

## Highest-value remaining work

1. Install and validate the intended four-class model artifact.
2. Add route/session metadata to uploads and persist GPS source/accuracy.
3. Replace process-local SSE with Redis pub/sub when deploying multiple workers.
4. Migrate all seeded/sample geography and visible labels from Bengaluru to Delhi-NCR.
5. Add a browser E2E run against Docker, including upload-to-issue-to-evidence verification.
