"""Fixed-window counters in PostgreSQL (no Redis, ADR 0016)."""

from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.policy import Limit
from app.config import get_settings
from app.models import RateLimit


def client_address(request: Request) -> str:
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("cf-connecting-ip")
        if forwarded:
            return forwarded.strip()
    return request.client.host if request.client else "unknown"


def _window_start(limit: Limit, now: datetime) -> datetime:
    seconds = int(limit.window.total_seconds())
    epoch = int(now.timestamp())
    return datetime.fromtimestamp(epoch - epoch % seconds, tz=UTC)


def _key(limit: Limit, subject: str) -> str:
    return f"{limit.name}:{subject.lower()}"


async def hits(db: AsyncSession, limit: Limit, subject: str) -> int:
    now = datetime.now(UTC)
    found = await db.scalar(
        select(RateLimit.hits).where(
            RateLimit.key == _key(limit, subject),
            RateLimit.window_start == _window_start(limit, now),
        )
    )
    return found or 0


async def record(db: AsyncSession, limit: Limit, subject: str) -> int:
    """Count one hit and return the count in this window."""
    now = datetime.now(UTC)
    statement = (
        insert(RateLimit)
        .values(key=_key(limit, subject), window_start=_window_start(limit, now), hits=1)
        .on_conflict_do_update(
            index_elements=[RateLimit.key, RateLimit.window_start],
            set_={"hits": RateLimit.hits + 1},
        )
        .returning(RateLimit.hits)
    )
    count = await db.scalar(statement)
    return count or 0


async def refuse_if_over(db: AsyncSession, limit: Limit, subject: str) -> None:
    if await hits(db, limit, subject) >= limit.hits:
        raise too_many(limit)


async def take(db: AsyncSession, limit: Limit, subject: str) -> None:
    """Count one hit, refusing it if the window is already full."""
    if await record(db, limit, subject) > limit.hits:
        raise too_many(limit)


def too_many(limit: Limit) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many tries. Wait a few minutes and try again.",
        headers={"Retry-After": str(int(limit.window.total_seconds()))},
    )


async def forget_older_than(db: AsyncSession, cutoff: datetime) -> None:
    """Cleanup for the job queue, once it exists."""
    await db.execute(delete(RateLimit).where(RateLimit.window_start < cutoff))
