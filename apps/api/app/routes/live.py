"""Live classes (ADR 0041): the teacher's commands over HTTP, and a WebSocket per open board.

- Teachers start, lock, push hints, broadcast, send notes and undo over HTTP, so every command is
  a normal request with the Origin guard, a rate limit and one transaction. Each command is stored
  and announced with NOTIFY in that transaction (`app.live.hub`).
- The teacher's socket only listens. The student's socket sends a throttled bench summary and a
  heartbeat, and receives what the teacher sends. A student who reconnects says which message they
  saw last and gets the rest from the database.
- The lab never waits on any of this (AGENTS.md rule 5): the device sends when it can and the
  attempt itself still syncs through /sync.
"""

import asyncio
import contextlib
import json
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, WebSocket, status
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import any_, delete, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocketDisconnect, WebSocketState

from app.auth import rate_limit
from app.auth.sessions import CurrentTeacher, Student, Teacher, load_principal
from app.config import get_settings
from app.db import Db, get_sessionmaker
from app.live.hub import Hub, Message, Subscriber, publish
from app.live.policy import (
    BENCH_EVERY,
    CATCH_UP_LIMIT,
    CLOSE_FORBIDDEN,
    CLOSE_NOT_FOUND,
    CLOSE_SIGNED_OUT,
    CLOSE_TOO_FAST,
    CLOSE_TOO_SLOW,
    FRAME_WINDOW,
    FRAMES_PER_WINDOW,
    HERE_WINDOW,
    KEEP_ENDED_SESSIONS,
    LIVE_COMMANDS_PER_TEACHER,
    MAX_FRAME_BYTES,
    RECHECK_EVERY,
    SEEN_EVERY,
)
from app.live.schemas import (
    BenchFrame,
    BenchOut,
    BroadcastSend,
    HelloFrame,
    HintPush,
    LiveMessageOut,
    LiveSessionOut,
    LiveSnapshot,
    LiveStart,
    LockSet,
    Mistake,
    NoteSend,
    PingFrame,
    StudentFrame,
    is_known_mistake,
)
from app.models import ClassMember, LiveBench, LiveMessage, LiveSession, SchoolClass
from app.routes.classes import NOT_FOUND, Responses, owned_class

log = structlog.get_logger()

router = APIRouter(prefix="/classes", tags=["live"])
socket_router = APIRouter(prefix="/live")

NO_LIVE: Responses = {
    404: {"description": "No such class of yours"},
    409: {"description": "No live class is running"},
}


def session_out(row: LiveSession) -> LiveSessionOut:
    return LiveSessionOut(
        id=row.id,
        class_id=row.class_id,
        experiment_id=row.experiment_id,
        lesson_minutes=row.lesson_minutes,
        steps_locked=row.steps_locked,
        started_at=row.started_at,
        ended_at=row.ended_at,
    )


def message_out(row: LiveMessage) -> LiveMessageOut:
    return LiveMessageOut(
        id=row.id,
        kind=row.kind,  # pyright: ignore[reportArgumentType] (checked by the table)
        data=row.data,
        to_member_ids=row.to_member_ids,
        created_at=row.created_at,
        undone_at=row.undone_at,
    )


def bench_out(row: LiveBench, display_name: str, now: datetime) -> BenchOut:
    return BenchOut(
        member_id=row.member_id,
        display_name=display_name,
        attempt_id=row.attempt_id,
        step=row.step,  # pyright: ignore[reportArgumentType] (checked by the table)
        completed=row.completed,  # pyright: ignore[reportArgumentType]
        # Stored before the API checked mistakes (finding H): left out, never a failed board.
        mistakes=[Mistake.model_validate(m) for m in row.mistakes if is_known_mistake(m)],
        readings=row.readings,
        joined_at=row.joined_at,
        updated_at=row.updated_at,
        last_seen_at=row.last_seen_at,
        measured_at=row.measured_at,
        here=now - row.last_seen_at <= HERE_WINDOW,
    )


async def _open_session(db: AsyncSession, class_id: uuid.UUID) -> LiveSession | None:
    return await db.scalar(
        select(LiveSession).where(LiveSession.class_id == class_id, LiveSession.ended_at.is_(None))
    )


async def _require_open(db: AsyncSession, class_id: uuid.UUID) -> LiveSession:
    row = await _open_session(db, class_id)
    if row is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="No live class is running. Start one first."
        )
    return row


async def _command(db: AsyncSession, teacher: Teacher) -> None:
    await rate_limit.take(db, LIVE_COMMANDS_PER_TEACHER, str(teacher.user.id))


async def _send(
    db: AsyncSession,
    session: LiveSession,
    teacher: Teacher,
    kind: str,
    data: dict[str, Any],
    to: list[uuid.UUID] | None,
) -> LiveMessageOut:
    row = LiveMessage(
        session_id=session.id, kind=kind, data=data, to_member_ids=to, sent_by=teacher.user.id
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)
    out = message_out(row)
    # The recipients ride once, in the envelope; the hub gives them back to teachers only.
    frame = out.model_dump(mode="json", exclude={"to_member_ids"})
    await publish(db, session.class_id, "all", {"type": "message", "message": frame}, to)
    log.info(
        "live.sent",
        kind=kind,
        session_id=str(session.id),
        user_id=str(teacher.user.id),
        recipients=-1 if to is None else len(to),
    )
    return out


async def purge_ended_sessions(db: AsyncSession, now: datetime) -> None:
    """Remove live sessions (and with them benches and messages) 30 days after they ended.
    Run when a session starts until the job queue exists (ADR 0041)."""
    await db.execute(delete(LiveSession).where(LiveSession.ended_at < now - KEEP_ENDED_SESSIONS))


# Teacher commands


@router.post("/{class_id}/live", responses=NOT_FOUND)
async def start_live(
    class_id: uuid.UUID, body: LiveStart, teacher: CurrentTeacher, db: Db
) -> LiveSessionOut:
    """Start a live class, or return the one already running (so a double click starts one)."""
    school_class = await owned_class(db, teacher, class_id)
    existing = await _open_session(db, school_class.id)
    if existing is not None:
        return session_out(existing)
    now = datetime.now(UTC)
    await purge_ended_sessions(db, now)
    row = LiveSession(
        class_id=school_class.id,
        started_by=teacher.user.id,
        experiment_id=body.experiment_id,
        lesson_minutes=body.lesson_minutes,
    )
    try:
        async with db.begin_nested():
            db.add(row)
    except IntegrityError:
        # Another tab started it a moment ago.
        return session_out(await _require_open(db, school_class.id))
    await db.refresh(row)
    out = session_out(row)
    await publish(
        db, school_class.id, "all", {"type": "started", "session": out.model_dump(mode="json")}
    )
    log.info("live.started", session_id=str(row.id), user_id=str(teacher.user.id))
    return out


@router.get("/{class_id}/live", responses=NOT_FOUND)
async def get_live(class_id: uuid.UUID, teacher: CurrentTeacher, db: Db) -> LiveSnapshot:
    """The live board: the running session, every bench in it, and what has been sent."""
    school_class = await owned_class(db, teacher, class_id)
    now = datetime.now(UTC)
    members = await db.scalar(
        select(func.count()).select_from(ClassMember).where(ClassMember.class_id == school_class.id)
    )
    session = await _open_session(db, school_class.id)
    if session is None:
        return LiveSnapshot(
            session=None, members=members or 0, benches=[], messages=[], server_time=now
        )
    benches = await db.execute(
        select(LiveBench, ClassMember.display_name)
        .join(ClassMember, ClassMember.id == LiveBench.member_id)
        .where(LiveBench.session_id == session.id)
        .order_by(ClassMember.display_name)
    )
    messages = await db.scalars(
        select(LiveMessage)
        .where(LiveMessage.session_id == session.id)
        .order_by(LiveMessage.id.desc())
        .limit(CATCH_UP_LIMIT)
    )
    return LiveSnapshot(
        session=session_out(session),
        members=members or 0,
        benches=[bench_out(b, name, now) for b, name in benches],
        messages=[message_out(m) for m in reversed(list(messages))],
        server_time=now,
    )


@router.post("/{class_id}/live/end", responses=NO_LIVE)
async def end_live(class_id: uuid.UUID, teacher: CurrentTeacher, db: Db) -> LiveSessionOut:
    school_class = await owned_class(db, teacher, class_id)
    row = await _require_open(db, school_class.id)
    row.ended_at = datetime.now(UTC)
    await db.flush()
    out = session_out(row)
    await publish(
        db, school_class.id, "all", {"type": "ended", "session": out.model_dump(mode="json")}
    )
    log.info("live.ended", session_id=str(row.id), user_id=str(teacher.user.id))
    return out


@router.put("/{class_id}/live/lock", responses=NO_LIVE)
async def set_live_lock(
    class_id: uuid.UUID, body: LockSet, teacher: CurrentTeacher, db: Db
) -> LiveSessionOut:
    """Lock steps: students stay on the step they are on until the teacher unlocks."""
    school_class = await owned_class(db, teacher, class_id)
    await _command(db, teacher)
    row = await _require_open(db, school_class.id)
    if row.steps_locked != body.locked:
        row.steps_locked = body.locked
        await db.flush()
        await publish(db, school_class.id, "all", {"type": "lock", "locked": body.locked})
        log.info("live.locked", session_id=str(row.id), locked=body.locked)
    return session_out(row)


@router.post("/{class_id}/live/hints", responses=NO_LIVE)
async def push_hint(
    class_id: uuid.UUID, body: HintPush, teacher: CurrentTeacher, db: Db
) -> LiveMessageOut:
    """Send one hint to every student whose bench shows this mistake now. Pushing the same
    mistake again reaches only those the standing hints have not; if there are none, it returns
    the latest hint, so a double click sends one."""
    school_class = await owned_class(db, teacher, class_id)
    await _command(db, teacher)
    session = await _require_open(db, school_class.id)
    earlier = list(
        await db.scalars(
            select(LiveMessage)
            .where(
                LiveMessage.session_id == session.id,
                LiveMessage.kind == "hint",
                LiveMessage.undone_at.is_(None),
                LiveMessage.data["rule"].astext == body.rule,
            )
            .order_by(LiveMessage.id)
        )
    )
    reached = {m for hint in earlier for m in hint.to_member_ids or []}
    recipients = list(
        await db.scalars(
            select(LiveBench.member_id)
            .where(
                LiveBench.session_id == session.id,
                LiveBench.mistakes.contains([{"rule": body.rule}]),
            )
            .order_by(LiveBench.member_id)
        )
    )
    recipients = [m for m in recipients if m not in reached]
    if not recipients:
        if earlier:
            return message_out(earlier[-1])
        raise HTTPException(status.HTTP_409_CONFLICT, detail="No one has this mistake now.")
    return await _send(
        db, session, teacher, "hint", {"rule": body.rule, "key": body.key}, recipients
    )


@router.post("/{class_id}/live/broadcast", responses=NO_LIVE)
async def broadcast(
    class_id: uuid.UUID, body: BroadcastSend, teacher: CurrentTeacher, db: Db
) -> LiveMessageOut:
    """An instruction to every student in the class, such as "everyone measure the wire"."""
    school_class = await owned_class(db, teacher, class_id)
    await _command(db, teacher)
    session = await _require_open(db, school_class.id)
    return await _send(db, session, teacher, "broadcast", {"text": body.text}, None)


@router.post("/{class_id}/live/notes", responses=NO_LIVE)
async def send_note(
    class_id: uuid.UUID, body: NoteSend, teacher: CurrentTeacher, db: Db
) -> LiveMessageOut:
    """A note to one student in the class."""
    school_class = await owned_class(db, teacher, class_id)
    await _command(db, teacher)
    member = await db.scalar(
        select(ClassMember.id).where(
            ClassMember.id == body.member_id, ClassMember.class_id == school_class.id
        )
    )
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")
    session = await _require_open(db, school_class.id)
    return await _send(db, session, teacher, "note", {"text": body.text}, [member])


@router.post("/{class_id}/live/messages/{message_id}/undo", responses=NO_LIVE)
async def undo_message(
    class_id: uuid.UUID, message_id: int, teacher: CurrentTeacher, db: Db
) -> LiveMessageOut:
    """Take back a hint, broadcast or note. Devices hide it if it is still showing."""
    school_class = await owned_class(db, teacher, class_id)
    await _command(db, teacher)
    session = await _require_open(db, school_class.id)
    row = await db.scalar(
        select(LiveMessage).where(
            LiveMessage.id == message_id, LiveMessage.session_id == session.id
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Message not found.")
    if row.undone_at is None:
        row.undone_at = datetime.now(UTC)
        await db.flush()
        await publish(
            db, school_class.id, "all", {"type": "undone", "id": row.id}, row.to_member_ids
        )
    return message_out(row)


# Sockets


def _hub(websocket: WebSocket) -> Hub:
    return websocket.app.state.hub


def _origin_ok(websocket: WebSocket) -> bool:
    """Browsers always send Origin on a WebSocket handshake, and the cookie rides along from any
    site, so the handshake must come from the web app (cross-site WebSocket hijacking)."""
    return websocket.headers.get("origin") == get_settings().web_origin


class _Frames:
    """Closes a socket that sends too many frames in a window."""

    def __init__(self) -> None:
        self.window_start = time.monotonic()
        self.count = 0

    def allow(self) -> bool:
        now = time.monotonic()
        if now - self.window_start >= FRAME_WINDOW.total_seconds():
            self.window_start, self.count = now, 0
        self.count += 1
        return self.count <= FRAMES_PER_WINDOW


async def _receive_text(websocket: WebSocket, frames: _Frames) -> str | None:
    """The next text frame, or None after closing the socket for a bad one."""
    message = await websocket.receive()
    if message["type"] == "websocket.disconnect":
        raise WebSocketDisconnect(message.get("code", 1000))
    raw = message.get("text")
    if raw is None:
        await websocket.close(1003)  # only text frames
        return None
    if len(raw.encode("utf-8")) > MAX_FRAME_BYTES:
        await websocket.close(1009)
        return None
    if not frames.allow():
        await websocket.close(CLOSE_TOO_FAST)
        return None
    return raw


async def _why_closed(
    websocket: WebSocket, expect: Teacher | Student, class_id: uuid.UUID
) -> int | None:
    """None while the socket's sign-in is still good and its class still theirs; otherwise the
    code to close it with."""
    async with get_sessionmaker()() as db:
        principal = await load_principal(db, websocket)
        owns = None
        if isinstance(expect, Teacher) and isinstance(principal, Teacher):
            owns = await db.scalar(
                select(SchoolClass.id).where(
                    SchoolClass.id == class_id, SchoolClass.teacher_id == principal.user.id
                )
            )
        await db.commit()
    if isinstance(expect, Teacher):
        if not (isinstance(principal, Teacher) and principal.user.id == expect.user.id):
            return CLOSE_SIGNED_OUT
        return None if owns is not None else CLOSE_NOT_FOUND
    if isinstance(principal, Student) and principal.member.id == expect.member.id:
        return None
    return CLOSE_SIGNED_OUT


def _for_student(message: Message) -> Message:
    """Students never see who else a message went to."""
    if message.get("type") == "message":
        inner = dict(message["message"])
        inner.pop("to_member_ids", None)
        return {"type": "message", "message": inner}
    if message.get("type") in ("started", "ended"):
        session = dict(message["session"])
        session.pop("class_id", None)
        return {"type": message["type"], "session": session}
    return message


async def _writer(websocket: WebSocket, sub: Subscriber, expect: Teacher | Student) -> None:
    next_check = time.monotonic() + RECHECK_EVERY.total_seconds()
    while True:
        try:
            message = await asyncio.wait_for(
                sub.queue.get(), timeout=max(0.0, next_check - time.monotonic())
            )
        except TimeoutError:
            message = {"type": "recheck"}
        if message.get("type") == "recheck":  # the regular check, or a kick (app/live/hub.py)
            code = await _why_closed(websocket, expect, sub.class_id)
            if code is not None:
                await websocket.close(code)
                return
            next_check = time.monotonic() + RECHECK_EVERY.total_seconds()
            continue
        if message.get("type") == "overflow":
            await websocket.close(CLOSE_TOO_SLOW)
            return
        await websocket.send_json(_for_student(message) if sub.role == "student" else message)


async def _run(websocket: WebSocket, *tasks: Any) -> None:
    """Run the socket's reader and writer until either stops, then stop the other."""
    running = [asyncio.create_task(t) for t in tasks]
    try:
        done, _ = await asyncio.wait(running, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            error = task.exception()
            if error is not None and not isinstance(error, WebSocketDisconnect):
                raise error
    finally:
        for task in running:
            task.cancel()
        for task in running:
            with contextlib.suppress(asyncio.CancelledError, WebSocketDisconnect, Exception):
                await task
        if websocket.application_state == WebSocketState.CONNECTED:
            with contextlib.suppress(Exception):
                await websocket.close()


@socket_router.websocket("/classes/{class_id}/teacher")
async def teacher_socket(websocket: WebSocket, class_id: uuid.UUID) -> None:
    """The teacher's live board listens here. Changes arrive as frames; the board reads the
    snapshot (GET /classes/{id}/live) first, and again whenever it gets `resync`."""
    if not _origin_ok(websocket):
        await websocket.close(CLOSE_FORBIDDEN)  # before accepting: the handshake fails
        return
    async with get_sessionmaker()() as db:
        principal = await load_principal(db, websocket)
        owns = None
        if isinstance(principal, Teacher):
            owns = await db.scalar(
                select(SchoolClass.id).where(
                    SchoolClass.id == class_id, SchoolClass.teacher_id == principal.user.id
                )
            )
        await db.commit()
    await websocket.accept()
    if not isinstance(principal, Teacher):
        await websocket.close(CLOSE_SIGNED_OUT if principal is None else CLOSE_FORBIDDEN)
        return
    if owns is None:
        await websocket.close(CLOSE_NOT_FOUND)
        return

    sub = Subscriber(
        class_id, "teacher", session_id=principal.session_id, user_id=principal.user.id
    )
    hub = _hub(websocket)
    hub.subscribe(sub)
    log.info("live.connected", role="teacher", user_id=str(principal.user.id))

    async def reader() -> None:
        frames = _Frames()
        while True:
            raw = await _receive_text(websocket, frames)
            if raw is None:
                return
            with contextlib.suppress(ValidationError):
                PingFrame.model_validate_json(raw)
                sub.offer({"type": "pong"})

    try:
        await _run(websocket, reader(), _writer(websocket, sub, principal))
    finally:
        hub.unsubscribe(sub)
        log.info("live.disconnected", role="teacher", user_id=str(principal.user.id))


_student_frame: TypeAdapter[HelloFrame | BenchFrame | PingFrame] = TypeAdapter(StudentFrame)


class _Bench:
    """One student's socket: their throttled bench writes and heartbeats."""

    def __init__(self, websocket: WebSocket, sub: Subscriber, student: Student) -> None:
        self.websocket = websocket
        self.sub = sub
        self.student = student
        self.class_id = student.school_class.id
        self.member_id = student.member.id
        self.last_write = 0.0
        self.last_seen = 0.0
        self.pending: BenchFrame | None = None
        self.flush: asyncio.Task[None] | None = None

    async def hello(self, frame: HelloFrame) -> None:
        """The session's state, then the messages for this student after `after`."""
        async with get_sessionmaker()() as db:
            session = await _open_session(db, self.class_id)
            messages: list[LiveMessage] = []
            cursor = frame.after
            if session is not None:
                rows = await db.scalars(
                    select(LiveMessage)
                    .where(
                        LiveMessage.session_id == session.id,
                        LiveMessage.id > frame.after,
                        LiveMessage.undone_at.is_(None),
                        (LiveMessage.to_member_ids.is_(None))
                        | (any_(LiveMessage.to_member_ids) == self.member_id),
                    )
                    .order_by(LiveMessage.id.desc())
                    .limit(CATCH_UP_LIMIT)
                )
                messages = list(reversed(list(rows)))
                latest = await db.scalar(
                    select(func.max(LiveMessage.id)).where(LiveMessage.session_id == session.id)
                )
                cursor = max(frame.after, latest or 0)
                await self._seen(db, session.id, joining=True)
            await db.commit()
        state: Message = {"type": "state", "session": None, "cursor": cursor}
        if session is not None:
            out = session_out(session).model_dump(mode="json")
            out.pop("class_id", None)
            state["session"] = out
        self.sub.offer(state)
        for m in messages:
            self.sub.offer({"type": "message", "message": message_out(m).model_dump(mode="json")})

    async def _seen(self, db: AsyncSession, session_id: uuid.UUID, *, joining: bool) -> None:
        """Mark the student here: a bench row on joining, a fresher last_seen_at otherwise."""
        self.last_seen = time.monotonic()
        if joining:
            inserted = await db.scalar(
                text("""
                    INSERT INTO live_benches (session_id, member_id) VALUES (:s, :m)
                    ON CONFLICT (session_id, member_id) DO UPDATE SET last_seen_at = now()
                    RETURNING (xmax = 0) AS inserted
                """),
                {"s": session_id, "m": self.member_id},
            )
            bench = await db.scalar(
                select(LiveBench).where(
                    LiveBench.session_id == session_id, LiveBench.member_id == self.member_id
                )
            )
            assert bench is not None
            out = bench_out(bench, self.student.member.display_name, datetime.now(UTC))
            if inserted:
                await publish(
                    db,
                    self.class_id,
                    "teachers",
                    {"type": "bench", "bench": out.model_dump(mode="json")},
                )
            else:
                await self._presence(db, True)
        else:
            await db.execute(
                update(LiveBench)
                .where(LiveBench.session_id == session_id, LiveBench.member_id == self.member_id)
                .values(last_seen_at=func.now())
            )

    async def _presence(self, db: AsyncSession, here: bool) -> None:
        await publish(
            db,
            self.class_id,
            "teachers",
            {"type": "presence", "member_id": str(self.member_id), "here": here},
        )

    async def ping(self) -> None:
        self.sub.offer({"type": "pong"})
        if time.monotonic() - self.last_seen < SEEN_EVERY.total_seconds():
            return
        async with get_sessionmaker()() as db:
            session = await _open_session(db, self.class_id)
            if session is not None:
                await self._seen(db, session.id, joining=False)
            await db.commit()

    async def bench(self, frame: BenchFrame) -> None:
        """Write now if the last write was long enough ago; otherwise keep the latest and write
        it when the window ends, so the teacher always ends up with the newest state."""
        wait = self.last_write + BENCH_EVERY.total_seconds() - time.monotonic()
        if wait <= 0 and self.flush is None:
            await self._write(frame)
            return
        self.pending = frame
        if self.flush is None:
            self.flush = asyncio.create_task(self._later(max(wait, 0.0)))

    async def _later(self, wait: float) -> None:
        await asyncio.sleep(wait)
        frame, self.pending = self.pending, None
        self.flush = None
        if frame is not None:
            try:
                await self._write(frame)
            except Exception:  # a task's error is otherwise never seen
                log.exception("live.bench_write_failed", member_id=str(self.member_id))

    async def _write(self, frame: BenchFrame) -> None:
        self.last_write = time.monotonic()
        self.last_seen = self.last_write
        completed = list(frame.completed)
        mistakes = [m.model_dump() for m in frame.mistakes]
        async with get_sessionmaker()() as db:
            row = (
                (
                    await db.execute(
                        text("""
                        INSERT INTO live_benches AS b
                            (session_id, member_id, attempt_id, step, completed, mistakes,
                             readings, measured_at)
                        SELECT s.id, :member_id, :attempt_id, :step, :completed,
                               CAST(:mistakes AS jsonb), :readings,
                               CASE WHEN 'measure' = ANY(CAST(:completed AS text[]))
                                    THEN now() END
                        FROM live_sessions s
                        WHERE s.class_id = :class_id AND s.ended_at IS NULL
                          AND s.experiment_id = :experiment_id
                        ON CONFLICT (session_id, member_id) DO UPDATE SET
                            attempt_id = excluded.attempt_id,
                            step = excluded.step,
                            completed = excluded.completed,
                            mistakes = excluded.mistakes,
                            readings = excluded.readings,
                            updated_at = now(),
                            last_seen_at = now(),
                            measured_at = coalesce(b.measured_at, excluded.measured_at)
                        RETURNING b.*
                    """),
                        {
                            "member_id": self.member_id,
                            "attempt_id": frame.attempt_id,
                            "step": frame.step,
                            "completed": completed,
                            "mistakes": _json(mistakes),
                            "readings": frame.readings,
                            "class_id": self.class_id,
                            "experiment_id": frame.experiment_id,
                        },
                    )
                )
                .mappings()
                .one_or_none()
            )
            if row is not None:
                bench = LiveBench(**row)
                out = bench_out(bench, self.student.member.display_name, datetime.now(UTC))
                await publish(
                    db,
                    self.class_id,
                    "teachers",
                    {"type": "bench", "bench": out.model_dump(mode="json")},
                )
            await db.commit()

    async def leave(self) -> None:
        if self.flush is not None:
            self.flush.cancel()
        with contextlib.suppress(Exception):
            async with get_sessionmaker()() as db:
                if await _open_session(db, self.class_id) is not None:
                    await self._presence(db, False)
                await db.commit()


def _json(value: object) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


@socket_router.websocket("/student")
async def student_socket(websocket: WebSocket) -> None:
    """A student's device during a live class: it sends `hello`, then bench summaries and
    heartbeats, and receives the session's state and what the teacher sends."""
    if not _origin_ok(websocket):
        await websocket.close(CLOSE_FORBIDDEN)
        return
    async with get_sessionmaker()() as db:
        principal = await load_principal(db, websocket)
        await db.commit()
    await websocket.accept()
    if not isinstance(principal, Student):
        await websocket.close(CLOSE_SIGNED_OUT if principal is None else CLOSE_FORBIDDEN)
        return

    sub = Subscriber(
        principal.school_class.id,
        "student",
        principal.member.id,
        session_id=principal.session_id,
    )
    hub = _hub(websocket)
    hub.subscribe(sub)  # before reading the catch-up, so nothing falls between the two
    bench = _Bench(websocket, sub, principal)
    log.info("live.connected", role="student", member_id=str(principal.member.id))

    async def reader() -> None:
        frames = _Frames()
        while True:
            raw = await _receive_text(websocket, frames)
            if raw is None:
                return
            try:
                frame = _student_frame.validate_json(raw)
            except ValidationError:
                await websocket.close(1007)
                return
            if isinstance(frame, HelloFrame):
                await bench.hello(frame)
            elif isinstance(frame, BenchFrame):
                await bench.bench(frame)
            else:
                await bench.ping()

    try:
        await _run(websocket, reader(), _writer(websocket, sub, principal))
    finally:
        hub.unsubscribe(sub)
        await bench.leave()
        log.info("live.disconnected", role="student", member_id=str(principal.member.id))
