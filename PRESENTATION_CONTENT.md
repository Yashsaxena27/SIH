# POTHOLE WALA — 6-SLIDE SIH PRESENTATION CONTENT

## SLIDE 1: Title
**Title:** POTHOLE WALA
**Subtitle:** AI-Powered Mobile Urban Intelligence Network
**Problem Statement:** SIH26124 — Mobile Urban Intelligence Network
**Value Proposition:** "Turning existing public buses into continuously moving urban sensors."

*(Visual Concept: Iconography of a Bus + Camera + AI Node + City Road = Urban Intelligence)*

---

## SLIDE 2: Idea + Solution + Innovation
**Title:** POTHOLE WALA — From Road Detection to Verified Repair

**THE PROBLEM**
* Road defects are difficult to monitor continuously across large cities.
* Existing complaint systems stop at detection.
* Duplicate reports obscure the physical severity of a defect.
* Municipalities lack actionable, location-based intelligence and repair verification.

**OUR SOLUTION**
1. **SENSE:** Existing public buses capture road conditions during regular routes.
2. **DETECT:** Edge AI identifies defects and attaches GPS/time evidence.
3. **INTELLIGENTLY ACT:** Multiple observations are spatially fused into one evolving issue, prioritized, and routed into maintenance tickets.
4. **VERIFY:** A later bus pass re-inspects the repaired location and marks the issue VERIFIED or REOPENED.

**INNOVATION & USP**
* **Mobile sensing infrastructure:** Uses buses already moving through the city.
* **Multi-bus evidence fusion:** Fuses overlapping spatial detections via PostGIS.
* **Closed-loop repair verification:** Checks if reported repairs were actually resolved.
* **Reopen-on-failure:** Persistent defects automatically return to the actionable state.

**> "Most systems detect. POTHOLE WALA detects → acts → verifies."**

---

## SLIDE 3: Technical Architecture & Methodology
**Title:** Technical Architecture & Methodology

**ARCHITECTURE FLOW**
```text
BUS CAMERA → EDGE AI (Tracking/Duplicate Suppression) → DETECTION EVENT 
  ↓
FASTAPI → POSTGRESQL + POSTGIS (Spatial Fusion) → URBAN ISSUE → PRIORITY ENGINE 
  ↓
MUNICIPAL TICKET → REPAIR REPORTED → BUS REVISIT → AI VERIFICATION → VERIFIED / REOPENED
```
*(Visual: Command Center dashboard interacting via Server-Sent Events with the Backend)*

**TECHNOLOGIES**
* **Frontend:** React, TypeScript, Vite
* **Backend:** FastAPI, Async SQLAlchemy, Server-Sent Events (SSE)
* **Database:** PostgreSQL, PostGIS (ST_DWithin)
* **AI:** YOLOv8-compatible pipeline, Centroid Tracking
* **Deployment:** Docker Compose

**METHODOLOGY**
1. Capture → 2. Detect → 3. Track → 4. Geotag → 5. Fuse 
6. Prioritize → 7. Ticket → 8. Repair → 9. Revisit → 10. Verify

*(Disclaimer Note: Prototype currently uses deterministic fallback inference for reliable demonstration; the same ML contract supports seamless integration of trained weights post-SIH).*

---

## SLIDE 4: Feasibility, Risks & Mitigation
**Title:** Feasibility, Risks & Mitigation

| CHALLENGE | MITIGATION | FUTURE SCALE |
| :--- | :--- | :--- |
| **Real-time processing on buses** | Edge-first inference + event-based communication | Optimized edge models / TensorRT |
| **Duplicate detections** | Temporal tracking + spatial fusion using PostGIS | Advanced tracking and confidence fusion |
| **Poor network connectivity** | Event-based asynchronous HTTP dispatch | Offline edge SQLite buffer + bulk sync |
| **False/weak observations** | Repeated observations from multiple buses build confidence | Validated Indian-road dataset training |
| **Large-scale deployment** | Existing bus routes become distributed infrastructure | Cloud-native scaling & device management |
| **Repair cannot be trusted blindly** | **Independent bus revisit + AI verification** | Automated contractor payouts based on verification |

**VIABILITY PILOT:** 1 City → Selected Routes → Municipal Dashboard → Expand Fleet → Expand City.

---

## SLIDE 5: Impact & Benefits
**Title:** Impact — From Pothole Detection to Accountable Road Maintenance

**1. CITIZENS**
* Faster identification of hazardous road defects.
* Better road safety with less dependence on manual complaints.

**2. MUNICIPALITIES**
* Continuous road-condition visibility and location-based intelligence.
* Prioritized maintenance workload with reduced duplicate complaints.

**3. PUBLIC FUNDS**
* Repair actions become completely traceable.
* Independent verification of reported repairs.
* Failed repairs can be automatically reopened.

**4. CITY INFRASTRUCTURE (Future Extensibility)**
* Existing buses become mobile sensing assets.
* Expandable to missing signs, faded markings, and waterlogging.

**> "Every bus journey can become another observation of the city's road network."**

---

## SLIDE 6: Research, Technologies & References
**Title:** Research, Technologies & References

**AI & Computer Vision**
* Ultralytics YOLOv8 Architecture Documentation
* Object Tracking & Duplicate Suppression Methodologies (Centroid/Euclidean)

**Geospatial & Database**
* PostgreSQL 15 & PostGIS 3.3 Documentation
* Spatial Indexing and `ST_DWithin` geofencing methodologies

**Backend & Real-Time**
* FastAPI / Starlette Documentation
* Server-Sent Events (SSE) W3C Specifications

**Urban Mobility**
* Intelligent Transportation Systems (ITS) Smart City frameworks
* Municipal road-condition monitoring literature
