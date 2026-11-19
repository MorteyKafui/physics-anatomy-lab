"""The AI request log (ADR 0043): pseudonymous, no prompt or reply text, kept 90 days.

A streamed reply ends after the request's own database session has been committed, so each row
is written in a session of its own. Until the API has scheduled jobs, writing a row also deletes
rows past the retention period.
"""

import hashlib
import hmac
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal, Protocol

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.sessions import Principal, Teacher
from app.config import get_settings
from app.db import get_sessionmaker
from app.models import AiRequest

AI_LOG_RETENTION = timedelta(days=90)
# Used only where the settings allow AI without a log key: local and test (app/config.py).
_LOCAL_KEY = b"physics-anatomy-local-ai-log-key"

Outcome = Literal["done", "cut-short", "refused", "held", "error", "cancelled"]


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


class AiLog(Protocol):
    async def record(self, entry: LogEntry) -> None: ...


class DatabaseAiLog:
    def __init__(self, sessions: async_sessionmaker[AsyncSession] | None = None) -> None:
        self._sessions = sessions

    async def record(self, entry: LogEntry) -> None:
        sessions = self._sessions or get_sessionmaker()
        async with sessions() as db, db.begin():
            await db.execute(
                delete(AiRequest).where(AiRequest.at < datetime.now(UTC) - AI_LOG_RETENTION)
            )
            db.add(AiRequest(**entry.__dict__))


def get_ai_log() -> AiLog:
    return DatabaseAiLog()
