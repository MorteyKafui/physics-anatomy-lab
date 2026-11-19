"""The answer cache (docs/content/ai-quotas-brief.md, decision 3).

The same question, asked again in the same place, gets the answer already checked, at no cost:

- **What if:** keyed by the experiment and version, the bench's quantities (a scenario can be
  worked out from them) and the question, compared after lowercasing and squashing spaces.
  Kept only when its title and reason use no number beyond the question's, the bench's and the
  scenario's own, so it cannot carry another student's readings.
- **Tutor:** the first reply on a step only, keyed by the experiment and version, the step, the
  help level, the coach's latest finding (by rule) and the question. Kept only when neither the
  question nor the reply has a number, so it cannot depend on one student's readings.

Later turns of a thread, report review and question drafting are never cached. Entries hold the
key's hash, never the question's text, and nothing about who asked; they are kept 30 days.
"""

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.context import AiContext
from app.ai.numbers import numbers_in, unexplained
from app.db import get_sessionmaker
from app.models import AiAnswer

ANSWER_RETENTION = timedelta(days=30)
COACH_FINDINGS = ("coach.hint", "coach.note")


@dataclass(frozen=True)
class Answer:
    """A checked answer: {"text": ...} for the tutor, {"item": ...} for what if."""

    model: str
    body: dict[str, Any]


def _normal(text: str) -> str:
    return " ".join(text.lower().split())


def _key(*parts: str) -> bytes:
    return hashlib.sha256("\x1f".join(parts).encode()).digest()


def _latest_finding(context: AiContext) -> str:
    for event in reversed(context.events):
        if event.kind in COACH_FINDINGS:
            rule = event.detail.get("rule")
            return rule if isinstance(rule, str) else ""
    return ""


def tutor_key(context: AiContext) -> bytes | None:
    """None when the question cannot be cached: a later turn, or a number in the question."""
    if context.thread or numbers_in(context.student_text):
        return None
    return _key(
        "tutor",
        context.experiment_id,
        str(context.experiment_version),
        context.step,
        context.help_level,
        _latest_finding(context),
        _normal(context.student_text),
    )


def what_if_key(context: AiContext) -> bytes:
    bench = sorted(f"{q.symbol}={q.value!r}{q.unit}" for q in context.quantities)
    return _key(
        "what-if",
        context.experiment_id,
        str(context.experiment_version),
        *bench,
        _normal(context.student_text),
    )


def tutor_keeps(reply: str) -> bool:
    return not numbers_in(reply)


def what_if_keeps(context: AiContext) -> Callable[[dict[str, Any]], bool]:
    def keeps(item: dict[str, Any]) -> bool:
        changes: dict[str, Any] = item.get("changes", {})
        seen = [
            *numbers_in(context.student_text),
            *(q.value for q in context.quantities),
            *(float(v) for v in changes.values() if isinstance(v, int | float)),
        ]
        return not unexplained(f"{item['title']} {item['reason']}", seen)

    return keeps


@dataclass(frozen=True)
class Caching:
    """What a reply needs to be kept: its key, and the rule that says whether it may be."""

    feature: str
    key: bytes
    keeps_text: Callable[[str], bool] | None = None
    keeps_item: Callable[[dict[str, Any]], bool] | None = None


class AnswerStore(Protocol):
    async def get(self, db: AsyncSession, key: bytes) -> Answer | None: ...
    async def put(self, feature: str, key: bytes, answer: Answer) -> None: ...


class DatabaseAnswerStore:
    """Read in the request's session; written in a session of its own, since a streamed reply
    ends after the request's session has been committed (as the AI log is)."""

    def __init__(self, sessions: async_sessionmaker[AsyncSession] | None = None) -> None:
        self._sessions = sessions

    async def get(self, db: AsyncSession, key: bytes) -> Answer | None:
        row = await db.scalar(
            select(AiAnswer).where(
                AiAnswer.key == key, AiAnswer.at >= datetime.now(UTC) - ANSWER_RETENTION
            )
        )
        return None if row is None else Answer(row.model, row.answer)

    async def put(self, feature: str, key: bytes, answer: Answer) -> None:
        sessions = self._sessions or get_sessionmaker()
        async with sessions() as db, db.begin():
            await db.execute(
                delete(AiAnswer).where(AiAnswer.at < datetime.now(UTC) - ANSWER_RETENTION)
            )
            await db.execute(
                insert(AiAnswer)
                .values(key=key, feature=feature, model=answer.model, answer=answer.body)
                .on_conflict_do_nothing(index_elements=[AiAnswer.key])
            )


def get_answer_store() -> AnswerStore:
    return DatabaseAnswerStore()
