"""Delete usage events older than 13 months, and the usage rate limit's spent windows (ADR 0048).

Run once a day by the scheduler: `uv run python -m app.usage_prune`. It is safe to run at any
time and any number of times.
"""

import asyncio
import calendar
from datetime import UTC, datetime

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.policy import USAGE_EVENTS_PER_ADDRESS, USAGE_KEEP_MONTHS
from app.db import get_engine, get_sessionmaker
from app.models import RateLimit, UsageEvent


def months_before(at: datetime, months: int) -> datetime:
    """The same time `months` calendar months earlier, on the month's last day if it is shorter."""
    index = at.year * 12 + at.month - 1 - months
    year, month = divmod(index, 12)
    day = min(at.day, calendar.monthrange(year, month + 1)[1])
    return at.replace(year=year, month=month + 1, day=day)


async def prune(db: AsyncSession, now: datetime | None = None) -> int:
    """Delete what is past keeping; return how many events went."""
    at = now or datetime.now(UTC)
    gone = await db.execute(
        delete(UsageEvent).where(UsageEvent.received_at < months_before(at, USAGE_KEEP_MONTHS))
    )
    await db.execute(
        delete(RateLimit).where(
            RateLimit.key.startswith(f"{USAGE_EVENTS_PER_ADDRESS.name}:"),
            RateLimit.window_start < at - USAGE_EVENTS_PER_ADDRESS.window,
        )
    )
    return gone.rowcount  # pyright: ignore[reportAttributeAccessIssue]


async def main() -> None:
    async with get_sessionmaker()() as db:
        n = await prune(db)
        await db.commit()
    await get_engine().dispose()
    print(f"Deleted {n} usage events older than {USAGE_KEEP_MONTHS} months.")


if __name__ == "__main__":
    asyncio.run(main())
