"""The one place the API talks to Claude, through the official Anthropic Python SDK (ADR 0043).

The key lives only on the server and never leaves it: it is read from the settings, given to the
SDK, and never logged or returned. Calls have no tools, a timeout and two retries. Tests replace
`get_claude` with a fake, so CI never calls the SDK and needs no key.
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Protocol

import anthropic

from app.ai.context import ModelRequest
from app.config import get_settings

# Seconds. The SDK retries timeouts, so the longest wait is about three times this.
REQUEST_TIMEOUT = 30.0
RETRIES = 2
# Models that accept the server-side refusal fallback; on a refusal the API reruns the request on
# the model it routes to by the refusal's category ("default"), inside the same call.
FALLBACK_MODELS = frozenset({"claude-sonnet-5-5", "claude-opus-5-5"})
FALLBACK_BETA = "server-side-fallback-2026-07-01"


@dataclass(frozen=True)
class TextPiece:
    text: str


@dataclass(frozen=True)
class Finished:
    model: str
    stop_reason: str | None
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int


Piece = TextPiece | Finished


class ClaudeError(Exception):
    """Claude could not answer. `retry` says whether trying again later may help."""

    def __init__(self, reason: str, *, retry: bool) -> None:
        super().__init__(reason)
        self.reason = reason
        self.retry = retry


class Claude(Protocol):
    def stream(self, request: ModelRequest) -> AsyncIterator[Piece]:
        """The reply as it is written, then one Finished. Raises ClaudeError."""
        ...


class AnthropicClaude:
    def __init__(
        self, api_key: str, http_client: anthropic.DefaultAsyncHttpxClient | None = None
    ) -> None:
        # `http_client` is for tests only, which answer from a recorded stream.
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key, timeout=REQUEST_TIMEOUT, max_retries=RETRIES, http_client=http_client
        )

    async def stream(self, request: ModelRequest) -> AsyncIterator[Piece]:
        params: dict[str, Any] = {
            "model": request.model,
            "max_tokens": request.max_tokens,
            "system": request.system,
            "messages": request.messages,
            "output_config": {"effort": request.effort},
        }
        try:
            if request.model in FALLBACK_MODELS:
                manager = self._client.beta.messages.stream(
                    **params, betas=[FALLBACK_BETA], fallbacks="default"
                )
            else:
                manager = self._client.messages.stream(**params)
            async with manager as stream:
                async for event in stream:
                    if event.type == "text":
                        yield TextPiece(event.text)
                message = await stream.get_final_message()
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError) as error:
            raise ClaudeError("credentials", retry=False) from error
        except anthropic.BadRequestError as error:
            raise ClaudeError("bad-request", retry=False) from error
        except anthropic.RateLimitError as error:
            raise ClaudeError("rate-limited", retry=True) from error
        except anthropic.APIStatusError as error:
            raise ClaudeError(f"status-{error.status_code}", retry=error.status_code >= 500) from (
                error
            )
        except anthropic.APIConnectionError as error:  # includes timeouts
            raise ClaudeError("connection", retry=True) from error
        usage = message.usage
        yield Finished(
            model=message.model,
            stop_reason=message.stop_reason,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cache_read_tokens=usage.cache_read_input_tokens or 0,
            cache_write_tokens=usage.cache_creation_input_tokens or 0,
        )


@lru_cache
def _client(api_key: str) -> AnthropicClaude:
    return AnthropicClaude(api_key)


def get_claude() -> Claude | None:
    """One client per process, created only when the key is set."""
    key = get_settings().anthropic_api_key
    return None if key is None else _client(key.get_secret_value())
