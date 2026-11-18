"""Live classes over HTTP (ADR 0040): starting, the board's snapshot and the teacher's commands.

The sockets are tested in test_live_socket.py; here benches are written straight to the table.
"""

import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import LogSender
from app.models import LiveSession
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher

START = {"experiment_id": "simple-pendulum", "lesson_minutes": 40}
ONE = {"rule": "counts-from-one", "key": "pendulum.counts-from-one", "skill": "measurement"}


async def _live_class(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "teacher@example.org")
    made = await create_class(client)
    started = await client.post(f"/classes/{made['id']}/live", json=START)
    assert started.status_code == 200, started.text
    return {**made, "session": started.json()}


async def _bench(
    db: AsyncSession, session_id: str, member_id: str, mistakes: list[dict[str, str]]
) -> None:
    await db.execute(
        text("""
            INSERT INTO live_benches (session_id, member_id, step, completed, mistakes)
            VALUES (:s, :m, 'measure', ARRAY['question', 'predict', 'build', 'check'],
                    CAST(:mistakes AS jsonb))
        """),
        {"s": session_id, "m": member_id, "mistakes": json.dumps(mistakes)},
    )


async def _student(code: str, name: str) -> str:
    async with browser() as s:
        return (await join(s, code, name))["member_id"]


async def test_starting_twice_gives_the_same_live_class(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _live_class(client, outbox)
    again = await client.post(f"/classes/{made['id']}/live", json=START)
    assert again.json()["id"] == made["session"]["id"]
    assert made["session"]["steps_locked"] is False
    assert made["session"]["lesson_minutes"] == 40


async def test_the_snapshot_shows_benches_and_who_is_here(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _live_class(client, outbox)
    kofi = await _student(made["code"], "Kofi_A")
    ama = await _student(made["code"], "Ama.S")
    await _bench(db, made["session"]["id"], kofi, [ONE])
    await _bench(db, made["session"]["id"], ama, [])
    await db.execute(
        text(
            "UPDATE live_benches SET last_seen_at = now() - interval '5 minutes' "
            "WHERE member_id = :m"
        ),
        {"m": ama},
    )
    snap = (await client.get(f"/classes/{made['id']}/live")).json()
    assert snap["members"] == 2
    benches = {b["display_name"]: b for b in snap["benches"]}
    assert benches["Kofi_A"]["here"] is True
    assert benches["Ama.S"]["here"] is False
    assert benches["Kofi_A"]["mistakes"] == [ONE]
    assert benches["Kofi_A"]["step"] == "measure"


async def test_a_hint_goes_to_everyone_with_that_mistake_only(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _live_class(client, outbox)
    kofi = await _student(made["code"], "Kofi_A")
    ama = await _student(made["code"], "Ama.S")
    esi = await _student(made["code"], "Esi")
    sid = made["session"]["id"]
    await _bench(db, sid, kofi, [ONE])
    await _bench(db, sid, ama, [ONE, {**ONE, "rule": "length-to-top", "key": "k"}])
    await _bench(db, sid, esi, [])

    sent = await client.post(
        f"/classes/{made['id']}/live/hints", json={"rule": ONE["rule"], "key": ONE["key"]}
    )
    assert sent.status_code == 200, sent.text
    hint = sent.json()
    assert hint["kind"] == "hint"
    assert sorted(hint["to_member_ids"]) == sorted([kofi, ama])
    assert hint["data"] == {"rule": ONE["rule"], "key": ONE["key"]}

    # Pushing again returns the same hint, so a double click sends one.
    again = await client.post(
        f"/classes/{made['id']}/live/hints", json={"rule": ONE["rule"], "key": ONE["key"]}
    )
    assert again.json()["id"] == hint["id"]

    nobody = await client.post(
        f"/classes/{made['id']}/live/hints", json={"rule": "swing-too-big", "key": "k"}
    )
    assert nobody.status_code == 409


async def test_undo_takes_a_hint_back_and_it_can_be_pushed_again(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _live_class(client, outbox)
    kofi = await _student(made["code"], "Kofi_A")
    await _bench(db, made["session"]["id"], kofi, [ONE])
    hint = (
        await client.post(
            f"/classes/{made['id']}/live/hints", json={"rule": ONE["rule"], "key": ONE["key"]}
        )
    ).json()
    undone = await client.post(f"/classes/{made['id']}/live/messages/{hint['id']}/undo")
    assert undone.status_code == 200 and undone.json()["undone_at"] is not None
    twice = await client.post(f"/classes/{made['id']}/live/messages/{hint['id']}/undo")
    assert twice.json()["undone_at"] == undone.json()["undone_at"]
    fresh = await client.post(
        f"/classes/{made['id']}/live/hints", json={"rule": ONE["rule"], "key": ONE["key"]}
    )
    assert fresh.json()["id"] != hint["id"]


async def test_lock_broadcast_note_and_end(client: AsyncClient, outbox: LogSender) -> None:
    made = await _live_class(client, outbox)
    kofi = await _student(made["code"], "Kofi_A")
    base = f"/classes/{made['id']}/live"

    locked = await client.put(f"{base}/lock", json={"locked": True})
    assert locked.json()["steps_locked"] is True

    said = await client.post(
        f"{base}/broadcast", json={"text": "  Everyone measure   the length now. "}
    )
    assert said.status_code == 200, said.text
    assert said.json()["data"] == {"text": "Everyone measure the length now."}
    assert said.json()["to_member_ids"] is None
    assert (await client.post(f"{base}/broadcast", json={"text": "x" * 281})).status_code == 422

    note = await client.post(f"{base}/notes", json={"member_id": kofi, "text": "Well done."})
    assert note.json()["to_member_ids"] == [kofi]

    snap = (await client.get(base)).json()
    assert [m["kind"] for m in snap["messages"]] == ["broadcast", "note"]

    ended = await client.post(f"{base}/end")
    assert ended.json()["ended_at"] is not None
    assert (await client.get(base)).json()["session"] is None
    for path, body in (("/lock", {"locked": False}), ("/broadcast", {"text": "Hi"})):
        method = client.put if path == "/lock" else client.post
        assert (await method(base + path, json=body)).status_code == 409
    assert (await client.post(f"{base}/end")).status_code == 409


async def test_a_note_only_reaches_a_student_of_this_class(
    client: AsyncClient, outbox: LogSender
) -> None:
    made = await _live_class(client, outbox)
    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        theirs = await create_class(other, "Their class")
        stranger = await _student(theirs["code"], "Yaw7")
    sent = await client.post(
        f"/classes/{made['id']}/live/notes", json={"member_id": stranger, "text": "Hello"}
    )
    assert sent.status_code == 404


async def test_another_teacher_cannot_watch_or_command_the_class(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _live_class(client, outbox)
    kofi = await _student(made["code"], "Kofi_A")
    await _bench(db, made["session"]["id"], kofi, [ONE])
    hint = (
        await client.post(
            f"/classes/{made['id']}/live/hints", json={"rule": ONE["rule"], "key": ONE["key"]}
        )
    ).json()
    base = f"/classes/{made['id']}/live"
    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        theirs = await create_class(other, "Their class")
        assert (await other.get(base)).status_code == 404
        assert (await other.post(base, json=START)).status_code == 404
        assert (await other.post(f"{base}/end")).status_code == 404
        assert (await other.put(f"{base}/lock", json={"locked": True})).status_code == 404
        assert (
            await other.post(f"{base}/hints", json={"rule": ONE["rule"], "key": "k"})
        ).status_code == 404
        assert (await other.post(f"{base}/broadcast", json={"text": "Hi"})).status_code == 404
        assert (
            await other.post(f"{base}/notes", json={"member_id": kofi, "text": "Hi"})
        ).status_code == 404
        assert (await other.post(f"{base}/messages/{hint['id']}/undo")).status_code == 404
        # Their own live class cannot reach this class's message by id.
        await other.post(f"/classes/{theirs['id']}/live", json=START)
        crossed = await other.post(f"/classes/{theirs['id']}/live/messages/{hint['id']}/undo")
        assert crossed.status_code == 404
    async with browser() as student:
        await join(student, made["code"], "Esi")
        assert (await student.get(base)).status_code == 403
        assert (await student.post(f"{base}/broadcast", json={"text": "Hi"})).status_code == 403
    still = await db.scalar(
        select(LiveSession.ended_at).where(LiveSession.id == uuid.UUID(made["session"]["id"]))
    )
    assert still is None


async def test_teacher_commands_are_rate_limited(client: AsyncClient, outbox: LogSender) -> None:
    made = await _live_class(client, outbox)
    base = f"/classes/{made['id']}/live"
    codes = [
        (await client.put(f"{base}/lock", json={"locked": i % 2 == 0})).status_code
        for i in range(61)
    ]
    assert codes[:60] == [200] * 60
    assert codes[60] == 429


async def test_sessions_ended_30_days_ago_are_removed_on_the_next_start(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _live_class(client, outbox)
    await client.post(f"/classes/{made['id']}/live/end")
    old = datetime.now(UTC) - timedelta(days=31)
    await db.execute(
        update(LiveSession)
        .where(LiveSession.id == uuid.UUID(made["session"]["id"]))
        .values(started_at=old - timedelta(hours=1), ended_at=old)
    )
    await client.post(f"/classes/{made['id']}/live", json=START)
    gone = await db.scalar(
        select(LiveSession.id).where(LiveSession.id == uuid.UUID(made["session"]["id"]))
    )
    assert gone is None
