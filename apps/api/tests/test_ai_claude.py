"""The SDK wrapper and the AI log, against a recorded stream and the test database.

The Anthropic client here answers from a mock transport, so nothing leaves the machine.
"""

import json
from datetime import UTC, datetime, timedelta
from typing import Any

import anthropic
import httpx2
import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.ai.claude import AnthropicClaude, ClaudeError, Finished, Piece, TextPiece
from app.ai.context import AiContext, build_request
from app.ai.features import FEATURES, FeatureName
from app.ai.log import DatabaseAiLog, LogEntry
from app.config import get_settings
from app.models import AiRequest
from tests.ai_fakes import TEST_KEY, context


def sse(*events: dict[str, Any]) -> bytes:
    return b"".join(f"event: {e['type']}\ndata: {json.dumps(e)}\n\n".encode() for e in events)


def recorded(model: str, stop_reason: str, *texts: str) -> bytes:
    usage = {"input_tokens": 40, "output_tokens": 1, "cache_read_input_tokens": 1500}
    return sse(
        {
            "type": "message_start",
            "message": {
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "model": model,
                "content": [],
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {**usage, "cache_creation_input_tokens": 0},
            },
        },
        {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}},
        *(
            {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": t}}
            for t in texts
        ),
        {"type": "content_block_stop", "index": 0},
        {
            "type": "message_delta",
            "delta": {"stop_reason": stop_reason, "stop_sequence": None},
            "usage": {"output_tokens": 12},
        },
        {"type": "message_stop"},
    )


class Recorder:
    def __init__(self, status: int, body: bytes) -> None:
        self.status = status
        self.body = body
        self.sent: list[httpx2.Request] = []

    def __call__(self, request: httpx2.Request) -> httpx2.Response:
        self.sent.append(request)
        headers = {
            "content-type": "text/event-stream" if self.status == 200 else "application/json"
        }
        return httpx2.Response(self.status, content=self.body, headers=headers)


def claude_for(recorder: Recorder) -> AnthropicClaude:
    http = anthropic.DefaultAsyncHttpxClient(transport=httpx2.MockTransport(recorder))
    return AnthropicClaude(TEST_KEY, http_client=http)


def tutor_request(model: str = "claude-haiku-5-5") -> Any:
    feature = FEATURES[FeatureName.tutor]
    return build_request(feature, model, "Help.", AiContext.model_validate(context()))


async def collect(claude: AnthropicClaude, model: str = "claude-haiku-5-5") -> list[Piece]:
    return [piece async for piece in claude.stream(tutor_request(model))]


async def test_the_sdk_streams_text_then_the_usage() -> None:
    recorder = Recorder(200, recorded("claude-haiku-5-5", "end_turn", "Start at ", "zero."))
    pieces = await collect(claude_for(recorder))
    assert pieces == [
        TextPiece("Start at "),
        TextPiece("zero."),
        Finished(
            model="claude-haiku-5-5",
            stop_reason="end_turn",
            input_tokens=40,
            output_tokens=12,
            cache_read_tokens=1500,
            cache_write_tokens=0,
        ),
    ]
    [sent] = recorder.sent
    body = json.loads(sent.content)
    assert sent.url.path == "/v1/messages"
    assert body["model"] == "claude-haiku-5-5"
    assert body["stream"] is True
    assert body["output_config"] == {"effort": "low"}
    assert "tools" not in body
    assert "fallbacks" not in body  # Haiku 5.5 has no server-side fallback
    assert TEST_KEY in (
        sent.headers.get("x-api-key"),
        sent.headers.get("authorization", "").removeprefix("Bearer "),
    )


async def test_sonnet_asks_for_the_refusal_fallback() -> None:
    recorder = Recorder(200, recorded("claude-sonnet-5-5", "end_turn", "Fine."))
    await collect(claude_for(recorder), "claude-sonnet-5-5")
    [sent] = recorder.sent
    assert json.loads(sent.content)["fallbacks"] == "default"
    assert "server-side-fallback-2026-07-01" in sent.headers["anthropic-beta"]


@pytest.mark.parametrize(
    ("status", "reason", "retry"),
    [(401, "credentials", False), (400, "bad-request", False), (429, "rate-limited", True)],
)
async def test_api_errors_become_one_failure(status: int, reason: str, retry: bool) -> None:
    error = {"type": "error", "error": {"type": "x", "message": "no"}}
    recorder = Recorder(status, json.dumps(error).encode())
    claude = claude_for(recorder)
    claude._client = claude._client.with_options(max_retries=0)  # pyright: ignore[reportPrivateUsage]
    with pytest.raises(ClaudeError) as failed:
        await collect(claude)
    assert (failed.value.reason, failed.value.retry) == (reason, retry)


def entry(**changes: Any) -> LogEntry:
    values: dict[str, Any] = {
        "feature": "tutor",
        "model": "claude-haiku-5-5",
        "principal_kind": "student",
        "pseudonym": bytes(32),
        "input_tokens": 1,
        "output_tokens": 2,
        "cache_read_tokens": 0,
        "cache_write_tokens": 0,
        "cost_microdollars": 1,
        "duration_ms": 5,
        "outcome": "done",
    }
    values.update(changes)
    return LogEntry(**values)


async def test_the_log_keeps_a_row_and_forgets_old_ones() -> None:
    """Writes to the test database for real (the log has its own session), then cleans up."""
    marker = bytes([7]) * 32
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        try:
            async with db.begin():
                db.add(AiRequest(**entry(pseudonym=marker).__dict__))
                db.add(
                    AiRequest(
                        **entry(pseudonym=marker).__dict__,
                        at=datetime.now(UTC) - timedelta(days=91),
                    )
                )
            await DatabaseAiLog(sessions).record(entry(pseudonym=marker, outcome="refused"))
            outcomes = (
                await db.scalars(select(AiRequest.outcome).where(AiRequest.pseudonym == marker))
            ).all()
            assert sorted(outcomes) == ["done", "refused"]
            assert (await db.scalar(select(func.count()).select_from(AiRequest)) or 0) >= 2
        finally:
            await db.rollback()
            async with db.begin():
                await db.execute(delete(AiRequest).where(AiRequest.pseudonym == marker))
    await engine.dispose()
