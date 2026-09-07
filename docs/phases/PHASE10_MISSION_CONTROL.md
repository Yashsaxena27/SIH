# PHASE 10 SPECIFICATION & VERIFICATION: MISSION CONTROL
**POTHOLE WALA — Infrastructure Intelligence Network**  
**SIH 2026 Build**

---

## 1. Executive Summary

Phase 10 delivers **Mission Control**, an executive operational command center designed for municipal commissioners, chief road engineers, and transit control rooms. Mission Control synthesizes cross-domain telemetry from YOLO detections, spatial fusion, GIS road intelligence, closed-loop verifications, SafeRoute hazards, and fleet sensing into a single, high-density situational interface.

### Core Principles & Truth Guardrails
1. **Prioritized Action Queue:** Surfaces critical operational actions ranked by urgency:
   - `URGENT_DEFECT`: Unassigned/critical defects with high confidence.
   - `OVERDUE_TICKET`: Repair tickets exceeding SLA deadlines.
   - `FAILED_VERIFICATION`: Residual defects flagged during closed-loop reinspections.
   - `COVERAGE_GAP`: High-priority corridors missing sensing passes >48 hours.
2. **1-Click Operational Dispatch:** Direct API actions to assign emergency crews, expedite tickets, or schedule sensing runs.
3. **Cross-Domain KPIs:** Zero mocked numbers. All operational health, inspection counts, fleet sizes, and verification statistics are computed live from PostgreSQL/PostGIS.

---

## 2. Architecture & Engines

### 2.1 Mission Control Engine (`backend/app/services/mission_control_engine.py`)

- **Overview Aggregation:**
  - Correlates counts from `urban_issues`, `repair_tickets`, `road_segments`, `buses`, and `verification_decisions`.
  - Determines system health status (`OPTIMAL`, `DEGRADED`, `CRITICAL`) based on open defect counts and SLA compliance.
- **Prioritized Action Queue Generation:**
  - Filters and ranks actionable tasks with estimated operational impacts and direct execution payloads.
  - Execution endpoint (`POST /api/v1/mission-control/execute-action`) validates actions and transitions issues or dispatches crews idempotently.

---

## 3. API Endpoints

- `GET /api/v1/mission-control/overview`: System-wide KPIs, network health, active fleet, and open repair statuses.
- `GET /api/v1/mission-control/action-queue`: Prioritized queue items with severity, priority score, and target entities.
- `POST /api/v1/mission-control/execute-action`: Dispatches operational workflows with audit trail.

---

## 4. Automated Backend Verification

Executed test suite: `backend/tests/test_phase10_mission_control.py` (3 / 3 passed):
1. `test_mission_control_overview_kpis`: Confirms network health score, open defects, active vehicles, and SLA compliance calculations.
2. `test_mission_control_action_queue_ranking`: Verifies action queue generates prioritized items with valid action types.
3. `test_mission_control_execute_action`: Confirms 1-click action execution performs real updates and returns success responses.

---

## 5. Frontend Command Console

- **Page:** `frontend/src/pages/Overview.tsx`
- **Features Tested:**
  - Network Health Gauge with dynamic color coding.
  - 4 Domain Metric Cards: Critical Defects, Active Sensing Fleet, Corridors at Risk, Pending Verifications.
  - Interactive Action Queue with Filter Tabs (`ALL`, `URGENT_DEFECT`, `OVERDUE_TICKET`, `FAILED_VERIFICATION`, `COVERAGE_GAP`).
  - 1-Click Operational Execution Button with instant feedback and toast notifications.
  - System Diagnostics Panel displaying database, GIS engine, YOLO inference, and Redis latency.
