# SIH26124 Final Implementation Report

## Acceptance-pass closure

The rebuilt frontend includes clearly-labelled controlled simulator actions for fixed and
still-present revisits. The genuine clean-frame fixture completed the real inspection
pipeline with zero detections (`INSP-CD50EEC3`). These controls represent demo actions, not
live field telemetry; route locations remain interpolated rather than hardware GPS.

The final verification-only pass completed three independent browser fixed flows and one
separate unresolved flow. Road Health now recalculates from persisted active issues on the
segment, and the frontend fetches segment and summary data sequentially. Browser proof showed
84/100 before and 86/100 after fixed verification for `SEG-DEL-NCR-01`.

The earlier false 100/100 result came from a stale host uvicorn process serving port 8000
alongside Docker, compounded by concurrent endpoint refreshes. The showcase run must use the
Docker backend exclusively.

## Changes delivered

1. Added persisted inspection event results to `InspectionJob`.
2. Added Alembic migration `0005_inspection_events`.
3. Returned actual processed events from the inspection status endpoint.
4. Fixed issue detail serialization to load linked detections, GPS, severity, and evidence
   without relying on an undefined variable.
5. Added `gps` and `snappedGps` compatibility fields to issue locations.
6. Changed the primary intelligence map default center to Delhi-NCR.
7. Added a narrowly scoped mock-mode synthetic video fixture so offline ML integration
   tests exercise the complete processor rather than failing before frame processing.
8. Seeded Delhi-NCR authority departments, demo operator identity, and showcase road segment
   during cold-start migrations so routing, assignment, and health calculations have valid
   configured records.
9. Added browser ticket creation and the missing frontend PUT client method required by the
   ticket status workflow.

## Root cause of the upload symptom

The upload endpoint created an asynchronous inspection job and the backend processed
events, but the status response deliberately discarded them (`events: []`). The
inspection page therefore had no result payload to render even when ingestion completed.
This made the UI appear stuck and encouraged the existing seeded/static issue cards to be
mistaken for upload output. The new `events` JSON column closes that result handoff.

A second runtime defect was found during the positive upload verification: the synchronous
ML worker called `asyncio.create_task()` from a worker thread, producing `no running event
loop` and failing the job before final persistence. Progress updates now schedule onto the
owning event loop with `call_soon_threadsafe`.

## Verification

| Check | Result |
|---|---|
| ML video processor E2E | Passed |
| Python compilation | Passed |
| Frontend production build | Passed |
| Alembic upgrade | Passed (`0004_timeline -> 0005_inspection_events`) |
| Issue coordinate serializer test | Fixed compatibility shape (`lat/lng/gps/snappedGps`) |

## Known limitations

- The checked-in YOLO artifact reports one runtime class; the four-class taxonomy is
  not verified by the current model and must not be presented as live capability.
- The default GPS path is controlled interpolation, not hardware GPS.
- SSE broadcasting is process-local.
- Historical/test fixtures may still reference Bengaluru; the active showcase simulator and
  route defaults use Delhi-NCR.
- Full backend tests require a compatible bcrypt/passlib dependency set and stable async
  test lifecycle; those are environment/test-harness issues not introduced by this change.
- A Docker cold-started browser run completed with inspection `INSP-58E31844`, nine real
  events, persisted evidence crops, Delhi-NCR route metadata, and issue IDs.
- Full browser ticket/repair/reinspection flow and three consecutive golden runs remain
  acceptance gaps.
- Real model loading now fails loudly instead of silently switching to mock detections.
