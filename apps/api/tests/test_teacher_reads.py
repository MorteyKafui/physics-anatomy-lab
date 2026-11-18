"""Teachers read their own classes' work, and nothing else (ADR 0040)."""

import uuid
from typing import Any

from httpx import AsyncClient

from app.auth.email import LogSender
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher
from tests.test_sync import attempt


def ev(n: int, kind: str, data: dict[str, Any], attempt_id: str = "a-1") -> dict[str, Any]:
    return {
        "id": f"{attempt_id}-e{n}",
        "attemptId": attempt_id,
        "seq": n,
        "device": "device-1",
        "at": 1_763_000_000_000 + n,
        "kind": kind,
        "data": data,
    }


HINT_ONE = {"hint": "pendulum.counts-from-one", "rule": "counts-from-one", "skill": "measurement"}
HINT_TOP = {"hint": "pendulum.length-to-top", "rule": "length-to-top", "skill": "apparatus"}


async def _student_work(code: str, name: str, events: list[dict[str, Any]]) -> AsyncClient:
    student = browser()
    await join(student, code, name)
    pushed = await student.post(
        "/sync/push", json={"attempts": [{"attempt": attempt("a-1"), "events": events}]}
    )
    assert pushed.status_code == 200, pushed.text
    return student


async def _class_with_work(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "teacher@example.org")
    made = await create_class(client)
    kofi = await _student_work(
        made["code"],
        "Kofi_A",
        [
            ev(1, "step.go-to", {"step": "build"}),
            ev(2, "coach.hint", {**HINT_ONE, "level": "hint"}),
            ev(3, "step.go-to", {"step": "measure"}),
            ev(4, "coach.note", {**HINT_ONE, "level": "watch"}),
        ],
    )
    ama = await _student_work(
        made["code"],
        "Ama.S",
        [
            ev(1, "step.go-to", {"step": "build"}),
            ev(2, "coach.hint", {**HINT_ONE, "level": "hint"}),
            ev(3, "coach.hint", {**HINT_TOP, "level": "hint"}),
            ev(4, "step.go-to", {"step": "nonsense"}),
        ],
    )
    await kofi.aclose()
    await ama.aclose()
    return made


async def test_a_teacher_sees_each_students_attempt_and_step(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _class_with_work(client, outbox)
    found = await client.get(f"/classes/{made['id']}/attempts")
    assert found.status_code == 200, found.text
    rows = {r["display_name"]: r for r in found.json()}
    assert set(rows) == {"Kofi_A", "Ama.S"}
    assert rows["Kofi_A"]["step"] == "measure"
    assert rows["Ama.S"]["step"] == "build"  # an unknown step is not a step
    assert rows["Kofi_A"]["events"] == 4
    assert rows["Kofi_A"]["client_id"] == "a-1"

    only = await client.get(f"/classes/{made['id']}/attempts", params={"experiment_id": "ohms-law"})
    assert only.json() == []


async def test_a_teacher_reads_an_attempts_events_a_page_at_a_time(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _class_with_work(client, outbox)
    first = (await client.get(f"/classes/{made['id']}/attempts")).json()[0]
    page = await client.get(f"/classes/{made['id']}/attempts/{first['id']}/events")
    assert page.status_code == 200, page.text
    body = page.json()
    assert [e["seq"] for e in body["events"]] == [1, 2, 3, 4]
    assert body["events"][0]["attemptId"] == "a-1"
    assert body["more"] is False
    after = await client.get(
        f"/classes/{made['id']}/attempts/{first['id']}/events", params={"after": body["cursor"]}
    )
    assert after.json()["events"] == []


async def test_mistakes_are_counted_by_student(client: AsyncClient, outbox: LogSender) -> None:
    made = await _class_with_work(client, outbox)
    found = (await client.get(f"/classes/{made['id']}/mistakes")).json()
    assert found[0] == {
        "rule": "counts-from-one",
        "key": "pendulum.counts-from-one",
        "skill": "measurement",
        "students": 2,
        "times": 3,
    }
    assert found[1]["rule"] == "length-to-top" and found[1]["students"] == 1


async def test_progress_counts_students_by_step(client: AsyncClient, outbox: LogSender) -> None:
    made = await _class_with_work(client, outbox)
    found = await client.get(
        f"/classes/{made['id']}/progress", params={"experiment_id": "simple-pendulum"}
    )
    assert found.status_code == 200, found.text
    assert {r["step"]: r["students"] for r in found.json()} == {"measure": 1, "build": 1}


# Access: only the class's own teacher (IDOR)


async def test_another_teacher_reads_nothing_of_the_class(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _class_with_work(client, outbox)
    attempt_id = (await client.get(f"/classes/{made['id']}/attempts")).json()[0]["id"]

    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        theirs = await create_class(other, "Their class")
        for path in (
            f"/classes/{made['id']}/attempts",
            f"/classes/{made['id']}/attempts/{attempt_id}/events",
            f"/classes/{made['id']}/mistakes",
            f"/classes/{made['id']}/progress?experiment_id=simple-pendulum",
        ):
            assert (await other.get(path)).status_code == 404, path
        # Their own class id with someone else's attempt id finds nothing either.
        crossed = await other.get(f"/classes/{theirs['id']}/attempts/{attempt_id}/events")
        assert crossed.status_code == 404
        assert (await other.get(f"/classes/{theirs['id']}/attempts")).json() == []
        assert (await other.get(f"/classes/{theirs['id']}/mistakes")).json() == []


async def test_students_and_signed_out_visitors_read_nothing(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _class_with_work(client, outbox)
    async with browser() as student:
        await join(student, made["code"], "Esi")
        assert (await student.get(f"/classes/{made['id']}/attempts")).status_code == 403
        assert (await student.get(f"/classes/{made['id']}/mistakes")).status_code == 403
    async with browser() as nobody:
        assert (await nobody.get(f"/classes/{made['id']}/attempts")).status_code == 401


async def test_a_teachers_own_attempts_are_not_class_work(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _class_with_work(client, outbox)
    pushed = await client.post(
        "/sync/push",
        json={
            "attempts": [
                {
                    "attempt": attempt("t-1"),
                    "events": [ev(1, "step.go-to", {"step": "plot"}, "t-1")],
                }
            ]
        },
    )
    assert pushed.status_code == 200
    names = {
        r["display_name"] for r in (await client.get(f"/classes/{made['id']}/attempts")).json()
    }
    assert names == {"Kofi_A", "Ama.S"}


async def test_an_unknown_attempt_is_not_found(client: AsyncClient, outbox: LogSender) -> None:
    made = await _class_with_work(client, outbox)
    missing = await client.get(f"/classes/{made['id']}/attempts/{uuid.uuid4()}/events")
    assert missing.status_code == 404
    bad = await client.get(f"/classes/{made['id']}/attempts/{uuid.uuid4()}/events?after=x")
    assert bad.status_code == 404  # the attempt is checked before the cursor
