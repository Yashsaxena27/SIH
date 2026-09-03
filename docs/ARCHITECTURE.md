# Architecture Overview
AI-powered Mobile Urban Intelligence Network

## The Closed-Loop Verification Pipeline

The system is designed not just to detect potholes, but to track their entire lifecycle and physically verify their repair using the same AI logic.

```mermaid
sequenceDiagram
    participant Bus as Mobile Edge (Bus)
    participant ML as ML Service (YOLOv8)
    participant API as FastAPI Backend
    participant DB as PostGIS
    participant FE as React Frontend (Command Center)

    %% Initial Detection
    Bus->>ML: Sends Video Feed
    ML->>ML: Detect Pothole & Track Centroid
    ML->>API: POST /ingestion/detection
    
    %% Spatial Fusion
    API->>DB: ST_DWithin (Is this a known pothole?)
    DB-->>API: New Issue Created (Observation Count: 1)
    API->>FE: SSE Broadcast (NEW_DETECTION)
    
    %% Second Bus (Fusion)
    Bus->>ML: Another bus drives by later
    ML->>API: POST /ingestion/detection
    API->>DB: ST_DWithin (Match found!)
    DB-->>API: Issue Updated (Observation Count: 2, Priority: HIGH)
    API->>FE: SSE Broadcast (ISSUE_UPDATED)
    
    %% Repair
    FE->>API: Ticket Created -> Repair Reported
    
    %% Revisit Verification
    Bus->>ML: Bus revisits location post-repair
    ML->>ML: Analyzes video (No pothole found)
    ML->>API: POST /ingestion/verification
    API->>DB: Update Issue to VERIFIED
    API->>FE: SSE Broadcast (ISSUE_UPDATED)
```

## Tech Stack
- **Edge ML**: Python, Ultralytics YOLOv8, OpenCV, Centroid Tracker
- **Backend API**: Python, FastAPI, SQLAlchemy (Async), Uvicorn
- **Spatial DB**: PostgreSQL 15 + PostGIS
- **Real-Time**: Server-Sent Events (SSE) via `sse-starlette`
- **Frontend**: React 18, Vite, TypeScript, Radix UI, TailwindCSS
- **Deployment**: Docker Compose

## Hardened Demo Resilience
The repository is optimized for a zero-downtime, deterministic SIH demo presentation. 
The database can be reliably reset via `python backend/scripts/reset_demo_data.py`. 
Frontend queries gracefully degrade via strict ErrorBoundaries and safe numerical formatters avoiding `NaN`.
