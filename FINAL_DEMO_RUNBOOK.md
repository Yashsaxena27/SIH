# SIH26124 Demo Runbook

Current status: **READY FOR SHOWCASE**. Three independent browser fixed runs, evidence,
routing, ticket lifecycle, fixed/unresolved verification, zero-detection upload, Docker cold
start, and Road Health before/after proof are verified.

## Pre-demo

1. Start services with the checked-in safe configuration:
   `docker compose --env-file .env.demo.example up -d --build`.
2. Confirm `docker compose ps` reports database, Redis, backend, and frontend running/healthy.
3. Confirm `http://localhost:8000/health/live` and `/health/ready`. Ensure no unrelated host
   uvicorn process is occupying port 8000.
4. Run `python backend/scripts/reset_demo_data.py` only from a host Python environment.
5. Confirm `VITE_USE_MOCK_DATA=false` for the showcase path.

## Golden flow

1. Open the frontend and navigate to **AI Inspection Workstation**.
2. Select a short MP4 and confirm the displayed filename/metadata.
3. Use a configured bus and start processing.
4. Show sampling, inference, tracking, and ingestion progress.
5. Wait for **Completed**, then show the event cards and annotated MP4.
6. Open an event/issue and show evidence, confidence, severity, timestamp, bus, and
   interpolated location source.
7. Open the Issues map and show the Delhi-NCR operational center and the issue marker.
8. Follow the issue into ticket assignment, simulated repair reporting, and verification.
9. Explain that repair verification is a controlled prototype lifecycle unless an external
   authority integration is explicitly configured.
10. Use the ticket page for Assign Officer, Start Work, Report Repair, and Send Verification.
    Then use the clearly-labelled browser **Revisit - Defect Fixed** or
    **Revisit - Still Present** control; these are controlled demo actions, not live field
    inspections.

## Verified acceptance trace

- Inspection: `INSP-CF3AFC11`
- Event: `EVT-dd0751fb`
- Evidence: `/evidence/BUS001_EVT-dd0751fb_1788685304.jpg`
- Issue: `iss_56b75495046a`
- Authority/department: `DELHI-NCR-ROADS` / `Delhi-NCR Road Infrastructure`
- Ticket: `tkt_8343e6f6`
- Resolved verification: `ver_2c8a5d6a1d32`
- Browser ticket transitions persisted: `assigned` → `in_progress` → `repair_reported` → `verifying`
- Final persisted state: issue `verified`, ticket `verified_resolved`
- Alternate unresolved trace: `iss_e69b9f45dc11` -> `tkt_ea7df4ac` ->
  `ver_894e130cf78b` (`unresolved`; issue and ticket `reopened`)

## Final browser run record

- Golden 1: `INSP-6A5A30A2` -> 9 events -> `iss_7d10fdd661b4` ->
  `tkt_082141b2` -> `ver_e05fe17c642a` -> verified / verified_resolved.
- Golden 2: `INSP-626A06DA` -> 9 events -> `iss_7caa17692e09` ->
  `tkt_0b56faa0` -> `ver_a4002ac864b3` -> verified / verified_resolved.
- Golden 3: `INSP-EB3E3770` -> 9 events -> `iss_59394840c7bd` ->
  `tkt_f984c076` -> `ver_c3c8123d2efd` -> verified / verified_resolved.
- Unresolved: `INSP-79D37904` -> 9 events -> `iss_2383e6098a44` ->
  `tkt_b681835e` -> `ver_35ef4ef6f03a` -> reopened / reopened.
- Road Health browser proof: `84 / 100` before and `86 / 100` after on
  `SEG-DEL-NCR-01`; issue `iss_d007e44193ab` resolved via `ver_3a84ae04359c`.

## Failsafe

- If a custom upload is unsuitable, use a curated demo asset and label it **Demo Dataset /
  Showcase Video**.
- If processing fails, show the failed stage and error rather than presenting static issues
  as upload results.
- Reset with `python backend/scripts/reset_demo_data.py`, then reload the frontend.
- Keep one known-good short MP4 and its expected event count available before presenting.

## Claims to avoid

- Do not claim live government API integration.
- Do not claim hardware GPS when the event says interpolated/demo route.
- Do not claim four-class inference until the installed model validates four classes.
- Do not call seeded issues results of the newly uploaded file.
