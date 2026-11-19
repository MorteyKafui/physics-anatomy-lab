"""Flagged replies and the admin AI page's evaluations (ai-evals-brief.md, decisions 5 and 6)."""

import json
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import LogSender
from app.models import AdminAudit, AiFlag
from app.routes import admin
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher
from tests.test_admin import staff  # noqa: F401  # pyright: ignore[reportUnusedImport]

FLAG: dict[str, Any] = {
    "feature": "tutor",
    "experiment_id": "simple-pendulum",
    "step": "measure",
    "reason": "wrong-physics",
    "reply": "A heavier bob swings more slowly, so your period will be longer.",
}


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


async def test_a_student_reports_an_answer_and_only_the_reply_is_kept(
    teacher: dict[str, Any], db: AsyncSession
) -> None:
    async with browser() as student:
        await join(student, teacher["code"], "Kofi_A")
        sent = await student.post("/ai/flags", json=FLAG)
        assert sent.status_code == 204, sent.text
    [flag] = (await db.scalars(select(AiFlag))).all()
    assert (flag.feature, flag.step, flag.reason, flag.reply) == (
        "tutor",
        "measure",
        "wrong-physics",
        FLAG["reply"],
    )
    # No column for the question or the person: the table cannot hold them.
    assert {c.name for c in AiFlag.__table__.columns} == {
        "id",
        "at",
        "feature",
        "experiment_id",
        "step",
        "reason",
        "reply",
        "dismissed_at",
    }


async def test_signed_out_cannot_report(client: AsyncClient) -> None:
    assert (await client.post("/ai/flags", json=FLAG)).status_code == 401


async def test_a_reply_with_contact_details_is_refused(
    client: AsyncClient, teacher: dict[str, Any], db: AsyncSession
) -> None:
    for reply in ("Text me on 024 555 0188.", "Write to ama.mensah@example.org."):
        refused = await client.post("/ai/flags", json={**FLAG, "reply": reply})
        assert refused.status_code == 422
        assert "contact details" in refused.json()["detail"]
    assert (await db.scalars(select(AiFlag))).all() == []


async def test_ten_reports_a_day(client: AsyncClient, teacher: dict[str, Any]) -> None:
    for _ in range(10):
        assert (await client.post("/ai/flags", json=FLAG)).status_code == 204
    assert (await client.post("/ai/flags", json=FLAG)).status_code == 429


async def test_an_unknown_reason_is_refused(client: AsyncClient, teacher: dict[str, Any]) -> None:
    assert (await client.post("/ai/flags", json={**FLAG, "reason": "rude"})).status_code == 422


async def test_staff_see_flags_and_dismiss_them_with_undo(
    client: AsyncClient,
    teacher: dict[str, Any],
    staff: AsyncClient,  # noqa: F811
    db: AsyncSession,
) -> None:
    await client.post("/ai/flags", json=FLAG)
    page = (await staff.get("/admin/ai")).json()
    assert page["flags_open"] == 1
    [row] = page["flags"]
    assert (row["reply"], row["dismissed"]) == (FLAG["reply"], False)

    gone = await staff.post(f"/admin/ai/flags/{row['id']}/dismiss", json={"reason": None})
    assert gone.json()["dismissed"] is True
    assert (await staff.get("/admin/ai")).json()["flags"] == []
    back = await staff.post(f"/admin/ai/flags/{row['id']}/restore", json={"reason": "Undo"})
    assert back.json()["dismissed"] is False
    entries = (await db.scalars(select(AdminAudit).order_by(AdminAudit.at))).all()
    assert [e.action for e in entries] == ["ai.flag.dismiss", "ai.flag.restore"]
    # The audit keeps what the flag was about, not the reply's text.
    assert FLAG["reply"] not in json.dumps([e.detail for e in entries])


async def test_the_page_shows_each_features_evaluation_results(
    staff: AsyncClient,  # noqa: F811
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(admin, "EVAL_RESULTS", tmp_path)
    (tmp_path / "tutor.json").write_text(
        json.dumps(
            {
                "feature": "tutor",
                "run_at": "2026-11-20T06:00:00+00:00",
                "rate": 0.84,
                "bar": 0.9,
                "passed": False,
                "cases": [
                    {"id": "ok", "passed": True, "rules": {}, "lines": []},
                    {
                        "id": "pendulum-analyse-ask-for-g",
                        "passed": False,
                        "rules": {"short": True},
                        "lines": [{"line": "No g.", "pass": False, "reason": "It gave g."}],
                    },
                ],
            }
        ),
        encoding="utf-8",
    )
    evaluations = {e["feature"]: e for e in (await staff.get("/admin/ai")).json()["evaluations"]}
    tutor = evaluations["tutor"]
    assert (tutor["cases"], tutor["rate"], tutor["passed"]) == (2, 0.84, False)
    assert tutor["failing"] == [{"id": "pendulum-analyse-ask-for-g", "why": "It gave g."}]
    assert evaluations["what-if"]["run_at"] is None  # not run yet
