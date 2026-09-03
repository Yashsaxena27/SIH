from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.domain import RoadSegment, Department, UrbanIssue, Bus

router = APIRouter(prefix="/api/v1", tags=["Analytics"])

@router.get("/analytics/road-segments")
async def get_road_segments(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(RoadSegment))
    segments = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "roadType": s.road_class,
            "healthScore": s.health_score,
            # Stub geometry for frontend (Bengaluru MG Road corridor)
            "startPoint": {"lat": 12.9716, "lng": 77.5946},
            "endPoint": {"lat": 12.9740, "lng": 77.6070}
        }
        for s in segments
    ]

@router.get("/departments")
async def get_departments(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Department))
    departments = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "type": d.department_type,
            "isActive": d.is_active
        }
        for d in departments
    ]

@router.get("/system/health")
async def get_system_health(session: AsyncSession = Depends(get_db)):
    total_buses = await session.scalar(select(func.count()).select_from(Bus))
    active_buses = await session.scalar(select(func.count()).select_from(Bus).where(Bus.status == 'online'))
    
    return {
        "overallStatus": "operational",
        "activeBuses": active_buses or 0,
        "totalBuses": total_buses or 0,
        "activeRoutes": 1,
        "totalRoutes": 1,
        "edgeDevicesOnline": active_buses or 0,
        "edgeDevicesTotal": total_buses or 0,
        "apiLatencyMs": 42,
        "detectionsPastHour": 0,
        "eventsInQueue": 0,
        "uptime": 99.9
    }


from app.models.domain import Alert, Detection
from datetime import datetime

@router.get('/system/alerts')
async def get_alerts(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Alert))
    alerts = result.scalars().all()
    return [{'id': a.id, 'type': a.alert_type, 'severity': a.severity, 'title': a.title, 'message': a.message, 'timestamp': str(a.created_at) if a.created_at else datetime.now().isoformat(), 'acknowledged': a.acknowledged} for a in alerts]

@router.get('/system/metrics')
async def get_metrics():
    return []

@router.get('/system/activity')
async def get_activity(session: AsyncSession = Depends(get_db)):
    # Return recent issues as activity for now
    result = await session.execute(select(UrbanIssue).order_by(UrbanIssue.created_at.desc()).limit(10))
    issues = result.scalars().all()
    return [{'id': i.id, 'type': 'issue_created', 'title': f'New Issue Detected', 'description': i.issue_type, 'timestamp': str(i.created_at) if i.created_at else datetime.now().isoformat()} for i in issues]

@router.get('/analytics/roads/summary')
async def get_road_summary(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(RoadSegment))
    segments = result.scalars().all()
    
    total_seg = len(segments)
    avg_score = round(sum(s.health_score for s in segments) / max(total_seg, 1), 1) if total_seg else 82.0
    
    excellent = sum(1 for s in segments if s.health_score >= 85)
    good = sum(1 for s in segments if 70 <= s.health_score < 85)
    fair = sum(1 for s in segments if 50 <= s.health_score < 70)
    critical = sum(1 for s in segments if s.health_score < 50)
    
    defect_count = await session.scalar(select(func.count()).select_from(UrbanIssue))
    
    return {
        'totalSegments': total_seg,
        'totalRoads': total_seg,
        'averageHealth': avg_score,
        'averageScore': avg_score,
        'criticalSegments': critical,
        'decliningSegments': fair,
        'improvedSegments': good,
        'totalDefects': defect_count or 0,
        'resolvedThisMonth': 0,
        'segmentDistribution': {
            'excellent': excellent,
            'good': good,
            'fair': fair,
            'critical': critical
        }
    }

@router.get('/analytics/roads/history')
async def get_road_history():
    return []

@router.get('/detections')
async def get_detections(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Detection))
    detections = result.scalars().all()
    return [{'id': d.id, 'timestamp': str(d.timestamp), 'confidence': d.confidence, 'severity': d.severity.value if hasattr(d.severity, 'value') else d.severity, 'type': d.detection_type} for d in detections]

@router.get('/detections/summary')
async def get_detection_summary():
    return {'total': 0, 'today': 0, 'pendingReview': 0, 'highConfidence': 0}

