import asyncio
import os
import sys

# Add backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import async_session_maker
from app.models.domain import Bus, Department

async def reset_demo_data():
    """
    Safely resets transactional tables for the SIH demo while preserving structural data.
    """
    print("WARNING: This will delete all detections, issues, tickets, and verifications.")
    print("Resetting demo data...")
    
    async with async_session_maker() as session:
        async with session.begin():
            # Delete in order of constraints
            await session.execute(text("DELETE FROM verifications;"))
            await session.execute(text("DELETE FROM observations;"))
            await session.execute(text("DELETE FROM tickets;"))
            await session.execute(text("DELETE FROM urban_issues;"))
            await session.execute(text("DELETE FROM detections;"))
            
            # Check if basic seed data exists, if not, insert it
            result = await session.execute(text("SELECT COUNT(*) FROM buses"))
            if result.scalar() == 0:
                print("Seeding default buses...")
                bus1 = Bus(id="BUS-1", registration_number="DL-1PB-0001", operator="DTC", status="online")
                bus2 = Bus(id="BUS-2", registration_number="DL-1PB-0002", operator="DTC", status="online")
                session.add_all([bus1, bus2])
            
            result = await session.execute(text("SELECT COUNT(*) FROM departments"))
            if result.scalar() == 0:
                print("Seeding default departments...")
                dept1 = Department(id="dept_roads", name="PWD Roads", department_type="roads", is_active=True)
                dept2 = Department(id="dept_water", name="Jal Board", department_type="water", is_active=True)
                session.add_all([dept1, dept2])
                
        print("Successfully cleared transactional tables and ensured seed data.")
        
if __name__ == "__main__":
    asyncio.run(reset_demo_data())
