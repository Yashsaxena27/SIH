import asyncio
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.models.base import Base
from app.models.domain import Department, User, Bus, Route, RoadSegment, UserRole
from app.core.security import get_password_hash
from app.core.config import settings

async def seed_data():
    engine = create_async_engine(settings.DATABASE_URL)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    
    async with session_maker() as session:
        # Create department
        dept = Department(
            id="dept_road",
            name="Road Maintenance Department",
            department_type="maintenance",
            service_area="Central Zone"
        )
        session.add(dept)
        
        # Create user
        user = User(
            id="usr_admin",
            name="System Admin",
            email="admin@sih.gov.in",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.admin,
            department_id=dept.id
        )
        session.add(user)
        
        # Create bus
        bus1 = Bus(
            id="BUS-001",
            registration_number="DL-1P-1234",
            operator="DTC",
            status="online",
            camera_status="online",
            gps_status="online"
        )
        session.add(bus1)

        bus2 = Bus(
            id="BUS-002",
            registration_number="DL-1P-5678",
            operator="DTC",
            status="online",
            camera_status="online",
            gps_status="online"
        )
        session.add(bus2)
        
        # Create road segment
        road = RoadSegment(
            id="RS-001",
            name="Connaught Place Inner Circle",
            road_class="arterial",
            geometry="LINESTRING(77.2173 28.6321, 77.2183 28.6331)",
            health_score=85.0
        )
        session.add(road)
        
        await session.commit()
        print("Database seeded successfully with base entities!")

if __name__ == "__main__":
    asyncio.run(seed_data())
