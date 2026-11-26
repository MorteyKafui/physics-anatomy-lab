"""Live sockets end to end (ADR 0041): a real server, real handshakes, NOTIFY through PostgreSQL.

These tests commit, so each uses fresh email addresses and deletes its teachers at the end (the
classes, students, sessions and live rows go with them).
"""

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import pytest
import uvicorn
from httpx import AsyncClient
from sqlalchemy import delete
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosed, InvalidStatus

from app.auth.email import LogSender
from app.config import get_settings
from app.db import get_engine, get_sessionmaker
from app.live.hub import Hub, listen_dsn, publish
from app.live.policy import CLOSE_FORBIDDEN, CLOSE_NOT_FOUND, CLOSE_SIGNED_OUT
from app.main import app
from app.models import User
from tests.conftest import ORIGIN
from tests.helpers import create_class, join, sign_in_teacher

ONE = {"rule": "counts-from-one", "key": "pendulum.counts-from-one", "skill": "measurement"}
START = {"experiment_id": "simple-pendulum", "lesson_minutes": 40}
WAIT = 5.0


@dataclass
class Server:
    base: str
    emails: list[str] = field(default_factory=list[str])

    def browser(self) -> AsyncClient:
        return AsyncClient(base_url=f"http://{self.base}", headers={"Origin": ORIGIN})

    def email(self) -> str:
        address = f"t-{uuid.uuid4().hex[:12]}@example.org"
        self.emails.append(address)
        return address

    def socket(self, path: str, client: AsyncClient | None, origin: str | None = ORIGIN) -> Any:
        cookie = "; ".join(f"{k}={v}" for k, v in client.cookies.items()) if client else ""
        return connect(
            f"ws://{self.base}{path}",
            origin=origin,  # pyright: ignore[reportArgumentType]
            additional_headers={"Cookie": cookie} if cookie else None,
            open_timeout=WAIT,
        )


@pytest.fixture
async def server(outbox: LogSender) -> AsyncIterator[Server]:
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
    config = uvicorn.Config(app, host="127.0.0.1", port=0, lifespan="on", log_level="warning")
    running = uvicorn.Server(config)
    task = asyncio.create_task(running.serve())
    while not running.started:  # noqa: ASYNC110 (uvicorn has no started event)
        await asyncio.sleep(0.02)
    port = running.servers[0].sockets[0].getsockname()[1]
    await asyncio.wait_for(app.state.hub.listening.wait(), WAIT)
    here = Server(f"127.0.0.1:{port}")
    try:
        yield here
    finally:
        async with get_sessionmaker()() as db:
            await db.execute(delete(User).where(User.email.in_(here.emails)))
            await db.commit()
        running.should_exit = True
        await task
        get_engine.cache_clear()
        get_sessionmaker.cache_clear()


async def receive(ws: ClientConnection, kind: str) -> dict[str, Any]:
    """The next frame of this type, skipping others."""
    async with asyncio.timeout(WAIT):
        while True:
            frame = json.loads(await ws.recv())
            if frame["type"] == kind:
                return frame


async def nothing_more(ws: ClientConnection, kind: str, wait: float = 0.8) -> None:
    try:
        async with asyncio.timeout(wait):
            while True:
                frame = json.loads(await ws.recv())
                assert frame["type"] != kind, frame
    except TimeoutError:
        return


async def closed_with(ws: ClientConnection) -> int:
    with pytest.raises(ConnectionClosed) as closed:
        async with asyncio.timeout(WAIT):
            while True:
                await ws.recv()
    assert closed.value.rcvd is not None
    return closed.value.rcvd.code


def bench(**changes: Any) -> str:
    frame: dict[str, Any] = {
        "type": "bench",
        "attempt_id": "a-1",
        "experiment_id": "simple-pendulum",
        "step": "measure",
        "completed": ["question", "predict", "build", "check"],
        "mistakes": [],
        "readings": 2,
    }
    frame.update(changes)
    return json.dumps(frame)


async def _classroom(server: Server, outbox: LogSender) -> tuple[AsyncClient, dict[str, Any]]:
    teacher = server.browser()
    await sign_in_teacher(teacher, outbox, server.email())
    made = await create_class(teacher)
    return teacher, made


async def _student(server: Server, code: str, name: str) -> tuple[AsyncClient, str]:
    student = server.browser()
    me = await join(student, code, name)
    return student, me["member_id"]


async def test_a_bench_reaches_the_teacher_and_a_hint_reaches_only_those_with_the_mistake(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    assert (await teacher.post(f"/classes/{made['id']}/live", json=START)).status_code == 200
    kofi, kofi_id = await _student(server, made["code"], "Kofi_A")
    esi, _ = await _student(server, made["code"], "Esi")

    async with (
        server.socket(f"/live/classes/{made['id']}/teacher", teacher) as board,
        server.socket("/live/student", kofi) as kofi_ws,
        server.socket("/live/student", esi) as esi_ws,
    ):
        await kofi_ws.send(json.dumps({"type": "hello", "after": 0}))
        state = await receive(kofi_ws, "state")
        assert state["session"]["experiment_id"] == "simple-pendulum"
        assert "class_id" not in state["session"]
        await esi_ws.send(json.dumps({"type": "hello", "after": 0}))
        await receive(esi_ws, "state")

        await kofi_ws.send(bench(mistakes=[ONE]))
        seen = await receive(board, "bench")
        while seen["bench"]["display_name"] != "Kofi_A" or not seen["bench"]["mistakes"]:
            seen = await receive(board, "bench")
        assert seen["bench"]["mistakes"] == [ONE]
        assert seen["bench"]["step"] == "measure"
        await esi_ws.send(bench())

        sent = await teacher.post(
            f"/classes/{made['id']}/live/hints", json={"rule": ONE["rule"], "key": ONE["key"]}
        )
        assert sent.status_code == 200, sent.text
        assert sent.json()["to_member_ids"] == [kofi_id]

        got = await receive(kofi_ws, "message")
        assert got["message"]["kind"] == "hint"
        assert got["message"]["data"] == {"rule": ONE["rule"], "key": ONE["key"]}
        assert "to_member_ids" not in got["message"]  # students never see who else got it
        await nothing_more(esi_ws, "message")
        on_board = await receive(board, "message")
        assert on_board["message"]["to_member_ids"] == [kofi_id]


async def test_a_student_who_reconnects_catches_up_from_the_database(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    await teacher.post(f"/classes/{made['id']}/live", json=START)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    base = f"/classes/{made['id']}/live"

    async with server.socket("/live/student", kofi) as ws:
        await ws.send(json.dumps({"type": "hello", "after": 0}))
        cursor = (await receive(ws, "state"))["cursor"]
        assert cursor == 0
        await teacher.post(f"{base}/broadcast", json={"text": "First"})
        first = await receive(ws, "message")

    # Offline: two more are sent and one is taken back.
    await teacher.post(f"{base}/broadcast", json={"text": "Second"})
    third = (await teacher.post(f"{base}/broadcast", json={"text": "Third"})).json()
    await teacher.post(f"{base}/messages/{third['id']}/undo")
    await teacher.put(f"{base}/lock", json={"locked": True})

    async with server.socket("/live/student", kofi) as ws:
        await ws.send(json.dumps({"type": "hello", "after": first["message"]["id"]}))
        state = await receive(ws, "state")
        assert state["session"]["steps_locked"] is True
        assert state["cursor"] == third["id"]
        caught = await receive(ws, "message")
        assert caught["message"]["data"] == {"text": "Second"}
        await nothing_more(ws, "message")


async def test_bench_updates_are_throttled_and_the_latest_wins(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    await teacher.post(f"/classes/{made['id']}/live", json=START)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    async with (
        server.socket(f"/live/classes/{made['id']}/teacher", teacher) as board,
        server.socket("/live/student", kofi) as ws,
    ):
        await ws.send(json.dumps({"type": "hello", "after": 0}))
        await receive(board, "bench")  # joining
        for readings in range(1, 6):
            await ws.send(bench(readings=readings))
        first = await receive(board, "bench")
        assert first["bench"]["readings"] == 1
        latest = await receive(board, "bench")  # within the window, merged into one
        assert latest["bench"]["readings"] == 5
        await nothing_more(board, "bench")
    snapshot = (await teacher.get(f"/classes/{made['id']}/live")).json()
    assert snapshot["benches"][0]["readings"] == 5


async def test_ending_the_live_class_reaches_every_socket(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    async with server.socket("/live/student", kofi) as ws:
        await ws.send(json.dumps({"type": "hello", "after": 0}))
        assert (await receive(ws, "state"))["session"] is None
        await teacher.post(f"/classes/{made['id']}/live", json=START)
        started = await receive(ws, "started")
        assert "class_id" not in started["session"]
        await teacher.put(f"/classes/{made['id']}/live/lock", json={"locked": True})
        assert (await receive(ws, "lock"))["locked"] is True
        await teacher.post(f"/classes/{made['id']}/live/end")
        assert (await receive(ws, "ended"))["session"]["ended_at"] is not None


# Who may connect


async def test_a_handshake_from_another_site_is_refused(server: Server, outbox: LogSender) -> None:
    teacher, made = await _classroom(server, outbox)
    for origin in ("https://evil.example", None):
        with pytest.raises(InvalidStatus):
            async with server.socket(f"/live/classes/{made['id']}/teacher", teacher, origin):
                pass
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    with pytest.raises(InvalidStatus):
        async with server.socket("/live/student", kofi, "https://evil.example"):
            pass


async def test_only_the_classs_teacher_can_watch_it(server: Server, outbox: LogSender) -> None:
    teacher, made = await _classroom(server, outbox)
    other, _ = await _classroom(server, outbox)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    path = f"/live/classes/{made['id']}/teacher"
    async with server.socket(path, other) as ws:
        assert await closed_with(ws) == CLOSE_NOT_FOUND
    async with server.socket(path, kofi) as ws:
        assert await closed_with(ws) == CLOSE_FORBIDDEN
    async with server.socket(path, None) as ws:
        assert await closed_with(ws) == CLOSE_SIGNED_OUT
    async with server.socket(f"/live/classes/{uuid.uuid4()}/teacher", teacher) as ws:
        assert await closed_with(ws) == CLOSE_NOT_FOUND


async def test_only_students_use_the_student_socket(server: Server, outbox: LogSender) -> None:
    teacher, _ = await _classroom(server, outbox)
    async with server.socket("/live/student", teacher) as ws:
        assert await closed_with(ws) == CLOSE_FORBIDDEN
    async with server.socket("/live/student", None) as ws:
        assert await closed_with(ws) == CLOSE_SIGNED_OUT


async def test_a_signed_out_student_is_closed_at_the_next_check(
    server: Server, outbox: LogSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    from datetime import timedelta

    from app.routes import live

    monkeypatch.setattr(live, "RECHECK_EVERY", timedelta(milliseconds=300))
    _, made = await _classroom(server, outbox)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    async with server.socket("/live/student", kofi) as ws:
        await kofi.post("/auth/sign-out")
        assert await closed_with(ws) == CLOSE_SIGNED_OUT


# Ending a sign-in closes its sockets at once (ASVS review, finding F), long before the regular
# check, which is minutes away in these tests.


async def test_signing_out_closes_the_students_socket_at_once(
    server: Server, outbox: LogSender
) -> None:
    _, made = await _classroom(server, outbox)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    async with server.socket("/live/student", kofi) as ws:
        await ws.send(json.dumps({"type": "hello", "after": 0}))
        await receive(ws, "state")
        await kofi.post("/auth/sign-out")
        assert await closed_with(ws) == CLOSE_SIGNED_OUT


async def test_a_removed_student_is_closed_at_once_and_the_others_stay(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    kofi, kofi_id = await _student(server, made["code"], "Kofi_A")
    ama, _ = await _student(server, made["code"], "Ama_B")
    async with (
        server.socket("/live/student", kofi) as gone,
        server.socket("/live/student", ama) as stays,
    ):
        for ws in (gone, stays):
            await ws.send(json.dumps({"type": "hello", "after": 0}))
            await receive(ws, "state")
        removed = await teacher.delete(f"/classes/{made['id']}/members/{kofi_id}")
        assert removed.status_code == 204, removed.text
        assert await closed_with(gone) == CLOSE_SIGNED_OUT
        await stays.send(json.dumps({"type": "ping"}))
        await receive(stays, "pong")


async def test_signing_out_closes_the_teachers_board_at_once(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    async with server.socket(f"/live/classes/{made['id']}/teacher", teacher) as ws:
        await ws.send(json.dumps({"type": "ping"}))
        await receive(ws, "pong")
        await teacher.post("/auth/sign-out")
        assert await closed_with(ws) == CLOSE_SIGNED_OUT


async def test_deleting_the_class_closes_every_socket_in_it(
    server: Server, outbox: LogSender
) -> None:
    teacher, made = await _classroom(server, outbox)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    async with (
        server.socket(f"/live/classes/{made['id']}/teacher", teacher) as board,
        server.socket("/live/student", kofi) as bench_ws,
    ):
        await board.send(json.dumps({"type": "ping"}))
        await receive(board, "pong")
        await bench_ws.send(json.dumps({"type": "hello", "after": 0}))
        await receive(bench_ws, "state")
        deleted = await teacher.post(
            f"/classes/{made['id']}/delete", json={"confirm_name": made["name"]}
        )
        assert deleted.status_code == 204, deleted.text
        assert await closed_with(board) == CLOSE_NOT_FOUND
        assert await closed_with(bench_ws) == CLOSE_SIGNED_OUT


async def test_bad_frames_close_the_socket(server: Server, outbox: LogSender) -> None:
    _, made = await _classroom(server, outbox)
    kofi, _ = await _student(server, made["code"], "Kofi_A")
    async with server.socket("/live/student", kofi) as ws:
        await ws.send(json.dumps({"type": "bench", "step": "dancing"}))
        assert await closed_with(ws) == 1007
    async with server.socket("/live/student", kofi) as ws:
        await ws.send("x" * 9000)
        assert await closed_with(ws) == 1009


async def test_two_containers_both_hear_a_message(server: Server) -> None:
    """Two hubs stand for two API containers: one NOTIFY reaches both."""
    from app.live.hub import Subscriber

    class_id = uuid.uuid4()
    hubs = [Hub(listen_dsn(get_settings().database_url)) for _ in range(2)]
    subs = [Subscriber(class_id, "teacher") for _ in hubs]
    try:
        for hub, sub in zip(hubs, subs, strict=True):
            await hub.start()
            await asyncio.wait_for(hub.listening.wait(), WAIT)
            hub.subscribe(sub)
        async with get_sessionmaker()() as db:
            await publish(db, class_id, "teachers", {"type": "pong"})
            await db.commit()
        for sub in subs:
            assert await asyncio.wait_for(sub.queue.get(), WAIT) == {"type": "pong"}
    finally:
        for hub in hubs:
            await hub.stop()


def test_a_kick_reaches_only_the_sockets_it_names() -> None:
    from app.live.hub import Subscriber

    hub = Hub("unused")
    room, other = uuid.uuid4(), uuid.uuid4()
    teacher = Subscriber(room, "teacher", session_id=uuid.uuid4(), user_id=uuid.uuid4())
    kofi = Subscriber(room, "student", uuid.uuid4(), session_id=uuid.uuid4())
    elsewhere = Subscriber(other, "student", uuid.uuid4(), session_id=uuid.uuid4())
    for sub in (teacher, kofi, elsewhere):
        hub.subscribe(sub)

    def kicked() -> list[bool]:
        got = [not s.queue.empty() for s in (teacher, kofi, elsewhere)]
        for s in (teacher, kofi, elsewhere):
            while not s.queue.empty():
                assert s.queue.get_nowait() == {"type": "recheck"}
        return got

    hub.deliver(json.dumps({"k": {"u": [str(teacher.user_id)]}}))
    assert kicked() == [True, False, False]
    hub.deliver(json.dumps({"k": {"s": [str(kofi.session_id)]}}))
    assert kicked() == [False, True, False]
    hub.deliver(json.dumps({"k": {"m": [str(elsewhere.member_id)]}}))
    assert kicked() == [False, False, True]
    hub.deliver(json.dumps({"k": {"c": [str(room)]}}))
    assert kicked() == [True, True, False]
    hub.deliver(json.dumps({"k": {"all": True}}))
    assert kicked() == [True, True, True]
