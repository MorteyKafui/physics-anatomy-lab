"""The AI switches and the admin AI page (docs/content/ai-quotas-brief.md, decisions 4 and 5)."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import switches
from app.ai.quotas import midnight
from app.auth.email import LogSender
from app.config import get_settings
from app.models import AdminAudit, AiRequest
from tests.ai_fakes import FakeClaude, FakeLog, context, stream
from tests.helpers import create_class, sign_in_teacher
from tests.test_admin import STAFF, staff  # noqa: F401  # pyright: ignore[reportUnusedImport]

OFF = "AI help is switched off at the moment. The coach still works."


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


async def flip(staff: AsyncClient, name: str, enabled: bool, reason: str | None = None) -> Any:  # noqa: F811
    got = await staff.post(
        f"/admin/ai/switches/{name}", json={"enabled": enabled, "reason": reason}
    )
    assert got.status_code == 200, got.text
    return {s["name"]: s["enabled"] for s in got.json()}


async def test_every_switch_is_on_until_staff_turn_one_off(
    staff: AsyncClient,  # noqa: F811
) -> None:
    page = (await staff.get("/admin/ai")).json()
    assert [(s["name"], s["enabled"]) for s in page["switches"]] == [
        ("all", True),
        ("tutor", True),
        ("what-if", True),
        ("report-review", True),
        ("question-drafting", True),
    ]
    drafting = page["switches"][-1]
    assert (drafting["model"], drafting["teachers_only"]) == ("claude-sonnet-5-5", True)


async def test_a_feature_switched_off_is_refused_and_hidden(
    client: AsyncClient,
    teacher: dict[str, Any],
    staff: AsyncClient,  # noqa: F811
    db: AsyncSession,
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    assert (await flip(staff, "what-if", False))["what-if"] is False
    refused = await client.post("/test-only/ai/what-if", json=context())
    assert (refused.status_code, refused.json()["detail"]) == (503, OFF)
    status = (await client.get("/ai/status")).json()
    assert status["available"] is True
    assert "what-if" not in status["features"]
    assert status["switched_off"] == {"what-if": OFF}
    assert [name for name, _ in await stream(client)][-1] == "done"  # the tutor still works

    # Undo: on again, at once on this process.
    await flip(staff, "what-if", True, "Undo")
    assert "what-if" in (await client.get("/ai/status")).json()["features"]
    entries = (await db.scalars(select(AdminAudit).order_by(AdminAudit.at))).all()
    assert [
        (e.action, e.detail["name"], e.detail["enabled"], e.detail["was"]) for e in entries
    ] == [
        ("ai.switch.set", "what-if", False, True),
        ("ai.switch.set", "what-if", True, False),
    ]
    assert entries[0].actor_email == STAFF and entries[1].detail["reason"] == "Undo"


async def test_all_ai_off_stops_every_feature(
    client: AsyncClient,
    teacher: dict[str, Any],
    staff: AsyncClient,  # noqa: F811
    ai_on: None,
    claude: FakeClaude,
) -> None:
    await flip(staff, "all", False)
    status = (await client.get("/ai/status")).json()
    assert (status["available"], status["reason"], status["message"]) == (
        False,
        "switched-off",
        OFF,
    )
    assert (await client.post("/test-only/ai/tutor", json=context())).status_code == 503
    assert claude.requests == []


async def test_other_processes_see_a_change_within_the_cache_time(
    client: AsyncClient,
    teacher: dict[str, Any],
    staff: AsyncClient,  # noqa: F811
    db: AsyncSession,
    ai_on: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert await switches.switched_off(db) == frozenset()
    # Another process changes a switch: this one keeps its read until the cache runs out.
    await db.merge(switches.AiSwitch(name="tutor", enabled=False))
    await db.flush()
    assert await switches.switched_off(db) == frozenset()
    clock = switches.time.monotonic() + switches.SWITCH_CACHE_SECONDS + 1
    monkeypatch.setattr(switches.time, "monotonic", lambda: clock)
    assert await switches.switched_off(db) == frozenset({"tutor"})


async def test_an_unknown_switch_is_refused(staff: AsyncClient) -> None:  # noqa: F811
    got = await staff.post("/admin/ai/switches/voice", json={"enabled": False})
    assert got.status_code == 422


async def test_the_ai_page_counts_requests_spend_the_cache_and_held_replies(
    staff: AsyncClient,  # noqa: F811
    db: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(get_settings(), "ai_daily_budget_usd", 0.01)
    now = datetime.now(UTC)
    rows = [
        ("tutor", "done", 4000, now - timedelta(minutes=30)),
        ("tutor", "held", 3000, now - timedelta(minutes=20)),
        ("tutor", "cached", 0, now - timedelta(minutes=10)),
        ("report-review", "done", 5000, now - timedelta(minutes=5)),
        ("what-if", "done", 2000, midnight() - timedelta(hours=1)),  # yesterday
    ]
    for feature, outcome, cost, at in rows:
        db.add(
            AiRequest(
                feature=feature,
                model="claude-haiku-5-5",
                principal_kind="student",
                pseudonym=bytes([3]) * 32,
                input_tokens=10,
                output_tokens=10,
                cache_read_tokens=0,
                cache_write_tokens=0,
                cost_microdollars=cost,
                duration_ms=100,
                outcome=outcome,
                at=at,
            )
        )
    await db.flush()
    page = (await staff.get("/admin/ai", params={"range": "7d"})).json()
    today = {f["feature"]: f for f in page["today"]}
    assert today["tutor"] == {
        "feature": "tutor",
        "requests": 3,
        "cost_microdollars": 7000,
        "held": 1,
        "cached": 1,
    }
    assert today["what-if"]["requests"] == 0
    week = {f["feature"]: f["requests"] for f in page["by_feature"]}
    assert week == {"tutor": 3, "what-if": 1, "report-review": 1, "question-drafting": 0}
    assert page["budget_microdollars"] == 10_000
    # 4000 + 3000 + 0 + 5000 passes 10,000 with the report review, five minutes ago.
    reached = datetime.fromisoformat(page["budget_reached_at"])
    assert abs((reached - rows[3][3]).total_seconds()) < 1
