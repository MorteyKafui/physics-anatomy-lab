"""The AI request log (ADR 0043): pseudonymous, no prompt or reply text, kept 90 days.

A streamed reply ends after the request's own database session has been committed, so each row
is written in a session of its own. A request that will reach Claude is first reserved: its row is
written as `pending`, committed at once so requests sent alongside it count it, and filled in when
the reply ends (app/ai/quotas.py). Until the API has scheduled jobs, writing a row also deletes
rows past the retention period.
"""

import hashlib
import hmac
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal, Protocol

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.sessions import Principal, Teacher
from app.config import get_settings
from app.db import get_sessionmaker
from app.models import AiRequest

AI_LOG_RETENTION = timedelta(days=90)
# Used only where the settings allow AI without a log key: local and test (app/config.py).
_LOCAL_KEY = b"physics-anatomy-local-ai-log-key"

Outcome = Literal["done", "cut-short", "refused", "held", "error", "cancelled", "cached"]


def pseudonym(principal: Principal) -> bytes:
    """A keyed hash of who asked: stable for counting, unreadable without AI_LOG_KEY."""
    key = get_settings().ai_log_key
    secret = _LOCAL_KEY if key is None else key.get_secret_value().encode()
    who = (
        f"teacher:{principal.user.id}"
        if isinstance(principal, Teacher)
        else f"student:{principal.member.id}"
    )
    return hmac.new(secret, who.encode(), hashlib.sha256).digest()


@dataclass(frozen=True)
class LogEntry:
    feature: str
    model: str
    principal_kind: Literal["teacher", "student"]
    pseudonym: bytes
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    cost_microdollars: int | None
    duration_ms: int
    outcome: Outcome


# Writes the pending row in the session given, or refuses the request; returns the row's id.
Reserve = Callable[[AsyncSession], Awaitable[uuid.UUID]]


class AiLog(Protocol):
    async def reserve(self, take: Reserve) -> None:
        """Runs `take` in a transaction of its own, committed before the reply starts."""
        ...

    async def record(self, entry: LogEntry) -> None:
        """Fills in the reserved row, or writes a new one (a cached answer is never reserved)."""
        ...


class DatabaseAiLog:
    """One per request (get_ai_log), so the row it reserved is this request's."""

    def __init__(self, sessions: async_sessionmaker[AsyncSession] | None = None) -> None:
        self._sessions = sessions
        self.reserved: uuid.UUID | None = None

    async def reserve(self, take: Reserve) -> None:
        sessions = self._sessions or get_sessionmaker()
        async with sessions() as db, db.begin():
            self.reserved = await take(db)

    async def record(self, entry: LogEntry) -> None:
        sessions = self._sessions or get_sessionmaker()
        async with sessions() as db, db.begin():
            await db.execute(
                delete(AiRequest).where(AiRequest.at < datetime.now(UTC) - AI_LOG_RETENTION)
            )
            if self.reserved is None:
                db.add(AiRequest(**entry.__dict__))
            else:
                await db.execute(
                    update(AiRequest).where(AiRequest.id == self.reserved).values(**entry.__dict__)
                )


def get_ai_log() -> AiLog:
    return DatabaseAiLog()
