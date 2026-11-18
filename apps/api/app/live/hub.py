"""The relay: one LISTEN connection per API container, fanning messages out to its sockets.

Every change is written to the database and announced with NOTIFY in the same transaction, so a
message reaches sockets only once it is stored, whichever container each socket is on. If the
LISTEN connection drops, messages sent meanwhile are missed, so every socket is told to `resync`
from the database once it is back (ADR 0041).
"""

import asyncio
import contextlib
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal, cast

import asyncpg  # pyright: ignore[reportMissingTypeStubs]
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.live.policy import CHANNEL, MAX_NOTIFY_BYTES, QUEUE_LIMIT

log = structlog.get_logger()

Audience = Literal["teachers", "students", "all"]
Message = dict[str, Any]


async def publish(
    db: AsyncSession,
    class_id: uuid.UUID,
    audience: Audience,
    message: Message,
    members: list[uuid.UUID] | None = None,
) -> None:
    """Announce a message to every socket in the class, once the transaction commits.

    `members` narrows a student message to those students (None: every student).
    """
    envelope: dict[str, Any] = {"c": str(class_id), "a": audience, "msg": message}
    if members is not None:
        envelope["m"] = [str(m) for m in members]
    payload = json.dumps(envelope, separators=(",", ":"), ensure_ascii=False, default=str)
    if len(payload.encode("utf-8")) >= MAX_NOTIFY_BYTES:
        # Only a long recipient list can get here; the sockets read the database instead.
        payload = json.dumps({"c": str(class_id), "a": audience, "msg": {"type": "resync"}})
    await db.execute(select(func.pg_notify(CHANNEL, payload)))


def _new_queue() -> asyncio.Queue[Message]:
    return asyncio.Queue(QUEUE_LIMIT)


@dataclass(eq=False)
class Subscriber:
    """One open socket: a teacher watching a class, or a student in it."""

    class_id: uuid.UUID
    role: Literal["teacher", "student"]
    member_id: uuid.UUID | None = None
    queue: asyncio.Queue[Message] = field(default_factory=_new_queue)
    overflowed: bool = False

    def wants(self, audience: str, members: list[str] | None) -> bool:
        if audience == "all":
            return members is None or self.role == "teacher" or str(self.member_id) in members
        if self.role == "teacher":
            return audience == "teachers"
        if audience != "students":
            return False
        return members is None or str(self.member_id) in members

    def offer(self, message: Message) -> None:
        if self.overflowed:
            return
        try:
            self.queue.put_nowait(message)
        except asyncio.QueueFull:
            # The socket is closed; the client reconnects and catches up from the database.
            self.overflowed = True
            with contextlib.suppress(asyncio.QueueEmpty):
                self.queue.get_nowait()
            self.queue.put_nowait({"type": "overflow"})


class Hub:
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn
        self._subscribers: dict[uuid.UUID, set[Subscriber]] = {}
        self._task: asyncio.Task[None] | None = None
        self._lost = asyncio.Event()
        self.listening = asyncio.Event()

    # Sockets

    def subscribe(self, subscriber: Subscriber) -> None:
        self._subscribers.setdefault(subscriber.class_id, set()).add(subscriber)

    def unsubscribe(self, subscriber: Subscriber) -> None:
        subs = self._subscribers.get(subscriber.class_id)
        if subs is not None:
            subs.discard(subscriber)
            if not subs:
                del self._subscribers[subscriber.class_id]

    def sockets(self) -> int:
        return sum(len(s) for s in self._subscribers.values())

    def deliver(self, payload: str) -> None:
        try:
            envelope = json.loads(payload)
            class_id = uuid.UUID(envelope["c"])
            audience = str(envelope["a"])
            message = envelope["msg"]
            members = envelope.get("m")
        except (ValueError, KeyError, TypeError):
            log.warning("live.bad_notify")
            return
        if not isinstance(message, dict):
            return
        for sub in tuple(self._subscribers.get(class_id, ())):
            if sub.wants(audience, members):
                sub.offer(message)  # pyright: ignore[reportUnknownArgumentType]

    def _resync_all(self) -> None:
        for subs in self._subscribers.values():
            for sub in subs:
                sub.offer({"type": "resync"})

    # The LISTEN connection

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="live-hub")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    def _on_notify(self, _connection: object, _pid: int, _channel: str, payload: object) -> None:
        self.deliver(str(payload))

    def _on_lost(self, _connection: object) -> None:
        self._lost.set()

    async def _run(self) -> None:
        delay = 0.5
        first = True
        while True:
            connection: Any = None
            try:
                connection = cast(Any, await asyncpg.connect(self._dsn))  # pyright: ignore[reportUnknownMemberType]
                self._lost.clear()
                connection.add_termination_listener(self._on_lost)
                await connection.add_listener(CHANNEL, self._on_notify)
                self.listening.set()
                if not first:
                    log.warning("live.listener_reconnected")
                    self._resync_all()
                delay = 0.5
                await self._lost.wait()
                log.warning("live.listener_lost")
            except asyncio.CancelledError:
                raise
            except Exception as error:
                log.warning("live.listener_failed", error=type(error).__name__)
            finally:
                self.listening.clear()
                if connection is not None:
                    with contextlib.suppress(Exception):
                        await connection.close(timeout=2)
            first = False
            await asyncio.sleep(delay)
            delay = min(delay * 2, 10.0)


def listen_dsn(database_url: str) -> str:
    """The SQLAlchemy URL as plain asyncpg takes it."""
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
