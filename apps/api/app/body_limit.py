"""Refuse request bodies over a size, before anything parses them (ADR 0039)."""

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class _TooLargeError(Exception):
    pass


class BodyLimit:
    """413 for a body over `max_bytes`, by its Content-Length or by the bytes that arrive.
    `smaller` gives some paths a lower limit, such as the open usage route (ADR 0048)."""

    def __init__(self, app: ASGIApp, max_bytes: int, smaller: dict[str, int] | None = None) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.smaller = smaller or {}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = self.smaller.get(scope["path"], self.max_bytes)
        for name, value in scope["headers"]:
            if name == b"content-length":
                try:
                    declared = int(value)
                except ValueError:
                    declared = limit + 1
                if declared > limit:
                    await _refuse(send)
                    return

        seen = 0
        started = False

        async def counted() -> Message:
            nonlocal seen
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > limit:
                    raise _TooLargeError
            return message

        async def tracked(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, counted, tracked)
        except _TooLargeError:
            if not started:
                await _refuse(send)


async def _refuse(send: Send) -> None:
    body = b'{"detail":"This request is too large. Send less at a time."}'
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})
