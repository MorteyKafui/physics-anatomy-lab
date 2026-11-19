"""A Claude reply as Server-Sent Events (ADR 0043).

Four events, and nothing else is ever sent:

- `text`: {"text": "..."}, a piece of the reply, in order.
- `item`: {"item": {...}}, for features that answer with data (what if): the whole answer,
  checked on the server, sent once instead of `text`.
- `done`: {"cut_short": bool}, the reply is complete (or was cut at the length limit).
- `refused`: {"message": "..."}, the model declined, or the reply failed its check (a number
  not from the bench); discard any text already shown.
- `error`: {"message": "...", "retry": bool}, no reply; `retry` says whether trying later may help.

Exactly one of done, refused or error ends every stream. Each request is logged once, however it
ends, including when the browser goes away mid-reply.
"""

import asyncio
import json
import time
from collections.abc import AsyncIterator, Callable
from typing import Any

import structlog
from sse_starlette import EventSourceResponse, ServerSentEvent

from app.ai.claude import Claude, ClaudeError, Finished, TextPiece
from app.ai.context import ModelRequest
from app.ai.features import Feature
from app.ai.log import AiLog, LogEntry, Outcome, pseudonym
from app.ai.prices import cost_microdollars
from app.auth.sessions import Principal, Teacher

log = structlog.get_logger()

# The longest a reply may take, start to finish, in seconds.
STREAM_LIMIT = 90.0
PING_SECONDS = 15
CUT_SHORT = frozenset({"max_tokens", "model_context_window_exceeded"})

NOT_AVAILABLE = "AI help is not available right now. The coach still works offline."
TOO_SLOW = "AI help took too long to answer. Try again in a moment."
REFUSED = "AI help cannot answer that. Ask about the experiment, or use the coach's hints."
HELD = (
    "That answer used a number that is not from your bench, so it has been hidden. "
    "Try asking again."
)

# Called with the whole reply when it ends; False holds it back (shown as `refused`).
ReplyCheck = Callable[[str], bool]
# For features that answer with data: turns the whole reply into the one `item` sent, or None to
# hold it. Their text is never streamed.
ReplyItem = Callable[[str], dict[str, Any] | None]
UNUSABLE = "AI help could not turn that into something the lab can run. Try asking another way."


def _event(name: str, data: dict[str, Any]) -> ServerSentEvent:
    return ServerSentEvent(event=name, data=json.dumps(data, ensure_ascii=False))


async def reply_events(
    feature: Feature,
    principal: Principal,
    request: ModelRequest,
    claude: Claude,
    ai_log: AiLog,
    check: ReplyCheck | None = None,
    to_item: ReplyItem | None = None,
) -> AsyncIterator[ServerSentEvent]:
    started = time.monotonic()
    written: list[str] = []
    finished: Finished | None = None
    outcome: Outcome = "error"
    try:
        async with asyncio.timeout(STREAM_LIMIT):
            async for piece in claude.stream(request):
                if isinstance(piece, TextPiece):
                    if piece.text:
                        written.append(piece.text)
                        if to_item is None:
                            yield _event("text", {"text": piece.text})
                else:
                    finished = piece
        if finished is None:
            yield _event("error", {"message": NOT_AVAILABLE, "retry": True})
        elif finished.stop_reason == "refusal":
            outcome = "refused"
            yield _event("refused", {"message": REFUSED})
        elif check is not None and not check("".join(written)):
            outcome = "held"
            log.info("ai.held", feature=feature.name)
            yield _event("refused", {"message": HELD})
        elif to_item is not None and finished.stop_reason not in CUT_SHORT:
            item = to_item("".join(written))
            if item is None:
                outcome = "held"
                log.info("ai.held", feature=feature.name)
                yield _event("refused", {"message": UNUSABLE})
            else:
                outcome = "done"
                yield _event("item", {"item": item})
                yield _event("done", {"cut_short": False})
        elif to_item is not None:
            outcome = "cut-short"
            yield _event("refused", {"message": UNUSABLE})
        else:
            cut_short = finished.stop_reason in CUT_SHORT
            outcome = "cut-short" if cut_short else "done"
            yield _event("done", {"cut_short": cut_short})
    except ClaudeError as failure:
        log.warning("ai.failed", feature=feature.name, reason=failure.reason)
        yield _event("error", {"message": NOT_AVAILABLE, "retry": failure.retry})
    except TimeoutError:
        log.warning("ai.too_slow", feature=feature.name)
        yield _event("error", {"message": TOO_SLOW, "retry": True})
    except (asyncio.CancelledError, GeneratorExit):  # the browser went away
        outcome = "cancelled"
        raise
    finally:
        model = finished.model if finished else request.model
        tokens = {
            "input_tokens": finished.input_tokens if finished else 0,
            "output_tokens": finished.output_tokens if finished else 0,
            "cache_read": finished.cache_read_tokens if finished else 0,
            "cache_write": finished.cache_write_tokens if finished else 0,
        }
        entry = LogEntry(
            feature=feature.name,
            model=model,
            principal_kind="teacher" if isinstance(principal, Teacher) else "student",
            pseudonym=pseudonym(principal),
            input_tokens=tokens["input_tokens"],
            output_tokens=tokens["output_tokens"],
            cache_read_tokens=tokens["cache_read"],
            cache_write_tokens=tokens["cache_write"],
            cost_microdollars=cost_microdollars(model, **tokens),
            duration_ms=round((time.monotonic() - started) * 1000),
            outcome=outcome,
        )
        try:
            await asyncio.shield(ai_log.record(entry))
        except Exception:  # the reply matters more than its log line
            log.exception("ai.log_failed", feature=feature.name)


def reply_stream(
    feature: Feature,
    principal: Principal,
    request: ModelRequest,
    claude: Claude,
    ai_log: AiLog,
    check: ReplyCheck | None = None,
    to_item: ReplyItem | None = None,
) -> EventSourceResponse:
    return EventSourceResponse(
        reply_events(feature, principal, request, claude, ai_log, check, to_item),
        ping=PING_SECONDS,
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
