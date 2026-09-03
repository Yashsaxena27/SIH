from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1 import issues, simulator, ingestion, fleet, tickets, verifications, analytics, events

app = FastAPI(
    title="Urban Intelligence Network API",
    description="Backend for AI-powered Mobile Urban Intelligence Network",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(issues.router)
app.include_router(simulator.router)
app.include_router(ingestion.router)
app.include_router(fleet.router)
app.include_router(tickets.router)
app.include_router(verifications.router)
app.include_router(analytics.router)
app.include_router(events.router)

@app.get("/health/live", tags=["Health"])
async def health_live():
    return {"status": "ok"}

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

@app.get("/health/ready", tags=["Health"])
async def health_ready():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready", "database": "up"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database is unavailable")
