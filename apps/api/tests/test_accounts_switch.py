"""The accounts switch (ADR 0047): off, the account routes answer as if they were never built.

The rest of the suite runs with the switch on (conftest.py), so the account code keeps its tests.
"""

import re
from collections.abc import Iterator
from typing import Any

import httpx
import pytest
from fastapi.routing import APIRoute, APIWebSocketRoute
from httpx import AsyncClient
from pydantic import SecretStr

from app.admin.access import AccessVerifier, get_access_verifier
from app.config import Settings, get_settings
from app.main import ACCOUNT_ROUTERS, OPEN_WITHOUT_ACCOUNTS, app
from tests.conftest import ORIGIN

ID = "00000000-0000-4000-8000-000000000000"


@pytest.fixture
def accounts_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "accounts_enabled", False)


def browser() -> AsyncClient:
    return AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
        headers={"Origin": ORIGIN},
    )


def switched_off() -> Iterator[tuple[str, str]]:
    """Every method and address the switch turns off, with its path parameters filled in."""
    for router in ACCOUNT_ROUTERS:
        for route in router.routes:
            if not isinstance(route, APIRoute) or route.name in OPEN_WITHOUT_ACCOUNTS:
                continue
            path = re.sub(r"\{[^}]+\}", ID, route.path)
            for method in route.methods or ():
                yield method, path


def test_accounts_are_off_unless_switched_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ACCOUNTS_ENABLED")
    assert Settings(_env_file=None).accounts_enabled is False  # pyright: ignore[reportCallIssue]


def test_a_deployed_server_without_accounts_needs_no_turnstile() -> None:
    deployed: dict[str, Any] = {
        "environment": "production",
        "web_origin": "https://physicsanatomy.example",
        "email_delivery": "none",
        "client_ip_header": "cf-connecting-ip",
        "admin_dev_bypass_email": None,
    }
    assert Settings.model_validate({**deployed, "accounts_enabled": False})
    with pytest.raises(ValueError, match="TURNSTILE_SECRET_KEY"):
        Settings.model_validate({**deployed, "accounts_enabled": True})
    assert Settings.model_validate(
        {**deployed, "accounts_enabled": True, "turnstile_secret_key": SecretStr("0x-test")}
    )


async def test_every_account_route_answers_404(accounts_off: None) -> None:
    routes = list(switched_off())
    # The switch covers sign-in, classes, joining, sync, live classes, privacy and AI.
    for prefix in ("/auth/", "/classes", "/join", "/sync/", "/export", "/account/", "/ai/"):
        assert any(path.startswith(prefix) for _, path in routes), prefix
    async with browser() as c:
        for method, path in routes:
            r = await c.request(method, path, json={})
            assert (r.status_code, r.json()) == (404, {"detail": "Not Found"}), (method, path)
            # The same headers as any other answer.
            assert r.headers["x-content-type-options"] == "nosniff"


async def test_a_wrong_method_is_a_404_too_not_a_405(accounts_off: None) -> None:
    async with browser() as c:
        assert (await c.delete("/auth/me")).status_code == 404
        assert (await c.put("/ai/status")).status_code == 404


async def test_with_accounts_on_the_routes_are_there() -> None:
    async with browser() as c:
        assert (await c.get("/auth/me")).status_code == 401
        assert (await c.delete("/auth/me")).status_code == 405


async def connect(path: str) -> list[dict[str, Any]]:
    """Open a socket on the whole app, as a browser would, and return what the app sent."""
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        return {"type": "websocket.connect"}

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    scope = {
        "type": "websocket",
        "path": path,
        "raw_path": path.encode(),
        "root_path": "",
        "query_string": b"",
        "headers": [(b"origin", ORIGIN.encode())],
        "scheme": "ws",
        "server": ("testserver", 80),
        "client": ("127.0.0.1", 1),
        "subprotocols": [],
        "app": app,
    }
    await app(scope, receive, send)  # pyright: ignore[reportArgumentType]
    return sent


async def test_live_sockets_are_closed(accounts_off: None) -> None:
    sockets = [
        r for router in ACCOUNT_ROUTERS for r in router.routes if isinstance(r, APIWebSocketRoute)
    ]
    assert sockets
    for route in sockets:
        sent = await connect(re.sub(r"\{[^}]+\}", ID, route.path))
        assert sent == [{"type": "websocket.close", "code": 1000, "reason": ""}], route.path


async def test_the_admin_api_health_and_approved_questions_stay_on(
    accounts_off: None, client: AsyncClient
) -> None:
    app.dependency_overrides[get_access_verifier] = lambda: AccessVerifier(
        None, None, dev_bypass_email="staff@example.org"
    )
    try:
        assert (await client.get("/admin/me")).status_code == 200
    finally:
        app.dependency_overrides.pop(get_access_verifier, None)
    assert (await client.get("/health")).status_code == 200
    r = await client.get("/questions/approved", params={"experiment_id": "pendulum.g"})
    assert (r.status_code, r.json()) == (200, [])
