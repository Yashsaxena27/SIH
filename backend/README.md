# Backend for AI-powered Mobile Urban Intelligence Network

## Architecture Overview
The backend is built as a **Modular Monolith** using **FastAPI** (Python 3.11+). It uses **PostgreSQL + PostGIS** for all spatial queries and data persistence.

### Key Technologies
- **Framework:** FastAPI
- **Database:** PostgreSQL + PostGIS (via `postgis/postgis:15-3.3` Docker image)
- **ORM:** SQLAlchemy 2.x + GeoAlchemy2
- **Migrations:** Alembic
- **Auth:** JWT (bcrypt)
- **Typing:** Pydantic V2

## Core Capabilities Developed
1. **Spatial Intelligence & Fusion Engine** (`app/services/spatial_fusion.py`): Automatically clusters detections into cohesive `UrbanIssue`s based on configurable PostGIS thresholds (`ST_DWithin`).
2. **Prioritization Engine** (`app/services/priority_engine.py`): Determines ticket urgency not just by ML confidence, but by *unique bus observation counts*, *severity*, and *persistence*.
3. **Closed-Loop Verification** (`app/services/verification.py`): Automatically evaluates future bus passes over a "Repaired" location, and either re-opens the issue or verifies it as resolved.
4. **Idempotent Ingestion Pipeline** (`app/services/ingestion.py`): Dedupes ML events from edge devices at the ingestion layer to prevent duplicate issues.

## Setup Instructions

### 1. Docker (Recommended)
You do not need to install Python locally if you use Docker Compose.

```bash
docker-compose up -d --build
```
This spins up:
- PostgreSQL + PostGIS on port 5432
- Redis on port 6379
- FastAPI backend on port 8000

*Note: Migrations will run automatically via the docker entrypoint command.*

### 2. Manual Development Setup
```bash
python -m venv venv
# Activate venv
pip install -r backend/requirements.txt

# Run migrations
cd backend
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

## Demo & Simulator
To demonstrate the system's USP without requiring real buses, we expose a simulator API:
- `POST /api/v1/demo/simulate-detection` (Creates/fuses an issue)
- `POST /api/v1/demo/simulate-repair/{ticket_id}` (Moves issue to VERIFICATION_PENDING)
- `POST /api/v1/demo/simulate-revisit/{issue_id}?fixed=true/false` (Closes the loop)

## API Documentation
Once running, interactive Swagger docs are available at:
- `http://localhost:8000/docs`

## Frontend Integration
To connect the existing frontend to this real backend, update `frontend/src/services/core/config.ts`:
```typescript
export const config = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  useMockData: false, // <-- Change this to false
};
```
