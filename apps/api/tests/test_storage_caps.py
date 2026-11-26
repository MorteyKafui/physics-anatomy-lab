"""Caps on what one person can make the server store (ASVS review, finding D).

A student could push synced work without limit, a class had no size limit, and a slow
dashboard query could hold a connection the lab needs.
"""

from collections.abc import AsyncIterator
from datetime import timedelta
from typing import Any

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import LogSender
from app.auth.policy import Limit
from app.db import Db, get_db
from app.routes import classes, sync, teacher
from tests.conftest import browser
from tests.helpers import create_class, join, preview, sign_in_teacher
from tests.test_sync import batch, event

FULL_TODAY = (
    "Your work is saved on this device. The server has taken all it can from you today, "
    "so it will sync tomorrow."
)


async def test_a_push_past_the_days_events_stores_nothing(
    client: AsyncClient, outbox: LogSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        sync, "SYNC_EVENTS_PER_DAY", Limit("sync-events:owner", 3, timedelta(days=1))
    )
    await sign_in_teacher(client, outbox, "t@example.org")
    assert (await client.post("/sync/push", json={"attempts": [batch(n=2)]})).status_code == 200
    # Sending the same two again is free: only new events count.
    again = await client.post("/sync/push", json={"attempts": [batch(n=2)]})
    assert again.status_code == 200, again.text

    refused = await client.post("/sync/push", json={"attempts": [batch(n=4)]})
    assert (refused.status_code, refused.json()["detail"]) == (429, FULL_TODAY)
    assert len((await client.get("/sync/pull")).json()["events"]) == 2  # nothing was stored

    # The refusal took nothing from the day: one more new event still fits.
    one_more = await client.post("/sync/push", json={"attempts": [batch(n=3)]})
    assert one_more.json()["attempts"] == [{"id": "a-1", "newEvents": 1, "status": "ok"}]


async def test_a_push_past_the_days_bytes_stores_nothing(
    client: AsyncClient, outbox: LogSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    size = len('{"length":0.8,"unit":"m","parts":[1,null,true]}')
    monkeypatch.setattr(
        sync, "SYNC_BYTES_PER_DAY", Limit("sync-bytes:owner", size * 2, timedelta(days=1))
    )
    await sign_in_teacher(client, outbox, "t@example.org")
    assert (await client.post("/sync/push", json={"attempts": [batch(n=2)]})).status_code == 200
    big: dict[str, Any] = {"attempt": batch()["attempt"], "events": [event(3)]}
    refused = await client.post("/sync/push", json={"attempts": [big]})
    assert refused.status_code == 429


async def test_each_owner_has_their_own_day(
    client: AsyncClient, outbox: LogSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        sync, "SYNC_EVENTS_PER_DAY", Limit("sync-events:owner", 2, timedelta(days=1))
    )
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    assert (await client.post("/sync/push", json={"attempts": [batch(n=2)]})).status_code == 200
    async with browser() as kofi:
        await join(kofi, made["code"], "Kofi_A")
        assert (await kofi.post("/sync/push", json={"attempts": [batch(n=2)]})).status_code == 200


async def test_a_full_class_takes_no_one_new(
    client: AsyncClient, outbox: LogSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(classes, "CLASS_MEMBER_LIMIT", 2)
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    for name in ("Kofi_A", "Ama_B"):
        async with browser() as student:
            await join(student, made["code"], name)
    async with browser() as late:
        assert await preview(late, made["code"]) == 409
        refused = await late.post(
            "/join",
            json={"code": made["code"], "display_name": "Esi_C", "agreed_to_terms": True},
        )
        assert (refused.status_code, refused.json()["detail"]) == (409, classes.CLASS_FULL)


async def test_a_slow_dashboard_statement_is_stopped_with_a_plain_line(
    db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(teacher, "TEACHER_STATEMENT_TIMEOUT_MS", 50)
    small = FastAPI(dependencies=[Depends(teacher.time_limited, scope="function")])

    @small.get("/slow")
    async def slow(session: Db) -> None:  # pyright: ignore[reportUnusedFunction]
        await session.execute(text("SELECT pg_sleep(1)"))

    async def test_db() -> AsyncIterator[AsyncSession]:
        yield db

    small.dependency_overrides[get_db] = test_db
    async with AsyncClient(transport=ASGITransport(app=small), base_url="http://t") as c:
        got = await c.get("/slow")
    assert (got.status_code, got.json()["detail"]) == (503, teacher.TOO_SLOW)
