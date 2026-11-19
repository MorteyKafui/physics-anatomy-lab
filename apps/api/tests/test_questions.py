"""The question bank (docs/content/ai-questions-brief.md): drafting, sending for review, the
staff review in the admin portal, and the approved questions exam mode reads."""

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.access import AccessVerifier, get_access_verifier
from app.admin.db import get_admin_read_db
from app.ai.stream import UNUSABLE
from app.auth.email import LogSender
from app.main import app
from app.models import AdminAudit, Question
from tests.ai_fakes import FakeClaude, FakeLog
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher

STAFF = "reviewer@example.org"
GOOD = [
    {
        "question": "Why do you start the stopwatch as the bob passes the centre of its swing?",
        "answer": "The bob moves fastest there, so the moment it passes the mark is sharp.",
        "marks": 2,
    },
    {
        "question": "Why do you keep the amplitude below 10°?",
        "answer": "The period depends on the amplitude for large swings.",
        "marks": 2,
    },
    {
        "question": "Name one precaution when measuring the length.",
        "answer": "Measure to the centre of the bob, with the eye level with the mark.",
        "marks": 1,
    },
]
DRAFT = {"experiment_id": "simple-pendulum", "topic": "precautions", "note": "timing"}


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    return await sign_in_teacher(client, outbox, "teacher@example.org")


@pytest.fixture
async def staff(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    verifier = AccessVerifier(None, None, dev_bypass_email=STAFF)
    app.dependency_overrides[get_access_verifier] = lambda: verifier
    app.dependency_overrides[get_admin_read_db] = lambda: db
    async with AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        yield c
    app.dependency_overrides.pop(get_access_verifier, None)
    app.dependency_overrides.pop(get_admin_read_db, None)


async def draft(client: AsyncClient, body: dict[str, Any] = DRAFT) -> list[tuple[str, Any]]:
    events: list[tuple[str, Any]] = []
    async with client.stream("POST", "/ai/question-drafting", json=body) as reply:
        assert reply.status_code == 200, await reply.aread()
        name = ""
        async for line in reply.aiter_lines():
            if line.startswith("event:"):
                name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                events.append((name, json.loads(line.removeprefix("data:").strip())))
    return events


async def submit(client: AsyncClient, questions: list[dict[str, Any]] = GOOD[:2]) -> Any:
    sent = await client.post(
        "/questions",
        json={"experiment_id": "simple-pendulum", "topic": "precautions", "questions": questions},
    )
    assert sent.status_code == 201, sent.text
    return sent.json()


# Drafting


async def test_three_drafts_come_as_one_item(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply(json.dumps({"questions": GOOD}))
    [(name, data), _] = await draft(client)
    assert name == "item"
    assert [q["marks"] for q in data["item"]["questions"]] == [2, 2, 1]
    [request] = claude.requests
    sent = str(request.messages)
    assert "teacher@example.org" not in sent
    assert "0.40 m to 1.00 m" in sent and "Why must the angle of swing be kept small?" in sent
    assert request.model == "claude-sonnet-5-5"


@pytest.mark.parametrize(
    "bad",
    [
        {"questions": GOOD[:2]},  # not three
        {"questions": [*GOOD[:2], {**GOOD[2], "answer": "Use g = 9.81 m s⁻² here."}]},
        {"questions": [*GOOD[:2], {**GOOD[2], "marks": 7}]},
        {"questions": [*GOOD[:2], {**GOOD[2], "question": "Why?"}]},
    ],
)
async def test_a_draft_that_fails_the_check_is_held(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    bad: dict[str, Any],
) -> None:
    claude.reply(json.dumps(bad))
    assert await draft(client) == [("refused", {"message": UNUSABLE})]


async def test_students_never_draft(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude
) -> None:
    made = await create_class(client)
    await client.patch(f"/classes/{made['id']}", json={"ai_enabled": True})
    async with browser() as student:
        await join(student, made["code"], "Kofi_A")
        assert (await student.post("/ai/question-drafting", json=DRAFT)).status_code == 403
    assert claude.requests == []


async def test_drafting_has_a_daily_limit(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply(json.dumps({"questions": GOOD}))
    for _ in range(20):
        await draft(client)
    assert (await client.post("/ai/question-drafting", json=DRAFT)).status_code == 429


async def test_drafting_is_only_for_experiments_with_facts(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude
) -> None:
    refused = await client.post(
        "/ai/question-drafting", json={**DRAFT, "experiment_id": "ohms-law"}
    )
    assert refused.status_code == 422


# Sending for review, and the teacher's list


async def test_a_teacher_sends_questions_and_follows_them(
    client: AsyncClient, teacher: dict[str, Any]
) -> None:
    sent = await submit(client)
    assert [q["state"] for q in sent] == ["submitted", "submitted"]
    mine = (await client.get("/questions/mine")).json()
    assert {q["id"] for q in mine} == {q["id"] for q in sent}
    # Nothing is in exam mode before review.
    approved = await client.get("/questions/approved", params={"experiment_id": "simple-pendulum"})
    assert approved.json() == []


@pytest.mark.parametrize(
    "bad", [{**GOOD[0], "answer": "It is 9.81 m s⁻²."}, {**GOOD[0], "question": "Why?"}]
)
async def test_an_edited_question_is_checked_too(
    client: AsyncClient, teacher: dict[str, Any], bad: dict[str, Any]
) -> None:
    sent = await client.post(
        "/questions",
        json={"experiment_id": "simple-pendulum", "topic": "precautions", "questions": [bad]},
    )
    assert sent.status_code == 422


async def test_at_most_thirty_wait_at_once(client: AsyncClient, teacher: dict[str, Any]) -> None:
    for _ in range(10):
        await submit(client, GOOD)
    refused = await client.post(
        "/questions",
        json={"experiment_id": "simple-pendulum", "topic": "precautions", "questions": GOOD[:1]},
    )
    assert refused.status_code == 429


async def test_signed_out_and_students_cannot_send(
    client: AsyncClient, teacher: dict[str, Any]
) -> None:
    made = await create_class(client)
    async with browser() as student:
        await join(student, made["code"], "Kofi_A")
        body = {"experiment_id": "simple-pendulum", "topic": "precautions", "questions": GOOD[:1]}
        assert (await student.post("/questions", json=body)).status_code == 403
    async with browser() as nobody:
        assert (await nobody.get("/questions/mine")).status_code == 401


# The review


async def test_staff_approve_with_edits_and_it_joins_exam_mode(
    client: AsyncClient, teacher: dict[str, Any], staff: AsyncClient, db: AsyncSession
) -> None:
    [first, second] = await submit(client)
    waiting = (await staff.get("/admin/questions")).json()
    assert [q["submitted_by"] for q in waiting] == ["teacher@example.org"] * 2

    approved = await staff.post(
        f"/admin/questions/{first['id']}/approve", json={"answer": "It moves fastest there."}
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["reviewed_by"] == STAFF
    rejected = await staff.post(
        f"/admin/questions/{second['id']}/reject", json={"reason": "It repeats a built-in one."}
    )
    assert rejected.json()["state"] == "rejected"
    again = await staff.post(f"/admin/questions/{first['id']}/approve", json={})
    assert again.status_code == 409

    public = await browser().get("/questions/approved", params={"experiment_id": "simple-pendulum"})
    assert [q["answer"] for q in public.json()] == ["It moves fastest there."]
    mine = {q["id"]: q for q in (await client.get("/questions/mine")).json()}
    assert mine[second["id"]]["reason"] == "It repeats a built-in one."

    actions = (await db.scalars(select(AdminAudit.action).order_by(AdminAudit.at))).all()
    assert actions[-2:] == ["question.approve", "question.reject"]
    detail = (await db.scalars(select(AdminAudit.detail))).all()
    assert all("fastest" not in json.dumps(d) and "repeats" not in json.dumps(d) for d in detail)


async def test_undo_puts_a_question_back_to_wait(
    client: AsyncClient, teacher: dict[str, Any], staff: AsyncClient
) -> None:
    [first, _] = await submit(client)
    await staff.post(f"/admin/questions/{first['id']}/approve", json={})
    reopened = await staff.post(f"/admin/questions/{first['id']}/reopen")
    assert reopened.json()["state"] == "submitted"
    assert reopened.json()["reviewed_by"] is None


async def test_an_edit_that_breaks_the_rules_is_refused(
    client: AsyncClient, teacher: dict[str, Any], staff: AsyncClient
) -> None:
    [first, _] = await submit(client)
    refused = await staff.post(
        f"/admin/questions/{first['id']}/approve", json={"answer": "g is 9.81 m s⁻² here."}
    )
    assert refused.status_code == 422


async def test_teachers_cannot_review(client: AsyncClient, teacher: dict[str, Any]) -> None:
    [first, _] = await submit(client)
    # The admin API answers only behind Cloudflare Access (ADR 0040), never to a teacher's cookie.
    tried = await client.post(f"/admin/questions/{first['id']}/approve", json={})
    assert tried.status_code in (401, 403, 503)
    assert (await client.get("/questions/mine")).json()[0]["state"] == "submitted"


async def test_deleting_the_account_takes_unreviewed_questions_only(
    client: AsyncClient, teacher: dict[str, Any], staff: AsyncClient, db: AsyncSession
) -> None:
    [first, second] = await submit(client)
    await staff.post(f"/admin/questions/{first['id']}/approve", json={})
    deleted = await client.post("/account/delete", json={"confirm_email": "teacher@example.org"})
    assert deleted.status_code == 204, deleted.text
    rows = {r.id: r for r in await db.scalars(select(Question))}
    assert uuid.UUID(second["id"]) not in rows
    kept = rows[uuid.UUID(first["id"])]
    assert (kept.state, kept.submitted_by) == ("approved", None)
