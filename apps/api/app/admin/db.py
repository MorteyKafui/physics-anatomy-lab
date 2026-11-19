"""The admin portal's reads: a read-only transaction with a time limit (ADR 0040).

Charts read `ADMIN_DATABASE_URL` (a read replica) when it is set, else the primary database. Either
way the transaction is read-only, so a mistake in a query cannot change data, and a statement
that runs longer than `ADMIN_STATEMENT_TIMEOUT_MS` is stopped, so a heavy chart never holds up
students.
"""

from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db import get_engine


@lru_cache
def _read_sessionmaker() -> async_sessionmaker[AsyncSession]:
    settings = get_settings()
    engine = (
        create_async_engine(settings.admin_database_url, pool_pre_ping=True, pool_size=2)
        if settings.admin_database_url
        else get_engine()
    )
    return async_sessionmaker(engine, expire_on_commit=False)


async def get_admin_read_db() -> AsyncIterator[AsyncSession]:
    timeout = int(get_settings().admin_statement_timeout_ms)
    async with _read_sessionmaker()() as db:
        await db.execute(text("SET TRANSACTION READ ONLY"))
        await db.execute(text(f"SET LOCAL statement_timeout = {timeout}"))
        try:
            yield db
        finally:
            await db.rollback()


ReadDb = Annotated[AsyncSession, Depends(get_admin_read_db)]
