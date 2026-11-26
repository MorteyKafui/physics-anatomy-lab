"""The load test's test-only route: it hands back sign-in links locally, and nowhere else."""

from httpx import AsyncClient
from pydantic import SecretStr
from pytest import MonkeyPatch

from app.auth.email import LogSender, NoSender, get_email_sender
from app.config import Settings
from app.main import app
from app.routes import load_test


async def test_it_returns_the_latest_link_for_that_address(
    client: AsyncClient, outbox: LogSender
) -> None:
    for email in ("ama@school.example", "kofi@school.example", "ama@school.example"):
        sent = await client.post("/auth/email-link", json={"email": email})
        assert sent.status_code == 202, sent.text
    latest = outbox.outbox[-1].text.split("#token=", 1)[1].split()[0]

    found = await client.get("/test-only/sign-in-link", params={"email": "AMA@school.example"})
    assert found.status_code == 200
    assert found.json() == {"token": latest}

    verified = await client.post("/auth/email-link/verify", json={"token": latest})
    assert verified.status_code == 200, verified.text


async def test_it_says_404_when_no_link_was_sent(client: AsyncClient, outbox: LogSender) -> None:
    missing = await client.get("/test-only/sign-in-link", params={"email": "x@school.example"})
    assert missing.status_code == 404


async def test_it_says_404_outside_local_and_test(
    client: AsyncClient, outbox: LogSender, monkeypatch: MonkeyPatch
) -> None:
    await client.post("/auth/email-link", json={"email": "ama@school.example"})
    staging = Settings(
        environment="staging",
        web_origin="https://physicsanatomy.example",
        email_delivery="none",
        client_ip_header="cf-connecting-ip",
        turnstile_secret_key=SecretStr("0x-test"),
    )
    monkeypatch.setattr(load_test, "get_settings", lambda: staging)
    refused = await client.get("/test-only/sign-in-link", params={"email": "ama@school.example"})
    assert refused.status_code == 404


async def test_it_says_404_when_email_is_really_sent(client: AsyncClient) -> None:
    app.dependency_overrides[get_email_sender] = NoSender
    try:
        refused = await client.get("/test-only/sign-in-link", params={"email": "a@school.example"})
    finally:
        app.dependency_overrides.pop(get_email_sender, None)
    assert refused.status_code == 404


def test_it_is_left_out_of_the_openapi_file() -> None:
    assert not any(path.startswith("/test-only") for path in app.openapi()["paths"])
