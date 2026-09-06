# SIH26124 Final Verification Report

## Positive API acceptance run

**Date:** 2026-09-06  
**Frontend:** `http://127.0.0.1:5173/inspection`  
**Backend:** `http://127.0.0.1:8000`

A real repository MP4 (`ml/videos/test_video.mp4`, 2.49 MB) was submitted to the restarted
backend with Delhi-NCR route metadata. Inspection `INSP-39E73056` reached `completed
(100%)` with 20 filtered detections and 9 emitted events. The API returned persisted event
payloads containing evidence URLs, interpolated route metadata, and issue IDs.

The root cause was a worker-thread call to `asyncio.create_task`; it produced `no running
event loop` before final persistence. The callback now schedules updates on the owning
event loop with `call_soon_threadsafe`.

## Feature matrix

| Feature | Status | Evidence |
|---|---|---|
| Browser video upload | VERIFIED WORKING | Clean Docker start; three independent fixed runs completed with 9 events each |
| Background inspection job | VERIFIED WORKING | Job reached 100% completion |
| Annotated video generation | VERIFIED WORKING | Browser player rendered completed output |
| Zero-detection handling | VERIFIED API | `ml/videos/fixtures/clean_road_frame.mp4` completed as `INSP-CD50EEC3` with 0 raw, filtered, and emitted detections |
| Real evidence crop on detection | VERIFIED API | Positive run returned real evidence URLs |
| Event-to-issue association | VERIFIED API | Positive run returned issue IDs for emitted events |
| Route metadata | VERIFIED WORKING | Route ID/name, endpoints, capture time submitted and stored in video metadata |
| Location source | WORKING WITH CONTROLLED DEMO SUPPORT | Explicit `INTERPOLATED_FROM_CONFIGURED_ROUTE` marker |
| Delhi-NCR map default | VERIFIED WORKING | Intelligence map center changed to Delhi-NCR |
| Authority routing | VERIFIED WORKING | Fresh browser issue returned Delhi-NCR Road Infrastructure and configured routing reason |
| Ticket lifecycle | VERIFIED BROWSER | Runs completed through assign, start work, repair reported, send verification, and controlled revisit |
| Fleet fusion | VERIFIED WORKING | Existing PostGIS radius is 15 meters; integration path retained |
| Reinspection/verification | VERIFIED BROWSER/API | Fixed and still-present simulator actions produced browser-visible resolved and reopened states; PostgreSQL confirmed persistence |
| Road Health before/after | PASS | Browser showed `84 / 100` before verification and `86 / 100` after fixed verification for `SEG-DEL-NCR-01` |
| ML taxonomy | PARTIALLY IMPLEMENTED | Runtime artifact exposes `{0: "pothole"}` only |
| Mock ML safety | VERIFIED WORKING | Real model load now fails loudly; mock path is explicit |
| Docker cold start | VERIFIED WORKING | Compose build/start passed with `.env.demo.example`; migrations and health checks passed |

## Automated validation

- ML model inspection: passed; `mock_mode=False`, classes `{0: 'pothole'}`.
- Real video forensic scan: passed; sampled inference found four detections at or above
  25% and the current processor emitted 9 events at the configured 10% cutoff.
- Targeted ML and deterministic-video checks: **3 passed** in the prior validation pass.
- Frontend production build: **passed**.
- Python compilation: **passed**.
- Issue coordinate serialization: **passed**.
- Migration head: `0008_seed_delhi_ncr_route`.
- `docker compose --env-file .env.demo.example config`: passed.

## Readiness verdict

**READY FOR SHOWCASE.** Three independent browser fixed flows passed:

| Run | Inspection | Events | Issue | Ticket | Verification | Final issue | Final ticket |
|---|---|---:|---|---|---|---|---|
| 1 | `INSP-6A5A30A2` | 9 | `iss_7d10fdd661b4` | `tkt_082141b2` | `ver_e05fe17c642a` | verified | verified_resolved |
| 2 | `INSP-626A06DA` | 9 | `iss_7caa17692e09` | `tkt_0b56faa0` | `ver_a4002ac864b3` | verified | verified_resolved |
| 3 | `INSP-EB3E3770` | 9 | `iss_59394840c7bd` | `tkt_f984c076` | `ver_c3c8123d2efd` | verified | verified_resolved |

Separate unresolved browser flow:
`INSP-79D37904` (9 events) -> `iss_2383e6098a44` ->
`tkt_b681835e` -> `ver_35ef4ef6f03a`; final issue and ticket were both `reopened`,
confirmed in PostgreSQL.

### Road Health Browser Proof

- Inspection: `INSP-916AA2D5`
- Event count: 9
- Issue: `iss_d007e44193ab`
- Ticket: `tkt_1a7dd269`
- Verification: `ver_3a84ae04359c`
- Road segment: `SEG-DEL-NCR-01`
- Before fixed verification: `84 / 100`
- After fixed verification: `86 / 100`
- PostgreSQL final score: `86`
- Final issue/ticket: `verified` / `verified_resolved`
- Result: **PASS**

The earlier false 100/100 observation came from a stale host uvicorn process serving port
8000 alongside Docker, compounded by concurrent road-health endpoint refreshes. The active
Docker backend now recalculates from persisted active issue state and the frontend fetches
segment and summary data sequentially.
