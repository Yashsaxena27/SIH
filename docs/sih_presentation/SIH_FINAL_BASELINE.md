# SIH FINAL BASELINE
## Current Architecture
- Edge ML: YOLOv8-compatible inference engine with Centroid Tracking and HTTP event dispatch.
- Backend: FastAPI, SQLAlchemy Async, Server-Sent Events (SSE).
- Database: PostgreSQL 15 + PostGIS for spatial fusion.
- Frontend: React 18, Vite, TypeScript.
- Deployment: Docker Compose.

## What Actually Works
- PostGIS spatial fusion (ST_DWithin).
- Live UI updates via SSE without polling.
- The entire Ticket & Issue lifecycle.
- Closed-loop verification (Success and Failure paths).
- Deterministic database reset.

## What is Simulated / Fallback
- ML Model Weights: Missing. The system uses a mathematically deterministic mock bounding box for reliable presentation.
- Fleet Telemetry: GPS movement is simulated via frontend/script parameters.
- JWT Auth & Cloud Storage: Bypassed/Mocked for prototype speed.

## Exact Commands
- Start: docker-compose up -d --build
- Reset: docker-compose exec backend python scripts/reset_demo_data.py
- ML Demo: python ml/demo_video.py --bus-id BUS-1
- Stop: docker-compose down
