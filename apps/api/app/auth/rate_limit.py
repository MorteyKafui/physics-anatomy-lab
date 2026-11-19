"""Fixed-window counters in PostgreSQL (no Redis, ADR 0016)."""

import ipaddress
from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.policy import Limit
from app.config import get_settings
from app.models import RateLimit


def client_address(request: Request) -> str:
    """The caller's network address, as rate limits count it. IPv6 counts by its /64, which one
    household or school is usually given, so rotating addresses inside it does not help."""
    header = get_settings().client_ip_header
    raw = request.headers.get(header, "") if header else ""
    if not raw:
        raw = request.client.host if request.client else "unknown"
    try:
        address = ipaddress.ip_address(raw.strip())
    except ValueError:
        return raw.strip()[:64]
    if address.version == 6:
        return str(ipaddress.ip_network(f"{address}/64", strict=False))
    return str(address)


def _window_start(limit: Limit, now: datetime) -> datetime:
    seconds = int(limit.window.total_seconds())
    epoch = int(now.timestamp())
    return datetime.fromtimestamp(epoch - epoch % seconds, tz=UTC)


def _key(limit: Limit, subject: str) -> str:
    return f"{limit.name}:{subject.lower()}"


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


async def forgive(db: AsyncSession, limit: Limit, subject: str) -> None:
    """Take back a hit counted by `take`, for limits that count only failures. Counting first
    and forgiving on success means parallel guesses cannot all slip past a read-then-write check:
    the upsert holds the row until each request's transaction ends."""
    now = datetime.now(UTC)
    await db.execute(
        update(RateLimit)
        .where(
            RateLimit.key == _key(limit, subject),
            RateLimit.window_start == _window_start(limit, now),
            RateLimit.hits > 0,
        )
        .values(hits=RateLimit.hits - 1)
    )


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


async def forget(db: AsyncSession, limit: Limit, subject: str) -> None:
    """Drop every window counted against this subject, such as a deleted account's email."""
    await db.execute(delete(RateLimit).where(RateLimit.key == _key(limit, subject)))
