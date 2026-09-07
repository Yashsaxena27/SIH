# PHASE 8 SPECIFICATION & VERIFICATION: SAFEROUTE
**POTHOLE WALA — Infrastructure Intelligence Network**  
**SIH 2026 Build**

---

## 1. Executive Summary

Phase 8 introduces **SafeRoute**, a risk-aware corridor routing engine for municipal vehicles, ambulances, and commercial fleets. Rather than optimizing purely for distance or travel time, SafeRoute computes pathing alternatives by integrating physical road hazard density, operational road health scores, and verified high-severity defect counts.

### Core Principles & Truth Guardrails
1. **Explainable Trade-Offs:** The engine never offers an opaque score. Every route alternative provides concrete explanations (e.g., *"Avoids Ring Road Ashram flyover surface breakup (5 high-severity defects)"*).
2. **Explicit Provenance & Timing Mode:** Route durations are explicitly labeled `ESTIMATED` based on municipal road design speeds and corridor speed limits. The system explicitly disclaims live satellite/traffic congestion simulation.
3. **Pavement Integrity Boundary:** Defect hazard avoidance is tied strictly to confirmed `UrbanIssue` records and `road_segments` health metrics, never unverified sensor noise.

---

## 2. Architecture & Algorithms

### 2.1 Multi-Objective Routing Engine (`backend/app/services/saferoute_engine.py`)

SafeRoute evaluates routing corridors using three canonical routing modes:

| Mode | Primary Objective | Optimization Formula |
| :--- | :--- | :--- |
| **`FASTEST`** | Minimize Estimated Transit Time | $\\min \\left( \\text{duration\\_s} + \\epsilon \\cdot \\text{risk\\_score} \\right)$ |
| **`SAFEST`** | Minimize Infrastructure Risk & Defects | $\\min \\left( \\text{risk\\_score} + \\epsilon \\cdot \\text{duration\\_s} \\right)$ |
| **`BALANCED`** | Multi-Criteria Pareto Trade-Off | $\\min \\left( 0.5 \\cdot \\text{norm\\_duration} + 0.5 \\cdot \\text{norm\\_risk} \\right)$ |

*(Note: $\\epsilon = 10^{-5}$ acts as an infinitesimal deterministic tie-breaker to prevent secondary inversion).*

### 2.2 Segment Risk Formulation

For each corridor candidate composed of road segments $S$:
- $\\text{Segment Hazard Count} = \\sum_{s \\in S} \\text{open\\_defects}(s)$
- $\\text{Average Road Health} = \\frac{1}{|S|} \\sum_{s \\in S} \\text{health\\_score}(s)$
- $\\text{Corridor Risk Score} = \\min \\left( 100, \\sum_{s \\in S} (100 - \\text{health\\_score}(s)) \\cdot 0.5 + (\\text{critical\\_defects} \\cdot 15) \\right)$

### 2.3 Explainable Hazard Differential
When comparing candidate route $R_A$ against alternate route $R_B$:
- $\\Delta \\text{Duration} = \\text{duration}(R_A) - \\text{duration}(R_B)$
- $\\Delta \\text{Risk} = \\text{risk}(R_A) - \\text{risk}(R_B)$
- $\\text{Avoided Hazards} = \\text{Hazards}(R_B) \\setminus \\text{Hazards}(R_A)$

---

## 3. Database Schema Migration

**Alembic Revision:** `0012_saferoute_corridors.py`  
- Seeded primary municipal corridors across Delhi NCR:
  - `SEG-DEL-NCR-02`: Barapullah Elevated Bypass (Banda Bahadur Marg $\\leftrightarrow$ Sarai Kale Khan)
  - `SEG-DEL-NCR-03`: Vikas Marg / NH24 Corridor (ITO $\\leftrightarrow$ Anand Vihar)
  - `SEG-DEL-NCR-04`: Ring Road Ashram Bypass (Lajpat Nagar $\\leftrightarrow$ Ashram Chowk)
- Verified LineString geometry validity via PostGIS `ST_IsValid()` and coordinate projection (`EPSG:4326`).

---

## 4. API Endpoints

- `GET /api/v1/saferoute/presets`: Returns standard municipal origin-destination pairs.
- `POST /api/v1/saferoute/plan`: Computes candidate routes according to mode (`FASTEST`, `SAFEST`, `BALANCED`).
  - Request Body: `{ "origin": [lat, lon], "destination": [lat, lon], "mode": "SAFEST" }`
  - Response: Candidates with GeoJSON coordinates, duration estimates, risk scores, and avoided hazards.
- `GET /api/v1/saferoute/corridors`: Returns full GeoJSON FeatureCollection of all evaluated corridors with live health metrics.

---

## 5. Automated Backend Verification

Executed test suite: `backend/tests/test_phase8_saferoute.py` (8 / 8 passed):
1. `test_saferoute_presets_available`: Confirms standard municipal routing corridors are exposed.
2. `test_saferoute_plan_safest_mode`: Confirms `SAFEST` candidate selects lowest risk corridor.
3. `test_saferoute_plan_fastest_mode`: Confirms `FASTEST` candidate prioritizes minimal estimated transit time.
4. `test_saferoute_plan_balanced_mode`: Confirms `BALANCED` trade-off computes Pareto-efficient route.
5. `test_saferoute_corridor_geojson`: Validates LineString GeoJSON output conforms to RFC 7946.
6. `test_avoided_hazards_explanation`: Verifies human-readable avoided defect explanations.
7. `test_truth_audit_timing_mode_estimated`: Confirms `timing_mode="ESTIMATED"` is strictly enforced.
8. `test_saferoute_empty_or_invalid_coordinates`: Tests 400/422 defensive validation on malformed inputs.

---

## 6. Frontend UI Verification

- **Component:** `frontend/src/components/gis/SafeRoutePanel.tsx`
- **Map Layer:** `frontend/src/components/CommandMap.tsx`
- **Features Tested:**
  - Route planning trigger from Intelligence GIS view banner.
  - Preset origin-destination selector.
  - Mode toggle (`SAFEST`, `BALANCED`, `FASTEST`).
  - Route comparison card showing $\\Delta$ time and $\\Delta$ risk.
  - Visual rendering of multiple candidate polylines on Leaflet map with recommendation badges.
