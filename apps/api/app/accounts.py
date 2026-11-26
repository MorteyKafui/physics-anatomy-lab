"""The accounts switch (ADR 0047): with ACCOUNTS_ENABLED off, the account routes do not exist.

Sign-in, classes, joining, live classes, sync, the privacy exports and AI answer exactly as a
route that was never built would: 404 for a request, a closed socket for a live class. The
routes stay in the app and in the OpenAPI file, so the code and its tests keep running with the
switch on, and turning accounts back on is one setting. The admin API and the exam's approved
questions stay open.

It is the innermost middleware, so a switched-off route is refused after the same checks as any
unknown address, and its 404 carries the same headers.
"""

from collections.abc import Iterable

from starlette.responses import JSONResponse
from starlette.routing import BaseRoute, Match
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.websockets import WebSocketClose

from app.config import get_settings


class AccountsSwitch:
    def __init__(self, app: ASGIApp, routes: Iterable[BaseRoute]) -> None:
        self.app = app
        self.routes = tuple(routes)

    def _switched_off(self, scope: Scope) -> bool:
        if get_settings().accounts_enabled:
            return False
        # PARTIAL is the right address with the wrong method: still the route, so still a 404,
        # never a 405 that would say it is there.
        return any(route.matches(scope)[0] is not Match.NONE for route in self.routes)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket") and self._switched_off(scope):
            if scope["type"] == "websocket":
                await WebSocketClose()(scope, receive, send)
            else:
                await JSONResponse({"detail": "Not Found"}, status_code=404)(scope, receive, send)
            return
        await self.app(scope, receive, send)
