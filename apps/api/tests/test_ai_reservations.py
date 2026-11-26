"""Each AI request is reserved before it reaches Claude (ASVS review, finding C).

Without the reservation, requests sent at the same time were each checked before any of them was
logged, so a person could pass their quota, and everyone the budget, by sending many at once.
"""

import asyncio
import uuid
from collections.abc import Awaitable
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.ai.features import FEATURES, FeatureName
from app.ai.log import DatabaseAiLog, pseudonym
from app.ai.quotas import UNDER_WAY, most_it_can_cost, reserve_in
from app.auth.sessions import Teacher
from app.config import get_settings
from app.models import AiRequest, User
from tests.ai_fakes import FakeClaude, FakeLog, context, stream
from tests.helpers import create_class, sign_in_teacher

STILL_ANSWERING = "AI help is still answering your last questions. Wait for them, then ask again."
USED_UP = "You have used today's AI help for this. The coach still works. It resets at midnight."
TUTOR = FEATURES[FeatureName.tutor]
MODEL = "claude-haiku-5-5"


@pytest.fixture
async def teacher(client: AsyncClient, outbox: Any) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


async def test_a_reply_fills_in_the_row_reserved_for_it(
    client: AsyncClient,
    teacher: dict[str, Any],
    db: AsyncSession,
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    assert [name for name, _ in await stream(client)][-1] == "done"
    [row] = (await db.scalars(select(AiRequest))).all()
    assert row.outcome == "done"
    assert row.cost_microdollars == ai_log.entries[0].cost_microdollars
    assert row.cost_microdollars != most_it_can_cost(TUTOR, MODEL)


async def test_replies_under_way_count_and_stop_one_more(
    client: AsyncClient,
    teacher: dict[str, Any],
    db: AsyncSession,
    ai_on: None,
    monkeypatch: pytest.MonkeyPatch,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    monkeypatch.setattr(get_settings(), "ai_quota_teacher", {"tutor": 3})
    for _ in range(2):
        await stream(client)
    # As if both replies were still running.
    await db.execute(update(AiRequest).values(outcome="pending"))
    await db.commit()
    refused = await client.post("/test-only/ai/tutor", json=context())
    assert (refused.status_code, refused.json()["detail"]) == (429, STILL_ANSWERING)

    # A pending row older than any reply can run is no longer under way, but still counts.
    await db.execute(update(AiRequest).values(at=datetime.now(UTC) - UNDER_WAY))
    await db.commit()
    assert [name for name, _ in await stream(client)][-1] == "done"
    refused = await client.post("/test-only/ai/tutor", json=context())
    assert (refused.status_code, refused.json()["detail"]) == (429, USED_UP)
    assert len(claude.requests) == 3


# Requests at the same time, each in a session of its own, as the server runs them.


async def race(monkeypatch: pytest.MonkeyPatch, tries: int, **settings: Any) -> int:
    """Sends `tries` reservations for one teacher at once; returns how many were let through."""
    for name, value in settings.items():
        monkeypatch.setattr(get_settings(), name, value)
    who = Teacher(kind="teacher", session_id=uuid.uuid4(), user=User(id=uuid.uuid4()))
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def one() -> bool:
        def take(db: AsyncSession) -> Awaitable[uuid.UUID]:
            return reserve_in(db, who, TUTOR, MODEL, get_settings())

        try:
            await DatabaseAiLog(sessions).reserve(take)
        except HTTPException as refused:
            assert refused.status_code == 429
            return False
        return True

    try:
        return sum(await asyncio.gather(*(one() for _ in range(tries))))
    finally:
        async with sessions() as db, db.begin():
            await db.execute(delete(AiRequest).where(AiRequest.pseudonym == pseudonym(who)))
        await engine.dispose()


async def test_a_quota_holds_when_requests_arrive_together(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    let_through = await race(monkeypatch, 8, ai_quota_teacher={"tutor": 3}, ai_requests_at_once=100)
    assert let_through == 3


async def test_replies_at_once_are_capped_when_requests_arrive_together(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    let_through = await race(monkeypatch, 8, ai_quota_teacher={"tutor": 100})
    assert let_through == get_settings().ai_requests_at_once == 2


async def test_the_budget_holds_when_requests_arrive_together(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Each reservation holds the most a tutor reply can cost; the budget fits two of them.
    most = most_it_can_cost(TUTOR, MODEL)
    let_through = await race(
        monkeypatch,
        8,
        ai_quota_teacher={"tutor": 100},
        ai_requests_at_once=100,
        ai_daily_budget_usd=(most * 1.5) / 1_000_000,
    )
    assert let_through == 2
