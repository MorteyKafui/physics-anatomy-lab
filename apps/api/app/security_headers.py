"""Headers on every API response (ASVS 5.0.0 chapter 3; docs/security/asvs-review-brief.md).

The API answers JSON and event streams, never pages, so its policy allows nothing to load or
run, and nothing may frame it. Answers are about a signed-in person, so no cache keeps them
unless a route says otherwise.
"""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

HEADERS: dict[bytes, bytes] = {
    b"content-security-policy": b"default-src 'none'; frame-ancestors 'none'",
    b"x-content-type-options": b"nosniff",
    b"referrer-policy": b"no-referrer",
    b"cross-origin-resource-policy": b"same-origin",
}
NO_STORE = (b"cache-control", b"no-store")


class SecurityHeaders:
    """Adds `HEADERS` to every HTTP response, and `Cache-Control: no-store` unless one is set."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers: list[tuple[bytes, bytes]] = list(message.get("headers", []))
                present = {name.lower() for name, _ in headers}
                headers += [(k, v) for k, v in HEADERS.items() if k not in present]
                if NO_STORE[0] not in present:
                    headers.append(NO_STORE)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, with_headers)
