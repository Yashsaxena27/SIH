from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.domain import RoadSegment, Department, UrbanIssue, Bus, Route

router = APIRouter(prefix="/api/v1", tags=["Analytics"])

@router.get("/analytics/road-segments")
async def get_road_segments(session: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    import shapely.wkb
    result = await session.execute(select(RoadSegment))
    segments = result.scalars().all()
    serialized = []
    for s in segments:
        start_point = None
        end_point = None
        if s.geometry:
            try:
                line = shapely.wkb.loads(bytes(s.geometry.data))
                coords = list(line.coords)
                if coords:
                    start_point = {"lat": coords[0][1], "lng": coords[0][0]}
                    end_point = {"lat": coords[-1][1], "lng": coords[-1][0]}
            except Exception:
                pass
        serialized.append({
            "id": s.id,
            "name": s.name,
            "roadType": s.road_class,
            "healthScore": s.health_score,
            "startPoint": start_point,
            "endPoint": end_point
        })
    return serialized

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
    
    total_routes = await session.scalar(select(func.count()).select_from(Route))
    active_routes = await session.scalar(select(func.count()).select_from(Route).where(Route.is_active == True))
    
    recent_detections = await session.scalar(
        select(func.count()).select_from(Detection).where(
            Detection.timestamp >= datetime.utcnow().replace(hour=datetime.utcnow().hour - 1 if datetime.utcnow().hour > 0 else 0)
        )
    )
    
    return {
        "overallStatus": "operational",
        "activeBuses": active_buses or 0,
        "totalBuses": total_buses or 0,
        "activeRoutes": active_routes or 0,
        "totalRoutes": total_routes or 0,
        "edgeDevicesOnline": active_buses or 0,
        "edgeDevicesTotal": total_buses or 0,
        "apiLatencyMs": None,
        "detectionsPastHour": recent_detections or 0,
        "eventsInQueue": None,
        "uptime": None
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
async def get_detection_summary(session: AsyncSession = Depends(get_db)):
    total = await session.scalar(select(func.count()).select_from(Detection))
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await session.scalar(
        select(func.count()).select_from(Detection).where(Detection.timestamp >= today_start)
    )
    pending = await session.scalar(
        select(func.count()).select_from(Detection).where(Detection.processing_status == 'pending')
    )
    high_conf = await session.scalar(
        select(func.count()).select_from(Detection).where(Detection.confidence >= 0.7)
    )
    return {
        'total': total or 0,
        'today': today_count or 0,
        'pendingReview': pending or 0,
        'highConfidence': high_conf or 0
    }

@router.get('/analytics/hotspots')
async def get_hotspots(session: AsyncSession = Depends(get_db)):
    """
    Detects spatial hotspots using PostGIS ST_ClusterDBSCAN.
    Clusters issues that are within 50 meters of each other (min 2 issues per cluster).
    """
    from sqlalchemy import text
    import shapely.wkb
    
    # 50 meters in degrees approx: 50 / 111320 = 0.00045
    # For EPSG:4326, we use ST_Transform or cast to geography for accurate distance, 
    # but ST_ClusterDBSCAN only works on geometry.
    # So we use a degree tolerance. 0.00045 degrees ~ 50 meters.
    query = text('''
        WITH Clusters AS (
            SELECT 
                id,
                severity,
                location,
                ST_ClusterDBSCAN(location, eps := 0.00045, minpoints := 2) over () as cid
            FROM urban_issues
            WHERE status NOT IN ('verified', 'closed')
        )
        SELECT 
            cid,
            COUNT(id) as issue_count,
            ST_AsBinary(ST_Centroid(ST_Collect(location))) as centroid
        FROM Clusters
        WHERE cid IS NOT NULL
        GROUP BY cid
        ORDER BY issue_count DESC
        LIMIT 20
    ''')
    
    result = await session.execute(query)
    hotspots = []
    
    for row in result:
        cid = row[0]
        count = row[1]
        centroid_wkb = row[2]
        
        point = shapely.wkb.loads(bytes(centroid_wkb))
        
        hotspots.append({
            "id": f"cluster_{cid}",
            "issueCount": count,
            "center": {"lat": point.y, "lng": point.x},
            "radius": 50, # approx display radius
            "severity": "high" if count > 5 else "medium"
        })
        
    return hotspots

