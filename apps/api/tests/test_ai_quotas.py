"""Daily quotas, the per-address limit and the daily budget (docs/content/ai-quotas-brief.md)."""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.quotas import midnight
from app.config import get_settings
from app.models import AiRequest
from tests.ai_fakes import FakeClaude, FakeLog, context, stream
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher

USED_UP = "You have used today's AI help for this. The coach still works. It resets at midnight."
BUDGET = "AI help has reached today's limit. The coach still works. It is back at midnight."
BUSY = "AI help is busy on this network today. The coach still works. Try again tomorrow."


@pytest.fixture
async def teacher(client: AsyncClient, outbox: Any) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


@pytest.fixture
async def student(client: AsyncClient, teacher: dict[str, Any]) -> AsyncIterator[AsyncClient]:
    await client.patch(f"/classes/{teacher['id']}", json={"ai_enabled": True})
    async with browser() as other:
        await join(other, teacher["code"], "Kofi_A")
        yield other


@pytest.fixture
def small_quotas(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_quota_student", {"tutor": 2, "what-if": 1, "report-review": 1})
    monkeypatch.setattr(settings, "ai_quota_teacher", {"tutor": 3})


async def status_of(client: AsyncClient) -> dict[str, Any]:
    got = await client.get("/ai/status")
    assert got.status_code == 200, got.text
    return got.json()


async def test_a_student_uses_up_a_feature_and_keeps_the_others(
    student: AsyncClient,
    ai_on: None,
    small_quotas: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    for _ in range(2):
        await stream(student)
    refused = await student.post("/test-only/ai/tutor", json=context())
    assert refused.status_code == 429
    assert refused.json()["detail"] == USED_UP
    assert len(claude.requests) == 2  # the refused request never reached Claude

    body = await status_of(student)
    assert body["available"] is True
    assert body["features"] == ["what-if", "report-review"]
    assert body["used_up"] == {"tutor": USED_UP}


async def test_each_person_has_their_own_quota(
    client: AsyncClient,
    student: AsyncClient,
    ai_on: None,
    small_quotas: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    for _ in range(2):
        await stream(student)
    # The teacher's quota is separate, and larger.
    for _ in range(3):
        await stream(client)
    assert (await client.post("/test-only/ai/tutor", json=context())).status_code == 429


async def test_yesterdays_requests_do_not_count(
    client: AsyncClient,
    teacher: dict[str, Any],
    db: AsyncSession,
    ai_on: None,
    small_quotas: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    for _ in range(3):
        await stream(client)
    assert (await client.post("/test-only/ai/tutor", json=context())).status_code == 429
    await db.execute(update(AiRequest).values(at=midnight() - timedelta(minutes=1)))
    assert [name for name, _ in await stream(client)][-1] == "done"


async def test_the_daily_budget_stops_everyone_until_midnight(
    client: AsyncClient,
    student: AsyncClient,
    db: AsyncSession,
    ai_on: None,
    monkeypatch: pytest.MonkeyPatch,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    monkeypatch.setattr(get_settings(), "ai_daily_budget_usd", 1.0)
    db.add(log_row(b"\x01" * 32, cost=600_000))
    db.add(log_row(b"\x02" * 32, cost=300_000, at=midnight() - timedelta(hours=1)))
    await db.commit()  # as the log's own session would
    assert [name for name, _ in await stream(student)][-1] == "done"  # 0.60 of 1.00 spent today

    db.add(log_row(b"\x03" * 32, cost=400_000))
    await db.commit()  # as the log's own session would
    for who in (client, student):
        refused = await who.post("/test-only/ai/tutor", json=context())
        assert refused.status_code == 429
        assert refused.json()["detail"] == BUDGET
        body = await status_of(who)
        assert (body["available"], body["reason"], body["message"]) == (
            False,
            "budget-reached",
            BUDGET,
        )


async def test_one_network_address_has_a_daily_ceiling(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    monkeypatch: pytest.MonkeyPatch,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    monkeypatch.setattr(get_settings(), "ai_requests_per_address", 2)
    for _ in range(2):
        await stream(client)
    refused = await client.post("/test-only/ai/tutor", json=context())
    assert refused.status_code == 429
    assert refused.json()["detail"] == BUSY


async def test_signed_out_is_refused_before_any_limit_is_counted(
    ai_on: None, monkeypatch: pytest.MonkeyPatch, client: AsyncClient, claude: FakeClaude
) -> None:
    monkeypatch.setattr(get_settings(), "ai_requests_per_address", 1)
    async with browser() as visitor:
        for _ in range(3):
            assert (await visitor.post("/ai/tutor", json=context())).status_code == 401
    assert claude.requests == []


def log_row(who: bytes, *, cost: int = 1000, at: datetime | None = None) -> AiRequest:
    return AiRequest(
        feature="tutor",
        model="claude-haiku-5-5",
        principal_kind="teacher",
        pseudonym=who,
        input_tokens=100,
        output_tokens=10,
        cache_read_tokens=0,
        cache_write_tokens=0,
        cost_microdollars=cost,
        duration_ms=100,
        outcome="done",
        at=at or datetime.now(UTC),
    )
