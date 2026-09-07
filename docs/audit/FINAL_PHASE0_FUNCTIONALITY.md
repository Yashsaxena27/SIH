# FINAL PHASE 0 — COMPLETE FRONTEND FUNCTIONALITY MATRIX & INTERACTION AUDIT
**Project:** POTHOLE WALA — Infrastructure Intelligence Network (SIH 2026 Final Build)  
**Audit Date:** September 2026  
**Scope:** Exhaustive inspection of all 18 frontend pages, routing table, API data sources, user actions, backend support, and persistence status.

---

## 1. Comprehensive Page-by-Page Audit Matrix

| Page Name | Route | Primary Purpose | API Data Source | User Actions | Backend Support | Persistence | State Classification | Current Status |
|---|---|---|---|---|---|---|:---:|---|
| **Overview (Mission Control)** | `/` | Executive KPIs, live map preview, urgent defects list | `GET /api/v1/analytics/overview`, `GET /api/v1/issues?limit=10` | Filter time range, click defect to open drawer, quick link to tickets | Fully Supported | Database (PostgreSQL) | **REAL / LIVE** | **WORKING** |
| **Intelligence** | `/intelligence` | Full-screen interactive GIS map with severity clustering and layers | `GET /api/v1/issues`, `GET /api/v1/authorities`, `GET /api/v1/analytics/heatmaps` | Pan/zoom map, toggle layers (PWD, MCD, Noida), filter severity, click marker | Fully Supported | Database (PostGIS) | **REAL / LIVE** | **WORKING** |
| **Live Map** | `/live-map` | Redundant route pointing to Intelligence view | Same as Intelligence | Same as Intelligence | Fully Supported | Database (PostGIS) | **DUPLICATE** | **100% Duplicate Clone of Intelligence** |
| **Issues** | `/issues` | Tabular inventory of all detected urban issues | `GET /api/v1/issues` | Filter by status, severity, authority; pagination; click row | Fully Supported | Database (PostgreSQL) | **REAL / LIVE** | **WORKING** |
| **Issue Detail (Drawer / View)** | `/issues/:id` | Deep 360 inspection view: coordinates, confidence, detections | `GET /api/v1/issues/{id}`, `GET /api/v1/issues/{id}/detections` | Click "Mark In Progress", "Resolve", "Reopen", "Create Ticket" | **BROKEN** (`PATCH /issues/{id}` missing) | Database | **PARTIAL / BROKEN ACTION** | **Drawer renders, but status mutation fails with 405** |
| **Tickets** | `/tickets` | Municipal work order management & SLA tracking | `GET /api/v1/tickets`, `PATCH /api/v1/tickets/{id}` | Filter by status, reassign contractor, advance SLA status | Fully Supported | Database (PostgreSQL) | **REAL / LIVE** | **WORKING** |
| **Inspection** | `/inspections` | Upload dashcam video, track processing jobs | `POST /api/v1/inspections/upload`, `GET /api/v1/inspections/jobs` | File drag-and-drop upload, poll job status, view annotated video stream | Fully Supported (in Docker; crashes on Win host) | Database & Disk | **REAL / ENVIRONMENT CONDITIONAL** | **WORKING in Docker; crashes on Windows host (no ffmpeg)** |
| **Verification** | `/verifications` | Audit contractor repairs using before/after photos | `GET /api/v1/verifications`, `POST /api/v1/verifications/submit` | Upload repair photo, inspect AI similarity score, verify or reject | Fully Supported | Database (PostgreSQL) | **REAL / LIVE** | **WORKING** |
| **Fleet** | `/fleet` | Transit bus telematics and patrol routes | `GET /api/v1/fleet/vehicles`, `GET /api/v1/fleet/routes` | View vehicle list, live patrol tracks, today's detections count | Supported | In-Memory / DB | **REAL + SYNTHETIC TELEMETRICS** | **WORKING** (Omitted from Sidebar) |
| **Analytics** | `/analytics` | Authority performance charts, resolution times, PCI trends | `GET /api/v1/analytics/overview`, `GET /api/v1/analytics/road-health` | Switch authority filter, toggle metrics | Fully Supported | Database (PostgreSQL) | **REAL / LIVE** | **WORKING** |
| **Road Health** | `/road-health` | Pavement Condition Index (PCI) segment ranking | `GET /api/v1/analytics/road-health` | Sort by segment rating (Good/Fair/Poor), click segment | Fully Supported | Database (PostGIS) | **REAL / LIVE** | **WORKING** |
| **Routes** | `/routes` | Patrol route geometry and defect density analysis | `GET /api/v1/fleet/routes` | View corridor details, inspect road segments | Supported | Database (PostGIS) | **REAL / LIVE** | **WORKING** (Omitted from Sidebar) |
| **Edge Monitoring** | `/edge-monitoring`| Edge device status, CPU/thermal telemetry, buffer health | `GET /api/v1/simulator/status` | Start/stop patrol simulator, view buffered frames | Supported | In-Memory / SQLite | **PROTOTYPE / DEMO** | **WORKING** (Omitted from Sidebar) |
| **Traffic** | `/traffic` | Road congestion and corridor impact | None | None | None | None | **STATIC / PLACEHOLDER** | **DUMMY SCREEN ("Coming in Phase 2")** |
| **Alerts** | `/alerts` | Critical defect and SLA breach notifications | Hardcoded mock alerts | Click "Acknowledge" (No-op) | None | Local State (Inert) | **STATIC / BROKEN ACTION** | **DEAD BUTTON (No onClick on Acknowledge)** |
| **Reports** | `/reports` | Exportable municipal reports and compliance summaries | Static report templates | Click "Generate Report" (No-op) | None | None | **STATIC / BROKEN ACTION** | **DEAD BUTTON (No onClick on Generate Report)** |
| **Settings** | `/settings` | System, GIS, authority, and model configuration | Hardcoded settings | Click 6 category cards (No-op) | None | None | **STATIC / INERT** | **DEAD CARDS (No onClick handlers)** |
| **Command Palette** | Modal (`Ctrl + K`) | Global search across issues, roads, and authorities | Hardcoded mock array | Type query, click search result (links to `/issues/1`) | None | None | **FAKE RUNTIME / MISLEADING** | **BROKEN (Navigates to /issues/1 -> 404 Crash)** |

---

## 2. Navigation & Shell State Audit

### A. Sidebar Navigation (`frontend/src/components/layout/Sidebar.tsx`)
- **Active Navigation Links:** Overview (`/`), Intelligence (`/intelligence`), Issues (`/issues`), Tickets (`/tickets`), Inspections (`/inspections`), Verifications (`/verifications`), Road Health (`/road-health`), Analytics (`/analytics`), Settings (`/settings`).
- **Hidden / Orphaned Pages (Registered in `App.tsx` routes but missing from Sidebar):**
  - `/fleet` (`Fleet.tsx`)
  - `/routes` (`Routes.tsx`)
  - `/edge-monitoring` (`EdgeMonitoring.tsx`)
  - `/traffic` (`Traffic.tsx`)
  - `/alerts` (`Alerts.tsx`)
  - `/reports` (`Reports.tsx`)
- **Hardcoded Badges (`Sidebar.tsx:43,46`):**
  - `Issues`: Statically displays `badge: '12'`
  - `Tickets`: Statically displays `badge: '5'`

### B. TopBar Notifications (`frontend/src/components/layout/TopBar.tsx`)
- **Notification Counter (`TopBar.tsx:30`):**
  - Statically declares `const pendingAlerts = 3;`
- **Dropdown Actions (`TopBar.tsx:167–171`):**
  - `<button>Mark all read</button>` has no handler.
  - `<button>View all alerts</button>` has no handler and does not navigate.
