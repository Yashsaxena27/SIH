import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.models.domain import (
    Department, User, Bus, Route, RoadSegment, UrbanIssue, 
    Detection, Observation, Ticket, Verification, Alert,
    UserRole, IssueStatus, TicketStatus, Severity, TicketPriority, VerificationResult
)
from app.core.security import get_password_hash
from app.core.config import settings

def gen_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def random_date(start_days_ago, end_days_ago=0):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=start_days_ago)
    end = now - timedelta(days=end_days_ago)
    delta = end - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_seconds)

async def seed_demo_data():
    print("Connecting to database...")
    engine = create_async_engine(settings.DATABASE_URL)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    
    async with session_maker() as session:
        print("Clearing existing data...")
        await session.execute(text("TRUNCATE TABLE verifications, tickets, observations, detections, urban_issues, alerts CASCADE"))
        await session.execute(text("TRUNCATE TABLE buses, routes, road_segments, users, departments CASCADE"))
        await session.commit()
        
        print("Creating Departments and Users...")
        depts = [
            Department(id=gen_id("dept"), name="BBMP Major Roads", department_type="maintenance", service_area="Bengaluru Central"),
            Department(id=gen_id("dept"), name="BBMP Ward Works", department_type="maintenance", service_area="Bengaluru South"),
            Department(id=gen_id("dept"), name="BTP Traffic Division", department_type="traffic", service_area="Bengaluru Central")
        ]
        session.add_all(depts)
        await session.commit()
        
        users = [
            User(id=gen_id("usr"), name="Admin PotholeWala", email="admin@potholewala.in", hashed_password=get_password_hash("admin123"), role=UserRole.admin, department_id=depts[0].id),
            User(id=gen_id("usr"), name="Officer Rajesh", email="rajesh@bbmp.gov.in", hashed_password=get_password_hash("pass123"), role=UserRole.officer, department_id=depts[0].id),
            User(id=gen_id("usr"), name="Operator Sneha", email="sneha@btp.gov.in", hashed_password=get_password_hash("pass123"), role=UserRole.operator, department_id=depts[2].id)
        ]
        session.add_all(users)
        await session.commit()
        
        print("Creating Routes and Road Segments...")
        routes_data = [
            {"name": "MG Road Route", "code": "R-MGR", "coords": [(77.5946, 12.9716), (77.6070, 12.9740)]},
            {"name": "Koramangala 100ft", "code": "R-KOR", "coords": [(77.6240, 12.9350), (77.6300, 12.9400)]},
            {"name": "Indiranagar 100ft", "code": "R-IND", "coords": [(77.6410, 12.9780), (77.6450, 12.9820)]},
            {"name": "ORR Marathahalli", "code": "R-ORR", "coords": [(77.7000, 12.9560), (77.7100, 12.9600)]}
        ]
        
        routes = []
        for rd in routes_data:
            line_wkt = f"LINESTRING({rd['coords'][0][0]} {rd['coords'][0][1]}, {rd['coords'][1][0]} {rd['coords'][1][1]})"
            r = Route(id=gen_id("route"), display_code=rd["code"], name=rd["name"], geometry=line_wkt)
            routes.append(r)
        session.add_all(routes)
        await session.commit()
        
        road_segments = []
        for i, rd in enumerate(routes_data):
            for j in range(4):
                lon = rd['coords'][0][0] + (rd['coords'][1][0] - rd['coords'][0][0]) * (j/4)
                lat = rd['coords'][0][1] + (rd['coords'][1][1] - rd['coords'][0][1]) * (j/4)
                lon2 = lon + 0.001
                lat2 = lat + 0.001
                rs = RoadSegment(
                    id=gen_id("rs"),
                    name=f"{rd['name']} - Segment {j+1}",
                    road_class="arterial" if i % 2 == 0 else "collector",
                    geometry=f"LINESTRING({lon} {lat}, {lon2} {lat2})",
                    health_score=random.uniform(40.0, 95.0)
                )
                road_segments.append(rs)
        session.add_all(road_segments)
        await session.commit()
        
        print("Creating Fleet (Buses)...")
        buses = []
        for i in range(12):
            b = Bus(
                id=gen_id("bus"),
                registration_number=f"KA-01-F-{random.randint(1000, 9999)}",
                operator="BMTC",
                route_id=random.choice(routes).id,
                status="online" if random.random() > 0.2 else "offline",
                camera_status="online",
                gps_status="online",
                edge_ai_status="online" if random.random() > 0.1 else "offline",
                last_seen=datetime.now(timezone.utc)
            )
            buses.append(b)
        session.add_all(buses)
        await session.commit()
        
        print("Creating Detections, Issues, Tickets, and Verifications...")
        
        detections = []
        issues = []
        observations = []
        tickets = []
        verifications = []
        
        severities = list(Severity)
        
        for i in range(40):
            rs = random.choice(road_segments)
            # Create a point near the road segment
            coords_str = str(rs.geometry).replace("LINESTRING(", "").replace(")", "") # Need to handle Geoalchemy2
            # GeoAlchemy2 `geometry` object when creating is just a string, but this is memory object.
            # wait, it's just the string we passed: LINESTRING(x y, x y)
            if isinstance(rs.geometry, str):
                coords_str = rs.geometry.replace("LINESTRING(", "").replace(")", "")
                lon1, lat1 = map(float, coords_str.split(",")[0].strip().split(" "))
            else:
                lon1, lat1 = 77.5946, 12.9716 # Fallback if it's WKB element
            
            lon_point = lon1 + random.uniform(-0.0005, 0.0005)
            lat_point = lat1 + random.uniform(-0.0005, 0.0005)
            pt_wkt = f"POINT({lon_point} {lat_point})"
            
            sev = random.choice(severities)
            bus = random.choice(buses)
            det_date = random_date(30, 2)
            
            det = Detection(
                id=gen_id("det"),
                event_id=f"EVT-{uuid.uuid4().hex[:6]}",
                bus_id=bus.id,
                timestamp=det_date,
                location=pt_wkt,
                detection_type="pothole",
                confidence=random.uniform(0.65, 0.98),
                severity=sev,
                evidence_url="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400",
                processing_status="fused"
            )
            detections.append(det)
            
            issue_stat = random.choice([IssueStatus.new, IssueStatus.confirmed, IssueStatus.ticket_created, IssueStatus.verified])
            iss = UrbanIssue(
                id=gen_id("iss"),
                issue_type="pothole",
                status=issue_stat,
                severity=sev,
                priority=random.choice(list(TicketPriority)),
                location=pt_wkt,
                road_segment_id=rs.id,
                first_detected_at=det_date - timedelta(hours=random.randint(1, 48)),
                last_observed_at=det_date,
                observation_count=random.randint(1, 15),
                unique_bus_count=random.randint(1, 5),
                confidence=det.confidence + 0.02 if det.confidence < 0.98 else 0.99,
                assigned_department_id=depts[0].id if issue_stat != IssueStatus.new else None
            )
            issues.append(iss)
            
            obs = Observation(
                id=gen_id("obs"),
                issue_id=iss.id,
                detection_id=det.id,
                bus_id=bus.id,
                timestamp=det_date,
                evidence_url=det.evidence_url,
                confidence=det.confidence
            )
            observations.append(obs)
            
            if issue_stat in [IssueStatus.ticket_created, IssueStatus.in_progress, IssueStatus.repair_reported, IssueStatus.verified]:
                tkt = Ticket(
                    id=gen_id("tkt"),
                    display_id=f"TKT-{random.randint(1000, 9999)}",
                    issue_id=iss.id,
                    department_id=depts[0].id,
                    title=f"{sev.value.title()} Pothole on {rs.name}",
                    description="Detected by edge AI. Requires immediate patch work.",
                    status=TicketStatus.open if issue_stat == IssueStatus.ticket_created else (TicketStatus.closed if issue_stat == IssueStatus.verified else TicketStatus.in_progress),
                    priority=iss.priority,
                    assigned_to=users[1].id
                )
                tickets.append(tkt)
                
                if issue_stat == IssueStatus.verified:
                    ver = Verification(
                        id=gen_id("ver"),
                        issue_id=iss.id,
                        ticket_id=tkt.id,
                        bus_id=bus.id,
                        timestamp=random_date(1, 0),
                        result=VerificationResult.resolved,
                        confidence=random.uniform(0.8, 0.99),
                        before_evidence_url=det.evidence_url,
                        after_evidence_url="https://images.unsplash.com/photo-1590497576571-0675ebc089a1?auto=format&fit=crop&q=80&w=400",
                        notes="Patch confirmed by visual AI pass."
                    )
                    verifications.append(ver)

        session.add_all(detections)
        await session.commit()
        session.add_all(issues)
        await session.commit()
        session.add_all(observations)
        await session.commit()
        session.add_all(tickets)
        await session.commit()
        session.add_all(verifications)
        await session.commit()
        
        print("Creating Alerts...")
        alerts = []
        for i in range(15):
            alerts.append(Alert(
                id=gen_id("alrt"),
                alert_type=random.choice(["critical_issue", "bus_offline", "sla_breach"]),
                severity=random.choice(["critical", "warning", "info"]),
                title=f"System Alert {i+1}",
                message="Automated monitoring alert generated by the system.",
                acknowledged=random.random() > 0.7
            ))
        session.add_all(alerts)
        
        await session.commit()
        print(f"Successfully seeded database with:")
        print(f" - {len(users)} Users")
        print(f" - {len(depts)} Departments")
        print(f" - {len(routes)} Routes")
        print(f" - {len(road_segments)} Road Segments")
        print(f" - {len(buses)} Buses")
        print(f" - {len(detections)} Detections")
        print(f" - {len(issues)} Issues")
        print(f" - {len(tickets)} Tickets")
        print(f" - {len(verifications)} Verifications")
        print(f" - {len(alerts)} Alerts")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
