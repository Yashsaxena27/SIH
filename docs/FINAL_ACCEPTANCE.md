| Capability | Implementation | API | DB Persistence | Frontend | Real E2E | Status |
|---|---|---|---|---|---|---|
| VIDEO | `backend/app/api/v1/inspection.py` | `POST /api/v1/inspection/video` | `InspectionJob` table | Phase 1 UI | Yes (tested `test_video.mp4`) | PASS |
| YOLO | `ml/pipeline.py` & `best.pt` | Background worker | N/A | SSE Progress | Yes (331 frames) | PASS |
| DETECTION | `_process_frame()` | `/api/v1/analytics/detections` | `Detection` table | Phase 1 UI | Yes (4 raw detections) | PASS |
| EVIDENCE | `storage.py` (Local mount) | `/evidence/BUS...` | `Observation.evidence_url` | Issue Detail UI | Yes (JPG frames stored) | PASS |
| OBSERVATION | `geoalchemy2` processing | `/api/v1/analytics/observations` | `Observation` table | Issue Detail UI | Yes (3 emitted tracks) | PASS |
| FUSION | `ST_DWithin` & Tracker | N/A | `UrbanIssue` table | Live Map / Issues | Yes (grouped to issue) | PASS |
| ROAD ISSUE | `UrbanIssue` model | `GET /api/v1/issues/{id}` | `UrbanIssue` table | Issues UI | Yes (iss_d6b61e10964c) | PASS |
| ROAD SEGMENT | PostGIS Nearest Neighbor | `/api/v1/analytics/roads` | `UrbanIssue.road_segment_id` | Overview Map | Yes (grid_12_9721...) | PASS |
| HOTSPOT | `ST_ClusterDBSCAN` | `GET /api/v1/hotspots` | `Hotspot` view/table | IntelligencePage | Yes (dynamically clustered) | PASS |
| SEVERITY | `Dynamic thresholding` | `/api/v1/issues/{id}` | `UrbanIssue.severity` | Issue Detail | Yes (medium/low) | PASS |
| PRIORITY | `Dynamic matrix` | `/api/v1/issues/{id}` | `UrbanIssue.priority` | Issues list | Yes | PASS |
| ROAD HEALTH | `severity_density_duration` | `/api/v1/analytics/roads/.../decision-support` | Derived | Road Health UI | Yes (Score: 74.8) | PASS |
| COMPLAINT | `Complaint` model | `POST /api/v1/complaints` | `Complaint` table | N/A | Yes | PASS |
| TICKET | `Ticket` model | `GET /api/v1/tickets` | `Ticket` table | Tickets UI | Yes (tkt_643ffe6f...) | PASS |
| ASSIGNMENT | `ticket_lifecycle.py` | `POST /api/v1/tickets/{id}/assign` | `Ticket.assigned_to` | Tickets UI | Yes (assigned) | PASS |
| IN_PROGRESS | `transition_ticket` | `PATCH /api/v1/tickets/{id}/status`| `TicketStatus.in_progress` | Tickets UI | Yes | PASS |
| REPAIR_REPORTED | `transition_ticket` | `POST /api/v1/tickets/{id}/repair-report` | `TicketStatus.repair_reported` | Tickets UI | Yes | PASS |
| VERIFICATION | `create_manual_verification` | `POST /api/v1/verifications` | `Verification` table | Verification UI | Yes (resolved) | PASS |
| VERIFIED | `transition_ticket` | `PATCH /api/v1/tickets/{id}/status` | `TicketStatus.verified_resolved` | Issue Detail UI | Yes | PASS |
| REOPENED | `transition_ticket` | `PATCH /api/v1/tickets/{id}/status` | `TicketStatus.reopened` | Issue Detail UI | Yes | PASS |
| TIMELINE | `ticket_lifecycle.py` | Embedded in `GET /issues/{id}` | `TimelineEvent` table | Resolution History | Yes (length=13) | PASS |
| SSE | `broadcast_event` | `/api/v1/stream` | N/A | Active listeners | Yes | PASS |
| MAP | `react-leaflet` | `/api/v1/hotspots` | N/A | `CommandMap.tsx` | Yes | PASS |
