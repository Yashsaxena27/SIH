# SIH26124 Remaining Limitations

## Verified in the current pass

- The real model loads with mock mode disabled.
- `ml/videos/test_video.mp4` produces real one-class pothole detections.
- The fixed backend completes the upload and persists 9 events with evidence URLs,
  interpolated Delhi-NCR locations, and issue IDs.
- The worker-to-event-loop failure (`no running event loop`) is fixed.

## Still incomplete or environment-dependent

- The installed model exposes only `{0: "pothole"}`; four-class inference is not validated.
- Location is route interpolation, not hardware GPS.
- The positive browser event-card and ticket/repair lifecycle is verified after cold start.
- `ml/videos/fixtures/clean_road_frame.mp4` is a genuine zero-detection fixture and completed
  through the upload API; a separate browser upload capture is still desirable.
- Docker cold start is verified with `.env.demo.example`.
- Three independent browser golden runs completed successfully:
  `INSP-6A5A30A2`, `INSP-626A06DA`, and `INSP-EB3E3770`, each with 9 events and
  verified/verified_resolved final states.
- The browser now has clearly-labelled simulated revisit controls; these represent controlled
  demo actions, not live field inspections.
- Road Health uses `100 - severity deductions - (reopened count * 5)`, clamped to 0-100.
  Browser proof passed with 84/100 before and 86/100 after fixed verification on
  `SEG-DEL-NCR-01`.
- Separate unresolved browser run `INSP-79D37904` -> `iss_2383e6098a44` ->
  `tkt_b681835e` -> `ver_35ef4ef6f03a` ended reopened/reopened and was confirmed in PostgreSQL.
- Full backend test execution is blocked by the environment's missing `pytest` command and
  previously observed bcrypt/passlib compatibility issues.
- Seeded/demo analytics and historical records remain synthetic unless explicitly labelled.
- Road Health is a decision-support score, not an official pavement condition index.

## Claim boundary

Do not claim live government integration, hardware GPS, four-class inference, production
accuracy, or full-city deployment.
