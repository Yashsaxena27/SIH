# POTHOLE WALA — DEMO RUNBOOK & PRESENTER GUIDE
## SIH 2026 Grand Finale — Live Demonstration Protocol
### Target Duration: 5–8 Minutes | Mode: Deterministic Golden Demo

============================================================
PLATFORM: POTHOLE WALA — Distributed Municipal Infrastructure Intelligence
BASELINE: Release Candidate v1.0 (Phase 12 Release Freeze)
URL: http://localhost:5173
BACKEND API: http://localhost:8000
============================================================

---

## 1. Pre-Flight Setup Checklist (T-5 Minutes)

Execute these verification checks before the judging panel arrives:

1. **Containers Running**:
   ```bash
   docker ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}"
   ```
   - `aih-pothole-backend-1` (healthy, port 8000)
   - `aih-pothole-frontend-1` (port 5173)
   - `aih-pothole-db-1` (healthy, port 5433)
   - `aih-pothole-redis-1` (healthy, port 6379)

2. **Open Presenter Browser**:
   - Navigate to: `http://localhost:5173/overview`
   - Set zoom level to 100% or 90% for optimal dual-monitor projection.

3. **Deterministic State Reset**:
   - Click the **"Reset Demo"** button on the top right of the Mission Control header.
   - Confirm the banner appears: *"Delhi-NCR Golden Scenario Reset to Canonical State."*
   - Or run via terminal:
     ```bash
     curl -s -X POST http://localhost:8000/api/v1/demo/reset-golden-scenario
     ```

---

## 2. 5–8 Minute Master Presentation Script

### Minute 0:00 – 1:00 | The Problem & The Mission Control Deck
- **Navigation**: Start on **Overview / Mission Control** (`/overview`).
- **Presenter Narrative**:
  > *"Good morning, esteemed judges. Municipal road maintenance in Indian cities has historically been reactive, fragmented, and unverified. Today, municipal corporations rely on citizens filing complaints on 311 portals. By the time a pothole is reported, vehicles are damaged, traffic is congested, and lives are endangered.*
  >
  > *POTHOLE WALA transforms this reactive loop into an autonomous, proactive intelligence network. By mounting single-camera edge AI units on existing public transit fleets—DTC and DIMTS buses in Delhi-NCR—we scan arterial corridors continuously without deploying expensive dedicated survey vehicles.*
  >
  > *Welcome to the POTHOLE WALA Municipal Operations Command Center."*
- **Action on Screen**:
  - Highlight the top KPI row:
    - **Operational Road Health Index** (88/100 across 37 Delhi-NCR corridors).
    - **Active Road Defects & Critical Hazards** (real-time PostGIS aggregation).
    - **Repair Resolution Rate** (52% verified fixed).
    - **Network Coverage & Blind Spots** (highlighting corridors needing inspection).

---

### Minute 1:00 – 2:30 | Distributed Sensing & Multi-Vehicle Fleet
- **Navigation**: Click sidebar **"Fleet Sensing"** (`/fleet`).
- **Presenter Narrative**:
  > *"How does the data enter the system? Here you see our active mobile sensing network. We currently integrate DTC buses and PWD survey units.*
  >
  > *Each vehicle is equipped with a forward-facing optical dashcam running lightweight YOLOv8 edge inference. Let us inspect the Inspection Sessions tab.*
  >
  > *Notice our strict engineering truthfulness: every sensing session carries an explicit Telemetry Provenance label—SIMULATED or REPLAY in this demonstration environment, and LIVE when connected to real bus hardware. We never disguise test data as live satellite telemetry.*
  >
  > *In the Coverage Intelligence tab, the system continuously cross-references bus GPS tracks against OpenStreetMap arterial corridors. When a corridor has not been surveyed in over 72 hours, an automated inspection gap alert is triggered."*
- **Action on Screen**:
  - Click into the **"Inspection Sessions"** tab to show `BUS-001` and `BUS-002` sessions with explicit `SIMULATED` pills.
  - Switch to **"Coverage Intelligence"** to show corridor coverage percentages and gap alerts.
  - Open a vehicle detail drawer (e.g. `BUS-001`) showing calibrated optical camera `CAM-001` (1080p, 30fps).

---

### Minute 2:30 – 4:00 | Spatial Fusion & Corroborated Defect
- **Navigation**: Click sidebar **"GIS Map / Intelligence"** (`/intelligence`).
- **Presenter Narrative**:
  > *"Now let us observe the intelligence engine in action. Multiple buses driving down the same road will detect the same pothole multiple times.*
  >
  > *A naive system would create duplicate work orders. POTHOLE WALA uses PostGIS spatial clustering with ST_DWithin within a 15-meter corridor buffer to fuse detections into a single canonical UrbanIssue.*
  >
  > *Let us click on this critical hazard on the Delhi-Noida Corridor (SEG-DEL-NCR-01).*
  >
  > *Notice: It has been independently observed and corroborated by BOTH BUS-001 and BUS-002 on separate transit passes. The confidence is boosted to 96%, and the Explainable Priority Engine automatically escalated this defect to Urgent because it sits on a primary arterial link."*
- **Action on Screen**:
  - Click on marker `iss_demo_gold_corrob` on the Delhi-Noida Corridor.
  - The **IssueDrawer** opens on the right.
  - Point to:
    - **Multi-Bus Spatial Fusion**: 2 independent observations (`BUS-001` + `BUS-002`).
    - **Corridor Matching Card**: Snapped to `SEG-DEL-NCR-01 (Delhi - Noida Corridor)` under Delhi PWD.
    - **Explainable Priority Score**: Multi-factor breakdown (Severity, Traffic Volume, Corroboration).

---

### Minute 4:00 – 5:30 | Closed-Loop Verification 2.0 (The Municipal Game-Changer)
- **Navigation**: Click sidebar **"Verification"** (`/verification`).
- **Presenter Narrative**:
  > *"This brings us to the core technical innovation of POTHOLE WALA: Closed-Loop Verification 2.0.*
  >
  > *The biggest failure point in smart governance is contractor accountability. A contractor marks a pothole 'fixed', uploads a random photo, and collects public payment.*
  >
  > *In our platform, NO NEW DETECTION does NOT automatically mean RESOLVED.*
  >
  > *Let us examine three canonical scenarios in our verification deck:*
  >
  > *1. RESOLVED (Scenario A): BUS-001 performed a reinspection pass on the Delhi-Noida link. The computer vision model confirmed a fresh asphalt patch with 94% confidence. Before-and-after evidence is cryptographically bound, and the ticket is safely closed.*
  >
  > *2. INCONCLUSIVE (Scenario Inconclusive): A contractor reported a repair on the Barapullah ramp. When BUS-001 passed, low morning sun caused severe optical glare. Pavement state could not be verified with confidence. Rather than falsely closing the ticket, the engine explicitly ruled it INCONCLUSIVE. The defect remains in PENDING_REVIEW.*
  >
  > *3. UNRESOLVED & REOPENED (Scenario D): In Noida Sector 62, a contractor marked a pothole filled. A transit pass detected residual cavity depth >35mm. The system rejected the repair and automatically REOPENED the ticket and defect for penalty action."*
- **Action on Screen**:
  - Show the **RESOLVED** card with before/after visual proof.
  - Show the **INCONCLUSIVE** card highlighting the *"Optical Glare / Lens Wash"* rationale.
  - Show the **REOPENED** card showing contractor accountability.

---

### Minute 5:30 – 6:45 | SafeRoute Navigation (Risk-Aware Pothole Avoidance)
- **Navigation**: Return to **GIS Map / SafeRoute** (`/intelligence`).
- **Presenter Narrative**:
  > *"Beyond municipal engineering, how does this benefit daily commuters? Meet SafeRoute—our risk-aware routing engine.*
  >
  > *Navigation apps optimize purely for distance or live congestion. But driving over severe potholes causes blowouts and accidents.*
  >
  > *Let us load the Delhi-NCR Showcase Preset: Connaught Place to Noida Sector 62.*
  >
  > *Look at the contrast between FASTEST and SAFEST modes:*
  >
  > *- FASTEST routes directly along the Delhi-Noida Expressway. It is 18.2 km, but exposes the driver to 4 severe potholes and 1 critical defect.*
  >
  > *- SAFEST mode reroutes via the NH24 Outer Bypass. It is 22.4 km (+4.2 km), but eliminates 100% of high-severity pothole hazards.*
  >
  > *Notice our disclaimer: Travel durations are labeled ESTIMATED based on Indian Roads Congress design speeds, because we do not simulate live dynamic traffic congestion."*
- **Action on Screen**:
  - In SafeRoute panel, select preset: *"Connaught Place PWD HQ -> Noida Sec 62 Tech Hub"*.
  - Click **FASTEST** button $	o$ Show direct red-accented route.
  - Click **SAFEST** button $	o$ Show green-accented bypass route and the rationale box displaying avoided hazards.

---

### Minute 6:45 – 7:30 | Mission Control Action Queue & Conclusion
- **Navigation**: Return to **Overview / Mission Control** (`/overview`).
- **Presenter Narrative**:
  > *"Finally, we return to the Command Center. The Prioritized Action Queue synthesizes all incoming telemetry into actionable, 1-click decisions for municipal dispatchers:*
  >
  > *- P1 Critical: Auto-dispatch work orders for corroborated arterial defects.*
  > *- P2 Urgent: Escalate SLA breaches.*
  > *- P3 Review: Re-assign inconclusive optical verifications.*
  >
  > *With POTHOLE WALA, Indian cities move from reactive citizen complaints to an automated, self-healing, evidence-driven road asset intelligence network.*
  >
  > *Thank you. We welcome your questions."*

---

## 3. Judge Q&A Quick Navigation Paths

| Judge Question Topic | Recommended Page to Open | Key Visual / Element to Highlight |
| :--- | :--- | :--- |
| **"How do you handle duplicate detections?"** | `/intelligence` $	o$ Click `iss_demo_gold_corrob` | Multi-bus spatial fusion card (2 buses, same coordinate) |
| **"What if the camera misses the pothole during repair check?"** | `/verification` $	o$ Filter `INCONCLUSIVE` | Inconclusive rationale card with glare/blur explanation |
| **"What AI models and classes are you running?"** | `/fleet` $	o$ Vehicle Drawer $	o$ `CAM-001` | Single-class YOLOv8 (`class 0: pothole`), windshield forward |
| **"Is this live GPS data?"** | `/fleet` $	o$ Inspection Sessions | Explicit `SIMULATED` / `REPLAY` telemetry provenance tags |
| **"How are routes calculated?"** | `/intelligence` $	o$ SafeRoute | IRC Speed Hierarchy & Avoided Hazards calculation |
| **"Can a dispatcher override the AI?"** | `/issues` $	o$ Issue 360 Drawer | Manual Operator Override with append-only audit trail |
