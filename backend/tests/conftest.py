import pytest_asyncio
from app.core.database import engine

@pytest_asyncio.fixture(autouse=True)
async def cleanup_engine_connections():
    """
    Disposes connection pool between async tests so asyncpg connections
    are never shared across closed event loops on Windows/Python 3.14.
    """
    yield
    await engine.dispose()
