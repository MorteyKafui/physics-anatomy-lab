"""Anonymous usage counts (ADR 0048): only the known fields, small bodies, a rate limit, no
address kept, the admin counts right, and rows gone after 13 months."""

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.policy import USAGE_MAX_BATCH
from app.config import get_settings
from app.models import RateLimit, UsageEvent
from app.usage_prune import months_before, prune
from tests.conftest import browser
from tests.test_admin import staff  # noqa: F401  (the admin portal's server, as staff)

DAY_A = "0" * 31 + "a"
DAY_B = "0" * 31 + "b"
DAY_C = "0" * 31 + "c"
STEPS = ["question", "predict", "build", "check", "measure"]
STEPS += ["tabulate", "plot", "analyse", "conclude", "report"]


def event(name: str = "experiment_viewed", **fields: Any) -> dict[str, Any]:
    out: dict[str, Any] = {
        "name": name,
        "experimentId": "simple-pendulum",
        "mode": "guided",
        "device": "desktop",
        "appVersion": "0.0.0",
        "dayId": DAY_A,
    }
    out.update(fields)
    return {k: v for k, v in out.items() if v is not None}


async def send(client: AsyncClient, *events: dict[str, Any]) -> int:
    response = await client.post("/usage/events", json={"events": list(events)})
    return response.status_code


async def test_a_batch_is_counted_without_sign_in(client: AsyncClient, db: AsyncSession) -> None:
    sent = [
        event(),
        event("stage_completed", step="question"),
        event("report_exported", format="pdf", mode=None),
    ]
    assert await send(client, *sent) == 204
    rows = (await db.scalars(select(UsageEvent).order_by(UsageEvent.id))).all()
    assert [r.name for r in rows] == ["experiment_viewed", "stage_completed", "report_exported"]
    assert rows[1].step == "question" and rows[2].format == "pdf" and rows[2].mode is None


async def test_the_table_has_nowhere_to_keep_an_address(db: AsyncSession) -> None:
    columns = (
        await db.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'usage_events'"
            )
        )
    ).scalars()
    assert set(columns) == {
        "id",
        "received_at",
        "name",
        "experiment_id",
        "step",
        "mode",
        "format",
        "device",
        "app_version",
        "day_id",
    }


@pytest.mark.parametrize(
    "bad",
    [
        event(userAgent="Mozilla/5.0"),
        event(readings=[1.2, 3.4]),
        event(url="https://example.org/lab?name=Ama"),
        event("page_viewed"),
        event("experiment_viewed", step="measure"),
        event("stage_completed"),
        event("stage_completed", step="lunch"),
        event("report_exported"),
        event("hint_shown", format="pdf"),
        event(mode="what-if"),
        event(device="smart-tv"),
        event(experimentId="Ama's pendulum"),
        event(dayId="not-a-day-id"),
        event(appVersion="1.0 <script>"),
    ],
)
async def test_unknown_names_and_fields_are_refused(
    client: AsyncClient, db: AsyncSession, bad: dict[str, Any]
) -> None:
    assert await send(client, event(), bad) == 422
    assert (await db.scalars(select(UsageEvent))).all() == []


async def test_a_batch_holds_one_to_fifty(client: AsyncClient) -> None:
    assert await send(client, *[event()] * USAGE_MAX_BATCH) == 204
    assert await send(client, *[event()] * (USAGE_MAX_BATCH + 1)) == 422
    assert await send(client) == 422


async def test_a_body_over_32_kb_is_refused(client: AsyncClient) -> None:
    padded = json.dumps({"events": [event()], "pad": " " * 33_000})
    response = await client.post(
        "/usage/events", content=padded, headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413

    async def chunks() -> AsyncIterator[bytes]:
        # No Content-Length: the bytes are counted as they arrive.
        for _ in range(40):
            yield b" " * 1024

    # FastAPI reports the cut-off stream as an unreadable body (400); either way it is refused.
    response = await client.post("/usage/events", content=chunks())
    assert response.status_code in (400, 413)


async def test_the_rate_limit_holds_per_address_and_keeps_no_address(
    db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "client_ip_header", "cf-connecting-ip")
    async with browser() as c:
        c.headers["cf-connecting-ip"] = "203.0.113.7"
        for _ in range(600 // USAGE_MAX_BATCH):
            assert await send(c, *[event()] * USAGE_MAX_BATCH) == 204
        assert await send(c, event()) == 429
        c.headers["cf-connecting-ip"] = "203.0.113.8"
        assert await send(c, event()) == 204
    assert len((await db.scalars(select(UsageEvent))).all()) == 601
    keys = (await db.scalars(select(RateLimit.key))).all()
    assert keys and not any("203.0.113" in k for k in keys)


def test_thirteen_months_are_counted_on_the_calendar() -> None:
    at = datetime(2027, 3, 31, 2, 0, tzinfo=UTC)
    assert months_before(at, 13) == datetime(2026, 2, 28, 2, 0, tzinfo=UTC)
    jan = datetime(2027, 1, 15, tzinfo=UTC)
    assert months_before(jan, 13) == datetime(2025, 12, 15, tzinfo=UTC)


async def test_rows_older_than_13_months_are_deleted(client: AsyncClient, db: AsyncSession) -> None:
    assert await send(client, event(), event(dayId=DAY_B)) == 204
    now = datetime.now(UTC)
    cutoff = months_before(now, 13)
    [old, kept] = (await db.scalars(select(UsageEvent.id).order_by(UsageEvent.id))).all()
    for row, at in ((old, cutoff - timedelta(hours=1)), (kept, cutoff + timedelta(hours=1))):
        await db.execute(update(UsageEvent).where(UsageEvent.id == row).values(received_at=at))
    assert await prune(db, now) == 1
    assert (await db.scalars(select(UsageEvent.id))).all() == [kept]


async def test_the_admin_usage_area_counts_right(
    client: AsyncClient,
    staff: AsyncClient,  # noqa: F811
) -> None:
    # Visitor A opens the pendulum twice, finishes every step and downloads a PDF; visitor B
    # opens it on a phone and stops after Question; visitor C opens Ohm's law on a tablet.
    sent = [
        event(),
        event(),
        event("attempt_started"),
        *[event("stage_completed", step=s) for s in STEPS],
        event("hint_shown"),
        event("attempt_completed"),
        event("report_exported", format="pdf"),
        event(dayId=DAY_B, device="phone"),
        event("stage_completed", step="question", dayId=DAY_B, device="phone"),
        event(experimentId="ohms-law", dayId=DAY_C, device="tablet"),
    ]
    assert await send(client, *sent) == 204
    u = (await staff.get("/admin/usage", params={"range": "24h"})).json()
    assert u["visitors"] == 3 and u["opens"] == 4
    assert sum(u["visitors_series"]) == 3 and sum(u["opens_series"]) == 4
    assert len(u["visitors_series"]) == 24
    [pendulum, ohms] = u["experiments"]
    assert pendulum == {
        "experiment_id": "simple-pendulum",
        "opens": 3,
        "visitors": 2,
        "started": 1,
        "reached_report": 1,
        "completed": 1,
    }
    assert ohms["experiment_id"] == "ohms-law" and ohms["opens"] == 1 and ohms["completed"] == 0
    pendulum_steps = [s for s in u["steps"] if s["experiment_id"] == "simple-pendulum"]
    assert [s["step"] for s in pendulum_steps] == STEPS
    assert [s["visitors"] for s in pendulum_steps] == [2] + [1] * 9
    assert u["exports"] == [{"key": "pdf", "n": 1}]
    assert u["devices"] == [
        {"key": "desktop", "n": 1},
        {"key": "phone", "n": 1},
        {"key": "tablet", "n": 1},
    ]
