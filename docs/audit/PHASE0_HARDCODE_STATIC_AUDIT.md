# PHASE 0 — HARDCODED VALUES, MOCK DATA & STATIC CODE AUDIT
**Project:** POTHOLE WALA — Infrastructure Intelligence Network  
**Audit Date:** September 2026  
**Auditor Roles:** Senior Principal Software Architect, Frontend/UX Auditor, Backend Systems Architect  
**Scope:** Exhaustive identification of hardcoded variables, static copy, non-functional UI elements, and seed data conflicts.

---

## 1. Frontend Mock Data & Broken Action Audit

### A. Command Palette (`frontend/src/components/common/CommandPalette.tsx`)
- **Lines 51–71:**
  ```tsx
  const mockResults: SearchResult[] = [
    { id: '1', title: 'PTH-0847', subtitle: 'Outer Ring Road • High Severity', type: 'issue', url: '/issues/1' },
    { id: '2', title: 'Ring Road Sector 4', subtitle: 'Pavement Condition: Poor (42)', type: 'road', url: '/roads/2' },
    { id: '3', title: 'South Delhi PWD', subtitle: '8 active tickets • 2 overdue', type: 'authority', url: '/authorities/1' },
    { id: '4', title: 'DL-1PC-4821', subtitle: 'Route 102 • Active • 4 detections today', type: 'vehicle', url: '/fleet' },
  ];
  ```
- **Flaws & Danger:**
  1. Search query filter runs against this static in-memory array rather than calling backend search or `/api/v1/issues`.
  2. Clicking result 1 navigates to `/issues/1`. Backend IDs in the golden demo are UUID-style (e.g. `iss_demo_gold_001`). Thus, `/issues/1` triggers a `404 Not Found` error in the UI.
  3. Clicking result 2 navigates to `/roads/2`, which matches no configured route in React Router.

---

### B. Navigation & Header Mock Artifacts
1. **Sidebar Badges (`frontend/src/components/layout/Sidebar.tsx:43,46`):**
   - Line 43: Hardcoded badge `badge: '12'` on the Issues navigation link.
   - Line 46: Hardcoded badge `badge: '5'` on the Tickets navigation link.
   - *Reality:* These numbers never change regardless of database count or live updates.
2. **TopBar Notifications (`frontend/src/components/layout/TopBar.tsx:30,167–171`):**
   - Line 30: `const pendingAlerts = 3;` is statically declared.
   - Lines 40–60: Dropdown contains static, non-dismissible mock alerts ("Critical defect detected on Outer Ring Rd", "SLA breach warning", "New inspection batch completed").
   - Line 167: `<button>Mark all read</button>` has no `onClick` handler.
   - Line 171: `<button>View all alerts</button>` has no `onClick` handler and does not navigate.

---

### C. Duplicate & Dead Pages
1. **Duplicate Page (`frontend/src/pages/LiveMap.tsx`):**
   - File contents (Lines 1–6):
     ```tsx
     import IntelligencePage from './Intelligence';
     export default function LiveMapPage() {
       return <IntelligencePage />;
     }
     ```
   - *Reality:* `LiveMap.tsx` is an exact 100% redundant clone of `Intelligence.tsx`.
2. **Placeholder Page (`frontend/src/pages/Traffic.tsx`):**
   - Lines 1–52 render a completely non-functional mockup labeled *"Traffic Intelligence — Coming in Phase 2"*.
3. **Dead Action Buttons:**
   - `Reports.tsx:159`: "Generate Report" button has no `onClick` handler. Clicking does nothing.
   - `Alerts.tsx:96`: "Acknowledge" button has no `onClick` handler. Clicking does nothing.
   - `Settings.tsx:116–146`: 6 settings cards (General, Authority, Map & GIS, Notifications, AI Model, API Keys) have no interaction handlers.
4. **Broken Status Mutation (`frontend/src/pages/IssueDetail.tsx:77`):**
   - `handleAction` invokes `api.updateIssue(id, { status: newStatus })`.
   - `frontend/src/services/api.ts` implements this as `client.patch('/issues/' + id, data)`.
   - **The backend has no `PATCH /api/v1/issues/{id}` endpoint.** The call immediately fails with HTTP `405 Method Not Allowed`.

---

### D. Hidden / Unreachable Pages
The following pages exist in `frontend/src/pages/` and are registered in `App.tsx` routes, but are **omitted from the main navigation Sidebar**:
- `/fleet` (`Fleet.tsx`)
- `/routes` (`Routes.tsx`)
- `/edge-monitoring` (`EdgeMonitoring.tsx`)
- `/traffic` (`Traffic.tsx`)
- `/alerts` (`Alerts.tsx`)
- `/reports` (`Reports.tsx`)

Users can only discover these pages by manually entering the URL in the browser address bar.

---

## 2. Backend & ML Hardcoded Values

### A. Fallback Jurisdiction Mapping (`backend/app/api/v1/complaints.py:33`)
```python
# If spatial lookup fails to resolve jurisdiction:
authority_id = resolved_authority_id or 1  # Hardcoded fallback to Authority 1 (Delhi PWD)
```
- *Flaw:* If a citizen reports an issue in Noida or outside municipal boundaries, the backend silently forces assignment to Delhi PWD rather than setting status to `unresolved` or returning an error.

### B. Insecure JWT Secret Key Default (`backend/app/core/config.py:33`)
```python
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkey-change-in-production")
```
- *Flaw:* Predictable fallback key used across instances if environment variable is missing.

### C. Hardcoded Bengaluru Coordinates in Edge GPS Simulator (`ml/pipeline/gps_simulator.py:7–28`)
```python
BENGALURU_ROUTE = [
    (12.9716, 77.5946),  # MG Road
    (12.9650, 77.6000),  # Brigade Road
    (12.9500, 77.6100),  # Hosur Road
    (12.9352, 77.6245),  # Koramangala
]
```
- *Collision:* The primary golden demo dataset (`seed_golden_demo.py`) operates in **Delhi-NCR** (latitude ~28.5, longitude ~77.2). If an edge simulation is triggered using the default route, detections will land in Karnataka, thousands of kilometers away from the active Delhi map bounds.

---

## 3. Seed Script Collisions & Data Schisms

The repository contains 4 distinct seed scripts with incompatible spatial and operational contexts:

| Script Path | Geographic Focus | Entities Seeded | Status / Conflict |
|---|---|---|---|
| `backend/scripts/seed_golden_demo.py` | **Delhi-NCR** (PWD, MCD Central, Noida) | 100 issues, 531 detections, 35 tickets, 18 verifications, 17 road segments | **AUTHORITATIVE GOLDEN DEMO**. Matches frontend map default center (`[28.5355, 77.2090]`). |
| `backend/scripts/seed_demo.py` | **Bengaluru** (BMTC buses, KA plates, Koramangala) | Truncates all tables, seeds BMTC bus fleet and Bengaluru coordinates | **DANGEROUS CONFLICT**. Running this destroys the Delhi golden demo and places all issues in South India. |
| `backend/scripts/seed.py` | Minimal prototype | Minimal test authorities and issues | Legacy draft script. |
| `backend/scripts/reset_demo_data.py` | Generic | Resets and repopulates test records | Utility reset script. |

> **AUDIT DIRECTIVE:**  
> `seed_golden_demo.py` must be locked as the sole official seeding mechanism.  
> `seed_demo.py` must be deprecated or quarantined to prevent accidental destruction of the Delhi-NCR demonstration environment.
