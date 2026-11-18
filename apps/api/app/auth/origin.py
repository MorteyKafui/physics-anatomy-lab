"""Cross-site request forgery guard for every change (ADR 0038).

With SameSite=Lax cookies, a change must come from the web origin: a request that carries an
Origin must carry an allowed one, and a request that carries the session cookie must carry Origin.
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.auth.sessions import cookie_name
from app.config import get_settings

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class OriginGuard(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method not in SAFE_METHODS:
            origin = request.headers.get("origin")
            allowed = get_settings().web_origin
            if origin is not None and origin != allowed:
                return _refuse()
            if origin is None and cookie_name() in request.cookies:
                return _refuse()
        return await call_next(request)


def _refuse() -> Response:
    return JSONResponse({"detail": "This request did not come from Physics Anatomy."}, 403)
