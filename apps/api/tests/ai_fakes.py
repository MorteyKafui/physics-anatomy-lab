"""A fake Claude and a fake AI log, so no test calls the SDK, needs a key or costs anything."""

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from httpx import AsyncClient

from app.ai.claude import ClaudeError, Finished, Piece, TextPiece
from app.ai.context import ModelRequest
from app.ai.log import LogEntry

TEST_KEY = "test-key-not-a-real-one"


@dataclass
class FakeClaude:
    """Replies with `pieces`, or raises `error` after them. Keeps every request it was sent."""

    pieces: list[Piece] = field(default_factory=list[Piece])
    error: ClaudeError | None = None
    requests: list[ModelRequest] = field(default_factory=list[ModelRequest])

    def reply(self, *texts: str, stop_reason: str = "end_turn") -> None:
        self.pieces = [
            *(TextPiece(t) for t in texts),
            Finished(
                model="claude-haiku-5-5",
                stop_reason=stop_reason,
                input_tokens=1200,
                output_tokens=80,
                cache_read_tokens=900,
                cache_write_tokens=0,
            ),
        ]

    async def stream(self, request: ModelRequest) -> AsyncIterator[Piece]:
        self.requests.append(request)
        for piece in self.pieces:
            yield piece
        if self.error is not None:
            raise self.error


@dataclass
class FakeLog:
    entries: list[LogEntry] = field(default_factory=list[LogEntry])

    async def record(self, entry: LogEntry) -> None:
        self.entries.append(entry)


def context(**changes: object) -> dict[str, object]:
    body: dict[str, object] = {
        "experiment_id": "simple-pendulum",
        "experiment_version": 1,
        "step": "measure",
        "help_level": "auto",
        "events": [
            {"kind": "reading.taken", "step": "measure", "detail": {"t": 36.12, "swings": 20}}
        ],
        "quantities": [{"symbol": "l", "name": "Length", "value": 0.8, "unit": "m"}],
        "student_text": "Why do I start counting at zero?",
    }
    body.update(changes)
    return body


Event = tuple[str, dict[str, object]]


async def stream(client: AsyncClient, feature: str = "tutor", **changes: object) -> list[Event]:
    """Post to the test-only route and read every event of the reply."""
    events: list[Event] = []
    async with client.stream("POST", f"/test-only/ai/{feature}", json=context(**changes)) as reply:
        assert reply.status_code == 200, await reply.aread()
        assert reply.headers["content-type"].startswith("text/event-stream")
        name = ""
        async for line in reply.aiter_lines():
            if line.startswith("event:"):
                name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                events.append((name, json.loads(line.removeprefix("data:").strip())))
    return events
