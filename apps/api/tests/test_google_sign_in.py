"""Google sign-in for teachers: the flow with a fake Google, and the ID token checks (ADR 0038)."""

import json
import time
from collections.abc import Iterator
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from httpx import AsyncClient
from joserfc import jwt
from joserfc.jwk import KeySet, RSAKey
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import LogSender
from app.auth.google import (
    Google,
    GoogleIdentity,
    GoogleSignInError,
    code_challenge,
    identity_from_claims,
)
from app.main import app
from app.models import User
from app.routes.auth import _google_or_404  # pyright: ignore[reportPrivateUsage]
from tests.helpers import sign_in_teacher

CLIENT_ID = "test-client.apps.googleusercontent.com"


class FakeGoogle:
    def __init__(self, who: GoogleIdentity) -> None:
        self.who = who
        self.nonces: list[str] = []

    def authorization_url(self, state: str, nonce: str, code_verifier: str) -> str:
        self.nonces.append(nonce)
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}"

    async def identity(self, code: str, code_verifier: str, nonce: str) -> GoogleIdentity:
        assert code == "good-code"
        assert nonce in self.nonces
        return self.who


@pytest.fixture
def google() -> Iterator[FakeGoogle]:
    fake = FakeGoogle(GoogleIdentity(sub="g-123", email="ama@example.org", name="Ms Owusu"))
    app.dependency_overrides[_google_or_404] = lambda: fake
    yield fake
    app.dependency_overrides.pop(_google_or_404, None)


async def _start(client: AsyncClient) -> str:
    started = await client.get("/auth/google/start")
    assert started.status_code == 302
    return parse_qs(urlparse(started.headers["location"]).query)["state"][0]


async def test_google_is_404_when_not_configured(client: AsyncClient) -> None:
    assert (await client.get("/auth/google/start")).status_code == 404


async def test_google_signs_a_teacher_in(
    client: AsyncClient, google: FakeGoogle, db: AsyncSession
) -> None:
    state = await _start(client)
    done = await client.get("/auth/google/callback", params={"code": "good-code", "state": state})
    assert done.status_code == 302
    assert done.headers["location"] == "http://localhost:3000/teach"
    me = (await client.get("/auth/me")).json()
    assert me["email"] == "ama@example.org"
    assert me["display_name"] == "Ms Owusu"

    # The state works once.
    again = await client.get("/auth/google/callback", params={"code": "good-code", "state": state})
    assert again.headers["location"].endswith("/sign-in?error=google")


async def test_google_links_to_a_teacher_who_used_email(
    client: AsyncClient, google: FakeGoogle, outbox: LogSender, db: AsyncSession
) -> None:
    first = await sign_in_teacher(client, outbox, "AMA@example.org")
    state = await _start(client)
    await client.get("/auth/google/callback", params={"code": "good-code", "state": state})
    assert (await client.get("/auth/me")).json()["id"] == first["id"]
    user = await db.scalar(select(User))
    assert user is not None and user.google_sub == "g-123"


async def test_a_callback_from_another_browser_fails(
    client: AsyncClient, google: FakeGoogle
) -> None:
    state = await _start(client)
    client.cookies.delete("pa_oauth_state")
    failed = await client.get("/auth/google/callback", params={"code": "good-code", "state": state})
    assert failed.headers["location"].endswith("/sign-in?error=google")
    assert (await client.get("/auth/me")).status_code == 401


def test_pkce_challenge_matches_rfc_7636() -> None:
    verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    assert code_challenge(verifier) == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"


def test_an_unverified_google_email_is_refused() -> None:
    with pytest.raises(GoogleSignInError):
        identity_from_claims({"sub": "1", "email": "a@example.org", "email_verified": False})


# The real client, against a fake Google token endpoint and key set.

KEY = RSAKey.generate_key(2048, parameters={"kid": "k1", "use": "sig", "alg": "RS256"})


def _id_token(**changes: Any) -> str:
    now = int(time.time())
    claims: dict[str, Any] = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "g-1",
        "email": "kojo@example.org",
        "email_verified": True,
        "nonce": "the-nonce",
        "iat": now,
        "exp": now + 300,
    }
    claims.update(changes)
    return jwt.encode({"alg": "RS256", "kid": "k1"}, claims, KEY)


def _google_with(id_token: str) -> Google:
    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/token":
            form = parse_qs(request.content.decode())
            assert form["code_verifier"] == ["verifier"]
            assert form["grant_type"] == ["authorization_code"]
            return httpx.Response(200, json={"id_token": id_token, "access_token": "a"})
        keys = KeySet([KEY]).as_dict(private=False)
        return httpx.Response(200, content=json.dumps(keys))

    return Google(CLIENT_ID, "secret", transport=httpx.MockTransport(handle))


async def test_a_signed_id_token_gives_the_identity() -> None:
    who = await _google_with(_id_token()).identity("code", "verifier", "the-nonce")
    assert who == GoogleIdentity(sub="g-1", email="kojo@example.org", name=None)


@pytest.mark.parametrize(
    "changes",
    [
        {"nonce": "another"},
        {"aud": "someone-else"},
        {"iss": "https://evil.example"},
        {"exp": int(time.time()) - 600},
    ],
)
async def test_a_bad_id_token_is_refused(changes: dict[str, Any]) -> None:
    with pytest.raises(GoogleSignInError):
        await _google_with(_id_token(**changes)).identity("code", "verifier", "the-nonce")


async def test_a_token_signed_by_another_key_is_refused() -> None:
    other = RSAKey.generate_key(2048, parameters={"kid": "k1"})
    forged = jwt.encode({"alg": "RS256", "kid": "k1"}, {"sub": "x", "nonce": "the-nonce"}, other)
    with pytest.raises(GoogleSignInError):
        await _google_with(forged).identity("code", "verifier", "the-nonce")


def test_the_authorization_url_asks_for_pkce() -> None:
    url = Google(CLIENT_ID, "secret").authorization_url("s", "n", "verifier")
    query = parse_qs(urlparse(url).query)
    assert query["code_challenge_method"] == ["S256"]
    assert query["code_challenge"] == [code_challenge("verifier")]
    assert query["state"] == ["s"] and query["nonce"] == ["n"]
