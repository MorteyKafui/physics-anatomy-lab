"""Teachers sign in with an email link (ADR 0038)."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import LogSender
from app.models import EmailLinkToken, Session, User
from tests.conftest import browser
from tests.helpers import sign_in_teacher, token_from


async def test_methods_say_google_is_off_until_configured(client: AsyncClient) -> None:
    response = await client.get("/auth/methods")
    assert response.json() == {"email_link": True, "google": False}


async def test_email_link_signs_a_teacher_in_and_works_once(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    sent = await client.post("/auth/email-link", json={"email": "Ama.Owusu@example.org"})
    assert sent.status_code == 202
    email = outbox.outbox[-1]
    assert email.to == "Ama.Owusu@example.org"
    assert "http://localhost:3000/sign-in/link#token=" in email.text

    token = token_from(outbox)
    stored = await db.scalar(select(EmailLinkToken.token_hash))
    assert stored is not None and token.encode() not in stored  # only the hash is kept

    verified = await client.post("/auth/email-link/verify", json={"token": token})
    assert verified.status_code == 200
    assert verified.json()["kind"] == "teacher"
    assert "pa_session" in client.cookies
    cookie = verified.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie

    me = await client.get("/auth/me")
    assert me.json()["email"] == "Ama.Owusu@example.org"

    again = await client.post("/auth/email-link/verify", json={"token": token})
    assert again.status_code == 400


async def test_the_same_teacher_is_found_whatever_the_case_of_the_email(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    first = await sign_in_teacher(client, outbox, "kwame@example.org")
    second = await sign_in_teacher(client, outbox, "KWAME@example.org")
    assert first["id"] == second["id"]
    assert await db.scalar(select(func.count()).select_from(User)) == 1


async def test_an_expired_link_is_refused(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await client.post("/auth/email-link", json={"email": "late@example.org"})
    await db.execute(
        update(EmailLinkToken).values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
    )
    refused = await client.post("/auth/email-link/verify", json={"token": token_from(outbox)})
    assert refused.status_code == 400
    assert "expired" in refused.json()["detail"]


async def test_a_made_up_token_is_refused(client: AsyncClient) -> None:
    refused = await client.post("/auth/email-link/verify", json={"token": "x" * 43})
    assert refused.status_code == 400


async def test_links_per_email_are_limited(client: AsyncClient, outbox: LogSender) -> None:
    for _ in range(5):
        assert (await client.post("/auth/email-link", json={"email": "a@example.org"})).is_success
    limited = await client.post("/auth/email-link", json={"email": "A@example.org"})
    assert limited.status_code == 429
    assert "retry-after" in limited.headers


async def test_no_email_is_sent_without_a_provider(client: AsyncClient) -> None:
    # The real sender in the test environment is the log; outside local and test it is "none".
    from app.auth.email import NoSender, get_email_sender
    from app.main import app

    app.dependency_overrides[get_email_sender] = NoSender
    try:
        refused = await client.post("/auth/email-link", json={"email": "a@example.org"})
    finally:
        app.dependency_overrides.pop(get_email_sender, None)
    assert refused.status_code == 503


async def test_signing_in_again_ends_the_old_session(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    await sign_in_teacher(client, outbox, "t@example.org")
    assert await db.scalar(select(func.count()).select_from(Session)) == 1


async def test_a_teacher_can_be_signed_in_on_two_devices(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    async with browser() as laptop:
        await sign_in_teacher(laptop, outbox, "t@example.org")
        assert (await laptop.get("/auth/me")).status_code == 200
    assert (await client.get("/auth/me")).status_code == 200
    assert await db.scalar(select(func.count()).select_from(Session)) == 2


async def test_sign_out_deletes_the_session(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    out = await client.post("/auth/sign-out")
    assert out.status_code == 204
    assert await db.scalar(select(func.count()).select_from(Session)) == 0
    assert (await client.get("/auth/me")).status_code == 401


async def test_an_idle_session_ends(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    past = datetime.now(UTC) - timedelta(seconds=1)
    await db.execute(update(Session).values(idle_expires_at=past))
    assert (await client.get("/auth/me")).status_code == 401


async def test_use_moves_the_idle_end_forward(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    soon = datetime.now(UTC) + timedelta(hours=1)
    long_ago = datetime.now(UTC) - timedelta(days=1)
    await db.execute(update(Session).values(idle_expires_at=soon, last_used_at=long_ago))
    assert (await client.get("/auth/me")).status_code == 200
    row = await db.scalar(select(Session))
    assert row is not None
    await db.refresh(row)
    assert row.idle_expires_at > soon + timedelta(days=6)
    assert row.idle_expires_at <= row.expires_at


async def test_a_teacher_sets_the_name_students_see(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    named = await client.patch("/auth/me", json={"display_name": "Mr  Mensah"})
    assert named.json()["display_name"] == "Mr Mensah"


async def test_signed_out_callers_get_401(client: AsyncClient) -> None:
    assert (await client.get("/auth/me")).status_code == 401
    assert (await client.get("/classes")).status_code == 401
