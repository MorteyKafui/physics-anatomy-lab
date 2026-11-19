"""Rate limits count the right things, and deployed settings fail closed (ADR 0038)."""

import pytest
from httpx import AsyncClient
from pydantic import SecretStr, ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.auth.email import LogSender
from app.auth.rate_limit import client_address
from app.config import Settings, get_settings
from app.main import app
from app.models import RejoinCode
from app.routes.auth import _google_or_404  # pyright: ignore[reportPrivateUsage]
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher


async def test_right_codes_do_not_count_against_a_shared_address(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    code = (await create_class(client))["code"]
    async with browser() as school_wifi:
        for _ in range(30):  # a whole class behind one address
            assert (await school_wifi.get(f"/join/{code}")).status_code == 200
        for _ in range(20):
            assert (await school_wifi.get("/join/AAA-AAA")).status_code == 404
        assert (await school_wifi.get(f"/join/{code}")).status_code == 429


def _request(host: str, headers: dict[str, str] | None = None) -> Request:
    raw = [(k.encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "headers": raw, "client": (host, 1234)})


def test_ipv6_addresses_count_by_their_64() -> None:
    first = client_address(_request("2001:db8:1:2:aaaa::1"))
    second = client_address(_request("2001:db8:1:2:bbbb::9"))
    assert first == second == "2001:db8:1:2::/64"
    assert client_address(_request("2001:db8:1:3::1")) != first
    assert client_address(_request("203.0.113.7")) == "203.0.113.7"


def test_the_proxy_header_is_read_only_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    forged = _request("10.0.0.1", {"cf-connecting-ip": "203.0.113.9"})
    assert client_address(forged) == "10.0.0.1"
    monkeypatch.setattr(get_settings(), "client_ip_header", "cf-connecting-ip")
    assert client_address(forged) == "203.0.113.9"


def test_deployed_environments_need_the_client_address_header() -> None:
    with pytest.raises(ValidationError, match="CLIENT_IP_HEADER"):
        Settings(environment="production", client_ip_header=None, admin_dev_bypass_email=None)
    assert Settings(
        environment="production",
        client_ip_header="cf-connecting-ip",
        admin_dev_bypass_email=None,
        turnstile_secret_key=SecretStr("0x-test"),
    )


async def test_a_new_rejoin_code_replaces_the_old_one(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    async with browser() as phone:
        student = await join(phone, made["code"])
    path = f"/classes/{made['id']}/members/{student['member_id']}/rejoin-code"
    old = (await client.post(path)).json()["code"]
    await client.post(path)
    assert await db.scalar(select(func.count()).select_from(RejoinCode)) == 1
    async with browser() as new_phone:
        assert (await new_phone.post("/join/rejoin", json={"code": old})).status_code == 404


async def test_google_starts_are_limited_per_address(client: AsyncClient) -> None:
    class Fake:
        def authorization_url(self, state: str, nonce: str, code_verifier: str) -> str:
            return "https://accounts.google.com/o/oauth2/v2/auth"

    app.dependency_overrides[_google_or_404] = Fake
    try:
        for _ in range(30):
            assert (await client.get("/auth/google/start")).status_code == 302
        assert (await client.get("/auth/google/start")).status_code == 429
    finally:
        app.dependency_overrides.pop(_google_or_404, None)
