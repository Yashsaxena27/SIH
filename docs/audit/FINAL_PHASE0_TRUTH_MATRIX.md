# FINAL PHASE 0 — HARDCODED VALUES, MOCK DATA & TRUTH AUDIT MATRIX
**Project:** POTHOLE WALA — Infrastructure Intelligence Network (SIH 2026 Final Build)  
**Audit Date:** September 2026  
**Scope:** Forensic analysis of all hardcoded values, mock artifacts, seed conflicts, and heuristic calculations across frontend, backend, and ML.

---

## 1. Complete Hardcode Forensic Inventory

| Variable / Value | Code Location | What It Represents | Classification | Where Does This Value Actually Come From? | Forensic Finding & Action |
|---|---|---|:---:|---|---|
| `PTH-0847`, `/issues/1` | `CommandPalette.tsx:51` | Search result item | **FAKE RUNTIME / MISLEADING** | Hardcoded JavaScript mock object array in client component. | **CRITICAL RISK:** Does not exist in DB; navigating to it results in 404 crash. Must replace with live API search. |
| `badge: '12'` | `Sidebar.tsx:43` | Issues notification badge | **STATIC COPY / DEAD** | Hardcoded string constant in navigation menu definition. | Never reflects database state. Must bind to dynamic query. |
| `badge: '5'` | `Sidebar.tsx:46` | Tickets notification badge | **STATIC COPY / DEAD** | Hardcoded string constant in navigation menu definition. | Never reflects database state. Must bind to dynamic query. |
| `pendingAlerts = 3` | `TopBar.tsx:30` | TopBar notification count | **STATIC COPY / DEAD** | Hardcoded integer constant in header component. | Never changes. Dropdown items are static strings. Must bind to live alerts API. |
| `[28.5355, 77.2090]` | `Intelligence.tsx:42` | Leaflet default map center | **CONFIGURATION** | Standard geographic center of South Delhi (Ring Road / AIIMS). | Valid configuration constant aligning with Delhi-NCR golden demo bounds. Preserve. |
| `15.0` meters | `spatial_fusion.py:38` | Spatial fusion radius | **HEURISTIC** | Fixed Euclidean buffer for deduplicating raw dashcam detections. | Good operational baseline, but lacks road-segment or heading constraints. |
| `0.15`, `0.05`, `0.01` | `severity.py:19–25` | Severity area ratios | **HEURISTIC / MISLEADING** | Arbitrary bounding-box to frame area fractions ($box / frame$). | **MISLEADING if described as depth.** Pure 2D camera-relative area ratio. |
| `BENGALURU_ROUTE` | `gps_simulator.py:7` | Bus patrol GPS coordinates | **PROTOTYPE FALLBACK** | Hardcoded Karnataka coordinates (MG Road, Koramangala: $12.97^\circ\text{N}, 77.59^\circ\text{E}$). | **COLLISION:** Golden demo is in Delhi ($28.5^\circ\text{N}$). Running simulator lands buses 2,000 km away. |
| `authority_id = 1` | `complaints.py:33` | Complaint authority fallback | **PROTOTYPE FALLBACK** | Hardcoded default to Delhi PWD when spatial lookup fails. | **UNSAFE:** Assigns out-of-boundary complaints to PWD instead of setting status to unresolved. |
| `JWT_SECRET_KEY` | `config.py:33` | JWT encryption secret | **PROTOTYPE FALLBACK** | `"supersecretkey-change-in-production"` fallback string. | **INSECURE:** Predictable fallback secret used if `.env` is unconfigured. |
| `100` Issues, `531` Obs | `seed_golden_demo.py` | Golden demo initial state | **GOLDEN DEMO DATA** | Seed script generating realistic Delhi-NCR municipal records. | **LEGITIMATE:** High-quality deterministic dataset. Primary demonstration asset. Preserve. |
| `BMTC` Bus Fleet | `seed_demo.py` | Legacy demo initial state | **CONFLICTING SEED DATA** | Legacy seed script populating Bengaluru transit data. | **DANGEROUS:** Truncates all tables and overwrites Delhi golden demo with Karnataka coordinates. Purge. |
| "Coming in Phase 2" | `Traffic.tsx:32` | Traffic intelligence view | **STATIC COPY** | Static placeholder card in React component. | Non-functional placeholder. Hide from navigation or integrate as map layer. |
| "Generate Report" | `Reports.tsx:159` | Report generation button | **DEAD BUTTON** | Inert `<button>` tag without `onClick` handler. | Dead interaction. Must wire to live report export or meaningful modal. |
| "Acknowledge" | `Alerts.tsx:96` | Alert acknowledgement | **DEAD BUTTON** | Inert `<button>` tag without `onClick` handler. | Dead interaction. Must wire to local/backend acknowledgement state. |
| 6 Category Cards | `Settings.tsx:116` | Configuration categories | **DEAD CARDS** | Inert JSX divs with no click handlers. | Dead interactions. Replace with functional tabbed settings. |
| `PATCH /issues/{id}` | `IssueDetail.tsx:77` | Status transition action | **BROKEN CONTRACT** | Frontend calls nonexistent endpoint on FastAPI backend. | Returns HTTP 405. Must add domain-aware mutation endpoint to `issues.py`. |

---

## 2. Forensic Resolution of Suspicious Values

### "Where Does This Value Actually Come From?"
1. **"Critical Severity" on Issue Cards:**
   - *Source:* `ml/engine/severity.py:19`.
   - *Formula:* Computed as `(x2 - x1) * (y2 - y1) / (frame_width * frame_height) > 0.15`.
   - *Truth:* It indicates that a 2D bounding box occupied $>15\%$ of the video frame. It does **not** indicate physical depth, millimeter dimensions, or structural asphalt failure.
2. **"91% Confidence" on Pothole Marker:**
   - *Source:* Dynamic running average calculation in `spatial_fusion.py:58`.
   - *Formula:* $((conf_{old} \times count) + conf_{new}) / (count + 1)$.
   - *Truth:* It represents the mathematical average of YOLOv8 bounding box confidence scores across multiple observation frames. It is a valid Bayesian-style aggregator, not a random mock.
3. **"MCD Central" Jurisdiction Assignment:**
   - *Source:* PostGIS `ST_Contains` spatial query against `jurisdictions.boundary` polygon table in PostgreSQL.
   - *Truth:* Derived from genuine geometric polygon intersection (`POLYGON((77.21 28.53, 77.28 28.53, ...))`). Fully legitimate GIS logic.
