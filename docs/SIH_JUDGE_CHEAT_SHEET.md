# POTHOLE WALA — SIH 2026 JUDGE CHEAT SHEET
## Technical Defense, Architectural Decisions & Anticipated Questions

============================================================
BENCHMARK: SIH 2026 Grand Finale Evaluation
DEFENSE POSTURE: Technologically Defensible, Zero Marketing Fluff, Absolute Scientific Integrity
============================================================

---

## 1. Top 10 Anticipated Judge Questions & Authoritative Answers

### Q1: How is this different from existing citizen grievance portals like Swachhata or CPGRAMS 311?
> **Answer**: Citizen portals are **reactive**, **unstructured**, and **unverified**. A citizen must hit a pothole, stop their vehicle, take a photo with unknown GPS calibration, and write a manual description. The municipal corporation has no way to verify whether the repair was executed without sending another human inspector.
>
> POTHOLE WALA is **proactive, passive, and automated**. Optical sensing cameras on existing public transit buses (DTC/DIMTS) continuously scan corridors during regular transit runs. Detections are automatically snapped to PostGIS road centerline segments, deduplicated across buses, and continuously verified on follow-up transit passes with before-and-after photographic evidence.

---

### Q2: What Computer Vision model are you using, and what exact defect classes does it detect?
> **Answer**: We run a fine-tuned **single-class YOLOv8** model strictly detecting **potholes (`class 0: pothole`)**.
>
> We deliberately chose NOT to claim multi-class road damage detection (such as alligator cracking, rutting, or ravelling) because optical dashcams at 40–50 km/h do not have the resolution or perpendicular angle to reliably differentiate hairline cracks from surface oil or road shadows without unacceptable false positive rates. We focus on high-consequence, vehicle-damaging cavity defects.

---

### Q3: How do you prevent duplicate issues when 50 buses pass the same pothole every day?
> **Answer**: We use a two-stage spatial and temporal fusion pipeline:
> 1. **PostGIS Linear Referencing**: Every raw detection coordinate is snapped to the nearest road segment centerline (`ST_ClosestPoint` on `road_segments`).
> 2. **PostGIS Spatial Clustering (`ST_DWithin`)**: If an existing active `UrbanIssue` exists within a 15-meter radius on the same road corridor, the new detection is attached as an additional `Observation` on the existing issue.
> 3. **Confidence Fusion**: Each new observation by an independent bus (`unique_bus_count`) increases the issue's corroborated confidence score asymptotically toward 0.99 via Bayesian combination.

---

### Q4: Explain the core principle: "No new detection does NOT mean resolved." How does that work?
> **Answer**: In naive systems, if a camera drives past a reported pothole and detects nothing, the issue is marked "Resolved". In reality, the camera may have missed it due to:
> - A vehicle ahead occluding the road surface (following distance <10m).
> - Severe solar glare or rain wash on the windshield.
> - The bus driving in lane 1 while the defect is in lane 3.
> - Low ambient lighting during night transit.
>
> In POTHOLE WALA Phase 7, reinspection produces three distinct outcomes:
> - **RESOLVED**: High-confidence optical confirmation of an asphalt patch or sealed surface (>0.85 confidence) matching the defect coordinate.
> - **UNRESOLVED**: Pothole cavity detected as still present $	o$ Work order automatically REOPENED.
> - **INCONCLUSIVE**: Poor visibility, glare, partial occlusion, or lane mismatch $	o$ Issue retained in `PENDING_REVIEW` with an auditable explanation. It is NEVER falsely closed.

---

### Q5: Does SafeRoute integrate live traffic simulation like Google Maps or TomTom?
> **Answer**: No, and we explicitly label travel times as **ESTIMATED**.
>
> SafeRoute is an **infrastructure-risk-aware navigation engine**, not a real-time traffic congestion simulator. It calculates route candidates using a multi-criteria Dijkstra cost function balancing distance against road defect severity. Travel times are derived using Indian Roads Congress (IRC) road hierarchy design speeds (e.g., 80 km/h for Expressways, 50 km/h for Primary Arterials, 30 km/h for Local Roads), with empirical speed penalty factors applied to degraded segments. We disclose this transparently on both the UI and API.

---

### Q6: What is "Operational Road Health Index"? Is it ASTM D6433 PCI?
> **Answer**: It is our canonical **Operational Road Health Index (0–100)**, and we explicitly state that it is **NOT ASTM D6433 Pavement Condition Index (PCI)**.
>
> Formal ASTM PCI requires structural core drilling, laser profilometry (IRI - International Roughness Index), and manual distress density measurement across 19 defect classes. Our metric is an operational health score computed dynamically per road segment:
> $$S = 100 - \min\left(100, \sum_{i} 	ext{SeverityWeight}_i 	imes 	ext{CorroborationWeight}_i 	imes rac{1000}{	ext{SegmentLengthInMeters}}ight)$$
> It provides municipal engineers with immediate operational prioritization across city corridors.

---

### Q7: How do you handle GPS drift and multipath errors in dense urban corridors like Connaught Place?
> **Answer**: Consumer GPS in urban canyons can drift by 10–25 meters. We handle this through:
> 1. **Centerline Projection**: Detections are snapped orthogonally to the OpenStreetMap road corridor vector. Points exceeding a 25-meter perpendicular distance are flagged as off-corridor.
> 2. **Centroid Stabilization**: As multiple buses observe the defect, the issue coordinates are updated using a running weighted average of observation coordinates, progressively reducing single-sensor GPS jitter.

---

### Q8: What happens if an issue occurs on a road where municipal jurisdiction is disputed (e.g. PWD vs MCD)?
> **Answer**: This is demonstrated in **Golden Scenario C**. When a defect's snapped location falls outside configured municipal polygon boundaries, the system sets `jurisdiction_source = "unresolved"` and `authority_id = null`.
>
> The backend strictly **blocks automated ticket dispatch** with HTTP 400 (`"Issue jurisdiction is unresolved; dispatch blocked"`). The issue is routed to the Mission Control Command Deck for manual inter-agency triage rather than being lost in municipal ping-pong.

---

### Q9: What is the hardware specification required to run this in production on a bus?
> **Answer**:
> - **Edge Unit**: NVIDIA Jetson Orin Nano (40 TOPS) or Raspberry Pi 5 with Hailo-8 AI acceleration ($150–$250 per bus).
> - **Camera**: 1080p forward windshield-mounted USB/GMSL2 camera with polarizing filter to minimize windshield reflections.
> - **GPS**: U-blox NEO-M8N GNSS receiver with active patch antenna.
> - **Inference**: YOLOv8n (nano) quantized to INT8 runs at ~45 FPS, consuming less than 15 Watts from the vehicle's 12V/24V power supply.

---

### Q10: How do you ensure data integrity so contractors cannot tamper with verification records?
> **Answer**:
> - All verification decisions, whether automated or manual operator override, are **append-only** in the PostgreSQL database.
> - Manual overrides do NOT edit the automated machine decision; they generate a linked `Verification` record with `is_override = true`, recording the operator's user ID, timestamp, and justification.
> - Before and after inspection images are stored with SHA-256 content hashes and immutable UUIDs.

---

## 2. Technical Defense Summary Table

| Evaluation Criterion | What Judges Might Expect | What POTHOLE WALA Actually Delivers |
| :--- | :--- | :--- |
| **Model Scope** | Unrealistic "we detect 25 road distress types" | Single-class YOLOv8 (`class 0: pothole`) with verified precision |
| **Routing Claims** | "Real-time satellite traffic routing" | IRC design speed risk-aware routing with explicit `ESTIMATED` labels |
| **Verification** | "If camera doesn't see it, it's fixed" | 3-way Closed-Loop Verification 2.0 (Resolved, Unresolved, Inconclusive) |
| **Telemetry** | Simulated data disguised as real hardware | Explicit Telemetry Provenance pills (`LIVE`, `REPLAY`, `SIMULATED`) |
| **Road Metric** | Claiming formal ASTM / IRC PCI | Operational Road Health (0–100) with published formula |
| **Architecture** | Toy frontend with mock JSON | Production FastAPI + PostgreSQL 15 + PostGIS 3.3 + Redis in Docker |
