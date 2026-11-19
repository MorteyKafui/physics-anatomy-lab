"""Resend delivery and Turnstile checks (ADR 0038; decided 2026-11-19)."""

import json
from collections.abc import Iterator

import httpx
import pytest
from httpx import AsyncClient
from pydantic import SecretStr, ValidationError

from app.auth.email import Email, EmailNotSentError, ResendSender
from app.auth.turnstile import Turnstile, get_human_check
from app.config import Settings
from app.main import app

MAIL = Email(to="ama@example.org", subject="Your sign-in link", text="the link")


async def test_resend_gets_the_message_with_the_key() -> None:
    seen: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"id": "e1"})

    sender = ResendSender(
        "re_test", "Physics Anatomy <sign-in@example.org>", httpx.MockTransport(handle)
    )
    await sender.send(MAIL)
    assert seen[0].headers["authorization"] == "Bearer re_test"
    assert json.loads(seen[0].content) == {
        "from": "Physics Anatomy <sign-in@example.org>",
        "to": ["ama@example.org"],
        "subject": "Your sign-in link",
        "text": "the link",
    }


@pytest.mark.parametrize("status", [401, 422, 500])
async def test_a_refused_message_is_not_sent(status: int) -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(status, json={"message": "no"}))
    with pytest.raises(EmailNotSentError):
        await ResendSender("re_test", "a@example.org", transport).send(MAIL)


def test_resend_needs_its_key() -> None:
    with pytest.raises(ValidationError, match="RESEND_API_KEY"):
        Settings(email_delivery="resend", resend_api_key=None)


def test_deployed_environments_need_turnstile() -> None:
    with pytest.raises(ValidationError, match="TURNSTILE_SECRET_KEY"):
        Settings(
            environment="staging", client_ip_header="cf-connecting-ip", turnstile_secret_key=None
        )
    assert Settings(
        environment="staging",
        client_ip_header="cf-connecting-ip",
        turnstile_secret_key=SecretStr("0x-test"),
    )


def _cloudflare(success: bool) -> httpx.MockTransport:
    def handle(request: httpx.Request) -> httpx.Response:
        form = dict(pair.split("=") for pair in request.content.decode().split("&"))
        assert form["secret"] == "0x-secret"  # noqa: S105 (a test value)
        return httpx.Response(200, json={"success": success and form["response"] == "good"})

    return httpx.MockTransport(handle)


async def test_turnstile_asks_cloudflare() -> None:
    assert await Turnstile("0x-secret", _cloudflare(True)).passed("good", "203.0.113.1")
    assert not await Turnstile("0x-secret", _cloudflare(True)).passed("bad", "203.0.113.1")
    assert not await Turnstile("0x-secret", _cloudflare(True)).passed(None, "203.0.113.1")
    down = httpx.MockTransport(lambda _: httpx.Response(503))
    assert not await Turnstile("0x-secret", down).passed("good", "203.0.113.1")


@pytest.fixture
def turnstile_on() -> Iterator[None]:
    app.dependency_overrides[get_human_check] = lambda: Turnstile("0x-secret", _cloudflare(True))
    yield
    app.dependency_overrides.pop(get_human_check, None)


async def test_forms_need_a_good_token_when_turnstile_is_on(
    client: AsyncClient, turnstile_on: None
) -> None:
    refused = await client.post("/auth/email-link", json={"email": "a@example.org"})
    assert refused.status_code == 403
    bad = await client.post(
        "/auth/email-link", json={"email": "a@example.org", "turnstile_token": "bad"}
    )
    assert bad.status_code == 403
    join = await client.post(
        "/join", json={"code": "AAA-AAA", "display_name": "Kofi", "agreed_to_terms": True}
    )
    assert join.status_code == 403
    rejoin = await client.post("/join/rejoin", json={"code": "AAAA-AAAA"})
    assert rejoin.status_code == 403


async def test_a_good_token_passes(client: AsyncClient, turnstile_on: None) -> None:
    from app.auth.email import LogSender, get_email_sender

    app.dependency_overrides[get_email_sender] = LogSender
    try:
        sent = await client.post(
            "/auth/email-link", json={"email": "a@example.org", "turnstile_token": "good"}
        )
    finally:
        app.dependency_overrides.pop(get_email_sender, None)
    assert sent.status_code == 202
