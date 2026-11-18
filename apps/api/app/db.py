"""The database engine and the per-request session."""

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    return create_async_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """One unit of work per request: committed when the handler returns, rolled back on error.

    A handler that must keep something even though it then refuses the request (a counted wrong
    code, say) commits before it raises.
    """
    async with get_sessionmaker()() as db:
        try:
            yield db
            await db.commit()
        except BaseException:
            await db.rollback()
            raise
