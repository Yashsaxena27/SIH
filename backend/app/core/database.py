from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.config import settings
from typing import AsyncGenerator

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.LOG_LEVEL == "DEBUG"),
    poolclass=NullPool,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
